// Wansview NVR gallery card — preview of locally saved camera recordings.
class WansviewNvrCard extends HTMLElement {
  setConfig(config) {
    this._config = { limit: 60, columns: 2, title: "Snimci", ...config };
    this._filter = config.camera || "";
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
      if (this._filter) msg.camera = this._filter;
      let wv = { items: [], cameras: [] };
      if (!this._filter || !(this._reoCams || []).includes(this._filter)) wv = await this._hass.callWS(msg);
      const wvItems = this._group(wv.items || []);
      const merge = (reo) => {
        let items = wvItems.concat(this._filter ? reo.filter((r) => r.camera === this._filter) : reo);
        items.sort((a, b) => (b.day + b.time).localeCompare(a.day + a.time));
        this._items = items.slice(0, this._config.limit);
      };
      // show Wansview clips right away, Reolink SD list (slow, asks the camera) is added when it arrives
      merge(this._reoCache || []);
      if (!this._filter) this._cams = [...(this._reoCams || []), ...(wv.cameras || [])];
      this._loaded = true;
      this._render();
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
      if (!this._filter) this._cams = [...reoNames, ...(wv.cameras || [])];
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
    this._render();
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
    const all = byDay[day];
    const counts = { person: 0, vehicle: 0, animal: 0, motion: 0 };
    all.forEach((it) => counts[this._kind(it)]++);
    const cams = [...new Set(all.map((it) => it.camera))].sort();
    if (!cams.length) cams.push(...new Set(this._items.map((it) => it.camera)));
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
        const top = rank.find((k) => b.k[k]);
        return `<div class="bar ${top}" style="left:${(i / 48) * 100}%;height:${18 + (b.n / max) * 82}%"></div>`;
      })
      .join("");

    const ticks = [];
    const step = z >= 4 ? 1 : z >= 2 ? 2 : 3;
    for (let hr = 0; hr < 24; hr++)
      ticks.push(`<div class="tick ${hr % step ? "minor" : ""}" style="left:${pct(hr * 3600)}%">${hr % step ? "" : `<span>${String(hr).padStart(2, "0")}:00</span>`}</div>`);

    const lanes = cams
      .map((cam) => {
        const evs = all
          .map((it, i) => ({ it, i }))
          .filter(({ it }) => it.camera === cam && kinds.has(this._kind(it)))
          .map(({ it, i }) => {
            const s = this._secs(it.time);
            return `<div class="ev ${this._kind(it)}" data-i="${i}" style="left:${pct(s)}%;width:${pct(this._durSecs(it))}%"></div>`;
          })
          .join("");
        return `<div class="lane"><div class="track"></div>${evs}</div>`;
      })
      .join("");
    const names = cams
      .map((cam) => {
        const its = all.filter((it) => it.camera === cam && kinds.has(this._kind(it)));
        const img = (its.find((it) => it.image) || {}).image;
        return `<div class="nm">${img ? `<img src="${img}">` : `<span class="ava">${this._esc(cam[0] || "?")}</span>`}
          <span class="nt">${this._esc(cam)}</span>${its.length ? `<span class="bd">${its.length}</span>` : ""}</div>`;
      })
      .join("");
    const dayChips = daysAvail
      .map((d) => `<button class="dchip ${d === day ? "on" : ""}" data-day="${d}">${this._dayLabel(d)}<small>${byDay[d].length}</small></button>`)
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
          <div class="rtx"><b>${this._esc(it.time.slice(0, 5))}</b><span>${this._esc(it.camera)}${it.count > 1 ? ` · ${it.count} klipa` : ""}${it.dur ? ` · ${this._esc(it.dur)}` : ""}</span></div>
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

  _dayLabel(day) {
    const d = new Date(day + "T12:00:00");
    const today = new Date();
    const y = new Date();
    y.setDate(today.getDate() - 1);
    const same = (a, b) => a.toDateString() === b.toDateString();
    if (same(d, today)) return "Danas";
    if (same(d, y)) return "Jučer";
    return d.toLocaleDateString("bs-BA", { weekday: "long", day: "numeric", month: "long" });
  }

  _esc(s) {
    return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  }

  _render() {
    if (!this.shadowRoot) return;
    const prevSc = this.shadowRoot.querySelector(".tlscroll");
    const prevLeft = prevSc ? prevSc.scrollLeft : null;
    const prevList = this.shadowRoot.querySelector(".tlist")?.scrollTop;
    const c = this._config || {};
    const byDay = {};
    for (const it of this._items) (byDay[it.day] = byDay[it.day] || []).push(it);
    const chips = ["", ...this._cams]
      .map((cam) => `<button class="chip ${cam === this._filter ? "on" : ""}" data-cam="${this._esc(cam)}">${cam ? this._esc(cam) : "Sve kamere"}</button>`)
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
        .tlnames { flex:none; width:118px; background:rgba(127,127,127,.06); border-right:1px solid rgba(127,127,127,.16); z-index:2; }
        .tlnames .sp { height:58px; }
        .nm { height:42px; display:flex; align-items:center; gap:7px; padding:0 8px; }
        .nm img, .nm .ava { width:26px; height:26px; border-radius:8px; object-fit:cover; flex:none; }
        .nm .ava { display:flex; align-items:center; justify-content:center; background:rgba(127,127,127,.25); font-size:12px; font-weight:700; color:var(--primary-text-color); }
        .nt { flex:1; font-size:12px; font-weight:700; color:var(--primary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .bd { font-size:10px; font-weight:800; color:var(--secondary-text-color); background:rgba(127,127,127,.18); border-radius:8px; padding:1px 6px; }
        .tlscroll { flex:1; overflow-x:auto; scrollbar-width:thin; }
        .tlinner { position:relative; min-width:100%; overflow:hidden; padding-bottom:4px; }
        .night { position:absolute; top:0; bottom:0; background:linear-gradient(180deg,rgba(40,60,140,.16),rgba(20,30,80,.10)); pointer-events:none; }
        .sunmark { position:absolute; top:2px; transform:translateX(-50%); font-size:11px; color:#ffca28; pointer-events:none; }
        .sunmark.moon { color:#9fa8da; }
        .hist { position:relative; height:34px; margin-top:2px; }
        .bar { position:absolute; bottom:0; width:calc(100% / 48 - 2px); margin-left:1px; border-radius:3px 3px 1px 1px;
               background:linear-gradient(180deg,var(--c),color-mix(in srgb,var(--c) 25%,transparent)); opacity:.8; }
        .axis { position:relative; height:22px; border-bottom:1px solid rgba(127,127,127,.16); }
        .tick { position:absolute; top:0; bottom:-1000px; border-left:1px solid rgba(127,127,127,.13); pointer-events:none; }
        .tick.minor { border-left:1px dotted rgba(127,127,127,.08); }
        .tick span { position:absolute; top:5px; left:4px; font-size:10px; font-weight:600; color:var(--secondary-text-color); letter-spacing:.2px; }
        .lane { position:relative; height:42px; }
        .track { position:absolute; left:4px; right:4px; top:17px; height:8px; border-radius:4px; background:rgba(127,127,127,.09); }
        .ev { position:absolute; top:12px; height:18px; min-width:7px; border-radius:9px; cursor:pointer; transform:translateX(-3px);
              background:linear-gradient(180deg,color-mix(in srgb,var(--c) 85%,#fff),var(--c)); box-shadow:0 0 10px color-mix(in srgb,var(--c) 55%,transparent);
              transition:transform .15s; }
        .ev:hover { transform:translateX(-3px) scaleY(1.25); z-index:3; }
        .now { position:absolute; top:0; bottom:0; width:2px; background:#ffeb3b; box-shadow:0 0 8px #ffeb3b; pointer-events:none; z-index:4; }
        .now span { position:absolute; top:2px; left:4px; font-size:10px; font-weight:800; color:#111; background:#ffeb3b; border-radius:6px; padding:0 5px; }
        .zoom { display:flex; justify-content:flex-end; gap:4px; margin:8px 0 4px; }
        .zoom button { border:0; background:rgba(127,127,127,.14); color:var(--secondary-text-color); border-radius:8px; padding:4px 10px; font-size:12px; font-weight:700; cursor:pointer; }
        .zoom button.on { background:var(--primary-color); color:#fff; }
        .tlist { margin-top:6px; display:flex; flex-direction:column; gap:4px; max-height:55vh; overflow-y:auto; }
        .row { display:flex; align-items:center; gap:10px; padding:6px; border-radius:12px; cursor:pointer; background:rgba(127,127,127,.06); transition:background .15s; }
        .row:hover { background:rgba(127,127,127,.14); }
        .rthumb { width:64px; height:40px; border-radius:8px; overflow:hidden; flex:none; display:flex; align-items:center; justify-content:center;
                  background:color-mix(in srgb,var(--c) 22%,#151515); box-shadow:inset 3px 0 0 var(--c); font-size:18px; }
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
        ${c.recent === false ? "" : !this._error && !this._items.length ? `<div class="empty">${this._loaded ? "Još nema snimaka." : "Učitavam snimke…"}</div>` : this._view === "timeline" ? this._timeline(byDay) : days}
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
      t.addEventListener("click", () => this._open(byDay[this._tlDay][+t.dataset.i]))
    );
    if (prevLeft !== null) {
      const sc = this.shadowRoot.querySelector(".tlscroll");
      if (sc) sc.scrollLeft = prevLeft;
      const tl = this.shadowRoot.querySelector(".tlist");
      if (tl && prevList) tl.scrollTop = prevList;
    } else if (this._view === "timeline" && !this._tlScrolled) {
      this._tlScrolled = true;
      this._scrollToLatest();
    }
    this.shadowRoot.querySelectorAll(".tile").forEach((t) =>
      t.addEventListener("click", () => this._open(byDay[t.dataset.day][+t.dataset.i]))
    );
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
