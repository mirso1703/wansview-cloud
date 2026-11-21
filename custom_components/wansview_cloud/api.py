"""Minimal client for the AJCloud (Wansview Cloud) app API."""
from __future__ import annotations

import base64
import logging
import os
import time
from typing import Any

import aiohttp

from .const import PORTAL_UAC, VENDOR

_LOGGER = logging.getLogger(__name__)


class WansviewError(Exception):
    """API error."""


class WansviewAuthError(WansviewError):
    """Bad credentials / token."""


def _encrypt_password(password: str, server_pub: str, client_sec: str) -> tuple[str, str]:
    from nacl.public import Box, PrivateKey, PublicKey  # provided by HA core

    box = Box(PrivateKey(base64.b64decode(client_sec)), PublicKey(base64.b64decode(server_pub)))
    nonce = os.urandom(24)
    ct = box.encrypt(password.encode(), nonce).ciphertext
    return base64.b64encode(ct).decode(), base64.b64encode(nonce).decode()


class WansviewApi:
    def __init__(self, session: aiohttp.ClientSession, username: str, password: str, agent_token: str) -> None:
        self._s = session
        self.username = username
        self._password = password
        self.agent_token = agent_token
        self.uac_url: str | None = None
        self.access_token: str | None = None
        self.refresh_token: str | None = None
        self.expires_at = 0.0

    def _base(self) -> dict[str, Any]:
        return {"origin": "PC", "osName": "windows", "agentName": "homeassistant", "appVendorCode": VENDOR}

    def _meta(self, auth: bool) -> dict[str, Any]:
        tz = int(time.localtime().tm_gmtoff / 60)
        m = {"locale": "en", "localtz": tz, "appName": "wansview", "appVendorCode": VENDOR}
        if auth and self.access_token:
            m["accessToken"] = self.access_token
        return m

    async def _post(self, url: str, data: dict[str, Any], auth: bool = True) -> dict[str, Any]:
        body = {"meta": self._meta(auth), "data": {**self._base(), **data}}
        headers = {"Content-Type": "application/json"}
        if auth and self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        async with self._s.post(url, json=body, headers=headers, timeout=aiohttp.ClientTimeout(total=20)) as r:
            try:
                js = await r.json(content_type=None)
            except Exception as err:  # noqa: BLE001
                raise WansviewError(f"{url}: HTTP {r.status}") from err
        return js

    async def raw(self, url: str, data: dict[str, Any] | None = None) -> dict[str, Any]:
        await self.ensure_token()
        return await self._post(url, data or {})

    @staticmethod
    def _ok(js: dict[str, Any], what: str) -> dict[str, Any]:
        if js.get("status") != "ok":
            raise WansviewError(f"{what}: {js.get('code')} {js.get('message')}")
        return js.get("result") or {}

    async def login(self) -> None:
        res = self._ok(
            await self._post(f"{PORTAL_UAC}/v1/account-node-query",
                             {"username": self.username, "crCode": "", "ctCode": "", "accountType": "email"}, False),
            "account-node-query")
        if not res.get("accountExisted", 1):
            raise WansviewAuthError("account does not exist")
        self.uac_url = res.get("uacNodeUrl") or "https://uac.ajcloud.net/api"
        ch = self._ok(
            await self._post(f"{self.uac_url}/v3/outer-challenge",
                             {"username": self.username, "action": "signin", "agentToken": self.agent_token}, False),
            "outer-challenge")
        enc, nonce = _encrypt_password(self._password, ch["serverPubKey"], ch["clientSecretKey"])
        js = await self._post(f"{self.uac_url}/v1/signin",
                             {"username": self.username, "password": enc, "nonce": nonce,
                              "agentToken": self.agent_token, "grantType": "password", "scope": "all"}, False)
        if js.get("status") != "ok":
            raise WansviewAuthError(f"signin: {js.get('code')} {js.get('message')}")
        self._store(js["result"])

    def _store(self, res: dict[str, Any]) -> None:
        self.access_token = res["accessToken"]
        self.refresh_token = res.get("refreshToken", self.refresh_token)
        self.expires_at = time.time() + int(res.get("accessExpiresIn", 7200))
        if (ident := res.get("ident")) and ident.get("uacNodeUrl"):
            self.uac_url = ident["uacNodeUrl"]

    async def ensure_token(self) -> None:
        if self.access_token and time.time() < self.expires_at - 600:
            return
        if self.access_token and self.refresh_token:
            js = await self._post(f"{self.uac_url}/v1/refresh-token",
                                  {"agentToken": self.agent_token, "accessToken": self.access_token,
                                   "refreshToken": self.refresh_token}, False)
            if js.get("status") == "ok":
                self._store(js["result"])
                return
        await self.login()

    async def device_list(self) -> dict[str, Any]:
        await self.ensure_token()
        return self._ok(await self._post(f"{self.uac_url}/v2/device-list", {}), "device-list")

    async def fetch_infos(self, gateway: str, dids: list[str]) -> list[dict[str, Any]]:
        await self.ensure_token()
        devs = [{"did": d, "deviceType": 1, "isShare": False, "scopes": []} for d in dids]
        res = self._ok(await self._post(f"{gateway}/v1/fetch-infos", {"devices": devs}), "fetch-infos")
        return res.get("infos", [])
