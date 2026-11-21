from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import WansviewCoordinator


class WansviewEntity(CoordinatorEntity[WansviewCoordinator]):
    _attr_has_entity_name = True

    def __init__(self, coordinator: WansviewCoordinator, did: str, key: str) -> None:
        super().__init__(coordinator)
        self.did = did
        self._attr_unique_id = f"{did}_{key}"
        self._attr_translation_key = key
        c = coordinator.cameras.get(did, {})
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, did)}, name=c.get("name", did), manufacturer="Wansview",
            model=c.get("model"), serial_number=did)

    @property
    def cam(self) -> dict:
        return (self.coordinator.data or {}).get(self.did, {})

    @property
    def available(self) -> bool:
        return super().available and bool(self.cam)
