from __future__ import annotations

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.const import PERCENTAGE, SIGNAL_STRENGTH_DECIBELS_MILLIWATT, EntityCategory

from .const import DOMAIN
from .coordinator import ts_to_dt
from .entity import WansviewEntity


async def async_setup_entry(hass, entry, async_add_entities):
    coord = hass.data[DOMAIN][entry.entry_id]
    ents = []
    for did in coord.cameras:
        ents += [Battery(coord, did, "battery"), Wifi(coord, did, "wifi_signal"),
                 Rssi(coord, did, "wifi_rssi"), LastMotion(coord, did, "last_motion")]
    async_add_entities(ents)


class Battery(WansviewEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.BATTERY
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = PERCENTAGE

    @property
    def native_value(self):
        return self.cam.get("battery")

    @property
    def extra_state_attributes(self):
        return {"source_key": self.cam.get("battery_key")}


class Wifi(WansviewEntity, SensorEntity):
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_icon = "mdi:wifi"

    @property
    def native_value(self):
        return self.cam.get("wifi")


class Rssi(WansviewEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.SIGNAL_STRENGTH
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = SIGNAL_STRENGTH_DECIBELS_MILLIWATT
    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_entity_registry_enabled_default = False

    @property
    def native_value(self):
        return self.cam.get("rssi")


class LastMotion(WansviewEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    @property
    def native_value(self):
        return ts_to_dt((self.cam.get("event") or {}).get("ts"))
