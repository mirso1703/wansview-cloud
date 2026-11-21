"""Polling coordinator for Wansview Cloud."""
from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import WansviewApi, WansviewAuthError, WansviewError
from .const import CONF_EVENT_PATH, CONF_MOTION_HOLD, DEFAULT_MOTION_HOLD, DEFAULT_SCAN, DOMAIN

_LOGGER = logging.getLogger(__name__)
DEVLIST_EVERY = 1800
TS_KEYS = ("alarmTs", "alarmTime", "ts", "cts", "time", "createTime", "createdAt", "startTime", "eventTs", "timestamp")
DID_KEYS = ("did", "deviceId", "devId", "channelId")
URL_KEYS = ("thumbUrl", "thumbnailUrl", "imageUrl", "imgUrl", "picUrl", "url", "snapshotUrl")
BATTERY_KEYS = ("batterylevel", "battery", "batterypercent", "batcapacity", "capacity", "batlevel",
                "powerlevel", "electricity", "batterycapacity", "chargingcapacity", "remainpower")


def _to_ts(v: Any) -> float | None:
    try:
        f = float(v)
    except (TypeError, ValueError):
        if isinstance(v, str) and "T" in v:
            try:
                return datetime.fromisoformat(v.replace("Z", "+00:00")).timestamp()
            except ValueError:
                return None
        return None
    if f <= 0:
        return None
    return f / 1000 if f > 1e11 else f


def find_battery(node: Any, path: str = "") -> tuple[float, str] | None:
    """Look for a 0..100 battery value anywhere except the capability flags."""
    if isinstance(node, dict):
        for k, v in node.items():
            if k in ("capability", "protectionPlan", "cloudStorPlan"):
                continue
            if k.lower() in BATTERY_KEYS and not isinstance(v, (dict, list)):
                try:
                    f = float(v)
                except (TypeError, ValueError):
                    continue
                if 0 <= f <= 100:
                    return f, f"{path}{k}"
            if isinstance(v, str) and v.startswith("{"):
                try:
                    v = json.loads(v)
                except ValueError:
                    pass
            if isinstance(v, (dict, list)) and (r := find_battery(v, f"{path}{k}.")):
                return r
    elif isinstance(node, list):
        for i, v in enumerate(node):
            if r := find_battery(v, f"{path}{i}."):
                return r
    return None


def parse_events(result: Any) -> list[dict[str, Any]]:
    """Generic: collect dicts that carry a device id and a timestamp."""
    out: list[dict[str, Any]] = []

    def walk(n: Any) -> None:
        if isinstance(n, dict):
            did = next((n[k] for k in DID_KEYS if isinstance(n.get(k), str)), None)
            ts = next((t for k in TS_KEYS if (t := _to_ts(n.get(k)))), None)
            if did and ts:
                url = next((n[k] for k in URL_KEYS if isinstance(n.get(k), str) and n[k].startswith("http")), None)
                out.append({"did": did, "ts": ts, "url": url, "raw": n})
            for v in n.values():
                walk(v)
        elif isinstance(n, list):
            for v in n:
                walk(v)

    walk(result)
    return out


