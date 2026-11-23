// Ripač sky card — Starlink status + Starlink satellites overhead (estimated serving satellite)
// + visible satellite passes (Satellite Spotter), on one night-sky card.
const SATJS = "https://cdn.jsdelivr.net/npm/satellite.js@5.0.0/+esm";
const TLE_KEY = "ripac_starlink_tle_v1";
const TLE_MAX_AGE = 12 * 3600 * 1000;

async function loadTle() {
  try {
    const c = JSON.parse(localStorage.getItem(TLE_KEY) || "null");
    if (c && Date.now() - c.t < TLE_MAX_AGE && c.d.length > 100) return c.d;
  } catch (e) {}
  let list = [];
  const get = async (u, ms = 20000) => {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), ms);
    try {
      const r = await fetch(u, { signal: ac.signal });
      return r.ok ? r : null;
    } finally {
      clearTimeout(to);
    }
  };
  try {
    const r = await get("https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle");
    if (r) {
      const lines = (await r.text()).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (let i = 0; i + 2 < lines.length + 1; i += 3) if (lines[i + 1]?.startsWith("1 ")) list.push([lines[i], lines[i + 1], lines[i + 2]]);
    }
  } catch (e) {}
  if (list.length < 100) {
    list = [];
    try {
      for (let p = 1; p <= 120; p++) {
        const r = await get(`https://tle.ivanstanojevic.me/api/tle/?search=STARLINK&page-size=100&page=${p}`);
        if (!r) break;
        const j = await r.json();
        for (const m of j.member || []) list.push([m.name, m.line1, m.line2]);
        if (!j.view || !j.view.next) break;
      }
    } catch (e) {}
  }
  if (list.length > 100) {
    try {
      localStorage.setItem(TLE_KEY, JSON.stringify({ t: Date.now(), d: list }));
    } catch (e) {}
  }
  return list;
}

class RipacSkyCard extends HTMLElement {
  setConfig(c) {
    this._c = {
      entity: "sensor.home_next_visible_pass",
      count: "sensor.home_visible_passes_next_24_hours",
      rows: 3,
      link: "/satellite-spotter",
      dish_az: "sensor.starlink_azimuth",
      dish_el: "sensor.starlink_elevation",
      ping: "sensor.starlink_ping",
      down: "sensor.starlink_downlink_throughput",
      up: "sensor.starlink_uplink_throughput",
      power: "sensor.starlink_power",
      online: "binary_sensor.starlink_connectivity",
      obstructed: "binary_sensor.starlink_obstructed",
      fov: 50,
      min_el: 25,
      ...c,
    };
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
  }
  set hass(h) {
    this._h = h;
    if (!this._started) {
      this._started = true;
      this._initSats();
      this._tick = setInterval(() => this._render(), 3000);
    }
    if (!this._painted) this._render();
  }
  disconnectedCallback() {
    clearInterval(this._tick);
    this._started = false;
  }
  connectedCallback() {
    if (this._h && !this._started) this.hass = this._h;
  }
  getCardSize() { return 7; }
  getGridOptions() { return { columns: "full", rows: "auto" }; }

