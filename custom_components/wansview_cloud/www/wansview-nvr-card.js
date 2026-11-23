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
    const daysAvail = Object.keys(byDay).sort().reverse();
    if (!daysAvail.length) return "";
    if (!this._tlDay || !byDay[this._tlDay]) this._tlDay = daysAvail[0];
    const day = this._tlDay;
    const items = byDay[day];
    const cams = [...new Set(items.map((it) => it.camera))].sort();
    const z = this._zoom;
    const pct = (sec) => (sec / 86400) * 100;
    const ticks = [];
    const step = z >= 4 ? 1 : z >= 2 ? 2 : 3;
    for (let h = 0; h <= 24; h++)
      ticks.push(`<div class="tick ${h % step ? "minor" : ""}" style="left:${pct(h * 3600)}%">${h % step || h === 24 ? "" : `<span>${String(h).padStart(2, "0")}</span>`}</div>`);
    const now = new Date();
    const isToday = now.toDateString() === new Date(day + "T12:00:00").toDateString();
    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const lanes = cams
      .map((cam) => {
        const evs = items
          .map((it, i) => ({ it, i }))
          .filter(({ it }) => it.camera === cam)
          .map(({ it, i }) => {
            const s = this._secs(it.time);
            const w = pct(this._durSecs(it));
            return `<div class="ev ${this._kind(it)}" data-i="${i}" style="left:${pct(s)}%;width:${w}%" title="${this._esc(it.time)} ${this._esc(it.tags || "")}"></div>`;
          })
          .join("");
        return `<div class="lane">${evs}</div>`;
      })
      .join("");
    const counts = { person: 0, vehicle: 0, animal: 0, motion: 0 };
    items.forEach((it) => counts[this._kind(it)]++);
    const dayChips = daysAvail
      .map((d) => `<button class="dchip ${d === day ? "on" : ""}" data-day="${d}">${this._dayLabel(d)}</button>`)
      .join("");
    const list = items
      .map(
        (it, i) => `<div class="row" data-i="${i}">
          <span class="dot ${this._kind(it)}"></span><b>${this._esc(it.time.slice(0, 5))}</b>
          <span class="rc">${this._esc(it.camera)}</span>
          <span class="rt">${it.reolink ? this._tagIcons(it.tags) : it.count > 1 ? `×${it.count}` : ""}</span>
          ${it.image ? `<img loading="lazy" src="${it.image}">` : ""}</div>`
      )
      .join("");
    return `
      <div class="dchips">${dayChips}</div>
      <div class="tlbar">
        <div class="legend">
          <span><i class="dot person"></i>Osoba ${counts.person}</span><span><i class="dot vehicle"></i>Vozilo ${counts.vehicle}</span>
          <span><i class="dot animal"></i>Životinja ${counts.animal}</span><span><i class="dot motion"></i>Pokret ${counts.motion}</span>
        </div>
        <div class="zoom">${[1, 2, 4, 8].map((n) => `<button data-z="${n}" class="${n === z ? "on" : ""}">${n}×</button>`).join("")}</div>
      </div>
      <div class="tl">
        <div class="tlnames"><div class="sp"></div>${cams.map((c) => `<div>${this._esc(c)}</div>`).join("")}</div>
        <div class="tlscroll"><div class="tlinner" style="width:${z * 100}%">
          <div class="axis">${ticks.join("")}</div>
          ${lanes}
          ${isToday ? `<div class="now" style="left:${pct(nowSec)}%"></div>` : ""}
        </div></div>
      </div>
      <div class="tlist">${list}</div>`;
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
        .seg { display:flex; background:rgba(127,127,127,.15); border-radius:10px; padding:3px; margin:4px 0 8px; }
        .seg button { flex:1; border:0; background:transparent; color:var(--primary-text-color); padding:6px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; }
        .seg button.on { background:var(--card-background-color,#222); box-shadow:0 1px 3px rgba(0,0,0,.3); }
        .dchips { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; margin-bottom:8px; }
        .dchip { flex:none; border:1px solid var(--divider-color); background:transparent; color:var(--primary-text-color); border-radius:14px; padding:4px 10px; font-size:12px; text-transform:capitalize; cursor:pointer; }
        .dchip.on { background:var(--primary-color); border-color:var(--primary-color); color:#fff; }
        .tlbar { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap; }
        .legend { display:flex; gap:10px; font-size:11px; color:var(--secondary-text-color); flex-wrap:wrap; }
        .legend span { display:flex; align-items:center; gap:4px; }
        .zoom { display:flex; gap:2px; }
        .zoom button { border:1px solid var(--divider-color); background:transparent; color:var(--primary-text-color); border-radius:8px; padding:3px 8px; font-size:12px; cursor:pointer; }
        .zoom button.on { background:var(--primary-color); color:#fff; border-color:var(--primary-color); }
        .tl { display:flex; border:1px solid var(--divider-color); border-radius:10px; overflow:hidden; }
        .tlnames { flex:none; width:78px; border-right:1px solid var(--divider-color); font-size:11px; font-weight:700; color:var(--primary-text-color); }
        .tlnames .sp { height:20px; }
        .tlnames div:not(.sp) { height:34px; display:flex; align-items:center; padding:0 6px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; border-top:1px solid rgba(127,127,127,.15); }
        .tlscroll { flex:1; overflow-x:auto; }
        .tlinner { position:relative; min-width:100%; }
        .axis { position:relative; height:20px; }
        .tick { position:absolute; top:0; bottom:-2000px; border-left:1px solid rgba(127,127,127,.22); pointer-events:none; }
        .tick.minor { border-left-style:dashed; border-left-color:rgba(127,127,127,.1); }
        .tick span { position:absolute; top:3px; left:3px; font-size:10px; color:var(--secondary-text-color); }
        .tl { position:relative; }
        .tlinner { overflow:hidden; }
        .lane { position:relative; height:34px; border-top:1px solid rgba(127,127,127,.15); }
        .ev { position:absolute; top:7px; height:20px; min-width:5px; border-radius:4px; cursor:pointer; opacity:.9; }
        .ev:hover { opacity:1; outline:2px solid #fff; }
        .person { background:#e53935; } .vehicle { background:#fb8c00; } .animal { background:#43a047; } .motion { background:#1e88e5; }
        .dot { display:inline-block; width:9px; height:9px; border-radius:50%; flex:none; }
        .now { position:absolute; top:0; bottom:0; width:2px; background:#ffeb3b; box-shadow:0 0 6px #ffeb3b; pointer-events:none; }
        .tlist { margin-top:10px; display:flex; flex-direction:column; gap:2px; max-height:50vh; overflow-y:auto; }
        .row { display:flex; align-items:center; gap:8px; padding:6px 4px; border-radius:8px; cursor:pointer; font-size:13px; color:var(--primary-text-color); }
        .row:hover { background:rgba(127,127,127,.12); }
        .row .rc { color:var(--secondary-text-color); flex:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .row img { width:56px; height:32px; object-fit:cover; border-radius:5px; }
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
