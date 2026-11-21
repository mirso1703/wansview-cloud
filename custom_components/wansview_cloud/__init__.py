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

RAW_SCHEMA = vol.Schema({
    vol.Required("url"): cv.string,
    vol.Optional("data", default={}): dict,
    vol.Optional("entry_id"): cv.string,
})


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    api = WansviewApi(async_get_clientsession(hass), entry.data[CONF_USERNAME],
                      entry.data[CONF_PASSWORD], entry.data[CONF_AGENT_TOKEN])
    coord = WansviewCoordinator(hass, api, entry)
    await coord.async_config_entry_first_refresh()
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = coord
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_reload))

    if not hass.services.has_service(DOMAIN, "raw_request"):
        async def raw_request(call: ServiceCall):
            coords = hass.data.get(DOMAIN, {})
            c = coords.get(call.data.get("entry_id")) or next(iter(coords.values()), None)
            if c is None:
                raise HomeAssistantError("no Wansview account loaded")
            url = call.data["url"]
            if not url.startswith("http"):
                url = f"{c.api.uac_url}{url}"
            try:
                return {"url": url, "response": await c.api.raw(url, call.data.get("data") or {})}
            except WansviewError as err:
                return {"url": url, "error": str(err)}

        hass.services.async_register(DOMAIN, "raw_request", raw_request, schema=RAW_SCHEMA,
                                     supports_response=SupportsResponse.ONLY)
    return True


async def _reload(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return ok