  async _initSats() {
    try {
      this._sat = await import(SATJS);
      const tle = await loadTle();
      this._recs = tle
        .map(([n, l1, l2]) => {
          try {
            return { name: n.replace(/^0 /, ""), rec: this._sat.twoline2satrec(l1, l2) };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);
      this._scan = 0;
      this._render();
    } catch (e) {
      this._satErr = String(e);
    }
  }

  // ---- geometry
  _obs() {
    const s = this._sat, cfg = this._h.config;
    return { longitude: s.degreesToRadians(cfg.longitude), latitude: s.degreesToRadians(cfg.latitude), height: (cfg.elevation || 300) / 1000 };
  }
  _look(rec, date, obs) {
    const s = this._sat;
    const pv = s.propagate(rec, date);
    if (!pv || !pv.position) return null;
    const gmst = s.gstime(date);
    const la = s.ecfToLookAngles(obs, s.eciToEcf(pv.position, gmst));
    return { az: (la.azimuth * 180) / Math.PI, el: (la.elevation * 180) / Math.PI, range: la.rangeSat };
  }
  _sep(az1, el1, az2, el2) {
    const r = Math.PI / 180;
    const c = Math.sin(el1 * r) * Math.sin(el2 * r) + Math.cos(el1 * r) * Math.cos(el2 * r) * Math.cos((az1 - az2) * r);
    return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
  }
  _starlinkNow() {
    if (!this._recs || !this._h) return null;
    const now = new Date(), obs = this._obs();
    // full sweep every ~60 s, then only the ones near/above the horizon
    if (!this._near || Date.now() - this._scan > 60000) {
      this._scan = Date.now();
      this._near = this._recs.filter((r) => {
        const l = this._look(r.rec, now, obs);
        return l && l.el > -5;
      });
    }
    const above = [];
    for (const r of this._near) {
      const l = this._look(r.rec, now, obs);
      if (l && l.el > 0 && l.range > 200 && l.range < 2500 && !/DTC/.test(r.name)) above.push({ name: r.name, ...l });
    }
    const daz = parseFloat(this._st(this._c.dish_az)), del = parseFloat(this._st(this._c.dish_el));
    let best = null;
    const fov = [];
    if (!isNaN(daz) && !isNaN(del)) {
      for (const s of above) {
        if (s.el < this._c.min_el) continue;
        s.sep = this._sep(daz, del, s.az, s.el);
        if (s.sep <= this._c.fov) {
          fov.push(s);
          if (!best || s.sep < best.sep) best = s;
        }
      }
    }
    return { above, fov, best, daz, del };
  }

  // ---- helpers
  _st(id) { const s = id && this._h.states[id]; return s ? s.state : null; }
  _num(id, d = 0) { const v = parseFloat(this._st(id)); return isNaN(v) ? "–" : v.toFixed(d); }
  _dir(d) {
    const m = { N: "S", NNE: "SSI", NE: "SI", ENE: "ISI", E: "I", ESE: "IJI", SE: "JI", SSE: "JJI", S: "J", SSW: "JJZ", SW: "JZ", WSW: "ZJZ", W: "Z", WNW: "ZSZ", NW: "SZ", NNW: "SSZ" };
    return m[d] || d || "";
  }
  _dirFromAz(a) {
    const order = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return this._dir(order[Math.round(((a % 360) + 360) % 360 / 22.5) % 16]);
  }
  _az(d) {
    const order = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const i = order.indexOf(d);
    return i < 0 ? 0 : i * 22.5;
  }
  _rating(r) { return { great: ["odličan", 4], good: ["dobar", 3], fair: ["solidan", 2], poor: ["slab", 1] }[r] || [r || "", 0]; }
  _t(iso) { return new Date(iso).toLocaleTimeString("bs-BA", { hour: "2-digit", minute: "2-digit" }); }
  _until(iso) {
    const m = Math.round((new Date(iso) - Date.now()) / 60000);
    if (m <= 0) return "sada";
    if (m < 60) return `za ${m} min`;
    return `za ${Math.floor(m / 60)} h ${m % 60} min`;
  }
  _day(iso) {
    const d = new Date(iso), t = new Date();
    if (d.toDateString() === t.toDateString()) return "danas";
    const y = new Date(); y.setDate(t.getDate() + 1);
    if (d.toDateString() === y.toDateString()) return "sutra";
    return d.toLocaleDateString("bs-BA", { weekday: "short" });
  }
  _pt(az, el, R, cx, cy) {
    const r = R * (1 - Math.max(0, Math.min(90, el)) / 90);
    const a = ((az - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }
  _esc(s) { return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }

  _net(online) {
    const R = "sensor.vikendica_router_";
    const st = (e) => this._h.states[e]?.state;
    const bars = Math.max(0, Math.min(5, parseInt(st(R + "signal_strength")) || 0));
    const mb = parseFloat(st(R + "4g_podaci_mjesecno")) || 0;
    const lim = parseFloat(st("input_number.4g_mjesecni_limit_gb")) || 0;
    const used = mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
    const sms = parseInt(st(R + "sms_unread")) || 0;
    const routerOk = !["unavailable", "unknown", undefined].includes(st(R + "uptime"));
    const mesh = st("sensor.mesh_sadrvan_ap_status");
    const vid = st("switch.wansview_nvr_preuzimanje_videa") === "on";
    const barHtml = [1, 2, 3, 4, 5].map((b) => `<i style="height:${3 + b * 2}px;background:${b <= bars ? "#7dd3fc" : "rgba(255,255,255,.2)"}"></i>`).join("");
    const ping = this._num(this._c.ping);
    return `
      <div class="path">
        <div class="node ${online ? "act" : "idle"}"><ha-icon icon="mdi:satellite-uplink"></ha-icon><div class="nn">Starlink</div>
          <div class="ns">${online ? `glavna veza · ${ping} ms` : "bez veze"}</div></div>
        <div class="node ${routerOk ? "" : "bad"}" data-nav="/cudy-router-sms"><ha-icon icon="mdi:router-wireless"></ha-icon><div class="nn">Ruter</div>
          <div class="ns">${routerOk ? `${this._esc(st(R + "total_clients") || "?")} uređaja${mesh && mesh !== "online" ? " · AP offline" : ""}` : "ne odgovara"}</div>
          <div class="ns ${sms ? "hot" : ""}">${sms ? `📩 ${sms} nova SMS` : "SMS: nema novih"}</div></div>
        <div class="node ${online ? "idle" : "act"}" data-e="${R}rsrp"><ha-icon icon="mdi:signal-4g"></ha-icon><div class="nn">4G rezerva <span class="bars">${barHtml}</span></div>
          <div class="ns">${online ? "čeka" : "AKTIVNA"} · ${this._esc(st(R + "rsrp") ?? "–")} dBm</div>
          <div class="ns">${used}${lim ? ` / ${lim} GB` : ""} ovaj mj.</div></div>
      </div>
      <div class="vrow ${vid ? "on" : ""}" data-tg="switch.wansview_nvr_preuzimanje_videa"><ha-icon icon="mdi:download-network"></ha-icon>
        <div style="flex:1"><div style="font-weight:700;font-size:13px">Video sa solarnih kamera</div><div class="muted" style="margin-top:1px">${vid ? "preuzima se" : "pauzirano – štedi 4G"}</div></div><div class="sw"></div></div>`;
  }

  _render() {
    if (!this.shadowRoot || !this._h) return;
    if (this.shadowRoot.querySelector(".hold")) return;
    this._painted = true;
    const s = this._h.states[this._c.entity];
    const n = this._h.states[this._c.count];
    const A = (s && s.attributes) || {};
    const up = (A.upcoming || []).filter((p) => new Date(p.end) > Date.now());
    const next = up[0];
    const rest = up.slice(1, 1 + this._c.rows);
    const sl = this._starlinkNow();
    const R = 74, cx = 82, cy = 82;

    // dome layers
    let layers = "";
    if (sl && !isNaN(sl.daz)) {
      const [bx, by] = this._pt(sl.daz, sl.del, R, cx, cy);
      const fr = (this._c.fov / 90) * R;
      layers += `<circle cx="${bx}" cy="${by}" r="${fr}" fill="rgba(127,182,255,.07)" stroke="rgba(127,182,255,.35)" stroke-dasharray="3 3"/>
        <circle cx="${bx}" cy="${by}" r="2.5" fill="#7fb6ff"/>`;
    }
    if (sl) {
      for (const x of sl.above) {
        const [px, py] = this._pt(x.az, x.el, R, cx, cy);
        const inF = x.sep != null && x.sep <= this._c.fov && x.el >= this._c.min_el;
        layers += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${inF ? 1.9 : 1.3}" fill="${inF ? "#cfe3ff" : "rgba(255,255,255,.38)"}"/>`;
      }
      if (sl.best) {
        const [px, py] = this._pt(sl.best.az, sl.best.el, R, cx, cy);
        layers += `<line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}" stroke="#5ee0a0" stroke-width="1.2" stroke-dasharray="2 3"><animate attributeName="stroke-dashoffset" values="10;0" dur="1s" repeatCount="indefinite"/></line>
          <circle cx="${px}" cy="${py}" r="5" fill="none" stroke="#5ee0a0" stroke-width="1.5"><animate attributeName="r" values="4;8;4" dur="1.6s" repeatCount="indefinite"/></circle>
          <circle cx="${px}" cy="${py}" r="3" fill="#5ee0a0"/>`;
      }
    }
    if (next && A.start_azimuth != null && A.pass_id === next.pass_id) {
      const p1 = this._pt(A.start_azimuth, A.start_elevation || 0, R, cx, cy);
      const p2 = this._pt(A.peak_azimuth, A.peak_elevation, R, cx, cy);
      const p3 = this._pt(A.end_azimuth, A.end_elevation || 0, R, cx, cy);
      const c = [2 * p2[0] - (p1[0] + p3[0]) / 2, 2 * p2[1] - (p1[1] + p3[1]) / 2];
      layers += `<path d="M${p1} Q${c} ${p3}" fill="none" stroke="url(#trail)" stroke-width="2.5" stroke-linecap="round" opacity=".9"/>
        <circle cx="${p2[0]}" cy="${p2[1]}" r="3.5" fill="#ffe27a"/>`;
    }
    layers += `<circle cx="${cx}" cy="${cy}" r="4" fill="#fff" stroke="#0a0f1f" stroke-width="1.5"/>`;

    const stars = Array.from({ length: 30 }, (_, i) => {
      const x = (i * 97) % 100, y = (i * 53) % 100, o = 0.2 + ((i * 7) % 10) / 22;
      return `<i style="left:${x}%;top:${y}%;opacity:${o};animation-delay:${(i % 7) * 0.6}s"></i>`;
    }).join("");
    const online = this._st(this._c.online) === "on";
    const obstructed = this._st(this._c.obstructed) === "on";
    const [rt, rv] = next ? this._rating(next.rating) : ["", 0];
    const dots = (v) => [1, 2, 3, 4].map((i) => `<b class="${i <= v ? "on" : ""}"></b>`).join("");
    const best = sl && sl.best;
    const slInfo = !this._recs
      ? `<div class="muted">${this._satErr ? "Orbite nedostupne" : "Učitavam orbite Starlinka…"}</div>`
      : best
        ? `<div class="lbl">Vjerovatno povezan</div>
           <div class="sat">${this._esc(best.name.replace("STARLINK-", "Starlink "))}</div>
           <div class="meta"><span class="pill">${this._dirFromAz(best.az)} · ${Math.round(best.el)}°</span><span class="pill">${Math.round(best.range)} km</span></div>
           <div class="muted">${sl.fov.length} u vidnom polju · ${sl.above.length} iznad horizonta</div>`
        : `<div class="lbl">Starlink</div><div class="muted">${sl ? sl.above.length : 0} satelita iznad horizonta, nijedan u vidnom polju tanjira</div>`;

    this.shadowRoot.innerHTML = `
    <style>
      ha-card{position:relative;overflow:hidden;padding:14px 14px 10px;color:#fff;
        background:radial-gradient(120% 90% at 80% 0%,#23345e 0%,#121a33 45%,#0a0f1f 100%);border:none}
      .stars i{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;animation:tw 4s ease-in-out infinite}
      @keyframes tw{50%{opacity:.08}}
      .hd{position:relative;display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px}
      .hd ha-icon{--mdc-icon-size:20px;color:#9fc4ff}
      .st{margin-left:auto;display:flex;gap:6px;align-items:center;font-size:12px;font-weight:600}
      .dot{width:8px;height:8px;border-radius:50%;background:${online ? "#5ee0a0" : "#e53935"};box-shadow:0 0 8px ${online ? "#5ee0a0" : "#e53935"}}
      .stats{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}
      .stat{background:rgba(255,255,255,.07);border-radius:10px;padding:6px 8px}
      .stat b{display:block;font-size:15px}
      .stat span{font-size:10px;opacity:.65;text-transform:uppercase;letter-spacing:.4px}
      .main{position:relative;display:flex;gap:10px;align-items:center;margin-top:10px}
      svg{flex:none}
      .side{min-width:0}
      .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#5ee0a0;font-weight:700}
      .sat{font-size:18px;font-weight:800;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .meta{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;font-size:12px}
      .pill{background:rgba(255,255,255,.1);padding:2px 8px;border-radius:10px}
      .muted{font-size:11px;opacity:.65;margin-top:6px;line-height:1.35}
      .legend{display:flex;gap:10px;font-size:10px;opacity:.7;margin-top:6px;flex-wrap:wrap}
      .legend i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px;vertical-align:middle}
      .sec{position:relative;margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08);cursor:pointer}
      .sech{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;opacity:.85;text-transform:uppercase;letter-spacing:.4px}
      .sech .cnt{margin-left:auto;text-transform:none;font-weight:600;opacity:.8}
      .np{display:flex;align-items:baseline;gap:8px;margin-top:6px;flex-wrap:wrap}
      .np .tm{font-size:24px;font-weight:800}
      .np .nm{font-size:15px;font-weight:700}
      .np .wh{font-size:12px;opacity:.7}
      .dots b{display:inline-block;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.2);margin-right:2px}
      .dots b.on{background:#ffe27a}
      .row{display:grid;grid-template-columns:46px 1fr auto;gap:8px;align-items:center;padding:6px 2px;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px}
      .row:last-child{border-bottom:none}
      .row .t{font-weight:700}
      .row .n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .row .r{display:flex;align-items:center;gap:6px;font-size:12px;opacity:.85}
      .el{width:30px;height:4px;border-radius:2px;background:rgba(255,255,255,.12);overflow:hidden}
      .el span{display:block;height:100%;background:linear-gradient(90deg,#7fb6ff,#ffe27a)}
      .path{position:relative;display:flex;align-items:stretch;gap:6px;margin-top:12px}
      .node{flex:1;padding:8px 4px;border-radius:12px;background:rgba(255,255,255,.07);text-align:center;cursor:pointer}
      .node.act{background:rgba(94,224,160,.15);box-shadow:inset 0 0 0 1px rgba(94,224,160,.5)}
      .node.act ha-icon{color:#5ee0a0}.node.bad{background:rgba(229,57,53,.2)}.node.idle{opacity:.8}
      .node ha-icon{--mdc-icon-size:20px;color:#cfe0ff}
      .nn{font-size:12.5px;font-weight:700;margin-top:2px}.ns{font-size:10.5px;opacity:.7}
      .arrow{display:none}.ns.hot{color:#5ee0a0;opacity:1;font-weight:700}
      .bars{display:inline-flex;align-items:flex-end;gap:1.5px;height:13px;vertical-align:-2px;margin-left:2px}.bars i{width:3px;border-radius:1px}
      .stats.s3{grid-template-columns:repeat(3,1fr)}
      .stat small{font-size:10px;opacity:.7}.stat.hot{background:rgba(94,224,160,.2)}
      .stat[data-e],.stat[data-nav]{cursor:pointer}
      .grp{position:relative;font-size:11px;text-transform:uppercase;letter-spacing:.5px;opacity:.6;font-weight:700;margin:12px 0 -4px}
      .vrow{position:relative;display:flex;align-items:center;gap:10px;margin-top:6px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.07);cursor:pointer}
      .vrow ha-icon{--mdc-icon-size:20px;color:#7dd3fc}
      .sw{width:30px;height:18px;border-radius:9px;background:rgba(255,255,255,.25);position:relative;flex:none}
      .sw::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .2s}
      .vrow.on .sw{background:#5ee0a0}.vrow.on .sw::after{left:14px}
    </style>
    <ha-card>
      <div class="stars">${stars}</div>
      <div class="hd"><ha-icon icon="${this._c.net ? "mdi:web" : "mdi:satellite-uplink"}"></ha-icon>${this._c.net ? "Internet" : "Starlink i nebo iznad Ripča"}
        <span class="st"><span class="dot"></span>${this._c.net ? (online ? (obstructed ? "Starlink zaklonjen" : "Online · Starlink") : "Preko 4G rezerve") : online ? (obstructed ? "Zaklonjen" : "Online") : "Offline"}</span></div>
      ${this._c.net ? this._net(online) + `<div class="grp">Starlink</div>` : ""}
      <div class="stats">
        <div class="stat"><b>${this._num(this._c.ping)} ms</b><span>Ping</span></div>
        <div class="stat"><b>${this._num(this._c.down, 1)}</b><span>↓ Mbit/s</span></div>
        <div class="stat"><b>${this._num(this._c.up, 1)}</b><span>↑ Mbit/s</span></div>
        <div class="stat"><b>${this._num(this._c.power)} W</b><span>Tanjir</span></div>
      </div>
      <div class="main">
        <svg width="164" height="164" viewBox="0 0 164 164">
          <defs><linearGradient id="trail" x1="0" x2="1"><stop offset="0" stop-color="#ffe27a" stop-opacity=".15"/><stop offset="1" stop-color="#ffe27a"/></linearGradient>
          <radialGradient id="sky"><stop offset="0" stop-color="#2a3d6e"/><stop offset="1" stop-color="#101830"/></radialGradient></defs>
          <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#sky)" stroke="rgba(255,255,255,.18)"/>
          <circle cx="${cx}" cy="${cy}" r="${(R * 2) / 3}" fill="none" stroke="rgba(255,255,255,.07)"/>
          <circle cx="${cx}" cy="${cy}" r="${R / 3}" fill="none" stroke="rgba(255,255,255,.07)"/>
          <line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="rgba(255,255,255,.05)"/>
          <line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="rgba(255,255,255,.05)"/>
          <text x="${cx}" y="6" fill="#9fc4ff" font-size="8" text-anchor="middle" font-weight="700">S</text>
          <text x="${cx}" y="163" fill="rgba(255,255,255,.5)" font-size="8" text-anchor="middle">J</text>
          <text x="161" y="${cy + 3}" fill="rgba(255,255,255,.5)" font-size="8" text-anchor="middle">I</text>
          <text x="3" y="${cy + 3}" fill="rgba(255,255,255,.5)" font-size="8" text-anchor="middle">Z</text>
          ${layers}
        </svg>
        <div class="side">${slInfo}
          <div class="legend"><span><i style="background:#5ee0a0"></i>povezan</span><span><i style="background:#cfe3ff"></i>vidno polje</span><span><i style="background:#ffe27a"></i>prelet</span></div>
        </div>
      </div>
      <div class="sec">
        <div class="sech"><ha-icon icon="mdi:satellite-variant" style="--mdc-icon-size:16px"></ha-icon>Vidljivi preleti<span class="cnt">${n ? n.state : "–"} / 24 h ›</span></div>
        ${next ? `<div class="np"><span class="tm">${this._t(next.start)}</span><span class="nm">${next.bright ? "⭐ " : ""}${this._esc(next.satellite)}</span>
            <span class="wh">${this._day(next.start)} · ${this._until(next.start)}</span></div>
          <div class="meta"><span class="pill">↗ ${this._dir(next.peak_direction)} · ${Math.round(next.peak_elevation)}°</span><span class="pill">${Math.round((next.duration_seconds || 0) / 60)} min</span>
            <span class="dots">${dots(rv)}</span><span style="opacity:.8">${rt}</span><span style="opacity:.8">${next.cloud_cover >= 50 ? `☁️ ${next.cloud_cover}%` : "✨ vedro"}</span></div>
          <div style="margin-top:6px">${rest.map((p) => `<div class="row"><span class="t">${this._t(p.start)}</span><span class="n">${p.bright ? "⭐ " : ""}${this._esc(p.satellite)}</span>
            <span class="r">${this._dir(p.peak_direction)}<span class="el"><span style="width:${Math.min(100, (p.peak_elevation / 90) * 100)}%"></span></span>${Math.round(p.peak_elevation)}° ${p.cloud_cover >= 50 ? "☁️" : "✨"}</span></div>`).join("")}</div>`
          : `<div class="muted">Nema vidljivih preleta u naredna 24 h.</div>`}
      </div>
    </ha-card>`;
    const root = this.shadowRoot;
    root.querySelectorAll("[data-e]").forEach((el) => (el.onclick = () => this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: el.dataset.e }, bubbles: true, composed: true }))));
    root.querySelectorAll("[data-nav]").forEach((el) => (el.onclick = () => { history.pushState(null, "", el.dataset.nav); window.dispatchEvent(new CustomEvent("location-changed")); }));
    root.querySelectorAll("[data-tg]").forEach((el) => (el.onclick = () => { this._h.callService("homeassistant", "toggle", { entity_id: el.dataset.tg }); el.classList.toggle("on"); }));
    this.shadowRoot.querySelector(".sec").onclick = () => {
      history.pushState(null, "", this._c.link);
      window.dispatchEvent(new CustomEvent("location-changed"));
    };
  }
}
if (!customElements.get("ripac-sky-card")) customElements.define("ripac-sky-card", RipacSkyCard);
