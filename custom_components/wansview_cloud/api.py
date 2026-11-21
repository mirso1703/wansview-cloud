"""Minimal client for the AJCloud (Wansview Cloud) app API.

Protocol: NaCl-box password challenge + HMAC-SHA256 request signing (X-UAC-Signature),
as used by the current Wansview Cloud mobile app.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import time
import uuid
from typing import Any
from urllib.parse import urlsplit

import aiohttp

from .const import PORTAL_UAC, VENDOR

_LOGGER = logging.getLogger(__name__)

APP_VERSION = "2.0.26012704"
AGENT_NAME = "SM-S926B"
USER_AGENT = "15; en-us; SM-S926B Build/AP3A.240905.015.A2;wansview/V2.0.26012704"


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
        self.agent_token = agent_token.strip("{}") or str(uuid.uuid4())
        self.uac_url: str | None = None
        self.access_token: str | None = None
        self.sign_token: str | None = None
        self.refresh_token: str | None = None
        self.expires_at = 0.0
        self.country = "BA"
        self.continent = ""

    def _meta(self, signed: bool, device_id: str | None = None) -> dict[str, Any]:
        m: dict[str, Any] = {
            "locale": "en",
            "localtz": int(time.localtime().tm_gmtoff / 60),
            "appName": "wansview",
            "appVersion": APP_VERSION,
            "appVendorCode": VENDOR,
            "agentName": AGENT_NAME,
            "appCountryCode": self.country,
            "appContinentCode": self.continent,
        }
        if signed and self.access_token:
            m["accessToken"] = self.access_token
        if device_id:
            m["deviceId"] = device_id
        return m

    def _signature(self, url: str, body: str) -> str:
        ts = str(int(time.time() * 1000) + 1000)
        path = urlsplit(url).path
        body_hash = hashlib.sha256(body.encode()).hexdigest()
        sign_body = f"POST\n{path}\n{body_hash}\n"
        to_sign = "HMAC-SHA256\n" + ts + "\n" + hashlib.sha256(sign_body.encode()).hexdigest()
        sig = base64.urlsafe_b64encode(
            hmac.new(self.sign_token.encode(), to_sign.encode(), hashlib.sha256).digest()).decode().rstrip("=")
        return f"UAC1-HMAC-SHA256;{ts};{sig}"

    async def _post(self, url: str, data: dict[str, Any], signed: bool = True,
                    device_id: str | None = None, meta: dict[str, Any] | None = None) -> dict[str, Any]:
        built = {"meta": {**self._meta(signed, device_id), **(meta or {})}, "data": data}
        body = json.dumps(built, separators=(",", ":"), ensure_ascii=False)
        headers = {
            "Content-Type": "application/json;charset=utf-8",
            "User-Agent": USER_AGENT,
            "x-agent-token": self.agent_token,
        }
        if signed:
            if not (self.access_token and self.sign_token):
                raise WansviewError("not logged in")
            headers["Authorization"] = f"Bearer {self.access_token}"
            headers["X-UAC-Signature"] = self._signature(url, body)
        async with self._s.post(url, data=body.encode(), headers=headers,
                                timeout=aiohttp.ClientTimeout(total=20)) as r:
            try:
                return await r.json(content_type=None)
            except Exception as err:  # noqa: BLE001
                raise WansviewError(f"{urlsplit(url).path}: HTTP {r.status}, not JSON") from err

    @staticmethod
    def _ok(js: dict[str, Any], what: str) -> dict[str, Any]:
        if js.get("status") != "ok" or js.get("code") not in (0, "0", None):
            raise WansviewError(f"{what}: {js.get('code')} {js.get('message')}")
        return js.get("result") or {}

    async def raw(self, url: str, data: dict[str, Any] | None = None, device_id: str | None = None,
                  signed: bool = True) -> dict[str, Any]:
        if signed:
            await self.ensure_token()
        return await self._post(url, data or {}, signed, device_id)

    async def login(self) -> None:
        self.access_token = self.sign_token = None
        res = self._ok(
            await self._post(f"{PORTAL_UAC}/v1/account-node-query",
                             {"username": self.username, "crCode": "", "ctCode": "", "accountType": "email",
                              "agentName": AGENT_NAME}, False),
            "account-node-query")
        if res.get("accountExisted") == 0:
            raise WansviewAuthError("account does not exist")
        self.uac_url = res.get("uacNodeUrl") or "https://uac-eu.ajcloud.net/api"
        ch = self._ok(
            await self._post(f"{self.uac_url}/v3/outer-challenge",
                             {"username": self.username, "action": "signin", "agentName": AGENT_NAME,
                              "agentToken": self.agent_token}, False),
            "outer-challenge")
        enc, nonce = _encrypt_password(self._password, ch["serverPubKey"], ch["clientSecretKey"])
        js = await self._post(f"{self.uac_url}/v1/signin",
                              {"username": self.username, "password": enc, "nonce": nonce,
                               "agentName": AGENT_NAME, "modelName": AGENT_NAME, "agentToken": self.agent_token,
                               "osName": "android", "origin": "mobile phone",
                               "grantType": "password", "scope": "all"}, False)
        if js.get("status") != "ok":
            raise WansviewAuthError(f"signin: {js.get('code')} {js.get('message')}")
        res = js["result"]
        self.access_token = res["accessToken"]
        self.sign_token = res["signToken"]
        self.refresh_token = res.get("refreshToken")
        self.expires_at = time.time() + int(res.get("accessExpiresIn", 7200))
        ident = res.get("ident") or {}
        self.country = (ident.get("region") or self.country).upper()
        self.continent = ident.get("continent") or self.continent
        if ident.get("uacNodeUrl"):
            self.uac_url = ident["uacNodeUrl"]

    async def ensure_token(self) -> None:
        if self.access_token and self.sign_token and time.time() < self.expires_at - 600:
            return
        await self.login()

    async def device_list(self) -> list[dict[str, Any]]:
        await self.ensure_token()
        res = self._ok(await self._post(f"{self.uac_url}/v3/device-list", {}), "device-list")
        merged: dict[str, dict[str, Any]] = {}
        for key in ("conDevices", "devGenerals", "devCmpts", "devPinners"):
            for item in res.get(key) or []:
                did = str(item.get("deviceId") or item.get("devId") or "")
                if did:
                    merged[did] = {**merged.get(did, {}), **item}
        return list(merged.values())

    async def fetch_infos(self, gateway: str, dids: list[str], shared: set[str] | None = None) -> list[dict[str, Any]]:
        await self.ensure_token()
        shared = shared or set()
        devs = [{"did": d, "scopes": [], "isShare": d in shared} for d in dids]
        res = self._ok(await self._post(f"{gateway}/v1/fetch-infos", {"devices": devs}), "fetch-infos")
        return res.get("infos", [])

    async def alarms(self, emc: str, did: str) -> list[dict[str, Any]]:
        await self.ensure_token()
        res = self._ok(await self._post(f"{emc}/v1/alarms-survey", {"deviceId": did}, True, did), "alarms-survey")
        return res.get("alarms") or []
