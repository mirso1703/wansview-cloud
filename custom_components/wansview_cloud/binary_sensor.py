from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from homeassistant.const import EntityCategory

from .const import DOMAIN
from .coordinator import ts_to_dt
from .entity import WansviewEntity


async def async_setup_entry(hass, entry, async_add_entities):
    coord = hass.data[DOMAIN][entry.entry_id]
    ents = []
    for did in coord.cameras:
        ents += [Motion(coord, did, "motion"), Online(coord, did, "online")]
    async_add_entities(ents)


class Motion(WansviewEntity, BinarySensorEntity):
    _attr_device_class = BinarySensorDeviceClass.MOTION

    @property
    def is_on(self):
        return self.cam.get("motion")

    @property
    def extra_state_attributes(self):
        ev = self.cam.get("event") or {}
        return {"last_event": ts_to_dt(ev.get("ts")), "event_image": ev.get("url"), "source": ev.get("source"),
                "tags": ev.get("tags")}


class Online(WansviewEntity, BinarySensorEntity):
    _attr_device_class = BinarySensorDeviceClass.CONNECTIVITY
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    @property
    def is_on(self):
        return self.cam.get("online")
