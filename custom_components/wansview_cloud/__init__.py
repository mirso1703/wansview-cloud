"""Wansview Cloud (AJCloud) integration."""
from __future__ import annotations

import logging

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_PASSWORD, CONF_USERNAME
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession
import homeassistant.helpers.config_validation as cv

from .api import WansviewApi, WansviewError
from .const import CONF_AGENT_TOKEN, DOMAIN, PLATFORMS
from .coordinator import WansviewCoordinator
from .recordings import CARD_URL, async_setup_recordings

_LOGGER = logging.getLogger(__name__)

RAW_SCHEMA = vol.Schema({
    vol.Required("url"): cv.string,
    vol.Optional("data", default={}): dict,
    vol.Optional("entry_id"): cv.string,
    vol.Optional("device_id"): cv.string,
    vol.Optional("signed", default=True): cv.boolean,
})


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    api = WansviewApi(async_get_clientsession(hass), entry.data[CONF_USERNAME],
                      entry.data[CONF_PASSWORD], entry.data[CONF_AGENT_TOKEN])
    coord = WansviewCoordinator(hass, api, entry)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = coord
    _register_services(hass)
    try:
        await coord.async_config_entry_first_refresh()
    except Exception:
        # keep the api reachable for the diagnostic service while HA retries setup
        hass.data.setdefault(f"{DOMAIN}_pending", {})[entry.entry_id] = coord
        hass.data[DOMAIN].pop(entry.entry_id, None)
        raise
    hass.data.get(f"{DOMAIN}_pending", {}).pop(entry.entry_id, None)
    await async_setup_recordings(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_reload))
    return True


