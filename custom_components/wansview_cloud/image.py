from __future__ import annotations

from homeassistant.components.image import ImageEntity
from homeassistant.core import callback

from .const import DOMAIN
from .coordinator import ts_to_dt
from .entity import WansviewEntity


async def async_setup_entry(hass, entry, async_add_entities):
    coord = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(Snapshot(hass, coord, did) for did in coord.cameras)


class Snapshot(WansviewEntity, ImageEntity):
    def __init__(self, hass, coord, did):
        WansviewEntity.__init__(self, coord, did, "snapshot")
        ImageEntity.__init__(self, hass)
        self._update_url()

    def _update_url(self) -> None:
        ev = self.cam.get("event") or {}
        url = ev.get("url") or self.cam.get("snapshot_url")
        ts = ev.get("ts") if ev.get("url") else self.cam.get("snapshot_ts")
        if url != self._attr_image_url:
            self._attr_image_url = url
            self._cached_image = None
            self._attr_image_last_updated = ts_to_dt(ts)

    @callback
    def _handle_coordinator_update(self) -> None:
        self._update_url()
        super()._handle_coordinator_update()
