"""Recordings API + gallery card for the local NVR."""
from __future__ import annotations

import os
from datetime import timedelta
from urllib.parse import quote

import voluptuous as vol
from aiohttp import web

from homeassistant.components import websocket_api
from homeassistant.components.http import HomeAssistantView, StaticPathConfig
from homeassistant.components.http.auth import async_sign_path
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN

MEDIA_URL = f"/api/{DOMAIN}/media"
CARD_URL = f"/{DOMAIN}_static/wansview-nvr-card.js"


def _root(hass: HomeAssistant) -> str:
    for c in (hass.data.get(DOMAIN) or {}).values():
        if getattr(c, "nvr", None):
            return c.nvr.root
    from .nvr import default_root
    return default_root(hass)


def _scan(root: str, camera: str | None, limit: int) -> list[dict]:
    out: list[dict] = []
    if not os.path.isdir(root):
        return out
    for cam in sorted(os.listdir(root)):
        if camera and cam != camera:
            continue
        cdir = os.path.join(root, cam)
        if not os.path.isdir(cdir):
            continue
        for day in os.listdir(cdir):
            ddir = os.path.join(cdir, day)
            if not os.path.isdir(ddir):
                continue
            groups: dict[str, dict] = {}
            for f in os.listdir(ddir):
                if f.endswith(".part") or "." not in f:
                    continue
                stem, ext = f.rsplit(".", 1)
                g = groups.setdefault(stem, {"camera": cam, "day": day, "time": stem.replace("-", ":")})
                if ext in ("jpg", "jpeg", "png"):
                    g["image"] = f"{cam}/{day}/{f}"
                else:
                    g["video"] = f"{cam}/{day}/{f}"
            out.extend(groups.values())
    out.sort(key=lambda g: (g["day"], g["time"]), reverse=True)
    return out[:limit]


class MediaView(HomeAssistantView):
    url = MEDIA_URL + "/{path:.+}"
    name = f"api:{DOMAIN}:media"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request, path: str) -> web.StreamResponse:
        root = os.path.realpath(_root(self.hass))
        full = os.path.realpath(os.path.join(root, path))
        if not full.startswith(root + os.sep) or not os.path.isfile(full):
            return web.Response(status=404)
        return web.FileResponse(full, headers={"Cache-Control": "private, max-age=86400"})


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/recordings",
    vol.Optional("camera"): str,
    vol.Optional("limit", default=120): vol.All(int, vol.Range(min=1, max=1000)),
})
@websocket_api.async_response
async def ws_recordings(hass: HomeAssistant, connection, msg) -> None:
    items = await hass.async_add_executor_job(_scan, _root(hass), msg.get("camera"), msg["limit"])
    refresh = connection.refresh_token_id

    def sign(rel: str | None) -> str | None:
        if not rel:
            return None
        return async_sign_path(hass, f"{MEDIA_URL}/{quote(rel)}", timedelta(hours=12), refresh_token_id=refresh)

    cams = await hass.async_add_executor_job(
        lambda: sorted(os.listdir(_root(hass))) if os.path.isdir(_root(hass)) else [])
    connection.send_result(msg["id"], {
        "cameras": cams,
        "items": [{**i, "image": sign(i.get("image")), "video": sign(i.get("video"))} for i in items],
    })


async def async_setup_recordings(hass: HomeAssistant) -> None:
    if hass.data.get(f"{DOMAIN}_rec_setup"):
        return
    hass.data[f"{DOMAIN}_rec_setup"] = True
    hass.http.register_view(MediaView(hass))
    websocket_api.async_register_command(hass, ws_recordings)
    await hass.http.async_register_static_paths([
        StaticPathConfig(CARD_URL, os.path.join(os.path.dirname(__file__), "www", "wansview-nvr-card.js"), False)
    ])
