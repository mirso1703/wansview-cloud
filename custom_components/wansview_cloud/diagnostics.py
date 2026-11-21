from __future__ import annotations

from homeassistant.components.diagnostics import async_redact_data

from .const import DOMAIN

REDACT = {"password", "accessToken", "refreshToken", "signToken", "accessKey", "accessPubKey", "accessPriKey",
          "localAccountConfig", "wlanMac", "ethMac", "remoteAddr", "wanIp", "aclid", "websocketFD",
          "masterUid", "uid", "email", "username", "agent_token", "iccid", "iccid1", "iccid2"}


async def async_get_config_entry_diagnostics(hass, entry):
    c = hass.data[DOMAIN][entry.entry_id]
    return async_redact_data({
        "options": dict(entry.options),
        "uac_url": c.api.uac_url,
        "cameras": c.cameras,
        "data": c.data,
        "raw": c.last_raw,
    }, REDACT)
