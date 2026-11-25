// Wansview NVR gallery card — preview of locally saved camera recordings.
class WansviewNvrCard extends HTMLElement {
  setConfig(config) {
    this._config = { limit: 60, columns: 2, title: "Snimci", ...config };
    this._filter = String(config.camera || "").replace(/ Vikendica$/, "");
    try {
      this._view = localStorage.getItem("wvnvr-view") || config.view || "grid";
      this._zoom = +localStorage.getItem("wvnvr-zoom") || 1;
    } catch (e) {
      this._view = config.view || "grid";
      this._zoom = 1;
    }
    this._items = [];
    this._cams = [];
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._render();
  }

  set hass(hass) {
    const first = !this._hass;
    const old = this._hass;
    this._hass = hass;
    if (!first && this._config.cameras && !this.shadowRoot.querySelector(".modal")) {
      const ids = this._config.cameras.flatMap((c) => [c.battery, c.motion, c.ago]).filter(Boolean);
      if (ids.some((id) => old.states[id] !== hass.states[id])) this._render();
    }
    if (first) {
      this._load();
      this._timer = setInterval(() => this._load(), 60000);
    }
  }

  disconnectedCallback() {
    clearInterval(this._timer);
  }

  getCardSize() {
    return 8;
  }

  getGridOptions() {
    return { columns: "full", rows: "auto" };
  }

  async _load() {
    if (!this._hass) return;
    try {
      const msg = { type: "wansview_cloud/recordings", limit: this._config.recent === false ? 1 : this._config.limit };
      const ck = (c) => String(c || "").replace(/ Vikendica$/, "");
      if (this._filter) msg.camera = this._filter;
      const wv = await this._hass.callWS(msg).catch(() => ({ items: [], cameras: [] }));
      const wvItems = this._group(wv.items || []);
      const merge = (reo) => {
        let items = wvItems.concat(reo);
        if (this._filter) items = items.filter((r) => ck(r.camera) === this._filter);
        items.sort((a, b) => (b.day + b.time).localeCompare(a.day + a.time));
        this._items = items.slice(0, this._config.limit);
      };
      // show Wansview clips right away, Reolink SD list (slow, asks the camera) is added when it arrives
      merge(this._reoCache || []);
      if (!this._filter || !this._cams?.length) this._cams = [...new Set([...(this._reoCams || []), ...(wv.cameras || [])].map(ck))];
      this._loaded = true;
      this._render(true);
      let reoNames = this._reoCams || [];
      if (this._config.reolink && this._config.recent !== false) {
        const timeout = new Promise((res) => setTimeout(() => res(null), 25000));
        const reo = await Promise.race([this._loadReolink().catch(() => null), timeout]);
        if (reo) {
          this._reoCache = reo;
          reoNames = [...new Set(reo.map((r) => r.camera))];
          this._reoCams = reoNames;
          merge(reo);
        }
      }
      if (!this._filter || !this._cams?.length) this._cams = [...new Set([...reoNames, ...(wv.cameras || [])].map(ck))];
      if (this._config.cameras) {
        const latest = {};
        await Promise.all(
          this._config.cameras.map(async (cam) => {
            const r = await this._hass.callWS({ type: "wansview_cloud/recordings", camera: cam.folder || cam.name, limit: 1 });
            latest[cam.folder || cam.name] = (r.items || [])[0];
          })
        );
        this._latest = latest;
      }
      this._error = null;
      this._loaded = true;
    } catch (e) {
      this._loaded = true;
      this._error = e.message || String(e);
    }
    this._render(true);
  }

  // merge back-to-back clips of the same camera (gap <= 2 min) into one event
  _group(items) {
    const asc = [...items].sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
    const ts = (it) => new Date(`${it.day}T${it.time}`).getTime();
    const out = [];
    for (const it of asc) {
      const last = out[out.length - 1];
      if (last && last.camera === it.camera && ts(it) - last._end <= 120000) {
        if (it.video) last.videos.push(it.video);
        last._end = ts(it) + 10000;
        last.count++;
        continue;
      }
      out.push({ ...it, videos: it.video ? [it.video] : [], count: 1, _end: ts(it) + 10000 });
    }
    return out;
  }

