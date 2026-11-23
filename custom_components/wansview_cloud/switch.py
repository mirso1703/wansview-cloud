from __future__ import annotations

from homeassistant.components.switch import SwitchEntity
from homeassistant.const import EntityCategory
from homeassistant.helpers.restore_state import RestoreEntity

from .const import DOMAIN


async def async_setup_entry(hass, entry, async_add_entities):
    coord = hass.data[DOMAIN][entry.entry_id]
    if coord.nvr:
        async_add_entities([VideoDownload(coord, entry)])


class VideoDownload(SwitchEntity, RestoreEntity):
    """Download alarm video clips to the NVR (turn off to save mobile data on 4G backup)."""

    _attr_has_entity_name = False
    _attr_name = "Wansview NVR preuzimanje videa"
    _attr_icon = "mdi:download-network"
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, coord, entry) -> None:
        self.coord = coord
        self._attr_unique_id = f"{entry.entry_id}_video_download"

    async def async_added_to_hass(self) -> None:
        last = await self.async_get_last_state()
        if last is not None:
            self.coord.nvr.video_enabled = last.state != "off"

    @property
    def is_on(self) -> bool:
        return self.coord.nvr.video_enabled

    async def async_turn_on(self, **kwargs) -> None:
        self.coord.nvr.video_enabled = True
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs) -> None:
        self.coord.nvr.video_enabled = False
        self.async_write_ha_state()
