"""Wansview Cloud (AJCloud) integration."""
from __future__ import annotations

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


async def _reload(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return ok
