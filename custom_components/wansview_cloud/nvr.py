"""Local 'NVR': save every motion alarm (picture + clip) under /media/wansview."""
from __future__ import annotations

import logging
import os
import re
import shutil
import time
from datetime import datetime, timedelta
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

_LOGGER = logging.getLogger(__name__)
RETRY_FOR = 600  # clips are uploaded after the event; keep trying for 10 min
EXT = {"image/jpeg": "jpg", "image/png": "png", "video/mp4": "mp4", "video/quicktime": "mov",
       "video/x-flv": "flv", "application/octet-stream": "mp4"}


def default_root(hass: HomeAssistant) -> str:
    media = (getattr(hass.config, "media_dirs", None) or {}).get("local") or "/media"
    return os.path.join(media, "wansview")


def storage_choices(hass: HomeAssistant) -> list[str]:
    """Default folder + one 'wansview' folder per drive/folder mounted under /media and /share."""
    out = [default_root(hass)]
    for base in ("/media", "/share"):
        if not os.path.isdir(base):
            continue
        for d in sorted(os.listdir(base)):
            p = os.path.join(base, d)
            if os.path.isdir(p) and d != "wansview" and not d.startswith("."):
                out.append(os.path.join(p, "wansview"))
    return out


def check_writable(path: str) -> bool:
    real = os.path.realpath(path)
    if not (real.startswith("/media/") or real.startswith("/share/") or real.startswith("/config/")):
        return False
    try:
        os.makedirs(real, exist_ok=True)
        test = os.path.join(real, ".write_test")
        with open(test, "w") as f:
            f.write("ok")
        os.remove(test)
        return True
    except OSError:
        return False


def _safe(name: str) -> str:
    return re.sub(r"[^\w\-. ]", "_", name, flags=re.UNICODE).strip() or "kamera"


class Nvr:
    def __init__(self, hass: HomeAssistant, retention_days: int, storage_dir: str | None = None) -> None:
        self.hass = hass
        self.root = storage_dir or default_root(hass)
        self._legacy = hass.config.path("media", "wansview")
        self.retention = retention_days
        self.saved: set[str] = set()
        self.pending: dict[str, dict[str, Any]] = {}
        self._last_cleanup = 0.0
        self.today: dict[str, int] = {}
        self._day = datetime.now().strftime("%Y-%m-%d")
        self.last_files: dict[str, dict[str, str]] = {}

    def add_alarm(self, cam_name: str, alarm: dict[str, Any]) -> None:
        did, cts = alarm.get("did"), str(alarm.get("cts"))
        key = f"{did}-{cts}"
        if not did or key in self.saved or key in self.pending:
            return
        urls: dict[str, str] = {}
        for i in alarm.get("images") or []:
            if isinstance(i, dict) and i.get("url") and "thumb" not in str(i.get("tags")):
                urls.setdefault("image", i["url"])
        for v in alarm.get("avs") or []:
            if isinstance(v, dict) and v.get("url") and "video" in str(v.get("tags")):
                urls.setdefault("video", v["url"])
        self.pending[key] = {"did": did, "cam": cam_name, "ts": int(cts) / 1000, "urls": urls,
                             "done": set(), "first": time.time()}

    async def process(self) -> list[dict[str, Any]]:
        """Download what is pending. Returns finished recordings."""
        finished = []
        if (d := datetime.now().strftime("%Y-%m-%d")) != self._day:
            self._day, self.today = d, {}
        session = async_get_clientsession(self.hass)
        for key, p in list(self.pending.items()):
            when = datetime.fromtimestamp(p["ts"])
            folder = os.path.join(self.root, _safe(p["cam"]), when.strftime("%Y-%m-%d"))
            base = when.strftime("%H-%M-%S")
            for kind, url in p["urls"].items():
                if kind in p["done"]:
                    continue
                try:
                    async with session.get(url, timeout=60) as r:
                        if r.status != 200:
                            continue
                        data = await r.read()
                        ctype = (r.headers.get("Content-Type") or "").split(";")[0]
                except Exception as err:  # noqa: BLE001
                    _LOGGER.debug("nvr download %s failed: %s", kind, err)
                    continue
                if len(data) < 500:
                    continue
                ext = EXT.get(ctype) or ("jpg" if kind == "image" else "mp4")
                path = os.path.join(folder, f"{base}.{ext}")
                await self.hass.async_add_executor_job(_write, path, data)
                p["done"].add(kind)
                self.last_files.setdefault(p["did"], {})[kind] = path
            all_done = p["done"] >= set(p["urls"])
            if all_done or time.time() - p["first"] > RETRY_FOR:
                self.pending.pop(key)
                self.saved.add(key)
                if p["done"]:
                    await self.hass.async_add_executor_job(self.known, {p["did"]: p["cam"]})
                    finished.append({"did": p["did"], "camera": p["cam"], "time": when.isoformat(),
                                     "files": {k: self.last_files[p["did"]].get(k) for k in p["done"]}})
        if time.time() - self._last_cleanup > 3600:
            self._last_cleanup = time.time()
            await self.hass.async_add_executor_job(self._cleanup_and_count)
        return finished

    def _cleanup_and_count(self) -> None:
        if not os.path.isdir(self.root):
            return
        limit = (datetime.now() - timedelta(days=self.retention)).strftime("%Y-%m-%d")
        for cam in os.listdir(self.root):
            cdir = os.path.join(self.root, cam)
            if not os.path.isdir(cdir):
                continue
            for day in os.listdir(cdir):
                if re.fullmatch(r"\d{4}-\d{2}-\d{2}", day) and day < limit:
                    shutil.rmtree(os.path.join(cdir, day), ignore_errors=True)

    def known(self, files_by_did: dict[str, str]) -> None:
        """Count today's recordings already on disk (after a restart)."""
        if self._legacy != self.root and os.path.isdir(self._legacy):
            for cam in os.listdir(self._legacy):
                for day in os.listdir(os.path.join(self._legacy, cam)):
                    src = os.path.join(self._legacy, cam, day)
                    dst = os.path.join(self.root, cam, day)
                    os.makedirs(dst, exist_ok=True)
                    for f in os.listdir(src):
                        shutil.move(os.path.join(src, f), os.path.join(dst, f))
            shutil.rmtree(self._legacy, ignore_errors=True)
        day = datetime.now().strftime("%Y-%m-%d")
        for did, name in files_by_did.items():
            d = os.path.join(self.root, _safe(name), day)
            if os.path.isdir(d):
                self.today[did] = len({f.rsplit(".", 1)[0] for f in os.listdir(d)})


def _write(path: str, data: bytes) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".part"
    with open(tmp, "wb") as f:
        f.write(data)
    os.replace(tmp, path)