def _register_services(hass: HomeAssistant) -> None:
    if not hass.services.has_service(DOMAIN, "raw_request"):
        async def raw_request(call: ServiceCall):
            coords = {**hass.data.get(f"{DOMAIN}_pending", {}), **hass.data.get(DOMAIN, {})}
            c = coords.get(call.data.get("entry_id")) or next(iter(coords.values()), None)
            if c is None:
                raise HomeAssistantError("no Wansview account loaded")
            url = call.data["url"]
            if not url.startswith("http"):
                url = f"{c.api.uac_url}{url}"
            try:
                return {"url": url, "response": await c.api.raw(url, call.data.get("data") or {},
                                                                 call.data.get("device_id"), call.data["signed"])}
            except Exception as err:  # noqa: BLE001
                return {"url": url, "error": repr(err)}

        hass.services.async_register(DOMAIN, "raw_request", raw_request, schema=RAW_SCHEMA,
                                     supports_response=SupportsResponse.ONLY)

    if not hass.services.has_service(DOMAIN, "save_image"):
        import os

        def _crop(data: bytes, box, old: bytes | None = None) -> bytes | None:
            """box = [ymin, xmin, ymax, xmax] on a 0-1000 scale (Gemini style).

            The crop keeps generous context around the animal (half the box on
            each side, at least 30 % of the frame, 4:3), is enlarged to at least
            640 px wide, and records the source pixel size in the JPEG comment.
            With ``old`` given, returns None when the new crop is not sharper
            than the saved one (fewer source pixels), so a good picture is kept."""
            from io import BytesIO
            from PIL import Image
            im = Image.open(BytesIO(data)).convert("RGB")
            w, h = im.size
            y0, x0, y1, x1 = [max(0, min(1000, float(v))) for v in box]
            if y1 <= y0 or x1 <= x0:
                return data
            x0, x1, y0, y1 = x0 * w / 1000, x1 * w / 1000, y0 * h / 1000, y1 * h / 1000
            cw, ch = (x1 - x0) * 2.0, (y1 - y0) * 2.0
            cw = max(cw, ch * 4 / 3, w * 0.3)
            ch = max(ch, cw * 3 / 4)
            cw, ch = min(cw, w), min(ch, h)
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            left = min(max(0, cx - cw / 2), w - cw)
            top = min(max(0, cy - ch / 2), h - ch)
            crop = im.crop((int(left), int(top), int(left + cw), int(top + ch)))
            src_px = crop.width * crop.height
            if old:
                try:
                    prev = Image.open(BytesIO(old))
                    c = prev.info.get("comment", b"")
                    c = c.decode() if isinstance(c, bytes) else str(c)
                    prev_px = int(c.split("src=")[1].split()[0]) if "src=" in c else 0
                    if prev_px and src_px <= prev_px:
                        return None
                except Exception:  # noqa: BLE001
                    pass
            if crop.width < 640:
                f = 640 / crop.width
                crop = crop.resize((640, int(crop.height * f)), Image.LANCZOS)
            out = BytesIO()
            crop.save(out, "JPEG", quality=90, comment=f"src={src_px} frame={w}x{h}".encode())
            return out.getvalue()

        def _read(path: str) -> bytes:
            with open(path, "rb") as f:
                return f.read()

        def _ok(path: str) -> bool:
            return path.startswith("/media/") or path.startswith("/share/")

        async def save_image(call: ServiceCall):
            """Save a camera/image entity picture (or copy a file), optionally cropped to a box."""
            path = os.path.realpath(call.data["filename"])
            if not _ok(path):
                raise HomeAssistantError("filename must be under /media or /share")
            ent, src = call.data.get("entity_id"), call.data.get("source")
            if src:
                src = os.path.realpath(src)
                if not _ok(src) or not os.path.isfile(src):
                    raise HomeAssistantError("source must be an existing file under /media or /share")
                data = await hass.async_add_executor_job(_read, src)
            elif ent and ent.startswith("camera."):
                from homeassistant.components.camera import async_get_image
                data = (await async_get_image(hass, ent)).content
            elif ent and ent.startswith("image."):
                comp = hass.data.get("image")
                try:
                    from homeassistant.components.image.const import DATA_COMPONENT
                    comp = hass.data.get(DATA_COMPONENT) or comp
                except ImportError:
                    pass
                img = comp.get_entity(ent) if comp else None
                if img is None:
                    raise HomeAssistantError(f"{ent} not found")
                data = await img.async_image()
            else:
                raise HomeAssistantError("give source (file) or entity_id (camera.* / image.*)")
            if not data:
                raise HomeAssistantError("no image")
            box = call.data.get("box")
            if box and len(box) == 4:
                old = None
                if call.data.get("only_if_better") and os.path.isfile(path):
                    old = await hass.async_add_executor_job(_read, path)
                try:
                    cropped = await hass.async_add_executor_job(_crop, data, box, old)
                except Exception as err:  # noqa: BLE001
                    _LOGGER.debug("crop failed: %s", err)
                    cropped = data
                if cropped is None:
                    return {"filename": path, "bytes": 0, "kept": True}
                data = cropped
            from .nvr import _write
            await hass.async_add_executor_job(_write, path, data)
            return {"filename": path, "bytes": len(data)}

        hass.services.async_register(DOMAIN, "save_image", save_image, schema=vol.Schema({
            vol.Optional("entity_id"): cv.entity_id, vol.Optional("source"): cv.string,
            vol.Required("filename"): cv.string, vol.Optional("box"): list,
            vol.Optional("only_if_better", default=False): cv.boolean}),
            supports_response=SupportsResponse.OPTIONAL)

        def _latest(folder: str):
            best = None
            for root, _d, files in os.walk(folder):
                for f in files:
                    if f.lower().endswith((".jpg", ".jpeg", ".png")):
                        p = os.path.join(root, f)
                        m = os.path.getmtime(p)
                        if best is None or m > best[0]:
                            best = (m, p)
            return best

        async def latest_image(call: ServiceCall):
            """Newest picture the NVR saved for a camera (folder name under the NVR root)."""
            from .recordings import _root
            from datetime import datetime
            folder = os.path.join(_root(hass), call.data["camera"])
            best = await hass.async_add_executor_job(_latest, folder)
            if not best:
                return {"path": None}
            media_dir = (getattr(hass.config, "media_dirs", None) or {}).get("local") or "/media"
            rel = os.path.relpath(best[1], media_dir)
            return {"path": best[1], "time": datetime.fromtimestamp(best[0]).isoformat(),
                    "age_s": int(datetime.now().timestamp() - best[0]),
                    "media_content_id": f"media-source://media_source/local/{rel}"}

        hass.services.async_register(DOMAIN, "latest_image", latest_image,
                                     schema=vol.Schema({vol.Required("camera"): cv.string}),
                                     supports_response=SupportsResponse.ONLY)


async def _reload(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return ok