  async _loadReolink() {
    const b = (id) => this._hass.callWS({ type: "media_source/browse_media", media_content_id: id });
    const root = await b("media-source://reolink");
    const days = this._config.reolink_days || 2;
    const out = [];
    for (const cam of root.children || []) {
      const ident = cam.media_content_id.split("|").slice(1).join("|");
      const name = (this._config.reolink_names || {})[cam.title] || cam.title;
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const id = `media-source://reolink/DAY|${ident}|${this._config.reolink_stream || "sub"}|${d.getFullYear()}|${d.getMonth() + 1}|${d.getDate()}`;
        let res;
        try {
          res = await b(id);
        } catch (e) {
          continue;
        }
        const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        for (const f of res.children || []) {
          const m = f.title.match(/^(\d\d:\d\d:\d\d)\s+(\d+:\d\d:\d\d)\s*(.*)$/);
          if (!m) continue;
          const tags = m[3].trim();
          if (!tags || /^Timer$/i.test(tags)) continue;
          out.push({ camera: name, day, time: m[1], dur: m[2].replace(/^0:/, ""), tags, reolink: f.media_content_id, count: 1, videos: [] });
        }
      }
    }
    return out;
  }

  _tagIcons(tags) {
    const t = (tags || "").toLowerCase();
    return [t.includes("person") ? "🧍" : "", t.includes("vehicle") ? "🚗" : "", t.includes("animal") || t.includes("pet") ? "🐾" : "", !/person|vehicle|animal|pet/.test(t) ? "〰️" : ""].join("");
  }

  _kind(it) {
    const t = (it.tags || it.label || "").toLowerCase();
    if (/person|osoba/.test(t)) return "person";
    if (/vehicle|car|auto/.test(t)) return "vehicle";
    if (/animal|pet|dog|cat|bird/.test(t)) return "animal";
    return "motion";
  }

  _secs(time) {
    const [h, m, s] = String(time).split(":").map((x) => +x || 0);
    return h * 3600 + m * 60 + s;
  }

  _durSecs(it) {
    if (it.dur) {
      const p = String(it.dur).split(":").map((x) => +x || 0);
      return p.reduce((a, b) => a * 60 + b, 0);
    }
    if (it._end) return Math.max(10, (it._end - new Date(`${it.day}T${it.time}`).getTime()) / 1000);
    return 10;
  }

  _timeline(byDay) {
    const n = new Date();
    const todayKey = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
    byDay[todayKey] = byDay[todayKey] || [];
    const daysAvail = Object.keys(byDay).sort().reverse();
    if (!this._tlDay || !byDay[this._tlDay]) this._tlDay = daysAvail.find((d) => byDay[d].length) || todayKey;
    const day = this._tlDay;
    const kinds = this._kinds || (this._kinds = new Set(["person", "vehicle", "animal", "motion"]));
    // same camera from Reolink SD card and from the NVR folder ("Ulaz Vikendica" / "Ulaz") → one lane;
    // an NVR snapshot that falls inside a Reolink event gives that event its picture instead of a second pill
    const ck = (c) => String(c || "").replace(/ Vikendica$/, "");
    const all = this._dedup(byDay[day]);
    this._tlAll = all;
    const counts = { person: 0, vehicle: 0, animal: 0, motion: 0 };
    all.forEach((it) => counts[this._kind(it)]++);
    const cams = [...new Set(all.map((it) => it._ck))];
    if (!cams.length) cams.push(...new Set(this._items.map((it) => ck(it.camera))));
    const ncount = (c) => all.filter((it) => it._ck === c && kinds.has(this._kind(it))).length;
    cams.sort((a, b) => ncount(b) - ncount(a) || a.localeCompare(b));
    const disp = (c) => this._disp(c);
    const z = this._zoom;
    const pct = (sec) => (sec / 86400) * 100;
    const isToday = day === todayKey;
    const nowSec = n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds();

    // day / night from sun.sun (hour of day of next rising / setting is close enough for any day)
    const sun = this._hass?.states["sun.sun"]?.attributes || {};
    const hod = (iso, def) => {
      if (!iso) return def;
      const d = new Date(iso);
      return d.getHours() * 3600 + d.getMinutes() * 60;
    };
    const rise = hod(sun.next_rising, 7 * 3600);
    const set = hod(sun.next_setting, 16.5 * 3600);
    const night = `<div class="night" style="left:0;width:${pct(rise)}%"></div><div class="night" style="left:${pct(set)}%;right:0"></div>
      <div class="sunmark" style="left:${pct(rise)}%">☀︎</div><div class="sunmark moon" style="left:${pct(set)}%">☾</div>`;

    // activity histogram, 30-min bins
    const bins = Array.from({ length: 48 }, () => ({ n: 0, k: { person: 0, vehicle: 0, animal: 0, motion: 0 } }));
    all.forEach((it) => {
      const k = this._kind(it);
      if (!kinds.has(k)) return;
      const b = bins[Math.min(47, Math.floor(this._secs(it.time) / 1800))];
      b.n++;
      b.k[k]++;
    });
    const max = Math.max(1, ...bins.map((b) => b.n));
    const rank = ["person", "vehicle", "animal", "motion"];
    const hist = bins
      .map((b, i) => {
        if (!b.n) return "";
        const h = 18 + (b.n / max) * 82;
        let acc = 0;
        const segs = rank
          .filter((k) => b.k[k])
          .map((k) => {
            const sh = (b.k[k] / b.n) * 100;
            const el = `<i class="${k}" style="bottom:${acc}%;height:${sh}%"></i>`;
            acc += sh;
            return el;
          })
          .join("");
        return `<div class="bar" style="left:${(i / 48) * 100}%;height:${h}%" title="${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"} · ${b.n}">${segs}</div>`;
      })
      .join("");

    const ticks = [];
    const step = z >= 4 ? 1 : z >= 2 ? 2 : 3;
    for (let hr = 0; hr < 24; hr++)
      ticks.push(`<div class="tick ${hr % step ? "minor" : ""}" style="left:${pct(hr * 3600)}%">${hr % step ? "" : `<span>${String(hr).padStart(2, "0")}:00</span>`}</div>`);

    const gap = 420 / z; // events closer than this (s) become one pill
    const lanes = cams
      .map((cam) => {
        const evs = all
          .map((it, i) => ({ it, i, s: this._secs(it.time), k: this._kind(it) }))
          .filter(({ it, k }) => it._ck === cam && kinds.has(k))
          .sort((a, b) => a.s - b.s);
        const groups = [];
        for (const e of evs) {
          const g = groups[groups.length - 1];
          const end = e.s + this._durSecs(e.it);
          if (g && e.s - g.e <= gap) {
            g.e = Math.max(g.e, end);
            g.list.push(e);
          } else groups.push({ s: e.s, e: end, list: [e] });
        }
        return `<div class="lane"><div class="track"></div>${groups
          .map((g) => {
            const best = rank.map((k) => g.list.find((x) => x.k === k)).find(Boolean);
            const n = g.list.length;
            const t0 = g.list[0].it.time.slice(0, 5);
            const tip = `${t0}${n > 1 ? ` · ${n} događaja` : ""} · ${{ person: "osoba", vehicle: "vozilo", animal: "životinja", motion: "pokret" }[best.k]}`;
            return `<div class="ev ${best.k}" data-i="${best.i}" title="${tip}" style="left:${pct(g.s)}%;width:${pct(Math.max(60, g.e - g.s))}%">${n > 1 ? `<b>${n}</b>` : ""}</div>`;
          })
          .join("")}</div>`;
      })
      .join("");
    const names = cams
      .map((cam) => {
        const its = all.filter((it) => it._ck === cam && kinds.has(this._kind(it)));
        const img = ([...its].reverse().find((it) => it.image) || {}).image;
        return `<div class="nm">${img ? `<img src="${img}">` : `<span class="ava">${this._esc(disp(cam)[0] || "?")}</span>`}
          <div class="nx"><span class="nt">${this._esc(disp(cam))}</span><span class="bd">${its.length} ${its.length === 1 ? "događaj" : "događaja"}</span></div></div>`;
      })
      .join("");
    const dayChips = daysAvail
      .map((d) => `<button class="dchip ${d === day ? "on" : ""}" data-day="${d}">${this._dayLabel(d, true)}<small>${d === day ? all.length : this._dedup(byDay[d]).length}</small></button>`)
      .join("");
    const label = { person: "Osoba", vehicle: "Vozilo", animal: "Životinja", motion: "Pokret" };
    const icon = { person: "🧍", vehicle: "🚗", animal: "🐾", motion: "〰️" };
    const legend = rank
      .map((k) => `<button class="lg ${k} ${kinds.has(k) ? "on" : ""}" data-k="${k}"><i></i>${label[k]}<b>${counts[k]}</b></button>`)
      .join("");
    const list = all
      .map((it, i) => ({ it, i }))
      .filter(({ it }) => kinds.has(this._kind(it)))
      .map(
        ({ it, i }) => `<div class="row" data-i="${i}">
          <div class="rthumb ${this._kind(it)}">${it.image ? `<img loading="lazy" src="${it.image}">` : `<span>${icon[this._kind(it)]}</span>`}</div>
          <div class="rtx"><b>${this._esc(it.time.slice(0, 5))}</b><span>${this._esc(disp(it._ck))}${it.count > 1 ? ` · ${it.count} klipa` : ""}${it.dur ? ` · ${this._esc(it.dur)}` : ""}</span></div>
          <span class="rk ${this._kind(it)}">${label[this._kind(it)]}</span></div>`
      )
      .join("");
    return `
      <div class="dchips">${dayChips}</div>
      <div class="legend">${legend}</div>
      <div class="tl">
        <div class="tlnames"><div class="sp"></div>${names}</div>
        <div class="tlscroll"><div class="tlinner" style="width:${z * 100}%">
          ${night}
          <div class="hist">${hist}</div>
          <div class="axis">${ticks.join("")}</div>
          ${lanes}
          ${isToday ? `<div class="now" style="left:${pct(nowSec)}%"><span>${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}</span></div>` : ""}
        </div></div>
      </div>
      <div class="zoom">${[1, 2, 4, 8].map((x) => `<button data-z="${x}" class="${x === z ? "on" : ""}">${x}×</button>`).join("")}</div>
      <div class="tlist">${list || `<div class="empty">Nema događaja za ovaj dan.</div>`}</div>`;
  }

  // same camera from Reolink SD card and from the NVR folder ("Ulaz Vikendica" / "Ulaz") → one lane;
  // an NVR snapshot that falls inside a Reolink event gives that event its picture instead of a second pill
  _disp(c) {
    return ({ Sadrvan: "Šadrvan", "Kuća Parking": "Parking", Iza: "Iza kuće", ...((this._config || {}).names || {}) })[c] || c;
  }

  _dedup(items) {
    const ck = (c) => String(c || "").replace(/ Vikendica$/, "");
    const raw = (items || []).map((it) => ({ ...it, _ck: ck(it.camera) }));
    const reo = raw.filter((it) => it.reolink);
    return raw.filter((it) => {
      if (it.reolink) return true;
      const s = this._secs(it.time);
      const hit = reo.find((r) => r._ck === it._ck && s >= this._secs(r.time) - 20 && s <= this._secs(r.time) + this._durSecs(r) + 20);
      if (!hit) return true;
      if (!hit.image && it.image) hit.image = it.image;
      if (!hit.videos.length && it.videos?.length) hit.videos = it.videos;
      return false;
    });
  }

  _dayLabel(day, short) {
    const d = new Date(day + "T12:00:00");
    const today = new Date();
    const y = new Date();
    y.setDate(today.getDate() - 1);
    const same = (a, b) => a.toDateString() === b.toDateString();
    if (same(d, today)) return "Danas";
    if (same(d, y)) return "Jučer";
    const wd = short ? ["Ned", "Pon", "Uto", "Sri", "Čet", "Pet", "Sub"] : ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];
    return `${wd[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}.`;
  }

  _esc(s) {
    return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  }

  _render(dataOnly) {
    if (!this.shadowRoot) return;
    if (dataOnly && this._view === "timeline" && this._nvrEl && this._nvrEl.isConnected && this._items.length) {
      const bd = {};
      for (const it of this._items) (bd[it.day] = bd[it.day] || []).push(it);
      this._nvrUpdate(bd);
      return;
    }
    const prevSc = this.shadowRoot.querySelector(".tlscroll");
    const prevLeft = prevSc ? prevSc.scrollLeft : null;
    const prevList = this.shadowRoot.querySelector(".tlist")?.scrollTop;
    const c = this._config || {};
    const byDay = {};
    for (const it of this._items) (byDay[it.day] = byDay[it.day] || []).push(it);
    const chips = ["", ...this._cams]
      .map((cam) => `<button class="chip ${cam === this._filter ? "on" : ""}" data-cam="${this._esc(cam)}">${cam ? this._esc(this._disp(cam)) : "Sve kamere"}</button>`)
      .join("");
    const days = Object.keys(byDay)
      .sort()
      .reverse()
      .map(
        (day) => `
        <div class="day">${this._dayLabel(day)} <span>${byDay[day].length}</span></div>
        <div class="grid" style="grid-template-columns:repeat(${c.columns},1fr)">
          ${byDay[day]
            .map(
              (it, i) => `
            <div class="tile" data-day="${day}" data-i="${i}">
              ${it.image ? `<img loading="lazy" src="${it.image}">` : it.reolink ? `<div class="reo"><div class="ri">${this._tagIcons(it.tags)}</div><div class="rd">${this._esc(it.dur)}</div></div>` : `<div class="noimg">🎞️</div>`}
              ${it.count > 1 ? `<div class="multi">×${it.count}</div>` : ""}
              <div class="shade"></div>
              <div class="cam">${this._esc(it.camera)}</div>
              <div class="time">${this._esc(it.time.slice(0, 5))}</div>
              ${it.video || it.reolink ? `<div class="play">▶</div>` : ""}
            </div>`
            )
            .join("")}
        </div>`
      )
      .join("");
    const st = (id) => (id && this._hass && this._hass.states[id] ? this._hass.states[id].state : null);
    const camsCfg = c.cameras || [];
    const camTiles = camsCfg
      .map((cam, idx) => {
        const it = (this._latest || {})[cam.folder || cam.name];
        const img = it && it.image ? it.image : cam.fallback && this._hass?.states[cam.fallback]?.attributes.entity_picture;
        const bat = st(cam.battery);
        const moving = st(cam.motion) === "on";
        const ago = st(cam.ago);
        const wide = !c.row && camsCfg.length % 2 === 1 && idx === camsCfg.length - 1;
        return `<div class="ctile ${wide ? "wide" : ""} ${moving ? "moving" : ""}" data-cam="${idx}">
            ${img ? `<img src="${img}">` : `<div class="noimg">📷</div>`}
            <div class="shade"></div>
            ${bat !== null && bat !== "unavailable" ? `<div class="pill bat ${+bat < 20 ? "low" : ""}">🔋 ${Math.round(+bat)}%</div>` : ""}
            ${moving ? `<div class="pill live">● Pokret</div>` : ""}
            <div class="pill name">${c.row ? `${this._esc(cam.name)}${ago ? `<br><span style="font-weight:500;opacity:.85">${this._esc(ago)}</span>` : ""}` : `${this._esc(cam.name)}${ago ? ` · ${this._esc(ago)}` : ""}`}</div>
            ${it && it.video ? `<div class="play">▶</div>` : ""}
          </div>`;
      })
      .join("");
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        ha-card { padding:12px; background:var(--ha-card-background, var(--card-background-color)); border-radius:var(--ha-card-border-radius,12px); }
        .head { display:flex; align-items:center; justify-content:space-between; margin:2px 2px 10px; }
        .title { font-size:18px; font-weight:600; color:var(--primary-text-color); }
        .count { font-size:12px; color:var(--secondary-text-color); }
        .chips { display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; scrollbar-width:none; }
        .chip { flex:none; border:1px solid var(--divider-color); background:transparent; color:var(--primary-text-color);
                border-radius:16px; padding:5px 12px; font-size:12px; font-weight:600; cursor:pointer; }
        .chip.on { background:var(--primary-color); border-color:var(--primary-color); color:#fff; }
        .day { margin:12px 2px 6px; font-size:13px; font-weight:700; color:var(--primary-text-color); text-transform:capitalize; }
        .day span { color:var(--secondary-text-color); font-weight:500; margin-left:4px; }
        .grid { display:grid; gap:8px; }
        .tile { position:relative; aspect-ratio:16/9; border-radius:10px; overflow:hidden; background:#111; cursor:pointer; }
        .tile img { width:100%; height:100%; object-fit:cover; display:block; }
        .noimg { display:flex; align-items:center; justify-content:center; height:100%; font-size:28px; }
        .shade { position:absolute; inset:0; background:linear-gradient(180deg,rgba(0,0,0,.35),transparent 35%,transparent 60%,rgba(0,0,0,.65)); }
        .cam { position:absolute; left:8px; top:6px; color:#fff; font-size:11px; font-weight:700; text-shadow:0 1px 2px #000; }
        .time { position:absolute; left:8px; bottom:6px; color:#fff; font-size:14px; font-weight:700; text-shadow:0 1px 2px #000; }
        .play { position:absolute; right:8px; bottom:6px; width:24px; height:24px; border-radius:50%; background:rgba(0,0,0,.55);
                color:#fff; font-size:11px; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(6px); }
        .more { font-size:13px; font-weight:600; color:var(--primary-color); text-decoration:none; }
        .cgrid.row { margin-bottom:0; }
        .cgrid.row .ctile { aspect-ratio:3/4; }
        .cgrid.row .pill { font-size:11px; padding:3px 7px; }
        .cgrid.row .pill.name { left:6px; right:6px; bottom:6px; text-align:center; white-space:normal; line-height:1.25; }
        .cgrid.row .pill.bat { right:6px; top:6px; font-size:10px; }
        .cgrid.row .pill.live { left:6px; top:6px; font-size:10px; }
        .cgrid.row .play { display:none; }
        .cgrid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:6px; }
        .ctile { position:relative; aspect-ratio:4/3; border-radius:12px; overflow:hidden; background:#111; cursor:pointer;
                 outline:2px solid transparent; transition:outline-color .3s; }
        .ctile.wide { grid-column:1 / -1; aspect-ratio:21/9; }
        .ctile.moving { outline-color:#e53935; }
        .ctile img { width:100%; height:100%; object-fit:cover; display:block; }
        .pill { position:absolute; color:#fff; font-size:12px; font-weight:700; padding:4px 10px; border-radius:14px;
                background:rgba(0,0,0,.55); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); white-space:nowrap; }
        .pill.name { left:8px; bottom:8px; }
        .pill.bat { right:8px; top:8px; font-size:11px; padding:3px 8px; }
        .pill.bat.low { background:rgba(229,57,53,.9); }
        .pill.live { left:8px; top:8px; background:rgba(229,57,53,.92); }
        .ctile .play { bottom:8px; right:8px; }
        .sub { margin:14px 2px 0; font-size:15px; font-weight:700; color:var(--primary-text-color); }
        .reo { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
               background:radial-gradient(circle at 30% 20%,#2b3a55,#141a26); }
        .reo .ri { font-size:26px; letter-spacing:2px; }
        .reo .rd { font-size:12px; font-weight:700; color:#cfe3ff; opacity:.85; }
        .multi { position:absolute; right:8px; top:6px; background:rgba(0,0,0,.55); color:#fff; font-size:11px; font-weight:700;
                 padding:2px 7px; border-radius:10px; }
        .empty { padding:24px; text-align:center; color:var(--secondary-text-color); }
        .modal { position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.92); display:flex; flex-direction:column;
                 align-items:center; justify-content:center; padding:16px; }
        .modal video, .modal img { max-width:100%; max-height:78vh; border-radius:10px; background:#000; }
        .mhead { color:#fff; font-weight:600; margin-bottom:10px; font-size:15px; }
        .mbar { display:flex; gap:10px; margin-top:12px; }
        .mbar button, .mbar a { background:rgba(255,255,255,.12); color:#fff; border:0; border-radius:18px; padding:8px 16px;
                 font-size:14px; text-decoration:none; cursor:pointer; }
        .seg { display:flex; background:rgba(127,127,127,.14); border-radius:12px; padding:3px; margin:6px 0 10px; }
        .seg button { flex:1; border:0; background:transparent; color:var(--secondary-text-color); padding:7px; border-radius:9px; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; }
        .seg button.on { background:var(--card-background-color,#262626); color:var(--primary-text-color); box-shadow:0 1px 4px rgba(0,0,0,.35); }
        .dchips { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; margin-bottom:10px; }
        .dchip { flex:none; display:flex; align-items:center; gap:6px; border:0; background:rgba(127,127,127,.14); color:var(--primary-text-color);
                 border-radius:16px; padding:6px 12px; font-size:13px; font-weight:600; text-transform:capitalize; cursor:pointer; }
        .dchip small { font-size:11px; opacity:.6; font-weight:700; }
        .dchip.on { background:var(--primary-color); color:#fff; }
        .dchip.on small { opacity:.85; }
        .legend { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; margin-bottom:10px; }
        .lg { flex:none; display:flex; align-items:center; gap:6px; border:1px solid rgba(127,127,127,.25); background:transparent; color:var(--secondary-text-color);
              border-radius:14px; padding:4px 10px; font-size:12px; font-weight:600; cursor:pointer; opacity:.45; transition:all .2s; }
        .lg.on { opacity:1; color:var(--primary-text-color); border-color:transparent; background:rgba(127,127,127,.14); }
        .lg i { width:8px; height:8px; border-radius:50%; background:var(--c); box-shadow:0 0 6px var(--c); }
        .lg b { font-weight:800; }
        .person { --c:#ff5252; } .vehicle { --c:#ffa726; } .animal { --c:#66bb6a; } .motion { --c:#42a5f5; }
        .tl { display:flex; border-radius:14px; overflow:hidden; background:rgba(0,0,0,.22); border:1px solid rgba(127,127,127,.16); }
        .tlnames { flex:none; width:112px; background:rgba(127,127,127,.06); border-right:1px solid rgba(127,127,127,.16); z-index:2; }
        .tlnames .sp { height:58px; }
        .nm { height:42px; display:flex; align-items:center; gap:7px; padding:0 8px; }
        .nm img, .nm .ava { width:26px; height:26px; border-radius:8px; object-fit:cover; flex:none; }
        .nm .ava { display:flex; align-items:center; justify-content:center; background:rgba(127,127,127,.25); font-size:12px; font-weight:700; color:var(--primary-text-color); }
        .nx { flex:1; min-width:0; display:flex; flex-direction:column; line-height:1.2; }
        .nt { font-size:12px; font-weight:700; color:var(--primary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .bd { font-size:10px; font-weight:600; color:var(--secondary-text-color); white-space:nowrap; }
        .tlscroll { flex:1; overflow-x:auto; scrollbar-width:thin; }
        .tlinner { position:relative; min-width:100%; overflow:hidden; padding-bottom:4px; }
        .night { position:absolute; top:0; bottom:0; background:linear-gradient(180deg,rgba(60,80,170,.22),rgba(30,40,110,.14)); pointer-events:none; }
        .sunmark { position:absolute; top:1px; transform:translateX(-50%); font-size:13px; color:#ffca28; pointer-events:none; }
        .sunmark.moon { color:#9fa8da; }
        .hist { position:relative; height:34px; margin-top:2px; }
        .bar { position:absolute; bottom:0; width:calc(100% / 48 - 2px); margin-left:1px; border-radius:3px 3px 1px 1px; overflow:hidden; opacity:.85; }
        .bar i { position:absolute; left:0; right:0; background:var(--c); }
        .axis { position:relative; height:22px; border-bottom:1px solid rgba(127,127,127,.16); }
        .tick { position:absolute; top:0; bottom:-1000px; border-left:1px solid rgba(127,127,127,.13); pointer-events:none; }
        .tick.minor { border-left:1px dotted rgba(127,127,127,.08); }
        .tick span { position:absolute; top:5px; left:4px; font-size:10px; font-weight:600; color:var(--secondary-text-color); letter-spacing:.2px; }
        .lane { position:relative; height:42px; }
        .track { position:absolute; left:4px; right:4px; top:17px; height:8px; border-radius:4px; background:rgba(127,127,127,.09); }
        .ev { position:absolute; top:11px; height:20px; min-width:10px; border-radius:10px; cursor:pointer; transform:translateX(-3px);
              background:var(--c); box-shadow:0 0 0 2px rgba(0,0,0,.35); transition:transform .15s;
              display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .ev b { font-size:10px; font-weight:800; color:rgba(0,0,0,.72); padding:0 4px; }
        .ev:hover { transform:translateX(-3px) scaleY(1.25); z-index:3; }
        .now { position:absolute; top:0; bottom:0; width:2px; background:#ffeb3b; box-shadow:0 0 8px #ffeb3b; pointer-events:none; z-index:4; }
        .now span { position:absolute; top:2px; left:4px; font-size:10px; font-weight:800; color:#111; background:#ffeb3b; border-radius:6px; padding:0 5px; }
        .zoom { display:flex; justify-content:flex-end; gap:4px; margin:8px 0 4px; }
        .zoom button { border:0; background:rgba(127,127,127,.14); color:var(--secondary-text-color); border-radius:8px; padding:4px 10px; font-size:12px; font-weight:700; cursor:pointer; }
        .zoom button.on { background:var(--primary-color); color:#fff; }

        .nv .pv { position:relative; aspect-ratio:16/9; background:#000; border-radius:14px; overflow:hidden; margin-bottom:6px; }
        .nv .pv img, .nv .pv video { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; background:#000; }
        .nv .pv img.dim { opacity:.25; filter:grayscale(1); }
        .nv .pempty { position:absolute; inset:0; display:none; flex-direction:column; align-items:center; justify-content:center; gap:10px; color:#ddd; font-size:13px; font-weight:600; text-align:center; }
        .nv .pempty button { border:0; border-radius:10px; padding:7px 12px; font:inherit; font-size:12.5px; background:rgba(255,255,255,.16); color:#fff; cursor:pointer; }
        .nv .pinfo { position:absolute; left:8px; top:8px; right:80px; font-size:12px; color:#fff; text-shadow:0 1px 3px #000; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none; }
        .nv .pkind { position:absolute; right:8px; top:8px; display:none; font-size:11px; font-weight:800; color:#111; background:var(--c); border-radius:9px; padding:2px 8px; pointer-events:none; }
        .nv .pload { position:absolute; left:50%; top:50%; width:28px; height:28px; margin:-14px; border-radius:50%; border:3px solid rgba(255,255,255,.25); border-top-color:#fff; animation:nvspin .8s linear infinite; display:none; }
        @keyframes nvspin { to { transform:rotate(360deg); } }
        .nv .pctl { display:flex; align-items:center; gap:6px; margin-bottom:8px; }
        .nv .pctl button { border:0; background:rgba(127,127,127,.15); color:var(--primary-text-color); border-radius:10px; min-width:40px; height:36px; font-size:16px; cursor:pointer; }
        .nv .pctl button.big { background:var(--primary-color); color:#fff; min-width:52px; }
        .nv .pctl button.txt { font-size:13px; font-weight:700; padding:0 12px; }
        .nv .pctl .sp { flex:1; }
        .nv .tlx { display:flex; border-radius:14px; overflow:hidden; background:rgba(0,0,0,.25); border:1px solid rgba(127,127,127,.16); }
        .nv .tlnames { flex:none; width:96px; background:rgba(127,127,127,.06); border-right:1px solid rgba(127,127,127,.16); z-index:2; }
        .nv .tlnames .sp { height:62px; }
        .nv .nm { height:40px; display:flex; align-items:center; gap:7px; padding:0 8px; }
        .nv .nm img, .nv .nm .ava { width:24px; height:24px; border-radius:7px; object-fit:cover; flex:none; }
        .nv .tlwrap { position:relative; flex:1; min-width:0; }
        .nv .tlscroll { overflow-x:auto; overflow-y:hidden; scrollbar-width:none; touch-action:pan-x pan-y; cursor:grab; }
        .nv .tlscroll::-webkit-scrollbar { display:none; }
        .nv .tlinner { position:relative; height:calc(62px + var(--lh, 0px)); min-height:120px; }
        .nv .bg { position:absolute; inset:0; pointer-events:none; }
        .nv .night { position:absolute; top:0; bottom:0; background:rgba(40,55,140,.2); }
        .nv .dsep { position:absolute; top:0; bottom:0; border-left:2px solid rgba(255,255,255,.28); }
        .nv .dsep span { position:absolute; top:3px; left:5px; font-size:10.5px; font-weight:800; color:var(--primary-text-color); white-space:nowrap; text-transform:capitalize; }
        .nv .tk { position:absolute; top:40px; bottom:0; border-left:1px solid rgba(127,127,127,.18); }
        .nv .tk.mi { top:54px; border-left-color:rgba(127,127,127,.08); }
        .nv .tk span { position:absolute; top:2px; left:4px; font-size:10px; font-weight:600; color:var(--secondary-text-color); }
        .nv .hs { position:absolute; left:0; right:0; top:18px; height:20px; pointer-events:none; }
        .nv .hb { position:absolute; bottom:0; border-radius:2px 2px 0 0; background:var(--c); opacity:.75; }
        .nv .lns { position:absolute; left:0; right:0; top:62px; }
        .nv .ln { position:absolute; left:0; right:0; height:40px; }
        .nv .tr { position:absolute; left:0; right:0; top:16px; height:8px; background:rgba(127,127,127,.07); }
        .nv .ev { position:absolute; top:10px; height:20px; border-radius:6px; background:var(--c); cursor:pointer; display:flex; align-items:center; justify-content:center; overflow:hidden; box-shadow:0 0 0 1px rgba(0,0,0,.4); }
        .nv .ev b { font-size:10px; font-weight:800; color:rgba(0,0,0,.72); }
        .nv .ev.cur { box-shadow:0 0 0 2px #fff; z-index:2; }
        .nv .nowl { position:absolute; top:0; bottom:0; width:0; border-left:2px dashed rgba(255,235,59,.55); pointer-events:none; }
        .nv .ph { position:absolute; left:50%; top:0; bottom:0; width:2px; margin-left:-1px; background:#ffeb3b; box-shadow:0 0 6px rgba(255,235,59,.7); pointer-events:none; z-index:5; }
        .nv .ph span { position:absolute; top:2px; left:50%; transform:translateX(-50%); font-size:11px; font-weight:800; color:#111; background:#ffeb3b; border-radius:7px; padding:1px 7px; white-space:nowrap; }
        .nv .zoom { display:flex; justify-content:flex-end; align-items:center; gap:4px; margin:8px 0 4px; }
        .nv .zoom .zh { flex:1; font-size:11px; color:var(--secondary-text-color); }
        .nv .row.cur { background:rgba(127,127,127,.22); }
        .tlist { margin-top:6px; display:flex; flex-direction:column; gap:4px; max-height:55vh; overflow-y:auto; }
        .row { display:flex; align-items:center; gap:10px; padding:6px; border-radius:12px; cursor:pointer; background:rgba(127,127,127,.06); transition:background .15s; }
        .row:hover { background:rgba(127,127,127,.14); }
        .rthumb { width:64px; height:40px; border-radius:8px; overflow:hidden; flex:none; display:flex; align-items:center; justify-content:center;
                  background:color-mix(in srgb,var(--c) 22%,#151515); font-size:18px; }
        .rthumb img { width:100%; height:100%; object-fit:cover; }
        .rtx { flex:1; display:flex; flex-direction:column; min-width:0; }
        .rtx b { font-size:15px; color:var(--primary-text-color); }
        .rtx span { font-size:12px; color:var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .rk { font-size:11px; font-weight:700; color:var(--c); background:color-mix(in srgb,var(--c) 16%,transparent); border-radius:10px; padding:3px 9px; }
      </style>
      <ha-card>
        ${camsCfg.length && c.recent === false ? `<div class="head"><div class="title">${this._esc(c.title)}</div>${c.link ? `<a class="more" href="${c.link}">Svi snimci ›</a>` : ""}</div>
            <div class="cgrid ${c.row ? "row" : ""}" style="${c.row ? `grid-template-columns:repeat(${camsCfg.length},1fr)` : ""}">${camTiles}</div>`
          : camsCfg.length ? `<div class="cgrid">${camTiles}</div><div class="head sub"><div>📼 Zadnji snimci</div><div class="count">${this._items.length} snimaka</div></div>`
          : `<div class="head"><div class="title">${this._esc(c.title)}</div><div class="count">${this._items.length} snimaka</div></div>`}
        ${c.recent !== false && this._cams.length > 1 ? `<div class="chips">${chips}</div>` : ""}
        ${this._error ? `<div class="empty">Greška: ${this._esc(this._error)}</div>` : ""}
        ${c.recent !== false ? `<div class="seg"><button data-v="grid" class="${this._view !== "timeline" ? "on" : ""}">▦ Mreža</button><button data-v="timeline" class="${this._view === "timeline" ? "on" : ""}">▬ Timeline</button></div>` : ""}
        ${c.recent === false ? "" : !this._error && !this._items.length ? `<div class="empty">${this._loaded ? "Još nema snimaka." : "Učitavam snimke…"}</div>` : this._view === "timeline" ? `<div class="nvrslot"></div>` : days}
      </ha-card>`;
    this.shadowRoot.querySelectorAll(".chip").forEach((b) =>
      b.addEventListener("click", () => {
        this._filter = b.dataset.cam;
        this._load();
      })
    );
    const more = this.shadowRoot.querySelector(".more");
    if (more)
      more.addEventListener("click", (e) => {
        e.preventDefault();
        history.pushState(null, "", c.link);
        window.dispatchEvent(new CustomEvent("location-changed"));
      });
    this.shadowRoot.querySelectorAll(".ctile").forEach((t) =>
      t.addEventListener("click", () => {
        const cam = camsCfg[+t.dataset.cam];
        const it = (this._latest || {})[cam.folder || cam.name];
        if (it) this._open(it);
      })
    );
    this.shadowRoot.querySelectorAll(".seg button").forEach((b) =>
      b.addEventListener("click", () => {
        this._view = b.dataset.v;
        try { localStorage.setItem("wvnvr-view", this._view); } catch (e) {}
        this._render();
      })
    );
    this.shadowRoot.querySelectorAll(".lg").forEach((b) =>
      b.addEventListener("click", () => {
        const k = b.dataset.k;
        if (this._kinds.has(k) && this._kinds.size > 1) this._kinds.delete(k);
        else this._kinds.add(k);
        this._render();
      })
    );
    this.shadowRoot.querySelectorAll(".dchip").forEach((b) =>
      b.addEventListener("click", () => {
        this._tlDay = b.dataset.day;
        this._render();
      })
    );
    this.shadowRoot.querySelectorAll(".zoom button").forEach((b) =>
      b.addEventListener("click", () => {
        this._zoom = +b.dataset.z;
        try { localStorage.setItem("wvnvr-zoom", this._zoom); } catch (e) {}
        this._render();
        this._scrollToLatest();
      })
    );
    this.shadowRoot.querySelectorAll(".ev, .row").forEach((t) =>
      t.addEventListener("click", () => this._open((this._tlAll || byDay[this._tlDay])[+t.dataset.i]))
    );
    const slot = this.shadowRoot.querySelector(".nvrslot");
    if (slot) {
      if (!this._nvrEl) this._nvrBuild();
      slot.appendChild(this._nvrEl);
      this._nvrUpdate(byDay);
    }
    if (false && prevLeft !== null) {
      const sc = this.shadowRoot.querySelector(".tlscroll");
      if (sc) sc.scrollLeft = prevLeft;
      const tl = this.shadowRoot.querySelector(".tlist");
      if (tl && prevList) tl.scrollTop = prevList;
    } else if (false) {
      this._tlScrolled = true;
      this._scrollToLatest();
    }
    this.shadowRoot.querySelectorAll(".tile").forEach((t) =>
      t.addEventListener("click", () => this._open(byDay[t.dataset.day][+t.dataset.i]))
    );
  }


  // ================= NVR timeline (scrub, pinch-zoom, player) =================
  _nvrBuild() {
    const el = document.createElement("div");
    el.className = "nv";
    el.innerHTML = `
      <div class="dchips"></div>
      <div class="legend"></div>
      <div class="pv"><img class="pimg" alt=""><video class="pvid" playsinline muted preload="auto"></video>
        <div class="pempty"></div><div class="pinfo"><b class="pcam"></b><span class="pt"></span></div><div class="pkind"></div><div class="pload"></div></div>
      <div class="pctl"><button data-a="prev" title="Prethodni događaj">⏮</button><button data-a="play" class="big" title="Pusti / pauza">▶</button><button data-a="next" title="Sljedeći događaj">⏭</button>
        <button data-a="sound" title="Zvuk">🔇</button><span class="sp"></span><button data-a="full" title="Puni ekran">⛶</button><button data-a="now" class="txt">Sada</button></div>
      <div class="tlx"><div class="tlnames"></div><div class="tlwrap"><div class="tlscroll"><div class="tlinner"></div></div><div class="ph"><span></span></div></div></div>
      <div class="zoom"><span class="zh">Prstima ili Ctrl+točkić za zoom</span>${[[24, "24 h"], [6, "6 h"], [1, "1 h"], [1 / 6, "10 min"]].map(([h, l]) => `<button data-h="${h}">${l}</button>`).join("")}</div>
      <div class="tlist"></div>`;
    this._nvrEl = el;
    const $ = (q) => el.querySelector(q);
    const sc = $(".tlscroll"), vid = $(".pvid");
    this._nvrUi = { sc, inner: $(".tlinner"), ph: $(".ph span"), vid, img: $(".pimg"), empty: $(".pempty"), cam: $(".pcam"), pt: $(".pt"), kind: $(".pkind"), load: $(".pload"),
      names: $(".tlnames"), chips: $(".dchips"), legend: $(".legend"), list: $(".tlist"), play: $('[data-a="play"]'), sound: $('[data-a="sound"]') };
    // scrubbing
    sc.addEventListener("scroll", () => {
      if (!this._nv) return;
      this._tc = this._nv.start + (sc.scrollLeft / this._pph) * 3600000;
      this._nvrLabel();
      if (this._prog) return;
      this._userAt = Date.now();
      if (!vid.paused) vid.pause();
      clearTimeout(this._seekT);
      this._seekT = setTimeout(() => this._nvrSeek(true), 260);
    }, { passive: true });
    // pinch zoom (touch) + ctrl/trackpad zoom
    let p0 = null;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    sc.addEventListener("touchstart", (e) => { if (e.touches.length === 2) p0 = { d: dist(e.touches), s: this._pph }; }, { passive: true });
    sc.addEventListener("touchmove", (e) => {
      if (e.touches.length !== 2 || !p0) return;
      e.preventDefault();
      this._nvrZoomTo(p0.s * (dist(e.touches) / p0.d));
    }, { passive: false });
    sc.addEventListener("touchend", () => { p0 = null; });
    sc.addEventListener("wheel", (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      this._nvrZoomTo(this._pph * Math.exp(-e.deltaY / 200));
    }, { passive: false });
    // clicks on pills / list / chips / legend / zoom / controls
    el.addEventListener("click", (e) => {
      const t = e.target.closest("[data-ev],[data-day],[data-k],[data-h],[data-a],.row");
      if (!t || !this._nv) return;
      if (t.dataset.ev != null || t.classList.contains("row")) return this._nvrGo(this._nv.ev[+(t.dataset.ev ?? t.dataset.i)], true);
      if (t.dataset.day) {
        const evs = this._nv.ev.filter((x) => x.day === t.dataset.day);
        return evs.length ? this._nvrGo(evs[evs.length - 1], true) : this._nvrJump(new Date(t.dataset.day + "T12:00:00").getTime());
      }
      if (t.dataset.k) {
        const k = t.dataset.k;
        if (this._kinds.has(k) && this._kinds.size > 1) this._kinds.delete(k); else this._kinds.add(k);
        return this._nvrDraw();
      }
      if (t.dataset.h) { this._nvrZoomTo(this._nvrUi.sc.clientWidth / +t.dataset.h); try { localStorage.setItem("wvnvr-pph-h", t.dataset.h); } catch (x) {} return; }
      const a = t.dataset.a;
      if (a === "play") { if (vid.getAttribute("src")) { vid.paused ? vid.play().catch(() => {}) : vid.pause(); } else this._nvrSeek(true); }
      if (a === "sound") { vid.muted = !vid.muted; this._nvrUi.sound.textContent = vid.muted ? "🔇" : "🔊"; }
      if (a === "full") { const pv = el.querySelector(".pv"); (vid.getAttribute("src") && vid.webkitEnterFullscreen && !pv.requestFullscreen) ? vid.webkitEnterFullscreen() : (pv.requestFullscreen ? pv.requestFullscreen() : vid.webkitEnterFullscreen && vid.webkitEnterFullscreen()); }
      if (a === "now") this._nvrJump(Date.now());
      if (a === "prev" || a === "next") {
        const act = this._nvrActive(), tc = this._tc;
        const e2 = a === "prev" ? [...act].reverse().find((x) => x.ts < tc - 1500) : act.find((x) => x.ts > tc + 1500);
        if (e2) this._nvrGo(e2, true);
      }
    });
    // follow playback on the timeline
    vid.addEventListener("timeupdate", () => {
      const e = this._cur;
      if (!e || vid.paused || Date.now() - (this._userAt || 0) < 800) return;
      this._nvrSetCenter(e.ts + vid.currentTime * 1000);
    });
    vid.addEventListener("play", () => { this._nvrUi.play.textContent = "⏸"; });
    vid.addEventListener("pause", () => { this._nvrUi.play.textContent = "▶"; });
    vid.addEventListener("waiting", () => { this._nvrUi.load.style.display = "block"; });
    vid.addEventListener("playing", () => { this._nvrUi.load.style.display = "none"; });
    vid.addEventListener("ended", () => {
      // like an NVR: continue with the next event on the same camera after a short pause
      const e = this._cur; if (!e) return;
      const nx = this._nvrActive().find((x) => x.ts > e.ts + 1000 && x.ts - e.end < 120000);
      if (nx) this._nvrGo(nx, false);
    });
    new ResizeObserver(() => { if (this._nv && Math.abs((this._lastVw || 0) - sc.clientWidth) > 4) this._nvrDraw(); }).observe(sc);
  }

  _nvrActive() { return this._nv.ev.filter((e) => this._kinds.has(e.kind)); }

  _nvrUpdate(byDay) {
    if (!this._nvrEl) return;
    this._kinds = this._kinds || new Set(["person", "vehicle", "animal", "motion"]);
    const ev = [];
    const days = Object.keys(byDay).sort().slice(-7);
    for (const d of days)
      for (const it of this._dedup(byDay[d])) {
        const ts = new Date(`${it.day}T${it.time}`).getTime();
        if (isNaN(ts)) continue;
        ev.push({ ...it, ts, end: ts + Math.max(8, this._durSecs(it)) * 1000, kind: this._kind(it) });
      }
    ev.sort((a, b) => a.ts - b.ts);
    ev.forEach((e, i) => (e.i = i));
    const now = Date.now();
    const first = days.length ? new Date(days[0] + "T00:00:00").getTime() : now - 86400000;
    const tEnd = new Date(); tEnd.setHours(23, 59, 59, 999);
    const cams = [...new Set(ev.map((e) => e._ck))];
    const cnt = (c) => ev.filter((e) => e._ck === c).length;
    cams.sort((a, b) => cnt(b) - cnt(a) || a.localeCompare(b));
    const firstLoad = !this._nv;
    this._nv = { ev, cams, start: first, end: Math.max(tEnd.getTime(), ev.length ? ev[ev.length - 1].end : 0) };
    if (this._tc == null) this._tc = ev.length ? ev[ev.length - 1].ts : now;
    this._nvrDraw();
    if (firstLoad) this._nvrSeek(false);
  }

  _nvrZoomTo(pph) {
    const vw = this._nvrUi.sc.clientWidth || 320;
    this._pph = Math.min(vw / (1 / 12), Math.max(vw / 48, pph));
    cancelAnimationFrame(this._zr);
    this._zr = requestAnimationFrame(() => this._nvrDraw());
  }

  _nvrSetCenter(t) {
    const U = this._nvrUi, N = this._nv;
    this._tc = t;
    this._prog = true;
    U.sc.scrollLeft = ((t - N.start) / 3600000) * this._pph;
    this._nvrLabel();
    clearTimeout(this._progT);
    this._progT = setTimeout(() => (this._prog = false), 80);
  }

  _nvrJump(t) {
    this._userAt = 0;
    this._nvrSetCenter(t);
    this._nvrSeek(true);
  }

  _nvrGo(e, play) {
    if (!e) return;
    this._userAt = 0;
    this._nvrSetCenter(e.ts + 500);
    this._nvrSeek(play !== false, e);
  }

  _nvrLabel() {
    const d = new Date(this._tc), p2 = (n) => String(n).padStart(2, "0");
    const today = new Date().toDateString() === d.toDateString();
    const WD = ["ned", "pon", "uto", "sri", "čet", "pet", "sub"];
    const dk = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
    if (dk !== this._phDay && this._nv) { this._phDay = dk; this._nvrSide(); this._nvrMark(this._cur); }
    this._nvrUi.ph.textContent = `${today ? "" : `${WD[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}. `}${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  }

  async _nvrSeek(play, force) {
    const U = this._nvrUi, tc = this._tc, act = this._nvrActive();
    const tol = Math.min(300000, Math.max(3000, (14 / this._pph) * 3600000)); // 14 px, max 5 min
    const rk = { person: 0, vehicle: 1, animal: 2, motion: 3 };
    const dist = (x) => (tc < x.ts ? x.ts - tc : tc > x.end ? tc - x.end : 0);
    let e = force || act.filter((x) => dist(x) <= tol).sort((a, b) => dist(a) - dist(b) || rk[a.kind] - rk[b.kind])[0];
    const label = { person: "Osoba", vehicle: "Vozilo", animal: "Životinja", motion: "Pokret" };
    const p2 = (n) => String(n).padStart(2, "0");
    if (!e) {
      this._cur = null;
      U.vid.pause(); U.vid.removeAttribute("src"); U.vid.load(); U.vid.style.display = "none";
      const near = act.reduce((b, x) => (!b || Math.abs(x.ts - tc) < Math.abs(b.ts - tc) ? x : b), null);
      U.img.style.display = near && near.image ? "block" : "none";
      if (near && near.image) U.img.src = near.image;
      U.img.classList.add("dim");
      U.empty.style.display = "flex";
      U.empty.innerHTML = near ? `Nema snimka u ovo vrijeme<br><button class="gonear">Najbliži: ${this._esc(this._disp(near._ck))} ${p2(new Date(near.ts).getHours())}:${p2(new Date(near.ts).getMinutes())} ›</button>` : "Nema snimaka";
      const gb = U.empty.querySelector(".gonear"); if (gb) gb.onclick = (ev) => { ev.stopPropagation(); this._nvrGo(near, true); };
      U.cam.textContent = ""; U.pt.textContent = ""; U.kind.style.display = "none";
      this._nvrMark(null);
      return;
    }
    U.empty.style.display = "none";
    U.img.classList.remove("dim");
    const changed = this._cur !== e;
    this._cur = e;
    this._nvrMark(e);
    U.cam.textContent = this._disp(e._ck);
    U.pt.textContent = ` · ${this._dayLabel(e.day, true)} ${e.time.slice(0, 8)}${e.dur ? ` · ${e.dur}` : ""}${e.count > 1 ? ` · ${e.count} klipa` : ""}`;
    U.kind.className = `pkind ${e.kind}`; U.kind.textContent = label[e.kind]; U.kind.style.display = "block";
    if (e.image) { U.img.src = e.image; U.img.style.display = "block"; } else U.img.style.display = "none";
    let src = (e.videos && e.videos[0]) || e.video || null;
    if (!src && e.reolink) {
      if (!e._url) {
        U.load.style.display = "block";
        try { e._url = (await this._hass.callWS({ type: "media_source/resolve_media", media_content_id: e.reolink, expires: 3600 })).url; } catch (x) { e._url = null; }
        U.load.style.display = "none";
        if (this._cur !== e) return;
      }
      src = e._url;
    }
    if (!src) { U.vid.style.display = "none"; return; }
    const off = Math.max(0, (this._tc - e.ts) / 1000);
    const go = () => {
      try { if (off < (U.vid.duration || 1e9) - 0.5) U.vid.currentTime = off; } catch (x) {}
      U.vid.style.display = "block";
      if (play) U.vid.play().catch(() => {});
    };
    if (changed || U.vid.getAttribute("src") !== src) {
      U.vid.setAttribute("src", src);
      if (e.image) U.vid.setAttribute("poster", e.image); else U.vid.removeAttribute("poster");
      U.vid.style.display = "block";
      U.vid.addEventListener("loadedmetadata", go, { once: true });
      U.vid.load();
    } else go();
  }

  _nvrMark(e) {
    this._nvrEl.querySelectorAll(".ev.cur").forEach((x) => x.classList.remove("cur"));
    if (e) this._nvrEl.querySelectorAll(`.ev[data-evs~="${e.i}"]`).forEach((x) => x.classList.add("cur"));
    this._nvrEl.querySelectorAll(".row.cur").forEach((x) => x.classList.remove("cur"));
    const r = e && this._nvrEl.querySelector(`.row[data-i="${e.i}"]`);
    if (r) r.classList.add("cur");
  }


  _nvrSide() {
    const U = this._nvrUi, N = this._nv, kinds = this._kinds, rank = ["person", "vehicle", "animal", "motion"];
    const p2 = (n) => String(n).padStart(2, "0"), act = N.ev.filter((e) => kinds.has(e.kind));
    const days = [...new Set(N.ev.map((e) => e.day))].sort().reverse();
    const curDay = (() => { const d = new Date(this._tc); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; })();
    U.chips.innerHTML = days.map((d) => `<button class="dchip ${d === curDay ? "on" : ""}" data-day="${d}">${this._dayLabel(d, true)}<small>${N.ev.filter((e) => e.day === d && kinds.has(e.kind)).length}</small></button>`).join("");
    const counts = {}; N.ev.filter((e) => e.day === curDay).forEach((e) => (counts[e.kind] = (counts[e.kind] || 0) + 1));
    const lab = { person: "Osoba", vehicle: "Vozilo", animal: "Životinja", motion: "Pokret" };
    U.legend.innerHTML = rank.map((k) => `<button class="lg ${k} ${kinds.has(k) ? "on" : ""}" data-k="${k}"><i></i>${lab[k]}<b>${counts[k] || 0}</b></button>`).join("");
    const icon = { person: "🧍", vehicle: "🚗", animal: "🐾", motion: "〰️" };
    U.list.innerHTML = act.filter((e) => e.day === curDay).reverse().map((e) => `<div class="row" data-i="${e.i}">
        <div class="rthumb ${e.kind}">${e.image ? `<img loading="lazy" src="${e.image}">` : `<span>${icon[e.kind]}</span>`}</div>
        <div class="rtx"><b>${this._esc(e.time.slice(0, 5))}</b><span>${this._esc(this._disp(e._ck))}${e.count > 1 ? ` · ${e.count} klipa` : ""}${e.dur ? ` · ${this._esc(e.dur)}` : ""}</span></div>
        <span class="rk ${e.kind}">${lab[e.kind]}</span></div>`).join("") || `<div class="empty">Nema događaja za ovaj dan.</div>`;
    this._phDay = curDay;
  }

  _nvrDraw() {
    const U = this._nvrUi, N = this._nv;
    if (!U || !N) return;
    const vw = U.sc.clientWidth || 320;
    this._lastVw = vw;
    if (!this._pph) { let hh = 6; try { hh = +localStorage.getItem("wvnvr-pph-h") || 6; } catch (x) {} this._pph = vw / hh; }
    const s = this._pph, H = 3600000, x = (t) => vw / 2 + ((t - N.start) / H) * s;
    const W = ((N.end - N.start) / H) * s + vw;
    const kinds = this._kinds, act = N.ev.filter((e) => kinds.has(e.kind));
    const p2 = (n) => String(n).padStart(2, "0"), WD = ["ned", "pon", "uto", "sri", "čet", "pet", "sub"];
    const out = [];
    // night shading per day + day separators
    const sun = this._hass?.states["sun.sun"]?.attributes || {};
    const hod = (iso, def) => { if (!iso) return def; const d = new Date(iso); return d.getHours() + d.getMinutes() / 60; };
    const rise = hod(sun.next_rising, 7), set = hod(sun.next_setting, 16.5);
    for (let d = new Date(N.start); d.getTime() < N.end; d.setDate(d.getDate() + 1)) {
      const d0 = d.getTime();
      out.push(`<div class="night" style="left:${x(d0)}px;width:${rise * s}px"></div><div class="night" style="left:${x(d0 + set * H)}px;width:${(24 - set) * s}px"></div>`);
      out.push(`<div class="dsep" style="left:${x(d0)}px"><span>${WD[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.</span></div>`);
    }
    // ticks (labels ≥ 64 px apart)
    const steps = [5, 10, 15, 30, 60, 120, 180, 360, 720];
    const st = steps.find((m) => (m / 60) * s >= 64) || 720;
    const minor = st >= 60 ? (st >= 360 ? 60 : st / 2) : st / 5;
    for (let t = N.start; t <= N.end; t += minor * 60000) {
      const d = new Date(t), mm = d.getHours() * 60 + d.getMinutes();
      const major = mm % st === 0;
      out.push(`<div class="tk ${major ? "" : "mi"}" style="left:${x(t)}px">${major && mm ? `<span>${p2(d.getHours())}:${p2(d.getMinutes())}</span>` : ""}</div>`);
    }
    // activity histogram (bins of ~10 px)
    const binMs = Math.max(5 * 60000, (10 / s) * H), bins = new Map();
    act.forEach((e) => { const b = Math.floor((e.ts - N.start) / binMs); const o = bins.get(b) || { n: 0, k: {} }; o.n++; o.k[e.kind] = (o.k[e.kind] || 0) + 1; bins.set(b, o); });
    const mx = Math.max(1, ...[...bins.values()].map((o) => o.n)), rank = ["person", "vehicle", "animal", "motion"];
    const hbs = [];
    bins.forEach((o, b) => {
      const top = rank.find((k) => o.k[k]);
      hbs.push(`<div class="hb ${top}" style="left:${x(N.start + b * binMs)}px;width:${Math.max(2, (binMs / H) * s - 1)}px;height:${20 + (o.n / mx) * 80}%"></div>`);
    });
    const hist = hbs.join("");
    // lanes
    const gapMs = Math.max(20000, (10 / s) * H);
    const lanes = N.cams.map((cam, li) => {
      const evs = act.filter((e) => e._ck === cam);
      const g = [];
      for (const e of evs) { const L = g[g.length - 1]; if (L && e.ts - L.e <= gapMs) { L.e = Math.max(L.e, e.end); L.l.push(e); } else g.push({ s: e.ts, e: e.end, l: [e] }); }
      return `<div class="ln" style="top:${li * 40}px"><div class="tr"></div>${g.map((G) => {
        const best = rank.map((k) => G.l.find((y) => y.kind === k)).find(Boolean);
        const w = Math.max(8, ((G.e - G.s) / H) * s);
        return `<div class="ev ${best.kind}" data-ev="${G.l[0].i}" data-evs="${G.l.map((y) => y.i).join(" ")}" style="left:${x(G.s)}px;width:${w}px">${G.l.length > 1 && w > 18 ? `<b>${G.l.length}</b>` : ""}</div>`;
      }).join("")}</div>`;
    }).join("");
    const nowX = x(Date.now());
    U.inner.style.width = W + "px";
    U.inner.style.setProperty("--lh", N.cams.length * 40 + "px");
    U.inner.innerHTML = `<div class="bg">${out.join("")}</div><div class="hs">${hist}</div><div class="ax"></div><div class="lns" style="height:${N.cams.length * 40}px">${lanes}</div><div class="nowl" style="left:${nowX}px"></div>`;
    // names
    U.names.innerHTML = `<div class="sp"></div>` + N.cams.map((cam) => {
      const its = N.ev.filter((e) => e._ck === cam);
      let img = ([...its].reverse().find((e) => e.image) || {}).image;
      if (!img && this._hass) { const ce = Object.values(this._hass.states).find((st2) => st2.entity_id.startsWith("camera.") && (st2.attributes.friendly_name || "").toLowerCase().startsWith(cam.toLowerCase())); img = ce && ce.attributes.entity_picture; }
      return `<div class="nm">${img ? `<img src="${img}">` : `<span class="ava">${this._esc(this._disp(cam)[0] || "?")}</span>`}<div class="nx"><span class="nt">${this._esc(this._disp(cam))}</span><span class="bd">${its.filter((e) => kinds.has(e.kind)).length}</span></div></div>`;
    }).join("");
    this._nvrSide();
    this._nvrSetCenter(this._tc);
    this._nvrMark(this._cur);
  }

  _scrollToLatest() {
    requestAnimationFrame(() => {
      const sc = this.shadowRoot.querySelector(".tlscroll");
      const first = this.shadowRoot.querySelector(".ev");
      if (sc && first) sc.scrollLeft = Math.max(0, first.offsetLeft - sc.clientWidth * 0.7);
    });
  }

  async _open(it) {
    const m = document.createElement("div");
    m.className = "modal";
    let videos = it.videos && it.videos.length ? [...it.videos] : it.video ? [it.video] : [];
    if (it.reolink) {
      try {
        const r = await this._hass.callWS({ type: "media_source/resolve_media", media_content_id: it.reolink, expires: 3600 });
        videos = [r.url];
      } catch (e) {
        videos = [];
      }
    }
    const media = videos.length
      ? `<video src="${videos[0]}" ${it.image ? `poster="${it.image}"` : ""} controls autoplay playsinline></video>`
      : it.image ? `<img src="${it.image}">` : `<div class="mhead">Snimak nije dostupan.</div>`;
    const extra = it.reolink ? ` · ${this._tagIcons(it.tags)} ${this._esc(it.dur)}` : videos.length > 1 ? ` · <span class="pn">1</span>/${videos.length} klipa` : "";
    m.innerHTML = `<div class="mhead">${this._esc(it.camera)} · ${this._dayLabel(it.day)} ${this._esc(it.time)}${extra}</div>${media}
      <div class="mbar">${it.image ? `<a href="${it.image}" target="_blank">Slika</a>` : ""}${
        videos.length ? `<a class="dl" href="${videos[0]}" target="_blank">Preuzmi video</a>` : ""
      }<button>Zatvori</button></div>`;
    const v = m.querySelector("video");
    if (v && videos.length > 1) {
      let i = 0;
      v.addEventListener("ended", () => {
        if (++i >= videos.length) return;
        v.src = videos[i];
        v.play().catch(() => {});
        const pn = m.querySelector(".pn");
        if (pn) pn.textContent = i + 1;
        const dl = m.querySelector(".dl");
        if (dl) dl.href = videos[i];
      });
    }
    m.addEventListener("click", (e) => {
      if (e.target === m || e.target.tagName === "BUTTON") m.remove();
    });
    this.shadowRoot.appendChild(m);
  }
}

customElements.define("wansview-nvr-card", WansviewNvrCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "wansview-nvr-card", name: "Wansview NVR", description: "Pregled lokalnih snimaka kamera" });
