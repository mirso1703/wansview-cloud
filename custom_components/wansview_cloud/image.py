from __future__ import annotations

import logging

from homeassistant.components.image import ImageEntity
from homeassistant.core import callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import DOMAIN
from .coordinator import ts_to_dt
from .entity import WansviewEntity

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass, entry, async_add_entities):
    coord = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(Snapshot(hass, coord, did) for did in coord.cameras)


class Snapshot(WansviewEntity, ImageEntity):
    """Newest of: last alarm picture / camera snapshot. Bytes are cached because
    the cloud URLs are signed and expire after a while."""

    _attr_content_type = "image/jpeg"

    def __init__(self, hass, coord, did):
        ImageEntity.__init__(self, hass)
        WansviewEntity.__init__(self, coord, did, "snapshot")
        self._bytes: bytes | None = None
        self._bytes_url: str | None = None
        self._pick()

    def _candidates(self) -> list[tuple[float, str]]:
        ev = self.cam.get("event") or {}
        out = []
        if ev.get("url"):
            out.append((ev.get("ts") or 0, ev["url"]))
        if self.cam.get("snapshot_url"):
            out.append((self.cam.get("snapshot_ts") or 0, self.cam["snapshot_url"]))
        return sorted(out, reverse=True)

    def _pick(self) -> None:
        c = self._candidates()
        if not c:
            return
        ts, url = c[0]
        if url != self._attr_image_url:
            self._attr_image_url = url
            self._attr_image_last_updated = ts_to_dt(ts)

    async def _fetch(self, url: str) -> bytes | None:
        try:
            async with async_get_clientsession(self.hass).get(url, timeout=15) as r:
                if r.status == 200:
                    data = await r.read()
                    if data[:2] == b"\xff\xd8" or len(data) > 1000:
                        return data
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("image fetch failed: %s", err)
        return None

    async def async_image(self) -> bytes | None:
        if self._bytes and self._bytes_url == self._attr_image_url:
            return self._bytes
        for _ts, url in self._candidates():
            data = await self._fetch(url)
            if data:
                self._bytes, self._bytes_url = data, self._attr_image_url
                return data
        return self._bytes  # keep showing the last good picture

    @callback
    def _handle_coordinator_update(self) -> None:
        self._pick()
        super()._handle_coordinator_update()
