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
from .const import (CONF_MOTION_HOLD, CONF_NVR, CONF_RETENTION, CONF_STORAGE, DEFAULT_MOTION_HOLD, DEFAULT_RETENTION,
                    DEFAULT_SCAN, DOMAIN)
from .nvr import Nvr

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
        self.nvr = Nvr(hass, int(entry.options.get(CONF_RETENTION, DEFAULT_RETENTION)),
                       entry.options.get(CONF_STORAGE) or None) \
            if entry.options.get(CONF_NVR, True) else None
        self._nvr_seeded = False

    @property
    def hold(self) -> int:
        return int(self.entry.options.get(CONF_MOTION_HOLD, DEFAULT_MOTION_HOLD))

    async def _load_devices(self) -> None:
        items = await self.api.device_list()
        self.last_raw["device_list"] = items
        cams: dict[str, dict[str, Any]] = {}
        for d in items:
            did = str(d.get("deviceId"))
            ctx = d.get("context") or {}
            if isinstance(ctx, str):
                try:
                    ctx = json.loads(ctx or "{}")
                except ValueError:
                    ctx = {}
            cfg = ctx.get("config", {}) if isinstance(ctx, dict) else {}
            cams[did] = {
                "shared": bool(d.get("conType")) or d.get("bindStatus") not in (None, "binded"),
                "name": (d.get("aliasName") or d.get("deviceName") or did).strip(),
                "model": d.get("prodName") or d.get("deviceMode"),
                "vendor": d.get("vendorCode"),
                "con_online": d.get("conStatus") == 1,
                "gateway": cfg.get("appGatewayUrl"),
                "emc": cfg.get("appEmcUrl"),
            }
        gw = next((c["gateway"] for c in cams.values() if c["gateway"]), None)
        for c in cams.values():
            c["gateway"] = c["gateway"] or gw
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
            if c.get("gateway"):
                by_gw.setdefault(c["gateway"], []).append(did)
        infos: dict[str, dict[str, Any]] = {}
        for gw, dids in by_gw.items():
            shared = {d for d in dids if self.cameras[d].get("shared")}
            try:
                fetched = await self.api.fetch_infos(gw, dids, shared)
            except WansviewError as err:
                _LOGGER.debug("fetch-infos failed: %s", err)
                fetched = []
            for it in fetched:
                infos[it.get("did") or it.get("deviceId")] = it.get("info") or {}
            # retry the missing ones with the opposite share flag
            missing = [d for d in dids if not infos.get(d)]
            if missing:
                flipped = {d for d in missing if d not in shared}
                try:
                    for it in await self.api.fetch_infos(gw, missing, flipped):
                        did = it.get("did") or it.get("deviceId")
                        if it.get("info"):
                            infos[did] = it["info"]
                            self.cameras[did]["shared"] = did in flipped
                except WansviewError as err:
                    _LOGGER.debug("fetch-infos retry failed: %s", err)
        self.last_raw["fetch_infos"] = infos
        for did, info in infos.items():
            alias = ((info.get("base") or {}).get("aliasName") or "").strip()
            if alias and did in self.cameras:
                self.cameras[did]["name"] = alias
        now = time.time()

        # 1) motion alarms: alarms-survey returns the account's latest alarm(s), each with its "did"
        emcs: dict[str, str] = {}
        for did, cam in self.cameras.items():
            if cam.get("emc"):
                emcs.setdefault(cam["emc"], did)
        for emc, any_did in emcs.items():
            try:
                alarms = await self.api.alarms(emc, any_did)
            except WansviewError as err:
                _LOGGER.debug("alarms-survey %s failed: %s", emc, err)
                continue
            self.last_raw.setdefault("alarms", {})[emc] = alarms[:5]
            for a in alarms:
                did = a.get("did")
                ts = _to_ts(a.get("cts"))
                if did not in self.cameras or not ts or ts <= self.last_event.get(did, {}).get("ts", 0):
                    continue
                if self.nvr:
                    self.nvr.add_alarm(self.cameras[did]["name"], a)
                imgs = a.get("images") or []
                url = next((i.get("url") for i in imgs if isinstance(i, dict) and i.get("url")
                            and "thumb" not in str(i.get("tags", ""))), None) or next(
                    (i.get("url") for i in imgs if isinstance(i, dict) and i.get("url")), None)
                self.last_event[did] = {"did": did, "ts": ts, "url": url, "source": "alarm",
                                        "duration": _num(a.get("dur"))}

        if self.nvr:
            if not self._nvr_seeded:
                self._nvr_seeded = True
                await self.hass.async_add_executor_job(
                    self.nvr.known, {d: c["name"] for d, c in self.cameras.items()})
            for rec in await self.nvr.process():
                self.hass.bus.async_fire(f"{DOMAIN}_recording", rec)

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
                "online": (str(base.get("onlineStatus")) in ("1", "2")) if base else c.get("con_online"),
                "fw": base.get("fwVersion"),
                "wifi": _num(net.get("wifiSignal")),
                "rssi": _num(net.get("wifiRssi")),
                "battery": bat[0] if bat else None,
                "battery_key": bat[1] if bat else None,
                "snapshot_url": base.get("snapshotUrl") or base.get("snapshotUrl2") or None,
                "snapshot_ts": _to_ts(base.get("snapshotTs")),
                "event": ev,
                "motion": bool(ev and now - ev["ts"] < self.hold),
                "recordings_today": self.nvr.today.get(did, 0) if self.nvr else None,
                "last_video": (self.nvr.last_files.get(did) or {}).get("video") if self.nvr else None,
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