class WansviewCoordinator(DataUpdateCoordinator[dict[str, dict[str, Any]]]):
    def __init__(self, hass: HomeAssistant, api: WansviewApi, entry) -> None:
        super().__init__(hass, _LOGGER, name=DOMAIN, update_interval=timedelta(seconds=DEFAULT_SCAN))
        self.api = api
        self.entry = entry
        self.cameras: dict[str, dict[str, Any]] = {}
        self._devlist_at = 0.0
        self._fallback: dict[str, str] = {}
        self.last_event: dict[str, dict[str, Any]] = {}
        self.last_raw: dict[str, Any] = {}

    @property
    def hold(self) -> int:
        return int(self.entry.options.get(CONF_MOTION_HOLD, DEFAULT_MOTION_HOLD))

    async def _load_devices(self) -> None:
        res = await self.api.device_list()
        self.last_raw["device_list"] = res
        gens = {g["deviceId"]: g for g in res.get("devGenerals", [])}
        cams: dict[str, dict[str, Any]] = {}
        for d in res.get("conDevices", []):
            did = d["deviceId"]
            g = gens.get(did, {})
            ctx: dict[str, Any] = {}
            try:
                ctx = json.loads(g.get("context") or "{}").get("config", {})
            except ValueError:
                pass
            cams[did] = {
                "name": d.get("aliasName") or did,
                "model": g.get("prodName") or g.get("deviceMode"),
                "vendor": g.get("vendorCode"),
                "gateway": ctx.get("appGatewayUrl") or "https://cam-gw.ajcloud.net/api",
                "emc": ctx.get("appEmcUrl"),
                "cloud": ctx.get("appCloudStorUrl"),
            }
        self.cameras = cams
        self._devlist_at = time.time()

    async def _async_update_data(self) -> dict[str, dict[str, Any]]:
        try:
            return await self._update()
        except WansviewAuthError as err:
            raise UpdateFailed(f"login failed: {err}") from err
        except WansviewError as err:
            self.api.access_token = None  # force a fresh login next time
            raise UpdateFailed(str(err)) from err

    async def _update(self) -> dict[str, dict[str, Any]]:
        if not self.cameras or time.time() - self._devlist_at > DEVLIST_EVERY:
            await self._load_devices()
        by_gw: dict[str, list[str]] = {}
        for did, c in self.cameras.items():
            by_gw.setdefault(c["gateway"], []).append(did)
        infos: dict[str, dict[str, Any]] = {}
        for gw, dids in by_gw.items():
            for it in await self.api.fetch_infos(gw, dids):
                infos[it.get("did") or it.get("deviceId")] = it.get("info") or {}
        self.last_raw["fetch_infos"] = infos
        now = time.time()

        # 1) real alarm list, once the endpoint is known (option event_path, e.g. "/v1/xyz")
        path = self.entry.options.get(CONF_EVENT_PATH)
        if path:
            for did, c in self.cameras.items():
                base = c.get("emc") or ""
                url = path if path.startswith("http") else f"{base}{path}"
                try:
                    js = await self.api.raw(url, {"deviceId": did, "did": did, "limit": 5, "pageSize": 5})
                except WansviewError as err:
                    _LOGGER.debug("event query failed: %s", err)
                    continue
                self.last_raw.setdefault("events", {})[did] = js
                for ev in parse_events(js.get("result")):
                    if ev["did"] == did and ev["ts"] > self.last_event.get(did, {}).get("ts", 0):
                        self.last_event[did] = {**ev, "source": "alarm_list"}

        # 2) fallback: a new alarm snapshot shows up in the device info
        for did, info in infos.items():
            base = info.get("base", {})
            sig = f"{base.get('snapshotTs')}|{base.get('snapshotUrl')}"
            prev = self._fallback.get(did)
            self._fallback[did] = sig
            ts = _to_ts(base.get("snapshotTs"))
            if prev is not None and sig != prev and ts and ts > self.last_event.get(did, {}).get("ts", 0):
                self.last_event[did] = {"did": did, "ts": ts, "url": base.get("snapshotUrl") or None,
                                        "source": "snapshot"}

        data: dict[str, dict[str, Any]] = {}
        for did, c in self.cameras.items():
            info = infos.get(did, {})
            base = info.get("base", {})
            net = info.get("networkConfig", {})
            bat = find_battery(info)
            ev = self.last_event.get(did)
            data[did] = {
                **c,
                "online": str(base.get("onlineStatus")) == "1" if base else None,
                "fw": base.get("fwVersion"),
                "wifi": _num(net.get("wifiSignal")),
                "rssi": _num(net.get("wifiRssi")),
                "battery": bat[0] if bat else None,
                "battery_key": bat[1] if bat else None,
                "snapshot_url": base.get("snapshotUrl") or base.get("snapshotUrl2") or None,
                "snapshot_ts": _to_ts(base.get("snapshotTs")),
                "event": ev,
                "motion": bool(ev and now - ev["ts"] < self.hold),
            }
        return data


def _num(v: Any) -> float | None:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if f >= 0 or f < -1 else None


def ts_to_dt(ts: float | None) -> datetime | None:
    return datetime.fromtimestamp(ts, tz=timezone.utc) if ts else None
