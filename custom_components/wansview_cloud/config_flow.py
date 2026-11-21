from __future__ import annotations

import uuid

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.const import CONF_PASSWORD, CONF_USERNAME
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import WansviewApi, WansviewAuthError, WansviewError
from .const import CONF_AGENT_TOKEN, CONF_EVENT_PATH, CONF_MOTION_HOLD, DEFAULT_MOTION_HOLD, DOMAIN


class ConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors = {}
        placeholders = {"detail": ""}
        if user_input is not None:
            username = user_input[CONF_USERNAME].strip()
            await self.async_set_unique_id(username.lower())
            self._abort_if_unique_id_configured()
            token = "{" + str(uuid.uuid4()) + "}"
            api = WansviewApi(async_get_clientsession(self.hass), username, user_input[CONF_PASSWORD], token)
            try:
                await api.login()
            except WansviewAuthError as err:
                errors["base"] = "invalid_auth"
                placeholders["detail"] = str(err)
            except (WansviewError, Exception) as err:  # noqa: BLE001
                errors["base"] = "cannot_connect"
                placeholders["detail"] = str(err)
            else:
                return self.async_create_entry(
                    title=username,
                    data={CONF_USERNAME: username, CONF_PASSWORD: user_input[CONF_PASSWORD], CONF_AGENT_TOKEN: token})
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({vol.Required(CONF_USERNAME): str, vol.Required(CONF_PASSWORD): str}),
            errors=errors, description_placeholders=placeholders)

    @staticmethod
    def async_get_options_flow(entry):
        return OptionsFlow()


class OptionsFlow(config_entries.OptionsFlow):
    async def async_step_init(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        o = self.config_entry.options
        return self.async_show_form(step_id="init", data_schema=vol.Schema({
            vol.Optional(CONF_MOTION_HOLD, default=o.get(CONF_MOTION_HOLD, DEFAULT_MOTION_HOLD)):
                vol.All(int, vol.Range(min=10, max=900)),
            vol.Optional(CONF_EVENT_PATH, description={"suggested_value": o.get(CONF_EVENT_PATH, "")}): str,
        }))
