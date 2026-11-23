// Ripač dashboard cards: ripac-security-card (protocols + house modes) and ripac-una-card (Una + forecast + warnings).
const css = `
  :host { display:block; }
  ha-card { padding:14px; border-radius:var(--ha-card-border-radius,16px); overflow:hidden;
    background:radial-gradient(120% 90% at 0% 0%, rgba(80,110,180,.16), transparent 60%), var(--ha-card-background, var(--card-background-color)); }
  .hd { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
  .shield { width:46px; height:46px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex:none;
    background:color-mix(in srgb,var(--c) 22%,transparent); color:var(--c); box-shadow:0 0 18px color-mix(in srgb,var(--c) 35%,transparent); }
  .shield ha-icon { --mdc-icon-size:26px; }
  .ttl { font-size:17px; font-weight:700; color:var(--primary-text-color); }
  .sub { font-size:12.5px; color:var(--secondary-text-color); margin-top:2px; line-height:1.35; }
  .lbl { font-size:11px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:var(--secondary-text-color); margin:14px 2px 8px; }
  .prot { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
  .pb { border:0; cursor:pointer; border-radius:14px; padding:12px 4px 10px; display:flex; flex-direction:column; align-items:center; gap:7px;
    background:rgba(127,127,127,.10); color:var(--primary-text-color); font:inherit; transition:transform .12s, background .2s; }
  .pb:active { transform:scale(.95); }
  .pb:hover { background:rgba(127,127,127,.18); }
  .pi { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; color:#fff;
    background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 55%,#000)); box-shadow:0 4px 12px color-mix(in srgb,var(--c) 40%,transparent); }
  .pi ha-icon { --mdc-icon-size:22px; }
  .pn { font-size:12.5px; font-weight:700; }
  .pd { font-size:10.5px; color:var(--secondary-text-color); margin-top:-4px; }
  .pb.run .pi { animation:pulse 1s infinite; }
  @keyframes pulse { 50% { opacity:.45; } }
  .tg { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .t { display:flex; align-items:center; gap:10px; padding:10px; border-radius:14px; cursor:pointer; background:rgba(127,127,127,.08);
    border:1px solid transparent; transition:all .2s; user-select:none; }
  .t.on { background:color-mix(in srgb,var(--c) 14%,transparent); border-color:color-mix(in srgb,var(--c) 45%,transparent); }
  .ti { width:34px; height:34px; border-radius:10px; flex:none; display:flex; align-items:center; justify-content:center;
    background:rgba(127,127,127,.18); color:var(--secondary-text-color); transition:all .2s; }
  .t.on .ti { background:var(--c); color:#fff; box-shadow:0 0 12px color-mix(in srgb,var(--c) 50%,transparent); }
  .ti ha-icon { --mdc-icon-size:19px; }
  .tx { flex:1; min-width:0; }
  .tn { font-size:13px; font-weight:700; color:var(--primary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ts { font-size:11px; color:var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .t.on .ts { color:color-mix(in srgb,var(--c) 75%,var(--primary-text-color)); font-weight:600; }
  .sw { width:30px; height:18px; border-radius:9px; background:rgba(127,127,127,.35); position:relative; flex:none; transition:background .2s; }
  .sw::after { content:""; position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:50%; background:#fff; transition:left .2s; }
  .t.on .sw { background:var(--c); }
  .t.on .sw::after { left:14px; }
  /* Una */
  .big { display:flex; align-items:baseline; gap:6px; }
  .lvl { font-size:34px; font-weight:800; color:var(--primary-text-color); letter-spacing:-.5px; }
  .unit { font-size:15px; color:var(--secondary-text-color); font-weight:600; }
  .badge { margin-left:auto; align-self:center; font-size:11.5px; font-weight:800; padding:5px 10px; border-radius:10px; color:#fff; background:var(--c); }
  .row2 { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
  .chip { font-size:11.5px; font-weight:600; padding:4px 9px; border-radius:9px; background:rgba(127,127,127,.12); color:var(--primary-text-color);
    display:flex; align-items:center; gap:4px; }
  .chip ha-icon { --mdc-icon-size:14px; }
  .chip.w { background:color-mix(in srgb,var(--c) 22%,transparent); color:color-mix(in srgb,var(--c) 70%,var(--primary-text-color)); }
  svg.spark { width:100%; height:70px; display:block; margin-top:10px; }
  .axis { display:flex; justify-content:space-between; font-size:10px; color:var(--secondary-text-color); margin-top:2px; }
  .up { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
  .us { padding:8px; border-radius:12px; background:rgba(127,127,127,.08); }
  .un { font-size:11px; color:var(--secondary-text-color); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .uv { font-size:15px; font-weight:800; color:var(--primary-text-color); }
  .ud { font-size:11px; font-weight:700; }
  .fc2 { margin-top:10px; padding:10px 12px; border-radius:12px; background:rgba(127,127,127,.08); }
  .wr { display:flex; align-items:center; gap:9px; font-size:13px; color:var(--primary-text-color); padding:4px 0; }
  .wr + .wr { border-top:1px solid rgba(127,127,127,.12); padding-top:7px; margin-top:3px; }
  .wr ha-icon { --mdc-icon-size:18px; color:var(--c); flex:none; }
  .wr b { color:var(--c); }
  .fc { margin-top:10px; padding:10px 12px; border-radius:12px; background:rgba(127,127,127,.08); font-size:13px; color:var(--primary-text-color);
    display:flex; gap:10px; align-items:center; }
  .fc ha-icon { color:var(--c); flex:none; }
`;

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

class RipacBase extends HTMLElement {
  setConfig(c) {
    this._config = c || {};
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
  }
  set hass(h) {
    const first = !this._hass;
    const old = this._hass;
    this._hass = h;
    if (first || this._watch().some((e) => old.states[e] !== h.states[e])) this._render();
  }
  st(e) {
    return this._hass?.states[e]?.state;
  }
  attr(e, a) {
    return this._hass?.states[e]?.attributes?.[a];
  }
  getGridOptions() {
    return { columns: "full", rows: "auto" };
  }
  getCardSize() {
    return 6;
  }
}

const PROTOCOLS = [
  { e: "script.protokol_dolazak", n: "Dolazak", d: "pripremi kuću", i: "mdi:car-arrow-right", c: "#43a047", q: "Pripremiti vikendicu (klima, bojler)?" },
  { e: "script.protokol_odlazak", n: "Odlazak", d: "ugasi i čuvaj", i: "mdi:home-export-outline", c: "#546e7a", q: "Ugasiti sve i uključiti čuvanje?" },
  { e: "script.protokol_noc", n: "Noć", d: "laku noć", i: "mdi:weather-night", c: "#5c6bc0" },
  { e: "script.protokol_poplava", n: "Poplava", d: "hitno", i: "mdi:home-flood", c: "#e53935", q: "Pokrenuti PROTOKOL POPLAVA?" },
];
const TOGGLES = [
  { e: "input_boolean.vikendica_prazna", n: "Kuća prazna", on: "Čuvam kuću", off: "Neko je tu", i: "mdi:home-lock", c: "#607d8b" },
  { e: "input_boolean.gosti_rezim", n: "Gosti", on: "Alarmi pauzirani", off: "Isključeno", i: "mdi:account-group", c: "#26a69a" },
  { e: "alarm_control_panel.tpanel_sonoff_1001892dfe_alarm", n: "TPanel alarm", on: "Naoružan", off: "Razoružan", i: "mdi:shield-lock", c: "#ef6c00", alarm: true },
  { e: "input_boolean.hitni_alarm_poplave", n: "Alarm poplave", on: "AKTIVAN", off: "Mirno", i: "mdi:home-flood", c: "#e53935" },
  { e: "automation.obavijest_o_pokretu_na_kameri", n: "Kamere", on: "Javljam pokret", off: "Utišano", i: "mdi:cctv", c: "#fb8c00" },
  { e: "automation.nocu_ugasi_vanjska_svjetla_bez_pokreta", n: "Noćno gašenje", on: "Gasi vanjska svjetla", off: "Isključeno", i: "mdi:weather-night", c: "#8e24aa" },
  { e: "input_boolean.vodostaj_na_zakljucanom_ekranu", n: "Una na ekranu", on: "Live Activity", off: "Isključeno", i: "mdi:cellphone-lock", c: "#1e88e5" },
  { e: "input_boolean.vikendica_na_zakljucanom_ekranu", n: "Kuća na ekranu", on: "Live Activity", off: "Isključeno", i: "mdi:cellphone-information", c: "#3949ab" },
  { e: "input_boolean.stednja_solarnih_kamera", n: "Argus štedi", on: "Odmara dok su poznati tu", off: "Uvijek čuva", i: "mdi:solar-power", c: "#f9a825" },
];
const MUTE = "input_boolean.kamere_utisane", MUTE_WHY = "input_text.kamere_utisane_razlog";
const PRESENCE = "binary_sensor.presence_senzor_sonoff_a480133cc3_occupancy";

class RipacSecurityCard extends RipacBase {
  _watch() {
    return [...PROTOCOLS.map((p) => p.e), ...TOGGLES.map((t) => t.e), PRESENCE, "sensor.kamera_iza_kuce", MUTE, MUTE_WHY, "sensor.poznati_na_mrezi"];
  }
  _status() {
    const prazna = this.st("input_boolean.vikendica_prazna") === "on";
    const gosti = this.st("input_boolean.gosti_rezim") === "on";
    const neko = this.st(PRESENCE) === "on";
    const flood = this.st("input_boolean.hitni_alarm_poplave") === "on";
    const alarm = this.st(TOGGLES[2].e);
    if (flood) return { c: "#e53935", i: "mdi:home-flood", t: "Alarm poplave je aktivan", s: "Evakuacijski režim – provjeri Unu i put." };
    if (alarm === "triggered") return { c: "#e53935", i: "mdi:alarm-light", t: "Alarm je aktiviran!", s: "TPanel je okinuo alarm – pogledaj kamere." };
    if (prazna && neko) return { c: "#ff7043", i: "mdi:shield-alert", t: "Pažnja", s: "Vikendica je prazna, a senzor u dnevnoj vidi nekoga." };
    if (gosti) return { c: "#26a69a", i: "mdi:account-group", t: "Gosti su u vikendici", s: neko ? "Neko je u dnevnoj · alarmi pauzirani" : "Alarmi i obavijesti o kretanju su pauzirani" };
    if (prazna) return { c: "#43a047", i: "mdi:shield-check", t: "Kuća je čuvana", s: `Niko nije u kući${alarm === "armed_away" ? " · TPanel naoružan" : ""} · kamere javljaju pokret` };
    return { c: "#1e88e5", i: "mdi:home-account", t: neko ? "Neko je u dnevnoj" : "Ti si u vikendici", s: "Čuvanje je isključeno" };
  }
  _render() {
    if (!this._hass) return;
    const s = this._status();
    const prot = PROTOCOLS.filter((p) => this._hass.states[p.e])
      .map((p) => `<button class="pb2 ${this.st(p.e) === "on" ? "run" : ""}" data-e="${p.e}" style="--c:${p.c}">${p.n}</button>`).join("");
    const row = (t) => {
      const v = this.st(t.e);
      const on = t.alarm ? v !== "disarmed" : v === "on";
      let sub = t.alarm && v === "triggered" ? "AKTIVIRAN!" : on ? t.on : t.off;
      let cls = on ? "on" : "";
      if (t.e === "automation.obavijest_o_pokretu_na_kameri" && on && this.st(MUTE) === "on") {
        const why = this.st(MUTE_WHY) || "", net = this.st("sensor.poznati_na_mrezi");
        const ko = why.startsWith("auto:") ? (why.split(":")[2] || "").replace(/ručno/, "") : why.startsWith("mreza:") ? why.slice(6) : "";
        const who = (net && net !== "niko" ? net : ko) || "";
        sub = who ? `Utišano · ${who} ${/,/.test(who) ? "su" : "je"} tu` : why.includes("ručno") ? "Utišano dok je auto tu" : "Utišano · poznati su tu";
        cls = "on part";
      }
      return `<div class="r ${cls}" data-e="${t.e}" style="--c:${t.c}"><div class="rx"><div class="rn">${t.n}</div><div class="rs">${sub}</div></div><div class="sw"></div></div>`;
    };
    const have = TOGGLES.filter((t) => this._hass.states[t.e]);
    const g1 = have.slice(0, 4).map(row).join(""), g2 = have.slice(4).map(row).join("");
    this.shadowRoot.innerHTML = `<style>${css}
      .prot2 { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
      .r.part .sw { opacity:.55; } .r.part .rs { color:#66bb6a !important; }
      .pb2 { border:0; cursor:pointer; border-radius:12px; padding:11px 4px; font:inherit; font-size:13px; font-weight:700; color:var(--primary-text-color);
        background:rgba(127,127,127,.12); transition:background .2s, transform .1s; }
      .pb2:active { transform:scale(.96); } .pb2:hover { background:color-mix(in srgb,var(--c) 25%,transparent); }
      .pb2.run { background:var(--c); color:#fff; animation:pulse 1s infinite; }
      .cols { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .grp { border-radius:14px; background:rgba(127,127,127,.07); padding:2px 12px; }
      .gt { font-size:11px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:var(--secondary-text-color); margin:0 2px 6px; }
      .r { display:flex; align-items:center; gap:10px; padding:10px 0; cursor:pointer; user-select:none; }
      .r + .r { border-top:1px solid rgba(127,127,127,.14); }
      .rx { flex:1; min-width:0; } .rn { font-size:13.5px; font-weight:600; color:var(--primary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .rs { font-size:11.5px; color:var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .r.on .rs { color:color-mix(in srgb,var(--c) 70%,var(--primary-text-color)); }
      .r .sw { width:30px; height:18px; border-radius:9px; background:rgba(127,127,127,.35); position:relative; flex:none; transition:background .2s; }
      .r .sw::after { content:""; position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:50%; background:#fff; transition:left .2s; }
      .r.on .sw { background:var(--c); } .r.on .sw::after { left:14px; }
      @media (max-width:420px) { .cols { grid-template-columns:1fr; } }
    </style><ha-card>
      ${this._config.toggles_only ? "" : `<div class="hd"><div class="shield" style="--c:${s.c}"><ha-icon icon="${s.i}"></ha-icon></div>
        <div><div class="ttl">${esc(s.t)}</div><div class="sub">${esc(s.s)}</div></div></div>
      <div class="prot2">${prot}</div>`}
      <div class="cols" style="margin-top:${this._config.toggles_only ? 0 : 12}px">
        <div><div class="gt">Čuvanje</div><div class="grp">${g1}</div></div>
        <div><div class="gt">Obavijesti</div><div class="grp">${g2}</div></div>
      </div></ha-card>`;
    this.shadowRoot.querySelectorAll(".pb2").forEach((b) =>
      b.addEventListener("click", () => {
        const p = PROTOCOLS.find((x) => x.e === b.dataset.e);
        if (p.q && !confirm(p.q)) return;
        this._hass.callService("script", "turn_on", { entity_id: p.e });
        b.classList.add("run");
      })
    );
    this.shadowRoot.querySelectorAll(".r").forEach((el) => {
      let timer;
      el.addEventListener("pointerdown", () => (timer = setTimeout(() => ((timer = null), this._more(el.dataset.e)), 600)));
      el.addEventListener("pointerup", () => {
        if (!timer) return;
        clearTimeout(timer);
        this._toggle(el.dataset.e);
      });
      el.addEventListener("pointerleave", () => clearTimeout(timer));
    });
  }
  _toggle(e) {
    const t = TOGGLES.find((x) => x.e === e);
    if (e === "automation.obavijest_o_pokretu_na_kameri" && this.st(MUTE) === "on") {
      this._hass.callService("input_boolean", "turn_off", { entity_id: MUTE });
      this._hass.callService("input_text", "set_value", { entity_id: MUTE_WHY, value: "" });
      return;
    }
    if (t.alarm) {
      const v = this.st(e);
      this._hass.callService("alarm_control_panel", v === "disarmed" ? "alarm_arm_away" : "alarm_disarm", { entity_id: e });
      return;
    }
    if (e === "input_boolean.hitni_alarm_poplave" && this.st(e) !== "on" && !confirm("Uključiti hitni alarm poplave?")) return;
    this._hass.callService("homeassistant", "toggle", { entity_id: e });
  }
  _more(e) {
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: e }, bubbles: true, composed: true }));
  }
}

const UNA = "sensor.hs_ripac_distance";
const UPSTREAM = [
  ["sensor.hs_martin_brod_vodostaj", "sensor.hs_martin_brod_porast_za_3_sata", "Martin Brod"],
  ["sensor.hs_kulen_vakuf_vodostaj", "sensor.hs_kulen_vakuf_porast_za_3_sata", "Kulen Vakuf"],
  ["sensor.hs_rmanj_manastir_vodostaj", "sensor.hs_rmanj_manastir_porast_za_3_sata", "Unac"],
];
const EV_GEN = { Vjetar: "vjetar", Kiša: "kiša", Poplava: "poplava", Grmljavina: "grmljavina", Snijeg: "snijeg", Poledica: "poledica", Magla: "magla", Vrućina: "vrućina", Hladnoća: "hladnoća" };
const EV_ICON = { Vjetar: "mdi:weather-windy", Kiša: "mdi:weather-pouring", Poplava: "mdi:home-flood", Grmljavina: "mdi:weather-lightning", Snijeg: "mdi:weather-snowy-heavy", Poledica: "mdi:snowflake-alert", Magla: "mdi:weather-fog", Vrućina: "mdi:thermometer-high", Hladnoća: "mdi:thermometer-low" };

const WX_ICON = { "clear-night": "mdi:weather-night", cloudy: "mdi:weather-cloudy", fog: "mdi:weather-fog", hail: "mdi:weather-hail", lightning: "mdi:weather-lightning",
  "lightning-rainy": "mdi:weather-lightning-rainy", partlycloudy: "mdi:weather-partly-cloudy", pouring: "mdi:weather-pouring", rainy: "mdi:weather-rainy",
  snowy: "mdi:weather-snowy", "snowy-rainy": "mdi:weather-snowy-rainy", sunny: "mdi:weather-sunny", windy: "mdi:weather-windy", exceptional: "mdi:alert" };
const WX_COL = { sunny: "#ffca28", "clear-night": "#9fa8da", partlycloudy: "#ffd54f", cloudy: "#b0bec5", rainy: "#64b5f6", pouring: "#42a5f5", "lightning-rainy": "#ab47bc",
  lightning: "#ab47bc", snowy: "#e3f2fd", "snowy-rainy": "#90caf9", fog: "#b0bec5", hail: "#80deea", windy: "#80cbc4" };
const DAYS = ["ned", "pon", "uto", "sri", "čet", "pet", "sub"];

class RipacUnaCard extends RipacBase {
  _watch() {
    return [UNA, "sensor.hs_ripac", "sensor.una_prognoza", "input_number.kisa_prognoza_24h", "sensor.meteoalarm_bih_nivo_upozorenja", "weather.home", ...UPSTREAM.flat()];
  }
  set hass(h) {
    super.hass = h;
    if (!this._histT || Date.now() - this._histT > 600000) {
      this._histT = Date.now();
      this._loadHist();
      this._loadWx();
    }
  }
  async _loadHist() {
    try {
      const start = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
      const r = await this._hass.callWS({ type: "history/history_during_period", start_time: start, entity_ids: [UNA], minimal_response: true, no_attributes: true });
      let hist = (r[UNA] || []).map((p) => [(p.lu || p.lc) * 1000, parseFloat(p.s)]).filter((p) => !isNaN(p[1]));
      try {
        // fill gaps (restarts, unavailable) with hourly long-term statistics
        const st = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: start, statistic_ids: [UNA], period: "hour", types: ["mean"] });
        const first = hist.length ? hist[0][0] : Date.now();
        const fill = (st[UNA] || []).map((x) => [typeof x.start === "number" ? x.start : new Date(x.start).getTime(), x.mean]).filter((x) => x[1] != null && x[0] < first - 1800e3);
        hist = fill.concat(hist);
      } catch (e) {}
      this._hist = hist;
      this._render();
    } catch (e) {}
  }
  async _loadWx() {
    try {
      const r = await this._hass.callWS({ type: "call_service", domain: "weather", service: "get_forecasts", service_data: { type: "daily" }, target: { entity_id: "weather.home" }, return_response: true });
      this._wx = r.response["weather.home"].forecast || [];
      const r2 = await this._hass.callWS({ type: "call_service", domain: "weather", service: "get_forecasts", service_data: { type: "hourly" }, target: { entity_id: "weather.home" }, return_response: true });
      this._wxh = r2.response["weather.home"].forecast || [];
      this._render();
    } catch (e) {}
  }
  // simple river model: rain of a day lifts the Una partly the same day, mostly the next; without rain it recedes at the recent rate
  _predict(l, wx) {
    const pts = this._hist || [];
    let decay = -4;
    if (pts.length > 2) {
      const dayAgo = Date.now() - 24 * 3600 * 1000;
      const old = pts.reduce((a, p) => (Math.abs(p[0] - dayAgo) < Math.abs(a[0] - dayAgo) ? p : a), pts[0]);
      const d = l - old[1];
      decay = Math.max(-10, Math.min(0, d < 0 ? d : -2));
    }
    const rise = (p) => (p < 5 ? 0 : p < 15 ? 0.4 * p : p < 30 ? 0.7 * p : 1.0 * p);
    const days = wx.slice(0, 3).map((d) => d.precipitation || 0);
    const out = [[Date.now(), l]];
    let lvl = l, carry = 0;
    for (let i = 0; i < 3; i++) {
      const r = rise(days[i] || 0);
      const gain = carry + r * 0.5;
      carry = r * 0.5;
      lvl = Math.max(80, lvl + (gain > 0 ? gain : decay));
      out.push([Date.now() + (i + 1) * 24 * 3600 * 1000, lvl]);
    }
    const peak = out.reduce((a, p) => (p[1] > a[1] ? p : a), out[0]);
    return { pts: out, peak, days };
  }
  _spark(c, pred) {
    const pts = this._hist || [];
    if (pts.length < 2) return "";
    const H0 = 48, H1 = 72, span = (H0 + H1) * 3600 * 1000;
    const t0 = Date.now() - H0 * 3600 * 1000;
    const fut = pred ? pred.pts : [];
    const vals = pts.map((p) => p[1]).concat(fut.map((p) => p[1]));
    const lo = Math.floor((Math.min(...vals) - 10) / 10) * 10, hi = Math.max(Math.ceil((Math.max(...vals) + 10) / 10) * 10, 210);
    const W = Math.max(280, Math.round(this._cw || 320)), H = 130, top = 8, bot = 22, left = 26;
    const x = (t) => left + ((t - t0) / span) * (W - left);
    const y = (v) => top + (1 - (v - lo) / (hi - lo)) * (H - top - bot);
    const nowX = x(Date.now());
    const past = pts.map((p) => [Math.max(p[0], t0), p[1]]).map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join("") + `L${nowX.toFixed(1)},${y(pts[pts.length - 1][1]).toFixed(1)}`;
    const futLine = fut.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join("");
    const base = H - bot;
    const grid = [];
    for (let v = lo; v <= hi; v += (hi - lo) > 80 ? 20 : 10)
      grid.push(`<line x1="${left}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(127,127,127,.12)"/><text x="${left - 4}" y="${y(v) + 3}" text-anchor="end" font-size="8.5" fill="var(--secondary-text-color)">${v}</text>`);
    const thr = (v, col) => v >= lo && v <= hi ? `<line x1="${left}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="${col}" stroke-width="1.2" stroke-dasharray="4 3" opacity=".85"/>` : "";
    // rain bars for coming days
    const bars = pred ? pred.days.map((mm, i) => {
      if (!mm) return "";
      const bx = x(Date.now() + (i + 0.5) * 24 * 3600 * 1000), bh = Math.min(28, mm * 1.2);
      return `<rect x="${bx - 7}" y="${base - bh}" width="14" height="${bh}" rx="2" fill="#42a5f5" opacity=".35"/><text x="${bx}" y="${base - bh - 2}" text-anchor="middle" font-size="7.5" fill="#64b5f6">${Math.round(mm)} mm</text>`;
    }).join("") : "";
    const pk = pred && pred.peak[0] > Date.now() + 3600e3 && pred.peak[1] - fut[0][1] >= 3 ? pred.peak : null;
    const pkCol = pk ? (pk[1] >= 205 ? "#e53935" : pk[1] >= 195 ? "#ffb300" : "#64b5f6") : "";
    const xl = [[-48, "-48 h"], [-24, "-24 h"], [0, "sada"], [24, "+1 dan"], [48, "+2 dana"], [72, "+3 dana"]]
      .map(([hh, t]) => `<text x="${x(Date.now() + hh * 3600e3)}" y="${H - 6}" text-anchor="${hh === -48 ? "start" : hh === 72 ? "end" : "middle"}" font-size="8.5" fill="${hh === 0 ? "var(--primary-text-color)" : "var(--secondary-text-color)"}" font-weight="${hh === 0 ? 700 : 400}">${t}</text>`).join("");
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" style="height:${H}px">
      <defs><linearGradient id="ug" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".4"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>
        <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#64b5f6" stop-opacity=".22"/><stop offset="1" stop-color="#64b5f6" stop-opacity="0"/></linearGradient></defs>
      ${grid.join("")}
      <rect x="${nowX}" y="${top}" width="${W - nowX}" height="${base - top}" fill="rgba(127,127,127,.06)"/>
      ${bars}
      ${thr(195, "#ffb300")}${thr(205, "#e53935")}${thr(250, "#b71c1c")}
      <path d="${past}L${nowX},${base}L${x(t0)},${base}Z" fill="url(#ug)"/>
      <path d="${past}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"/>
      ${futLine ? `<path d="${futLine}L${x(fut[fut.length - 1][0])},${base}L${nowX},${base}Z" fill="url(#fg)"/><path d="${futLine}" fill="none" stroke="#64b5f6" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round"/>` : ""}
      <line x1="${nowX}" x2="${nowX}" y1="${top}" y2="${base}" stroke="var(--primary-text-color)" stroke-opacity=".35"/>
      <circle cx="${nowX}" cy="${y(pts[pts.length - 1][1])}" r="4" fill="${c}" stroke="#fff" stroke-width="1.5"/>
      ${pk ? (() => { const lx = Math.min(W - 24, Math.max(left + 24, x(pk[0]))); return `<circle cx="${x(pk[0])}" cy="${y(pk[1])}" r="3.5" fill="${pkCol}"/><rect x="${lx - 22}" y="${y(pk[1]) - 19}" width="44" height="13" rx="6" fill="${pkCol}"/>
        <text x="${lx}" y="${y(pk[1]) - 10}" text-anchor="middle" font-size="8.5" font-weight="800" fill="#111">~${Math.round(pk[1])} cm</text>`; })() : ""}
      ${xl}
    </svg>
    <div class="legend2"><span><i style="background:${c}"></i>izmjereno</span><span><i class="d"></i>procjena po prognozi kiše</span><span><i style="background:#42a5f5;opacity:.5"></i>kiša</span><span><i style="background:#ffb300"></i>195 voda na putu</span><span><i style="background:#e53935"></i>205 put plavi</span></div>`;
  }
  // rough expectation for the next 2-3 days from forecast rain, current trend and upstream stations
  _rainSpells() {
    const hrs = (this._wxh || []).filter((x) => new Date(x.datetime) > Date.now() - 3600e3);
    const sp = [];
    for (const x of hrs) {
      const t = new Date(x.datetime).getTime(), mm = x.precipitation || 0;
      if (mm < 0.2) continue;
      const last = sp[sp.length - 1];
      if (last && t - last.end <= 2 * 3600e3) { last.end = t; last.mm += mm; }
      else sp.push({ start: t, end: t, mm });
    }
    return sp.filter((x) => x.mm >= 1);
  }
  _rainText() {
    if (!this._wxh) return "";
    const sp = this._rainSpells();
    if (!sp.length) return "";
    const hm = (t) => new Date(t).toLocaleTimeString("bs-BA", { hour: "2-digit", minute: "2-digit" });
    const day = (t) => { const d = new Date(t), n = new Date(), tm = new Date(); tm.setDate(n.getDate() + 1);
      return d.toDateString() === n.toDateString() ? "danas" : d.toDateString() === tm.toDateString() ? "sutra" : { ned: "u nedjelju", pon: "u ponedjeljak", uto: "u utorak", sri: "u srijedu", "čet": "u četvrtak", pet: "u petak", sub: "u subotu" }[DAYS[d.getDay()]]; };
    const hrs = (a, b) => { const h = Math.round((b - a) / 3600e3) + 1; return h === 1 ? "oko sat vremena" : h < 5 ? `${h} sata` : `${h} sati`; };
    return sp.slice(0, 2).map((x, i) => {
      const end = x.end + 3600e3, mm = Math.max(1, Math.round(x.mm));
      if (x.start <= Date.now() + 1800e3) return `Kiša upravo pada i trebala bi stati oko ${hm(end)}${day(end) !== "danas" ? ` ${day(end)}` : ""} (još ~${mm} mm).`;
      return `${i ? "Ponovo bi trebala padati" : "Kiša bi trebala početi"} ${day(x.start)} oko ${hm(x.start)} i padati ${hrs(x.start, x.end)}, do ~${hm(end)} (~${mm} mm).`;
    }).join(" ");
  }
  _expect(l, tr, wx, prog, pred) {
    const up = UPSTREAM.map(([e, r, n]) => [n, parseFloat(this.st(r)) || 0]);
    const wave = up.filter(([, d]) => d >= 15);
    const rain3 = pred.days.reduce((a, b) => a + b, 0);
    const peak = Math.round(pred.peak[1]);
    const end = Math.round(pred.pts[pred.pts.length - 1][1]);
    const pkDay = pred.peak[0] > Date.now() + 3600e3 ? ["", "sutra", "prekosutra", "za 3 dana"][Math.round((pred.peak[0] - Date.now()) / 864e5)] || "" : "";
    let txt, col = "#43a047", icon = "mdi:check-circle";
    if (wave.length) {
      txt = `Uzvodno brzo raste (${wave.map(([n, d]) => `${n} +${Math.round(d)} cm`).join(", ")}) – val stiže do Ripča za 4–9 h.`;
      col = "#ffb300"; icon = "mdi:waves-arrow-up";
    } else if (peak - l >= 3) {
      txt = `${this._rainText() || ""} Ukupno ~${Math.round(rain3)} mm u 3 dana, pa bi Una mogla porasti do oko <b>${peak} cm</b>${pkDay ? ` (${pkDay})` : ""}.`;
      col = "#42a5f5"; icon = "mdi:trending-up";
    } else {
      icon = end < l - 2 ? "mdi:trending-down" : "mdi:waves";
      txt = (this._rainText() ? this._rainText() + " " : "") + (end < l - 2 ? `Bez značajne kiše (${Math.round(rain3)} mm u 3 dana) – Una polako opada, oko <b>${end} cm</b> za 3 dana.` : `Bez značajne kiše – Una ostaje mirna oko <b>${Math.round(l)} cm</b>.`);
    }
    const top = Math.max(peak, l);
    if (top >= 205) { col = "#e53935"; icon = "mdi:home-flood"; txt += " <b>Put bi mogao biti poplavljen.</b>"; }
    else if (top >= 195) { col = "#ffb300"; icon = "mdi:alert"; txt += " Voda bi mogla izaći na put."; }
    else txt += " Put ostaje prohodan.";
    if (wx.slice(0, 3).some((d) => /snow/.test(d.condition)) && peak > l) txt += " Dio padavina je snijeg, pa porast može kasniti.";
    if (prog.startsWith("raste") && icon !== "mdi:trending-down") { col = "#42a5f5"; icon = "mdi:trending-up"; }
    return { txt, col, icon, rain: !!this._rainText() };
  }
  _render() {
    if (!this._hass) return;
    const l = parseFloat(this.st(UNA));
    const tr = parseFloat(this.st("sensor.hs_ripac")) || 0;
    const st = isNaN(l) ? null : l >= 250 ? ["#b71c1c", "PLACEVI", "voda na placevima"] : l >= 205 ? ["#e53935", "POPLAVA", "put poplavljen"] : l >= 195 ? ["#ffb300", "PRIPREMNO", "voda na putu"] : ["#43a047", "NORMALNO", "put suh i prohodan"];
    const c = st ? st[0] : "#888";
    const trend = tr >= 1 ? `raste ${tr.toFixed(1)} cm/h` : tr <= -1 ? `opada ${Math.abs(tr).toFixed(1)} cm/h` : "miruje";
    const prog = this.st("sensor.una_prognoza") || "";
    const warns = this.attr("sensor.meteoalarm_bih_nivo_upozorenja", "warnings") || [];
    const wx = (this._wx || []).filter((d) => new Date(d.datetime).toDateString() === new Date().toDateString() || new Date(d.datetime) > new Date()).slice(0, 4);
    const wcol = { 2: "#fbc02d", 3: "#fb8c00", 4: "#e53935" };
    const hm = (s) => new Date(s).toLocaleTimeString("bs-BA", { hour: "2-digit", minute: "2-digit" });
    const dayName = (d) => {
      const t = new Date(); const tm = new Date(); tm.setDate(t.getDate() + 1);
      return d.toDateString() === t.toDateString() ? "Danas" : d.toDateString() === tm.toDateString() ? "Sutra" : DAYS[d.getDay()];
    };
    const when = (w) => {
      if (w.active) return `sada${w.expires ? ` do ${hm(w.expires)}` : ""}`;
      return `${dayName(new Date(w.onset)).toLowerCase()} ${hm(w.onset)}${w.expires ? `–${hm(w.expires)}` : ""}`;
    };
    const warnFor = (d) => {
      const s = new Date(d); s.setHours(0, 0, 0, 0);
      const e = new Date(s); e.setDate(e.getDate() + 1);
      return warns.filter((w) => new Date(w.onset || Date.now()) < e && new Date(w.expires || Date.now() + 864e5) > s).sort((a, b) => b.level - a.level)[0];
    };
    const days = wx.map((d) => {
      const dt = new Date(d.datetime);
      const w = warnFor(dt);
      return `<div class="wd ${w ? "warn" : ""}" style="${w ? `--c:${wcol[w.level]}` : ""}">
        <div class="wdn">${dayName(dt)}</div>
        <ha-icon icon="${WX_ICON[d.condition] || "mdi:weather-cloudy"}" style="color:${WX_COL[d.condition] || "#b0bec5"}"></ha-icon>
        <div class="wdt"><b>${Math.round(d.temperature)}°</b> <span>${d.templow != null ? Math.round(d.templow) + "°" : ""}</span></div>
        <div class="wdr">${d.precipitation ? `💧 ${Math.round(d.precipitation)} mm` : "suho"}</div>
        ${w ? `<div class="wdw"><ha-icon icon="${EV_ICON[w.event_hr] || "mdi:alert"}"></ha-icon></div>` : ""}</div>`;
    }).join("");
    const wrows = warns.map((w) => `<div class="wr" style="--c:${wcol[w.level]}"><ha-icon icon="${EV_ICON[w.event_hr] || "mdi:alert"}"></ha-icon>
        <span><b>${esc(w.level_name)} upozorenje</b> · ${esc(EV_GEN[w.event_hr] || w.event_hr)}, ${when(w)}</span></div>`).join("");
    const pred = isNaN(l) ? null : this._predict(l, wx);
    const ex = isNaN(l) ? null : this._expect(l, tr, wx, prog, pred);
    const ups = UPSTREAM.filter(([e]) => this._hass.states[e]).map(([e, r, n]) => {
      const v = parseFloat(this.st(e));
      const d = Math.round(parseFloat(this.st(r)) || 0);
      const col = d >= 15 ? "#e53935" : d >= 5 ? "#ffb300" : d <= -3 ? "#42a5f5" : "var(--secondary-text-color)";
      return `<div class="us"><div class="un">${n}</div><div class="uv">${isNaN(v) ? "–" : Math.round(v)} <span class="unit" style="font-size:11px">cm</span></div>
        <div class="ud" style="color:${col}">${d > 0 ? "+" : ""}${d} cm / 3 h</div></div>`;
    }).join("");
    this.shadowRoot.innerHTML = `<style>${css}
      .wk { display:grid; grid-template-columns:repeat(${Math.max(wx.length, 1)},1fr); gap:6px; }
      .wd { position:relative; text-align:center; padding:8px 4px; border-radius:12px; background:rgba(127,127,127,.08); border:1px solid transparent; }
      .wd.warn { border-color:color-mix(in srgb,var(--c) 60%,transparent); background:color-mix(in srgb,var(--c) 10%,transparent); }
      .wdn { font-size:11.5px; font-weight:700; color:var(--secondary-text-color); text-transform:capitalize; }
      .wd > ha-icon { --mdc-icon-size:26px; margin:4px 0 2px; }
      .wdt b { font-size:15px; color:var(--primary-text-color); } .wdt span { font-size:12px; color:var(--secondary-text-color); }
      .wdr { font-size:10.5px; color:var(--secondary-text-color); margin-top:2px; }
      .wdw { position:absolute; top:4px; right:4px; width:18px; height:18px; border-radius:50%; background:var(--c); display:flex; align-items:center; justify-content:center; }
      .wdw ha-icon { --mdc-icon-size:12px; color:#000; }
      .hd1 { display:flex; align-items:center; gap:10px; }
      .shield.sm { width:38px; height:38px; border-radius:12px; } .shield.sm ha-icon { --mdc-icon-size:22px; }
      .hd1 .ttl { font-size:15px; white-space:nowrap; } .tt2 { min-width:0; } .tt2 .sub { margin-top:0; font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .hd1 .big { display:flex; align-items:baseline; gap:3px; margin-left:4px; cursor:pointer; } .hd1 .lvl { font-size:24px; }
      .tr { display:flex; align-items:center; gap:1px; color:var(--tc); } .tr ha-icon { --mdc-icon-size:22px; } .tr small { font-size:11px; font-weight:700; }
      .hd1 .badge { margin-left:auto; }
      @media (max-width:380px) { .hd1 .tt2 .ttl { font-size:13px; } }
      .hdw { container-type:inline-size; }
      .hd1 .tt2 { flex:1 1 auto; min-width:0; overflow:hidden; } .hd1 .ttl { overflow:hidden; text-overflow:ellipsis; }
      .hd1 .big, .hd1 .tr, .hd1 .badge, .hd1 .shield { flex:none; }
      @container (max-width:430px) { .hd1 { gap:7px; } .hd1 .shield.sm { display:none; } .hd1 .lvl { font-size:20px; } .hd1 .big { margin-left:0; }
        .hd1 .badge { font-size:10.5px; padding:4px 8px; } .hd1 .tr small { display:none; } }
      @container (max-width:330px) { .hd1 .badge { display:none; } }
      .legend2 { display:flex; gap:12px; flex-wrap:wrap; font-size:10.5px; color:var(--secondary-text-color); margin-top:2px; }
      .legend2 i { display:inline-block; width:10px; height:3px; border-radius:2px; margin-right:5px; vertical-align:middle; }
      .legend2 i.d { background:repeating-linear-gradient(90deg,#64b5f6 0 4px,transparent 4px 7px); }
      .exp { position:relative; overflow:hidden; margin-top:10px; padding:12px 78px 26px 14px; border-radius:14px;
        background:linear-gradient(135deg,color-mix(in srgb,var(--c) 16%,transparent),color-mix(in srgb,var(--c) 5%,transparent));
        font-size:13px; line-height:1.45; color:var(--primary-text-color); }
      .exp > div { position:relative; z-index:1; }
      .exp .sym { position:absolute; top:10px; right:14px; width:52px; height:52px; border-radius:50%; display:flex; align-items:center; justify-content:center;
        background:color-mix(in srgb,var(--c) 18%,transparent); color:var(--c); }
      .exp .sym ha-icon { --mdc-icon-size:30px; }
      .exp .sym .tr { position:absolute; right:-4px; bottom:-4px; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center;
        background:var(--ha-card-background,var(--card-background-color,#1c1c1c)); color:var(--c); }
      .exp .sym .tr ha-icon { --mdc-icon-size:15px; }
      .exp svg.wv { position:absolute; left:0; bottom:0; width:200%; height:30px; color:var(--c); animation:wv 14s linear infinite; }
      .exp svg.wv.b { opacity:.10; height:38px; animation-duration:22s; }
      .exp svg.wv.a { opacity:.18; }
      @keyframes wv { from { transform:translateX(0); } to { transform:translateX(-50%); } }
      @media (prefers-reduced-motion: reduce) { .exp svg.wv { animation:none; } }
      .exp small { display:block; font-size:10.5px; color:var(--secondary-text-color); margin-top:3px; }
    </style><ha-card>
      <div class="hdw"><div class="hd1"><div class="shield sm" style="--c:${c}"><ha-icon icon="mdi:waves"></ha-icon></div>
        <div class="tt2"><div class="ttl">Una kod Ripča</div><div class="sub">${st ? st[2] : ""}</div></div>
        <div class="lv big"><span class="lvl">${isNaN(l) ? "–" : l.toFixed(1)}</span><span class="unit">cm</span></div>
        <div class="tr" style="--tc:${tr >= 1 ? "#ef5350" : tr <= -1 ? "#42a5f5" : "var(--secondary-text-color)"}" title="${trend}">
          <ha-icon icon="${tr >= 3 ? "mdi:arrow-up-bold" : tr >= 1 ? "mdi:arrow-top-right" : tr <= -3 ? "mdi:arrow-down-bold" : tr <= -1 ? "mdi:arrow-bottom-right" : "mdi:arrow-right"}"></ha-icon>${Math.abs(tr) >= 1 ? `<small>${tr > 0 ? "+" : ""}${tr.toFixed(1)}</small>` : ""}</div>
        ${st ? `<div class="badge" style="--c:${c}">${st[1]}</div>` : ""}</div></div>
      ${this._spark(c, pred)}
      ${ex ? `<div class="lbl">Šta očekivati</div><div class="exp" style="--c:${ex.col}"><svg class="wv b" viewBox="0 0 400 30" preserveAspectRatio="none"><path fill="currentColor" d="M0 15 Q 25 5 50 15 T 100 15 T 150 15 T 200 15 T 250 15 T 300 15 T 350 15 T 400 15 V 30 H 0 Z"/></svg><svg class="wv a" viewBox="0 0 400 30" preserveAspectRatio="none"><path fill="currentColor" d="M0 15 Q 25 5 50 15 T 100 15 T 150 15 T 200 15 T 250 15 T 300 15 T 350 15 T 400 15 V 30 H 0 Z"/></svg><div class="sym"><ha-icon icon="${ex.rain ? "mdi:weather-pouring" : ex.icon}"></ha-icon>${ex.rain ? `<span class="tr"><ha-icon icon="${ex.icon}"></ha-icon></span>` : ""}</div><div>${ex.txt}<small>Procjena iz prognoze kiše i uzvodnih stanica</small></div></div>` : ""}

      ${wx.length ? `<div class="lbl">Vrijeme</div><div class="wk">${days}</div>` : ""}
      ${wrows ? `<div class="fc2" style="margin-top:8px">${wrows}</div>` : ""}
      ${ups ? `<div class="lbl">Uzvodno</div><div class="up">${ups}</div>` : ""}
    </ha-card>`;
    const sv = this.shadowRoot.querySelector("svg.spark");
    if (sv) {
      const w = sv.getBoundingClientRect().width;
      if (w > 0 && Math.abs(w - (this._cw || 0)) > 4) { this._cw = w; requestAnimationFrame(() => this._render()); return; }
      if (!this._ro) { this._ro = new ResizeObserver(() => { const nw = this.shadowRoot.querySelector("svg.spark")?.getBoundingClientRect().width; if (nw && Math.abs(nw - (this._cw || 0)) > 4) { this._cw = nw; this._render(); } }); this._ro.observe(this); }
    }
    this.shadowRoot.querySelector(".big")?.addEventListener("click", () => this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: UNA }, bubbles: true, composed: true })));
    this.shadowRoot.querySelector(".wk")?.addEventListener("click", () => this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: "weather.home" }, bubbles: true, composed: true })));
  }
}

const R = "sensor.vikendica_router_";
class RipacNetCard extends RipacBase {
  _watch() {
    return [R + "rsrp", R + "signal_strength", R + "band", R + "4g_podaci_mjesecno", R + "sms_unread", R + "total_clients", R + "uptime",
      "binary_sensor.starlink_connectivity", "switch.wansview_nvr_preuzimanje_videa", "input_number.4g_mjesecni_limit_gb", "sensor.mesh_sadrvan_ap_status"];
  }
  _render() {
    if (!this._hass) return;
    const sl = this.st("binary_sensor.starlink_connectivity") === "on";
    const bars = Math.max(0, Math.min(5, parseInt(this.st(R + "signal_strength")) || 0));
    const rsrp = this.st(R + "rsrp");
    const mb = parseFloat(this.st(R + "4g_podaci_mjesecno")) || 0;
    const lim = parseFloat(this.st("input_number.4g_mjesecni_limit_gb")) || 0;
    const used = mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
    const sms = parseInt(this.st(R + "sms_unread")) || 0;
    const routerOk = !["unavailable", "unknown", undefined].includes(this.st(R + "uptime"));
    const mesh = this.st("sensor.mesh_sadrvan_ap_status");
    const vid = this.st("switch.wansview_nvr_preuzimanje_videa") === "on";
    const barHtml = [1, 2, 3, 4, 5].map((b) => `<i style="height:${4 + b * 3}px;background:${b <= bars ? "#7dd3fc" : "rgba(255,255,255,.18)"}"></i>`).join("");
    this.shadowRoot.innerHTML = `<style>${css}
      ha-card.net { background:linear-gradient(160deg,#16213a,#0d1424); color:#e8eefc; }
      .net .ttl, .net .tn, .net .uv { color:#fff; } .net .sub, .net .ts, .net .un { color:#9fb0cf; }
      .path { display:flex; align-items:center; gap:8px; margin:2px 0 12px; }
      .node { flex:1; padding:10px; border-radius:12px; background:rgba(255,255,255,.06); text-align:center; }
      .node.act { background:rgba(74,222,128,.14); box-shadow:inset 0 0 0 1px rgba(74,222,128,.45); }
      .node.idle { opacity:.75; }
      .node ha-icon { --mdc-icon-size:22px; color:#cfe0ff; } .node.act ha-icon { color:#4ade80; }
      .nn { font-size:12.5px; font-weight:700; margin-top:3px; } .ns { font-size:10.5px; color:#9fb0cf; }
      .arrow { color:#5b6b8c; font-size:18px; }
      .bars { display:inline-flex; align-items:flex-end; gap:2px; height:19px; vertical-align:middle; } .bars i { width:4px; border-radius:1px; }
      .grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
      .cell { padding:9px; border-radius:12px; background:rgba(255,255,255,.06); cursor:pointer; }
      .cell .uv { font-size:15px; } .cell.alert { background:rgba(74,222,128,.16); }
      .vrow { display:flex; align-items:center; gap:10px; margin-top:8px; padding:10px; border-radius:12px; background:rgba(255,255,255,.06); cursor:pointer; }
      .vrow .tx { flex:1; } .vrow .sw { background:${vid ? "#4ade80" : "rgba(255,255,255,.25)"}; }
      .vrow .sw::after { left:${vid ? "14px" : "2px"}; }
    </style><ha-card class="net">
      <div class="lbl" style="margin-top:0;color:#9fb0cf">Kako kuća ide na internet</div>
      <div class="path">
        <div class="node ${sl ? "act" : "idle"}"><ha-icon icon="mdi:satellite-uplink"></ha-icon><div class="nn">Starlink</div><div class="ns">${sl ? "glavna veza" : "bez veze"}</div></div>
        <div class="arrow">⇄</div>
        <div class="node ${routerOk ? "" : "idle"}"><ha-icon icon="mdi:router-wireless"></ha-icon><div class="nn">Cudy ruter</div><div class="ns">${routerOk ? (mesh === "online" ? "+ Šadrvan AP" : "Šadrvan AP offline") : "ne odgovara"}</div></div>
        <div class="arrow">⇄</div>
        <div class="node ${sl ? "idle" : "act"}"><ha-icon icon="mdi:signal-4g"></ha-icon><div class="nn">4G rezerva</div><div class="ns">${sl ? "čeka" : "AKTIVNA"} · <span class="bars">${barHtml}</span></div></div>
      </div>
      <div class="grid3">
        <div class="cell" data-e="${R}rsrp"><div class="un">4G signal</div><div class="uv">${rsrp ?? "–"} <span class="unit" style="font-size:11px">dBm</span></div><div class="ts">${esc(this.st(R + "band") || "")}</div></div>
        <div class="cell" data-e="${R}4g_podaci_mjesecno"><div class="un">4G ovaj mjesec</div><div class="uv">${used}</div><div class="ts">${lim ? `od ${lim} GB` : "bez limita"}</div></div>
        <div class="cell ${sms ? "alert" : ""}" data-nav="/cudy-router-sms"><div class="un">SMS poruke</div><div class="uv">${sms ? `${sms} nova` : "nema novih"}</div><div class="ts">otvori inbox ›</div></div>
      </div>
      <div class="vrow" data-tg="switch.wansview_nvr_preuzimanje_videa"><ha-icon icon="mdi:download-network" style="color:#7dd3fc"></ha-icon>
        <div class="tx"><div class="tn">Video sa solarnih kamera</div><div class="ts">${vid ? "preuzima se" : "pauzirano (štedi 4G)"} · ${esc(this.st(R + "total_clients") || "?")} uređaja na mreži</div></div><div class="sw"></div></div>
    </ha-card>`;
    this.shadowRoot.querySelectorAll("[data-e]").forEach((el) => el.addEventListener("click", () => this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: el.dataset.e }, bubbles: true, composed: true }))));
    this.shadowRoot.querySelectorAll("[data-nav]").forEach((el) => el.addEventListener("click", () => { history.pushState(null, "", el.dataset.nav); window.dispatchEvent(new CustomEvent("location-changed")); }));
    this.shadowRoot.querySelectorAll("[data-tg]").forEach((el) => el.addEventListener("click", () => this._hass.callService("homeassistant", "toggle", { entity_id: el.dataset.tg })));
  }
}

const CARE = [
  { n: "Filter klime", how: "očisti filter u klimi", i: "mdi:air-filter", c: "#26c6da", used: "sensor.dnevna_ripac_klima_sati_od_servisa", max: 300, unit: "h rada", date: "input_datetime.servis_klima_filter", act: "SERVIS_KLIMA" },
  { n: "Kamenac u bojleru", how: "očisti grijač bojlera", i: "mdi:water-boiler", c: "#ef5350", used: "sensor.bojler_vikendica_bojler_kwh_od_servisa", max: 1500, unit: "kWh", date: "input_datetime.servis_bojler_kamenac", days: 365, act: "SERVIS_BOJLER" },
  { n: "Paneli solarnih kamera", how: "obriši male panele na kamerama", i: "mdi:solar-panel", c: "#ffca28", date: "input_datetime.servis_paneli_kamera", days: 60, act: "SERVIS_PANELI" },
  { n: "Ventilator invertera", how: "očisti prašinu s ventilatora", i: "mdi:fan", c: "#ff7043", date: "input_datetime.servis_inverter_ventilator", days: 180, temp: "sensor.ripac_q0048088723771_ripac_inverter_temperature", act: "SERVIS_INVERTER" },
];
const GUARD = [
  { e: "automation.zastita_smrzavanje", n: "Smrzavanje cijevi", d: "Soba ispod 5 °C → klima grije na 7 °C i pali konvektor", i: "mdi:snowflake-alert", c: "#4fc3f7" },
  { e: "automation.zastita_vlaga_i_bud", n: "Vlaga i buđ", d: "Vlaga >68 % → odvlaživač ili klima na sušenje (samo kad ima struje)", i: "mdi:water-percent", c: "#26a69a" },
  { e: "automation.zastita_greske_klime", n: "Kvar klime", d: "Javlja čim klima prijavi grešku", i: "mdi:air-conditioner", c: "#ffa726" },
  { e: "automation.zastita_zdravlje_sistema", n: "Uređaji offline", d: "Javlja kad bitan uređaj ne radi duže od 1 h", i: "mdi:heart-pulse", c: "#ec407a" },
];
class RipacCareCard extends RipacBase {
  _watch() {
    return [...CARE.flatMap((x) => [x.used, x.date, x.temp].filter(Boolean)), ...GUARD.map((g) => g.e), "sensor.najvisa_vlaga_u_kuci", "sensor.najniza_temperatura_u_kuci"];
  }
  _render() {
    if (!this._hass) return;
    const days = (e) => {
      const v = this.st(e);
      if (!v || v === "unknown") return 0;
      return Math.max(0, Math.floor((Date.now() - new Date(v + "T00:00:00").getTime()) / 86400000));
    };
    const items = CARE.map((x) => {
      const d = days(x.date);
      let pct, txt;
      if (x.used) {
        const u = parseFloat(this.st(x.used)) || 0;
        pct = Math.max(u / x.max, x.days ? d / x.days : 0);
        txt = `${Math.round(u)} / ${x.max} ${x.unit}${x.days ? ` · ${d} od ${x.days} dana` : ""}`;
      } else {
        pct = d / x.days;
        txt = `${d} od ${x.days} dana`;
      }
      const t = x.temp ? parseFloat(this.st(x.temp)) : null;
      if (t && t >= 60) pct = Math.max(pct, 1);
      if (t) txt += ` · ${t} °C`;
      const due = pct >= 1;
      const col = due ? "#ef5350" : pct >= 0.8 ? "#ffb300" : x.c;
      return `<div class="ci"><div class="ti" style="background:${col};color:#fff"><ha-icon icon="${x.i}"></ha-icon></div>
        <div class="tx"><div class="tn">${x.n}${due ? ` <span style="color:#ef5350">· na redu</span>` : ""}</div>
        <div class="bar"><i style="width:${Math.min(100, pct * 100).toFixed(0)}%;background:${col}"></i></div>
        <div class="ts">${txt} · ${x.how}</div></div>
        <button class="done" data-act="${x.act}" title="Urađeno">✓</button></div>`;
    }).join("");
    const guards = GUARD.filter((g) => this._hass.states[g.e]).map((g) => {
      const on = this.st(g.e) === "on";
      return `<div class="t ${on ? "on" : ""}" data-e="${g.e}" style="--c:${g.c}"><div class="ti"><ha-icon icon="${g.i}"></ha-icon></div>
        <div class="tx"><div class="tn">${g.n}</div><div class="ts" style="white-space:normal">${g.d}</div></div><div class="sw"></div></div>`;
    }).join("");
    this.shadowRoot.innerHTML = `<style>${css}
      .ci { display:flex; align-items:center; gap:10px; padding:9px 0; border-top:1px solid rgba(127,127,127,.12); }
      .ci:first-of-type { border-top:0; }
      .bar { height:6px; border-radius:3px; background:rgba(127,127,127,.18); margin:5px 0 4px; overflow:hidden; } .bar i { display:block; height:100%; border-radius:3px; }
      .ci .ts { white-space:normal; }
      .done { border:0; width:32px; height:32px; border-radius:10px; background:rgba(127,127,127,.14); color:var(--primary-text-color); font-size:15px; cursor:pointer; flex:none; }
      .done:active { background:#43a047; color:#fff; }
      .tg1 { display:grid; grid-template-columns:1fr; gap:8px; }
      .note { font-size:12px; color:var(--secondary-text-color); margin:-2px 2px 8px; line-height:1.4; }
    </style><ha-card>
      <div class="lbl" style="margin-top:0">Održavanje</div>
      <div class="note">Brojim koliko je šta radilo od zadnjeg čišćenja. Kad nešto dođe do kraja, dobiješ obavijest; kad ga očistiš, dodirni ✓ da brojač krene ispočetka.</div>
      ${items}
      <div class="lbl">Automatska zaštita kuće</div>
      <div class="note">Spremno, ali ugašeno. Uključi ono što želiš da kuća radi sama dok nikoga nema (sad: vlaga do ${esc(this.st("sensor.najvisa_vlaga_u_kuci"))} %, najhladnije ${esc(this.st("sensor.najniza_temperatura_u_kuci"))} °C).</div>
      <div class="tg1">${guards}</div></ha-card>`;
    this.shadowRoot.querySelectorAll(".done").forEach((b) => b.addEventListener("click", () => {
      const x = CARE.find((c) => c.act === b.dataset.act);
      if (!confirm(`${x.n}: označiti kao urađeno danas?`)) return;
      if (x.used) this._hass.callService("utility_meter", "calibrate", { entity_id: x.used, value: "0" });
      const n = new Date();
      this._hass.callService("input_datetime", "set_datetime", { entity_id: x.date, date: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}` });
    }));
    this.shadowRoot.querySelectorAll(".t").forEach((el) => el.addEventListener("click", () => this._hass.callService("homeassistant", "toggle", { entity_id: el.dataset.e })));
  }
}

const Q = "sensor.ripac_q0048088723771_ripac_";
class RipacSolarCard extends RipacBase {
  _watch() {
    return [Q + "solar_power", Q + "grid_power", Q + "output_power", Q + "battery_power", Q + "load_percentage", Q + "battery_voltage", Q + "energy_today",
      "sensor.baterija_soc_stabilno", "select.ripac_q0048088723771_ripac_output_priority", "sensor.tarifa_struje", "input_boolean.pametno_upravljanje_solarom",
      "sensor.energy_production_today", "sensor.energy_production_tomorrow", "sensor.baterije_energija_bms", "sensor.sh24100_h_01606_battery", "sensor.sh24100_h_01488_battery", "binary_sensor.visak_solara"];
  }
  _render() {
    if (!this._hass) return;
    const n = (e) => parseFloat(this.st(e)) || 0;
    const sol = n(Q + "solar_power"), grid = n(Q + "grid_power"), load = n(Q + "output_power"), bat = n(Q + "battery_power"), soc = n("sensor.baterija_soc_stabilno");
    const inv = n(Q + "load_percentage");
    const mode = this.st("select.ripac_q0048088723771_ripac_output_priority") || "";
    const tar = this.st("sensor.tarifa_struje") || "";
    const ai = this.st("input_boolean.pametno_upravljanje_solarom") === "on";
    const visak = this.st("binary_sensor.visak_solara") === "on";
    const pvToday = n(Q + "energy_today"), fcToday = n("sensor.energy_production_today"), fcTom = n("sensor.energy_production_tomorrow");
    const W = (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)} kW` : `${Math.round(v)} W`);
    const status = grid > 30 ? `Kuća je na mreži${sol > 20 ? ", solar puni bateriju" : ""}` : sol > 20 && sol >= load ? "Kuća radi na solaru" + (bat > 20 ? ", višak puni bateriju" : "") : "Kuća radi na bateriji";
    const invUse = Math.max(0, sol + grid - bat - load);
    const uses = `Potrošnja ${W(load + invUse)} · kuća ${W(load)} + inverter ${W(invUse)}`;
    // flows: [active, reverse]
    const f = { sol: sol > 20, grid: Math.abs(grid) > 30, load: load > 5, bat: Math.abs(bat) > 20 };
    const C = { sol: "#ffca28", grid: "#b39ddb", load: "#90caf9", bat: "#69f0ae" };
    const socCol = soc < 25 ? "#ef5350" : soc < 50 ? "#ffb300" : C.bat;
    const R = 34, circ = 2 * Math.PI * R;
    const batIcon = soc >= 95 ? "mdi:battery" : bat > 20 ? `mdi:battery-charging-${Math.max(10, Math.round(soc / 10) * 10)}` : `mdi:battery-${Math.max(10, Math.round(soc / 10) * 10)}`;
    const path = (id, d, on, col, rev) => `<path id="${id}" d="${d}" fill="none" stroke="${on ? col : "rgba(255,255,255,.10)"}" stroke-width="${on ? 3 : 2}" stroke-linecap="round" ${on ? `style="filter:drop-shadow(0 0 4px ${col})"` : ""}/>` +
      (on ? [0, 0.5].map((b) => `<circle r="3.2" fill="#fff"><animateMotion dur="1.6s" begin="${b * 1.6}s" repeatCount="indefinite" keyPoints="${rev ? "1;0" : "0;1"}" keyTimes="0;1" calcMode="linear"><mpath href="#${id}"/></animateMotion></circle>`).join("") : "");
    const pos = (x, y) => `left:${(x / 320) * 100}%;top:${(y / 250) * 100}%`;
    const nd = (x, y, col, icon, val, sub, on) => `<div class="nd ${on ? "on" : ""}" style="${pos(x, y)};--c:${col}"><ha-icon icon="${icon}"></ha-icon><div class="nv">${val}</div>${sub ? `<div class="nsb">${sub}</div>` : ""}</div>`;
    const svg = `<div class="fw"><svg viewBox="0 0 320 250">
      ${path("p1", "M160,74 L160,105", f.sol, C.sol)}
      ${path("p2", "M74,125 L140,125", f.grid, C.grid, grid < 0)}
      ${path("p3", "M180,125 L246,125", f.load, C.load)}
      ${path("p4", "M160,145 L160,176", f.bat, C.bat, bat < 0)}
      <circle cx="160" cy="210" r="${R}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="4"/>
      <circle cx="160" cy="210" r="${R}" fill="none" stroke="${socCol}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(soc / 100) * circ} ${circ}" transform="rotate(-90 160 210)"/>
    </svg>
      ${nd(160, 40, C.sol, "mdi:solar-panel-large", W(sol), visak ? "višak" : "solar", f.sol)}
      ${nd(40, 125, C.grid, "mdi:transmission-tower", W(grid), esc(tar).toLowerCase() || "mreža", f.grid)}
      ${nd(280, 125, C.load, "mdi:home-lightning-bolt", W(load), "kuća", f.load)}
      <div class="nd ctr" style="${pos(160, 125)}" title="Opterećenje ${Math.round(inv)}%"><ha-icon icon="mdi:sine-wave"></ha-icon><div class="cv">${W(invUse)}</div><div class="nsb">inverter</div></div>
      ${nd(160, 210, socCol, batIcon, `${Math.round(soc)}%`, bat > 20 ? `+${W(bat)}` : bat < -20 ? `−${W(-bat)}` : "miruje", f.bat)}
    </div>`;
    const cyc = this.st("sensor.ciklusi_baterije"), vmin = this.st("sensor.ripac_q0048088723771_baterija_napon_min_24h"), vnow = this.st(Q + "battery_voltage");
    this.shadowRoot.innerHTML = `<style>${css}
      ha-card.sol { background:radial-gradient(110% 80% at 50% 35%,#24304a,#121826 70%); color:#fff; }
      .sol .ttl { color:#fff; } .sol .sub { color:#a9b6cf; }
      .top { display:flex; align-items:center; gap:8px; }
      .pill { font-size:11.5px; font-weight:700; padding:5px 10px; border-radius:10px; background:rgba(255,255,255,.08); color:#e8eefc; cursor:pointer; white-space:nowrap; }
      .pill.ai { display:flex; align-items:center; gap:4px; } .pill.ai.on { background:rgba(105,240,174,.18); color:#69f0ae; }
      .pill ha-icon { --mdc-icon-size:15px; }
      .fw { position:relative; width:100%; max-width:400px; aspect-ratio:320/250; margin:6px auto 0; }
      .fw svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
      .nd { position:absolute; transform:translate(-50%,-50%); width:21.25%; aspect-ratio:1; border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center;
        background:rgba(255,255,255,.05); box-shadow:inset 0 0 0 2px rgba(255,255,255,.10); transition:all .3s; }
      .nd.on { background:color-mix(in srgb,var(--c) 14%,transparent); box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--c) 55%,transparent), 0 0 18px color-mix(in srgb,var(--c) 25%,transparent); }
      .nd ha-icon { --mdc-icon-size:22px; color:rgba(255,255,255,.45); } .nd.on ha-icon { color:var(--c); }
      .nv { font-size:15px; font-weight:800; color:#fff; line-height:1.15; margin-top:1px; }
      .nsb { font-size:10px; color:#a9b6cf; }
      .nd.ctr { width:15.5%; background:rgba(255,255,255,.08); } .nd.ctr ha-icon { --mdc-icon-size:15px; color:#cfd8ea; } .nd.ctr .cv { font-size:11.5px; font-weight:800; color:#fff; line-height:1.1; } .nd.ctr .nsb { font-size:8.5px; }
      .nd:last-of-type { box-shadow:none; background:color-mix(in srgb,var(--c) 10%,transparent); }
      .kp { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-top:8px; }
      .k { padding:9px; border-radius:12px; background:rgba(255,255,255,.06); cursor:pointer; }
      .kl { font-size:10.5px; font-weight:700; letter-spacing:.4px; text-transform:uppercase; color:#a9b6cf; }
      .kv { font-size:16px; font-weight:800; margin-top:2px; } .kv small { font-size:11px; font-weight:600; color:#a9b6cf; }
      .ks { font-size:11px; color:#a9b6cf; margin-top:1px; }
      .pb2 { height:4px; border-radius:2px; background:rgba(255,255,255,.1); margin-top:5px; overflow:hidden; } .pb2 i { display:block; height:100%; background:#ffca28; border-radius:2px; }
    </style><ha-card class="sol">
      <div class="top"><div style="flex:1">${this._config.no_title ? `<div class="ttl" style="font-size:15px">${status}</div><div class="sub">${uses}</div>` : `<div class="ttl">Solar i baterija</div><div class="sub">${status}</div><div class="sub">${uses}</div>`}</div>
        <div class="pill" data-e="select.ripac_q0048088723771_ripac_output_priority" title="Režim invertera">${{ SOL: "☀️ Solar prvo", SBU: "🔋 Solar → baterija → mreža", SUB: "☀️ Solar → mreža → baterija", UTI: "🔌 Mreža prvo" }[mode.trim()] || esc(mode.trim())}</div>
        <div class="pill ai ${ai ? "on" : ""}" data-tg="input_boolean.pametno_upravljanje_solarom" title="Pametno upravljanje"><ha-icon icon="mdi:robot"></ha-icon>${ai ? "Pametno: uklj." : "Pametno: isklj."}</div></div>
      ${svg}
      <div class="kp">
        <div class="k" data-e="${Q}energy_today"><div class="kl">Solar danas</div><div class="kv">${pvToday.toFixed(1)} <small>kWh</small></div>
          <div class="pb2"><i style="width:${fcToday ? Math.min(100, (pvToday / fcToday) * 100) : 0}%"></i></div><div class="ks">prognoza ${fcToday.toFixed(1)} kWh</div></div>
        <div class="k" data-e="sensor.energy_production_tomorrow"><div class="kl">Sutra</div><div class="kv">${fcTom.toFixed(1)} <small>kWh</small></div>
          <div class="ks">${fcTom >= 10 ? "☀️ dobar dan" : fcTom >= 4 ? "⛅ osrednje" : "☁️ slabo sunca"}</div></div>
        <div class="k" data-nav="/ripac-odrzavanje/pregled"><div class="kl">Baterije</div><div class="kv">${(n("sensor.baterije_energija_bms") || soc / 100 * 6.4).toFixed(1)} <small>/ 6.4 kWh</small></div>
          <div class="ks">${["sh24100_h_01606", "sh24100_h_01488"].map((b) => this.st(`sensor.${b}_battery`)).filter((x) => x && !isNaN(x)).map((x) => Math.round(x) + "%").join(" · ") || "BMS –"} · ${esc(vnow ?? "–")} V</div>
          <div class="ks">${(() => { const c = ["sh24100_h_01606", "sh24100_h_01488"].map((b) => parseFloat(this.st(`sensor.${b}_cycles`))).filter((x) => !isNaN(x)); const t = parseFloat(this.st("sensor.baterije_najniza_temperatura")); return `${c.length ? Math.round(c.reduce((a, b) => a + b, 0) / c.length) + " ciklusa" : ""}${!isNaN(t) ? ` · ${t.toFixed(0)} °C` : ""}`; })()}</div></div>
      </div></ha-card>`;
    const root = this.shadowRoot;
    root.querySelectorAll("[data-e]").forEach((el) => el.addEventListener("click", () => this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: el.dataset.e }, bubbles: true, composed: true }))));
    root.querySelectorAll("[data-tg]").forEach((el) => el.addEventListener("click", () => this._hass.callService("homeassistant", "toggle", { entity_id: el.dataset.tg })));
    root.querySelectorAll("[data-nav]").forEach((el) => el.addEventListener("click", () => { history.pushState(null, "", el.dataset.nav); window.dispatchEvent(new CustomEvent("location-changed")); }));
  }
}

class RipacBriefCard extends RipacBase {
  _watch() {
    return ["input_boolean.sazetak_engleski", ...PROTOCOLS.map((p) => p.e)];
  }
  set hass(h) {
    super.hass = h;
    if (!this._sub && this._config?.template) {
      this._sub = h.connection
        .subscribeMessage((m) => { if (m.result !== undefined) { this._out = String(m.result); this._render(); } }, { type: "render_template", template: this._config.template })
        .catch(() => (this._sub = null));
    }
  }
  disconnectedCallback() {
    if (this._sub) this._sub.then((u) => u && u()).catch(() => {});
    this._sub = null;
  }
  connectedCallback() {
    if (this._hass && !this._sub) this.hass = this._hass;
  }
  _render() {
    if (!this._hass) return;
    const en = this.st("input_boolean.sazetak_engleski") === "on";
    const html = (this._out || "").replace(/\n/g, " ");
    this.shadowRoot.innerHTML = `<style>
      :host { display:block; } .b { position:relative; padding:4px 2px; color:var(--primary-text-color); font-size:15px; line-height:1.6; }
      .b h2 { margin:0 64px 8px 0; font-size:22px; font-weight:700; }
      .lang { position:absolute; top:4px; right:2px; display:flex; background:rgba(127,127,127,.15); border-radius:10px; padding:2px; }
      .lang button { border:0; background:transparent; color:var(--secondary-text-color); font:inherit; font-size:11.5px; font-weight:800; padding:4px 8px; border-radius:8px; cursor:pointer; }
      .lang button.on { background:var(--card-background-color,#262626); color:var(--primary-text-color); box-shadow:0 1px 3px rgba(0,0,0,.3); }
      .acts { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-top:12px; }
      .act { border:0; cursor:pointer; border-radius:12px; padding:11px 4px; font:inherit; font-size:13px; font-weight:700; color:var(--primary-text-color);
        background:rgba(127,127,127,.14); transition:background .2s, transform .1s; }
      .act:active { transform:scale(.96); } .act:hover { background:color-mix(in srgb,var(--c) 25%,transparent); }
      .act.run { background:var(--c); color:#fff; }
    </style><div class="b"><div class="lang"><button data-l="bs" class="${en ? "" : "on"}">BS</button><button data-l="en" class="${en ? "on" : ""}">EN</button></div>${html}
      ${this._config.protocols ? `<div class="acts">${PROTOCOLS.filter((p) => this._hass.states[p.e]).map((p) => `<button class="act ${this.st(p.e) === "on" ? "run" : ""}" data-e="${p.e}" style="--c:${p.c}">${en ? { Dolazak: "Arrive", Odlazak: "Leave", Noć: "Night", Poplava: "Flood" }[p.n] : p.n}</button>`).join("")}</div>` : ""}</div>`;
    this.shadowRoot.querySelectorAll(".act").forEach((b) =>
      b.addEventListener("click", () => {
        const p = PROTOCOLS.find((x) => x.e === b.dataset.e);
        if (p.q && !confirm(p.q)) return;
        this._hass.callService("script", "turn_on", { entity_id: p.e });
        b.classList.add("run");
      })
    );
    this.shadowRoot.querySelectorAll(".lang button").forEach((b) =>
      b.addEventListener("click", () => this._hass.callService("input_boolean", b.dataset.l === "en" ? "turn_on" : "turn_off", { entity_id: "input_boolean.sazetak_engleski" }))
    );
  }
}

class RipacAcChip extends HTMLElement {
  setConfig(c) {
    this._c = { entity: "climate.ripac_ripac", ...c };
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
  }
  set hass(h) {
    const ids = [this._c.entity, this._c.power, this._c.energy].filter(Boolean);
    const changed = !this._h || ids.some((e) => this._h.states[e] !== h.states[e]);
    this._h = h;
    if (changed || !this._done) this._render();
  }
  _svc(service, data) {
    this._h.callService("climate", service, { entity_id: this._c.entity, ...data });
  }
  _render() {
    const s = this._h?.states[this._c.entity];
    if (!s) return;
    this._done = true;
    const a = s.attributes, mode = s.state, on = mode !== "off" && mode !== "unavailable";
    const part = this._c.part || "all";
    this.style.display = part === "controls" && !on ? "none" : "";
    if (part === "controls" && !on) { this.shadowRoot.innerHTML = ""; return; }
    const M = { heat: ["Grije", "#ff7043", "mdi:fire"], cool: ["Hladi", "#4fc3f7", "mdi:snowflake"], dry: ["Suši", "#26a69a", "mdi:water-percent"], fan_only: ["Ventilator", "#b0bec5", "mdi:fan"] };
    const col = on && M[mode] ? M[mode][1] : "#9e9e9e";
    const t = a.temperature;
    const icon0 = this._c.icon || "mdi:air-conditioner";
    const pv = this._c.power ? parseFloat(this._h.states[this._c.power]?.state) : NaN;
    const ev = this._c.energy ? parseFloat(this._h.states[this._c.energy]?.state) : NaN;
    const pTxt = !isNaN(pv) && pv > 5 ? (pv >= 1000 ? `${(pv / 1000).toFixed(1)} kW` : `${Math.round(pv)} W`) : "";
    const eTxt = !isNaN(ev) && ev > 0.05 ? `${ev.toFixed(1)} kWh danas` : "";
    const extra = [pTxt, eTxt].filter(Boolean).join(" · ");
    const modes = ["heat", "cool", "dry", "fan_only"].filter((m) => (a.hvac_modes || []).includes(m));
    const fanTxt = { auto: "auto", low: "1", middle_low: "2", medium: "3", middle_high: "4", high: "5" }[a.fan_mode] || a.fan_mode || "";
    this.shadowRoot.innerHTML = `<style>
      .c { display:flex; align-items:center; gap:4px; padding:4px; border-radius:22px; background:rgba(0,0,0,.55);
        backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); color:#fff; font:600 12.5px Inter,Roboto,sans-serif; white-space:nowrap;
        box-shadow:${on ? `0 0 0 1.5px ${col}, 0 0 14px ${col}55` : "0 0 0 1px rgba(255,255,255,.15)"}; }
      .ttl { display:flex; align-items:center; gap:5px; padding:0 8px 0 8px; height:32px; border-radius:16px; cursor:pointer; }
      .ttl:hover { background:rgba(255,255,255,.08); }
      .ttl ha-icon { --mdc-icon-size:17px; color:${col}; }
      .sep { width:1px; height:20px; background:rgba(255,255,255,.15); margin:0 2px; }
      button { border:0; width:32px; height:32px; border-radius:50%; background:transparent; color:#fff; font:700 18px/1 Inter,Roboto,sans-serif;
        cursor:pointer; padding:0; display:flex; align-items:center; justify-content:center; }
      button:hover { background:rgba(255,255,255,.12); }
      button:active { transform:scale(.92); }
      button ha-icon { --mdc-icon-size:17px; }
      .pw { background:${on ? col : "rgba(255,255,255,.14)"}; }
      .t { font-size:16px; font-weight:800; min-width:34px; text-align:center; }
    </style><div class="c">
      ${part === "controls"
        ? `<div class="ttl" title="Dodirni za promjenu režima"><ha-icon icon="${M[mode] ? M[mode][2] : "mdi:air-conditioner"}"></ha-icon>${M[mode] ? M[mode][0] : mode}</div>
           <div class="sep"></div><button class="dn">−</button><span class="t">${t ?? "–"}°</span><button class="up">+</button>`
        : `<div class="ttl stat"><ha-icon icon="${on && M[mode] ? M[mode][2] : icon0}"></ha-icon>${this._c.compact ? (on ? `${t ?? "–"}°${pTxt ? ` <span style="opacity:.75;font-weight:500">${pTxt}</span>` : ""}` : "") : on ? `${this._c.name || "Klima"} · ${t ?? "–"}°${extra ? ` <span style="opacity:.75;font-weight:500">· ${extra}</span>` : ""}` : `${this._c.name || "Klima"} · ${this._c.off_text || "ugašena"}${eTxt ? ` <span style="opacity:.75;font-weight:500">· ${eTxt}</span>` : ""}`}</div>
           <button class="pw" title="${on ? "Ugasi" : "Upali"}"><ha-icon icon="mdi:power"></ha-icon></button>`}
    </div>`;
    const R = this.shadowRoot;
    const step = a.target_temp_step || 1;
    const sane = (m) => (m === "cool" ? (t && t >= 22 && t <= 28 ? t : 24) : m === "heat" ? (t && t >= 16 && t <= 24 ? t : 21) : t || 22);
    const more = () => this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: this._c.entity }, bubbles: true, composed: true }));
    const ttl = R.querySelector(".ttl");
    let lp;
    ttl.addEventListener("pointerdown", () => (lp = setTimeout(() => ((lp = null), more()), 600)));
    ttl.addEventListener("pointerleave", () => clearTimeout(lp));
    ttl.addEventListener("pointerup", () => {
      if (!lp) return;
      clearTimeout(lp);
      if (!on || part !== "controls") return more();
      const i = modes.indexOf(mode);
      setMode(modes[(i + 1) % modes.length]);
    });
    if (R.querySelector(".dn")) R.querySelector(".dn").onclick = () => this._svc("set_temperature", { temperature: Math.max(a.min_temp || 16, (t || 21) - step) });
    if (R.querySelector(".up")) R.querySelector(".up").onclick = () => this._svc("set_temperature", { temperature: Math.min(a.max_temp || 32, (t || 21) + step) });
    const setMode = async (m) => {
      await this._h.callService("climate", "set_hvac_mode", { entity_id: this._c.entity, hvac_mode: m });
      if (m === "heat" || m === "cool") {
        const want = sane(m);
        if (want !== t) setTimeout(() => this._svc("set_temperature", { temperature: want }), 1500);
      }
    };
    if (R.querySelector(".pw")) R.querySelector(".pw").onclick = () => (on ? this._svc("set_hvac_mode", { hvac_mode: "off" }) : setMode("heat"));

  }
}

class RipacSwitchChip extends HTMLElement {
  setConfig(c) {
    this._c = { name: "Uređaj", icon: "mdi:power", color: "#ff7043", on_text: "radi", off_text: "ugašen", ...c };
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
  }
  set hass(h) {
    const ids = [this._c.entity, this._c.power].filter(Boolean);
    const changed = !this._h || ids.some((e) => this._h.states[e] !== h.states[e]);
    this._h = h;
    if (changed) this._render();
  }
  _render() {
    const s = this._h?.states[this._c.entity];
    if (!s) return;
    const on = s.state === "on", col = this._c.color;
    const p = this._c.power ? parseFloat(this._h.states[this._c.power]?.state) : NaN;
    const pw = !isNaN(p) && p > 1 ? (p >= 1000 ? `${(p / 1000).toFixed(1)} kW` : `${Math.round(p)} W`) : "";
    this.shadowRoot.innerHTML = `<style>
      .c { display:flex; align-items:center; gap:4px; padding:4px 4px 4px 10px; border-radius:22px; background:rgba(0,0,0,.55);
        backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); color:#fff; font:600 12.5px Inter,Roboto,sans-serif; white-space:nowrap; cursor:pointer;
        box-shadow:${on ? `0 0 0 1.5px ${col}, 0 0 14px ${col}55` : "0 0 0 1px rgba(255,255,255,.15)"}; user-select:none; }
      .c ha-icon { --mdc-icon-size:17px; }
      .i { color:${on ? col : "#bbb"}; display:flex; }
      .pw { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:${on ? col : "rgba(255,255,255,.14)"}; margin-left:4px; }
      .w { opacity:.75; font-weight:500; }
    </style><div class="c"><span class="i"><ha-icon icon="${this._c.icon}"></ha-icon></span>
      ${this._c.compact ? (on ? `<span>${pw || this._c.on_text}</span>` : "") : `<span>${this._c.name} · ${on ? this._c.on_text : this._c.off_text}${on && pw ? ` <span class="w">${pw}</span>` : ""}</span>`}
      <span class="pw"><ha-icon icon="mdi:power"></ha-icon></span></div>`;
    const c = this.shadowRoot.querySelector(".c");
    let lp;
    c.addEventListener("pointerdown", () => (lp = setTimeout(() => { lp = null; this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: this._c.entity }, bubbles: true, composed: true })); }, 600)));
    c.addEventListener("pointerleave", () => clearTimeout(lp));
    c.addEventListener("pointerup", () => { if (!lp) return; clearTimeout(lp); this._h.callService("homeassistant", "toggle", { entity_id: this._c.entity }); });
  }
}


/* ---------- Vozila: poznata / nepoznata (todo.poznata_vozila, polja u opisu) ---------- */
const VKEYS = ["model", "boja", "vlasnik", "mobitel", "poznato", "viđeno"];
function vParse(desc) {
  const o = {};
  (desc || "").split("\n").forEach((l) => { const m = l.match(/^\s*([^:]+):\s*(.*)$/); if (m) o[m[1].trim().toLowerCase()] = m[2].trim(); });
  return o;
}
function vDesc(o) { return VKEYS.map((k) => `${k}: ${o[k] || ""}`).join("\n"); }
function vPlate(x) { return (x || "").toUpperCase().replace(/[^A-Z0-9ŠĐČĆŽ]/g, ""); }
function vEsc(x) { return String(x || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }

class RipacVozilaCard extends HTMLElement {
  setConfig(c) { this._c = Object.assign({ entity: "todo.poznata_vozila", title: "Vozila" }, c || {}); if (!this.shadowRoot) this.attachShadow({ mode: "open" }); }
  set hass(h) {
    this._hass = h;
    const st = h.states[this._c.entity];
    const key = st ? st.state + st.last_updated : "";
    if (key !== this._key && !this._editing()) { this._key = key; this._load(); }
  }
  getCardSize() { return 4; }
  _editing() { const a = this.shadowRoot && this.shadowRoot.activeElement; return !!(a && a.tagName === "INPUT"); }
  async _load() {
    try {
      const r = await this._hass.callWS({ type: "call_service", domain: "todo", service: "get_items", target: { entity_id: this._c.entity }, return_response: true });
      this._items = (r.response[this._c.entity] || {}).items || [];
    } catch (e) { this._items = []; }
    this._img = this._img || {};
    await Promise.all(this._items.map(async (it) => {
      try {
        const r = await this._hass.callWS({ type: "media_source/resolve_media", media_content_id: `media-source://media_source/local/vozila/${vPlate(it.summary)}.jpg`, expires: 3600 });
        this._img[it.summary] = r.url;
      } catch (e) { this._img[it.summary] = null; }
    }));
    this._render();
  }
  async _svc(service, data) { await this._hass.callService("todo", service, data, { entity_id: this._c.entity }); }
  async _save(uid) {
    const it = this._items.find((i) => i.uid === uid); if (!it) return;
    const row = this.shadowRoot.querySelector(`[data-uid="${uid}"]`);
    const o = vParse(it.description);
    row.querySelectorAll("input[data-k], select[data-k]").forEach((i) => { o[i.dataset.k] = i.type === "checkbox" ? (i.checked ? "da" : "ne") : i.value.trim(); });
    const plate = vPlate(row.querySelector("input[data-plate]").value) || it.summary;
    await this._svc("update_item", { item: uid, rename: plate, description: vDesc(o) });
  }
  async _add() {
    const f = this.shadowRoot.querySelector(".new");
    const plate = vPlate(f.querySelector("[data-n=tab]").value);
    if (!plate) { f.querySelector("[data-n=tab]").focus(); return; }
    const o = { model: f.querySelector("[data-n=model]").value.trim(), boja: f.querySelector("[data-n=boja]").value.trim(),
      vlasnik: f.querySelector("[data-n=vl]").value.trim(), poznato: "da", "viđeno": "" };
    await this._svc("add_item", { item: plate, description: vDesc(o) });
    this._adding = false;
  }
  _phones() {
    const st = this._hass.states;
    return Object.keys(st).filter((e) => {
      if (!e.startsWith("device_tracker.")) return false;
      const a = st[e].attributes;
      if (a.source_type !== "router") return /mobitel/.test(e);
      const b = parseInt(String(a.mac || "").slice(0, 2), 16);
      return /mobitel|phone|iphone|android|galaxy/i.test(e + (a.hostname || "")) || (!isNaN(b) && (b & 2));
    });
  }
  _phoneOpts(cur) {
    const st = this._hass.states;
    const list = this._phones(); if (cur && !list.includes(cur)) list.push(cur);
    return `<option value="">— nema —</option>` + list.map((e) => {
      const s = st[e]; const nm = s ? (s.attributes.friendly_name || e) : e;
      return `<option value="${e}" ${e === cur ? "selected" : ""}>${vEsc(nm)}${s && s.state === "home" ? " · na WiFi-ju" : ""}</option>`;
    }).join("");
  }
  async _syncPhones() {
    const m = {};
    (this._items || []).forEach((it) => { const o = vParse(it.description); if (o.mobitel && o.poznato === "da") m[o.mobitel] = o.vlasnik || it.summary; });
    const v = JSON.stringify(m);
    if (v.length <= 255 && this._hass.states["input_text.poznati_mobiteli"] && this._hass.states["input_text.poznati_mobiteli"].state !== v)
      await this._hass.callService("input_text", "set_value", { entity_id: "input_text.poznati_mobiteli", value: v });
  }
  _render() {
    if (!this._hass) return;
    const items = (this._items || []).map((it) => ({ it, o: vParse(it.description) }))
      .sort((a, b) => (a.o.poznato === "da") - (b.o.poznato === "da") || (b.o["viđeno"] || "").localeCompare(a.o["viđeno"] || ""));
    const rows = items.map(({ it, o }) => {
      const kn = o.poznato === "da";
      const im = (this._img || {})[it.summary];
      return `<div class="v ${kn ? "kn" : "un"}" data-uid="${it.uid}">
        ${im ? `<img class="ph" src="${im}" onerror="this.remove()" loading="lazy">` : ""}
        <div class="top"><input class="plate" data-plate value="${vEsc(it.summary)}" spellcheck="false">
          <span class="tag">${kn ? "Poznato" : "Nepoznato"}</span>
          <label class="sw"><input type="checkbox" data-k="poznato" ${kn ? "checked" : ""}><i></i></label>
          <button class="del" title="Obriši"><ha-icon icon="mdi:trash-can-outline"></ha-icon></button></div>
        <div class="grid">
          <label>Model<input data-k="model" value="${vEsc(o.model)}" placeholder="npr. VW Golf 7"></label>
          <label>Boja<input data-k="boja" value="${vEsc(o.boja)}" placeholder="boja"></label>
          <label class="wide">Vlasnik<input data-k="vlasnik" list="osobe" value="${vEsc(o.vlasnik)}" placeholder="izaberi osobu ili upiši"></label>
        </div>
        ${o["viđeno"] ? `<div class="seen"><ha-icon icon="mdi:eye-outline"></ha-icon>${vEsc(o["viđeno"])}</div>` : ""}
      </div>`;
    }).join("") || `<div class="empty">Još nema vozila. Kamera ih sama dodaje kad ih vidi, ili dodaj ručno.</div>`;
    const nUn = items.filter((x) => x.o.poznato !== "da").length;
    this.shadowRoot.innerHTML = `<style>
      ha-card { padding:14px 14px 12px; }
      .hd { display:flex; align-items:center; gap:8px; font-size:16px; font-weight:600; margin-bottom:10px; }
      .hd ha-icon { --mdc-icon-size:22px; color:var(--primary-color); } .hd .n { margin-left:auto; font-size:12px; font-weight:500; color:var(--secondary-text-color); }
      .v { overflow:hidden; border-radius:14px; padding:10px 12px; margin-bottom:8px; background:rgba(127,127,127,.08); border:1px solid rgba(127,127,127,.14); }
      .v.un { background:color-mix(in srgb,#ff9800 10%,transparent); border-color:color-mix(in srgb,#ff9800 35%,transparent); }
      .top { display:flex; align-items:center; gap:8px; }
      .ph { display:block; width:calc(100% + 24px); margin:-10px -12px 10px; aspect-ratio:4/3; object-fit:cover; border-radius:14px 14px 0 0; cursor:zoom-in; }
      .plate { font:700 15px/1 ui-monospace,Menlo,monospace; letter-spacing:1px; background:#fff; color:#111; border:2px solid #1e3a8a; border-left:10px solid #1e3a8a;
        border-radius:6px; padding:5px 8px; width:120px; min-width:0; flex:0 1 120px; text-transform:uppercase; }
      .tag { font-size:11px; font-weight:700; padding:3px 8px; border-radius:10px; background:rgba(76,175,80,.18); color:#66bb6a; }
      .v.un .tag { background:rgba(255,152,0,.2); color:#ffa726; }
      .sw { margin-left:auto; position:relative; width:40px; height:22px; cursor:pointer; } .sw input { opacity:0; width:0; height:0; }
      .sw i { position:absolute; inset:0; border-radius:11px; background:rgba(127,127,127,.4); transition:.2s; }
      .sw i:after { content:""; position:absolute; left:3px; top:3px; width:16px; height:16px; border-radius:50%; background:#fff; transition:.2s; }
      .sw input:checked + i { background:#4caf50; } .sw input:checked + i:after { left:21px; }
      .del { background:none; border:0; color:var(--secondary-text-color); cursor:pointer; padding:2px; } .del ha-icon { --mdc-icon-size:18px; }
      .grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:8px; margin-top:8px; }
      .grid .wide { grid-column:1 / -1; } label select { appearance:auto; }
      label { display:flex; flex-direction:column; gap:3px; font-size:10.5px; text-transform:uppercase; letter-spacing:.4px; color:var(--secondary-text-color); }
      label input, label select, .new input { font-size:14px; text-transform:none; letter-spacing:0; color:var(--primary-text-color); background:rgba(127,127,127,.12);
        border:1px solid transparent; border-radius:9px; padding:7px 9px; outline:none; min-width:0; width:100%; box-sizing:border-box; }
      label input:focus, label select:focus, .new input:focus { border-color:var(--primary-color); }
      .seen { display:flex; align-items:center; gap:5px; margin-top:7px; font-size:11.5px; color:var(--secondary-text-color); } .seen ha-icon { --mdc-icon-size:14px; }
      .empty { font-size:13px; color:var(--secondary-text-color); padding:6px 2px 10px; }
      .addb { width:100%; border:1px dashed rgba(127,127,127,.4); background:none; color:var(--primary-color); border-radius:12px; padding:9px; font-size:14px; cursor:pointer; }
      .new { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:10px; border-radius:14px; background:rgba(127,127,127,.08); }
      .new .wide { grid-column:1 / -1; } .new .acts { grid-column:1 / -1; display:flex; gap:8px; justify-content:flex-end; }
      .new button { border:0; border-radius:10px; padding:8px 14px; font-size:14px; cursor:pointer; } .ok { background:var(--primary-color); color:#fff; } .no { background:rgba(127,127,127,.2); color:var(--primary-text-color); }
    </style><ha-card>
      <div class="hd"><ha-icon icon="mdi:car-multiple"></ha-icon>${vEsc(this._c.title)}<span class="n">${items.length} vozila${nUn ? ` · ${nUn} nepoznato` : ""}</span></div>
      <datalist id="osobe">${Object.values(this._hass.states).filter((x) => x.entity_id.startsWith("person.")).map((x) => `<option value="${vEsc(x.attributes.friendly_name)}">`).join("")}</datalist>
      ${rows}
      ${this._adding ? `<div class="new">
          <input data-n="tab" class="wide" placeholder="Tablica (npr. A12K345)" style="text-transform:uppercase">
          <input data-n="model" placeholder="Model"><input data-n="boja" placeholder="Boja">
          <input data-n="vl" class="wide" placeholder="Vlasnik">
          <div class="acts"><button class="no">Odustani</button><button class="ok">Dodaj</button></div></div>`
        : `<button class="addb">+ Dodaj vozilo</button>`}
    </ha-card>`;
    const R = this.shadowRoot;
    R.querySelectorAll(".ph").forEach((im) => im.addEventListener("click", () => window.open(im.src, "_blank")));
    R.querySelectorAll(".v").forEach((row) => {
      const uid = row.dataset.uid;
      row.querySelectorAll("input, select").forEach((i) => i.addEventListener("change", () => this._save(uid)));
      row.querySelector(".del").addEventListener("click", async () => {
        if (confirm(`Obrisati ${row.querySelector(".plate").value}?`)) await this._svc("remove_item", { item: [uid] });
      });
    });
    const ab = R.querySelector(".addb"); if (ab) ab.addEventListener("click", () => { this._adding = true; this._render(); R.querySelector("[data-n=tab]").focus(); });
    const ok = R.querySelector(".ok"); if (ok) ok.addEventListener("click", () => this._add());
    const no = R.querySelector(".no"); if (no) no.addEventListener("click", () => { this._adding = false; this._render(); });
  }
}


/* ---------- Osobe: HA person + mobitel na WiFi-ju ---------- */
class RipacOsobeCard extends HTMLElement {
  setConfig(c) { this._c = c || {}; if (!this.shadowRoot) this.attachShadow({ mode: "open" }); }
  getCardSize() { return 3; }
  set hass(h) {
    this._hass = h;
    const key = Object.values(h.states).filter((x) => /^(person|device_tracker)\./.test(x.entity_id) || x.entity_id === "input_text.osobe_mac")
      .map((x) => x.entity_id + x.state + (x.attributes.ip || "") + (x.attributes.mac || "")).join("|");
    const a = this.shadowRoot && this.shadowRoot.activeElement;
    if (key !== this._key && !(a && /INPUT|SELECT/.test(a.tagName))) { this._key = key; this._load(); }
  }
  async _load() {
    try { const r = await this._hass.callWS({ type: "person/list" }); this._persons = r.storage || []; } catch (e) { this._persons = []; }
    this._render();
  }
  _macs() { try { return JSON.parse(this._hass.states["input_text.osobe_mac"].state) || {}; } catch (e) { return {}; } }
  _norm(m) { return String(m || "").trim().toUpperCase().replace(/-/g, ":"); }
  /* svi router trackeri po MAC-u (i oni koji nisu na WiFi-ju, da znamo zadnji IP) */
  _byMac() {
    const m = {};
    Object.values(this._hass.states).forEach((x) => {
      const a = x.attributes;
      if (x.entity_id.startsWith("device_tracker.") && a.source_type === "router" && a.mac) m[this._norm(a.mac)] = x;
    });
    return m;
  }
  _t(x) { return String(x.attributes.online_time || "").replace(/^0 Day /, "").replace(/:\d\d$/, ""); }
  _opts(cur, phones, macs) {
    const all = this._byMac();
    let o = `<option value="">— bez mobitela —</option>`;
    /* spremljeni: samo MAC, a IP samo ako je uređaj sada na WiFi-ju */
    if (cur) {
      const x = all[cur];
      const on = x && x.state === "home";
      o += `<option value="${vEsc(cur)}" selected>${vEsc(cur)}${on && x.attributes.ip ? " · " + vEsc(x.attributes.ip) : " · nije na WiFi-ju"}</option>`;
    }
    /* za povezivanje: IP i MAC */
    phones.forEach(([mac, x]) => {
      if (mac === cur || Object.values(macs).includes(mac)) return;
      o += `<option value="${mac}">${vEsc(x.attributes.ip || "?")} · ${mac} · ${vEsc(this._t(x))}</option>`;
    });
    return o + `<option value="__manual">✏️ Upiši MAC ručno…</option>`;
  }
  async _setMac(name, mac) {
    const m = this._macs();
    mac = this._norm(mac);
    if (mac) m[name] = mac; else delete m[name];
    const v = JSON.stringify(m);
    if (v.length > 255) { alert("Previše osoba za jedno polje (255 znakova)."); return; }
    await this._hass.callService("input_text", "set_value", { entity_id: "input_text.osobe_mac", value: v });
  }
  _render() {
    if (!this._hass) return;
    const st = this._hass.states, macs = this._macs(), all = this._byMac();
    const live = Object.fromEntries(Object.entries(all).filter(([, x]) => x.state === "home"));
    const phones = Object.entries(live).filter(([mac, x]) => {
      const b = parseInt(mac.slice(0, 2), 16);
      return /mobitel|phone|iphone|android|galaxy|pixel/i.test(x.entity_id + (x.attributes.hostname || "")) || (!isNaN(b) && (b & 2))
        || Object.values(macs).includes(mac);
    });
    const rows = (this._persons || []).map((p) => {
      const ps = Object.values(st).find((x) => x.entity_id.startsWith("person.") && x.attributes.id === p.id);
      const mac = macs[p.name] || "";
      const onWifi = mac && live[mac];
      const home = (ps && ps.state === "home") || onWifi;
      const src = onWifi ? "na WiFi-ju" : ps && ps.state === "home" ? "po GPS-u" : "";
      return `<div class="p ${home ? "home" : ""}" data-id="${p.id}" data-name="${vEsc(p.name)}">
        <div class="av">${vEsc(p.name.slice(0, 1).toUpperCase())}</div>
        <div class="nm"><b>${vEsc(p.name)}</b><span>${home ? `🟢 u vikendici · ${vEsc(src)}` : "⚪ nije tu"}</span></div>
        <div class="ipw">${this._manual && this._manual === p.id
          ? `<input class="ip" value="${vEsc(mac)}" placeholder="AA:BB:CC:DD:EE:FF" autocapitalize="characters">`
          : `<select class="ips">${this._opts(mac, phones, macs)}</select>`}</div>
        <button class="del" title="Obriši osobu"><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>
      </div>`;
    }).join("");
    const free = phones.filter(([mac]) => !Object.values(macs).includes(mac));
    this.shadowRoot.innerHTML = `<style>
      ha-card { padding:14px 14px 12px; }
      .hd { display:flex; align-items:center; gap:8px; font-size:16px; font-weight:600; margin-bottom:10px; }
      .hd ha-icon { --mdc-icon-size:22px; color:var(--primary-color); } .hd .n { margin-left:auto; font-size:12px; font-weight:500; color:var(--secondary-text-color); }
      .p { display:grid; grid-template-columns:36px minmax(0,1fr) minmax(0,1.1fr) auto; align-items:center; gap:10px; padding:8px 0; border-top:1px solid rgba(127,127,127,.12); }
      .p:first-of-type { border-top:0; }
      .av { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; background:rgba(127,127,127,.2); }
      .p.home .av { background:#4caf50; color:#fff; }
      .nm { display:flex; flex-direction:column; min-width:0; } .nm b { font-size:14px; } .nm span { font-size:11.5px; color:var(--secondary-text-color); } .nm .mac { font-family:ui-monospace,Menlo,monospace; font-size:10.5px; opacity:.8; }
      select, input { font-size:13px; color:var(--primary-text-color); background:rgba(127,127,127,.12); border:1px solid transparent; border-radius:9px; padding:7px 8px; min-width:0; width:100%; box-sizing:border-box; font-family:ui-monospace,Menlo,monospace; }
      input:focus, select:focus { border-color:var(--primary-color); outline:none; } select { appearance:auto; font-family:inherit; } .ipw { min-width:0; }
      .add input { font-family:inherit; }
      .del { background:none; border:0; color:var(--secondary-text-color); cursor:pointer; } .del ha-icon { --mdc-icon-size:18px; }
      .add { display:flex; gap:8px; margin-top:10px; } .add button { border:0; border-radius:10px; padding:8px 14px; background:var(--primary-color); color:#fff; font-size:14px; cursor:pointer; }
      .free { margin-top:10px; font-size:12px; color:var(--secondary-text-color); } .free b { font-family:ui-monospace,Menlo,monospace; color:var(--primary-text-color); font-weight:600; }
      .hint { font-size:11.5px; color:var(--secondary-text-color); margin-top:8px; line-height:1.4; }
    </style><ha-card>
      <div class="hd"><ha-icon icon="mdi:account-group"></ha-icon>Osobe<span class="n">u vikendici: ${vEsc(st["sensor.poznati_na_mrezi"] ? st["sensor.poznati_na_mrezi"].state : "–")}</span></div>
      ${rows}
      ${free.length ? `<div class="free">Nepovezani mobiteli na WiFi-ju: ${free.map(([mac, x]) => `<b>${vEsc(x.attributes.ip || "?")}</b> · ${mac} (online ${vEsc(this._t(x) || "?")})`).join(", ")}</div>` : ""}
      <div class="add"><input placeholder="Nova osoba (npr. Tata)"><button>Dodaj</button></div>
      <div class="hint">Za povezivanje izaberi mobitel po IP-u i MAC-u. Pamti se samo MAC, a IP se prikazuje kad je mobitel na WiFi-ju. Na iPhoneu za WiFi vikendice drži "Privatna WiFi adresa" na <b>Fiksna</b> (ili isključenu), da MAC ostane isti.</div>
    </ha-card>`;
    const R = this.shadowRoot;
    R.querySelectorAll(".p").forEach((row) => {
      const p = this._persons.find((x) => x.id === row.dataset.id);
      const sel = row.querySelector(".ips");
      if (sel) sel.addEventListener("change", (ev) => {
        if (ev.target.value === "__manual") { this._manual = p.id; this._render(); const i = this.shadowRoot.querySelector(".ip"); if (i) i.focus(); return; }
        this._setMac(p.name, ev.target.value);
      });
      const ipi = row.querySelector(".ip");
      if (ipi) {
        const done = () => { this._manual = null; this._setMac(p.name, ipi.value); };
        ipi.addEventListener("change", done);
        ipi.addEventListener("keydown", (e) => { if (e.key === "Enter") ipi.blur(); });
      }
      row.querySelector(".del").addEventListener("click", async () => {
        if (confirm(`Obrisati osobu ${p.name}?`)) { await this._setMac(p.name, ""); await this._hass.callWS({ type: "person/delete", person_id: p.id }); this._load(); }
      });
    });
    const inp = R.querySelector(".add input");
    const add = async () => { const n = inp.value.trim(); if (!n) return; await this._hass.callWS({ type: "person/create", name: n }); inp.value = ""; this._load(); };
    R.querySelector(".add button").addEventListener("click", add);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });
  }
}

/* ---------- picture-elements: oznaka pokreta → otvori zadnji video iz NVR-a ---------- */
class RipacMotionLabel extends HTMLElement {
  setConfig(c) { this._c = c || {}; }
  set hass(h) {
    this._hass = h;
    const st = h.states[this._c.entity];
    const txt = (this._c.prefix || "") + (st ? st.state : "–");
    if (txt !== this._txt) { this._txt = txt; this.textContent = txt; }
    if (!this._bound) {
      this._bound = true;
      this.style.cursor = "pointer";
      this.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); this._play(); });
    }
  }
  async _play() {
    let it = null;
    try {
      const r = await this._hass.callWS({ type: "wansview_cloud/recordings", camera: this._c.folder, limit: 5 });
      it = (r.items || []).find((x) => x.video) || (r.items || [])[0];
    } catch (e) { /* ignore */ }
    const m = document.createElement("div");
    m.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px;font-family:Roboto,sans-serif;color:#fff";
    const head = it ? `${it.camera} · ${it.day === new Date().toISOString().slice(0, 10) ? "danas" : it.day} ${it.time}` : "Nema snimka";
    const media = !it ? "" : it.video
      ? `<video src="${it.video}" ${it.image ? `poster="${it.image}"` : ""} controls autoplay playsinline style="max-width:100%;max-height:75vh;border-radius:12px;background:#000"></video>`
      : `<img src="${it.image}" style="max-width:100%;max-height:75vh;border-radius:12px">`;
    m.innerHTML = `<div style="font-size:15px;font-weight:600">${vEsc(head)}</div>${media}
      <div style="display:flex;gap:10px"><button data-a="nvr" style="border:0;border-radius:18px;padding:9px 16px;background:rgba(255,255,255,.15);color:#fff;font-size:14px">Svi snimci</button>
      <button data-a="x" style="border:0;border-radius:18px;padding:9px 16px;background:#fff;color:#000;font-size:14px">Zatvori</button></div>`;
    m.addEventListener("click", (e) => {
      const a = e.target.dataset && e.target.dataset.a;
      if (e.target === m || a === "x") m.remove();
      if (a === "nvr") { m.remove(); history.pushState(null, "", this._c.nvr || "/ripac-nvr"); window.dispatchEvent(new CustomEvent("location-changed")); }
    });
    document.body.appendChild(m);
  }
}

if (!customElements.get("ripac-motion-label")) customElements.define("ripac-motion-label", RipacMotionLabel);
if (!customElements.get("ripac-osobe-card")) customElements.define("ripac-osobe-card", RipacOsobeCard);
if (!customElements.get("ripac-vozila-card")) customElements.define("ripac-vozila-card", RipacVozilaCard);
if (!customElements.get("ripac-security-card")) customElements.define("ripac-security-card", RipacSecurityCard);
if (!customElements.get("ripac-una-card")) customElements.define("ripac-una-card", RipacUnaCard);
if (!customElements.get("ripac-net-card")) customElements.define("ripac-net-card", RipacNetCard);
if (!customElements.get("ripac-solar-card")) customElements.define("ripac-solar-card", RipacSolarCard);
if (!customElements.get("ripac-brief-card")) customElements.define("ripac-brief-card", RipacBriefCard);
if (!customElements.get("ripac-ac-chip")) customElements.define("ripac-ac-chip", RipacAcChip);
if (!customElements.get("ripac-switch-chip")) customElements.define("ripac-switch-chip", RipacSwitchChip);
if (!customElements.get("ripac-care-card")) customElements.define("ripac-care-card", RipacCareCard);
window.customCards = window.customCards || [];
window.customCards.push(
  { type: "ripac-security-card", name: "Ripač sigurnost", description: "Protokoli i režimi kuće" },
  { type: "ripac-una-card", name: "Ripač Una", description: "Vodostaj, prognoza, upozorenja i uzvodne stanice" }
);

// ---------- BS / EN dashboard translation (driven by input_boolean.sazetak_engleski) ----------
(() => {
  const EXACT = {
    "Kamere": "Cameras", "Solarne kamere": "Solar cameras", "Svi snimci ›": "All recordings ›", "Sobe": "Rooms", "Vani": "Outside",
    "Solar i baterija": "Solar & battery", "Kuća i održavanje": "House & maintenance", "Održavanje i zdravlje kuće": "Maintenance & house health",
    "Sve OK": "All OK", "Održavanje": "Maintenance", "Dnevna": "Living room", "V soba": "Bedroom V", "M soba": "Bedroom M", "Tehnička": "Utility room",
    "Kupatilo": "Bathroom", "Dvorište": "Yard", "Ulaz": "Entrance", "Iza": "Back", "Obala": "Riverbank", "Kuća Parking": "House parking",
    // security
    "Dolazak": "Arrive", "Odlazak": "Leave", "Noć": "Night", "Poplava": "Flood", "Čuvanje": "Guarding", "Obavijesti": "Notifications",
    "Kuća prazna": "House empty", "Čuvam kuću": "Guarding the house", "Neko je tu": "Someone is home", "Gosti": "Guests", "Isključeno": "Off",
    "Alarmi pauzirani": "Alarms paused", "TPanel alarm": "TPanel alarm", "Naoružan": "Armed", "Razoružan": "Disarmed", "AKTIVIRAN!": "TRIGGERED!",
    "Alarm poplave": "Flood alarm", "Mirno": "Quiet", "AKTIVAN": "ACTIVE", "Javljam pokret": "Reporting motion", "Argus štedi": "Argus saving", "Odmara dok su poznati tu": "Rests while family is here", "Uvijek čuva": "Always on guard", "Utišano": "Muted",
    "Noćno gašenje": "Night lights-off", "Gasi vanjska svjetla": "Turns off outdoor lights", "Una na ekranu": "Una on lock screen",
    "Kuća na ekranu": "House on lock screen", "Kuća je čuvana": "House is guarded", "Gosti su u vikendici": "Guests at the cottage",
    "Ti si u vikendici": "You're at the cottage", "Neko je u dnevnoj": "Someone in the living room", "Pažnja": "Attention",
    // una
    "Una kod Ripča": "Una at Ripač", "NORMALNO": "NORMAL", "PRIPREMNO": "ALERT", "POPLAVA": "FLOOD", "PLACEVI": "PLOTS",
    "Šta očekivati": "What to expect", "Vrijeme": "Weather", "Uzvodno": "Upstream", "Procjena iz prognoze kiše i uzvodnih stanica": "Estimate from rain forecast and upstream gauges",
    "Danas": "Today", "Sutra": "Tomorrow", "pon": "Mon", "uto": "Tue", "sri": "Wed", "čet": "Thu", "pet": "Fri", "sub": "Sat", "ned": "Sun",
    "suho": "dry", "izmjereno": "measured", "procjena po prognozi kiše": "estimate from rain forecast", "kiša": "rain",
    "195 voda na putu": "195 water on road", "205 put plavi": "205 road floods", "sada": "now", "+1 dan": "+1 day", "+2 dana": "+2 days", "+3 dana": "+3 days",
    "Žuto upozorenje": "Yellow warning", "Narandžasto upozorenje": "Orange warning", "Crveno upozorenje": "Red warning",
    // solar
    "Kuća radi na bateriji": "House is running on battery", "Ručno": "Manual", "Pametno: uklj.": "Smart: on", "Pametno: isklj.": "Smart: off", "☀️ Solar prvo": "☀️ Solar first", "🔋 Solar → baterija → mreža": "🔋 Solar → battery → grid", "☀️ Solar → mreža → baterija": "☀️ Solar → grid → battery", "🔌 Mreža prvo": "🔌 Grid first", "Baterije": "Batteries", "miruje": "idle", "kuća": "house", "višak": "surplus", "inverter": "inverter",
    "jeftina": "cheap", "skupa": "expensive", "mreža": "grid", "Solar danas": "Solar today", "Baterija": "Battery",
    "☀️ dobar dan": "☀️ good day", "⛅ osrednje": "⛅ moderate", "☁️ slabo sunca": "☁️ little sun",
    // internet / sky
    "glavna veza": "main link", "bez veze": "no link", "Ruter": "Router", "4G rezerva": "4G backup", "ne odgovara": "not responding",
    "Video sa solarnih kamera": "Video from solar cameras", "preuzima se": "downloading", "pauzirano – štedi 4G": "paused – saving 4G",
    "Preko 4G rezerve": "Via 4G backup", "Starlink zaklonjen": "Starlink obstructed", "Vjerovatno povezan": "Probably connected",
    "povezan": "connected", "vidno polje": "field of view", "prelet": "pass", "Vidljivi preleti": "Visible passes", "slab": "weak",
    "osrednji": "fair", "dobar": "good", "odličan": "great", "✨ vedro": "✨ clear", "Tanjir": "Dish", "Ping": "Ping",
    "Učitavam orbite Starlinka…": "Loading Starlink orbits…", "Nema vidljivih preleta u naredna 24 h.": "No visible passes in the next 24 h.",
    "Orbite nedostupne": "Orbits unavailable",
  };
  const SUBS = [
    [/^(.*) · prije (.+)$/, (m, a, b) => `${EXACT[a] || a} · ${b} ago`], [/^prije (.+)$/, "$1 ago"],
    [/^(\S[^·]*?) · $/, (m, a) => `${EXACT[a.trim()] || a} · `], [/Solarne kamere/g, "Solar cameras"], [/^Mjesečni/, "Monthly"],
    [/^Vlaga /, "Humidity "], [/^Potrošnja /, "Load "], [/^Bojler /, "Boiler "],
    [/^Klima · ugašena$/, "AC · off"], [/^Konvektor · ugašen/, "Heater · off"], [/^Konvektor · grije/, "Heater · heating"], [/^Klima · ([\d.]+)°$/, "AC · $1°"], [/^Konvektor · ([\d.]+)°$/, "Heater · $1°"], [/^Grije$/, "Heating"], [/^Hladi$/, "Cooling"], [/^Suši$/, "Drying"], [/^Ventilator$/, "Fan"],
    [/Niko nije u kući/g, "Nobody is home"], [/ · TPanel naoružan/g, " · TPanel armed"], [/kamere javljaju pokret/g, "cameras report motion"],
    [/Čuvanje je isključeno/g, "Guarding is off"], [/alarmi pauzirani/g, "alarms paused"], [/Alarmi i obavijesti o kretanju su pauzirani/g, "Alarms and motion alerts are paused"],
    [/put suh i prohodan/g, "road dry and passable"], [/voda na putu/g, "water on the road"], [/put poplavljen/g, "road flooded"], [/voda na placevima/g, "water on the plots"],
    [/· miruje/g, "· steady"], [/raste ([\d.]+) cm\/h/g, "rising $1 cm/h"], [/opada ([\d.]+) cm\/h/g, "falling $1 cm/h"],
    [/Kiša upravo pada i trebala bi stati oko (\S+)/g, "Rain is falling now and should stop around $1"], [/\(još ~(\d+) mm\)/g, "(another ~$1 mm)"],
    [/Kiša bi trebala početi /g, "Rain should start "], [/Ponovo bi trebala padati /g, "It should rain again "], [/ i padati /g, " and last "], [/, do ~/g, ", until ~"],
    [/oko sat vremena/g, "about an hour"], [/(\d+) sata\b/g, "$1 hours"], [/(\d+) sati\b/g, "$1 hours"], [/ oko (\d\d:\d\d)/g, " around $1"],
    [/Ukupno ~(\d+) mm u 3 dana, pa bi Una mogla porasti do oko/g, "About $1 mm in 3 days, so the Una could rise to about"],
    [/\(za 3 dana\)/g, "(in 3 days)"], [/\(prekosutra\)/g, "(the day after tomorrow)"], [/\(sutra\)/g, "(tomorrow)"],
    [/ Put ostaje prohodan\./g, " The road stays passable."], [/Put ostaje prohodan\./g, "The road stays passable."], [/ Voda bi mogla izaći na put\./g, " Water could reach the road."],
    [/Put bi mogao biti poplavljen\./g, "The road could flood."], [/Bez značajne kiše – Una ostaje mirna oko/g, "No significant rain – the Una stays steady at about"],
    [/Bez značajne kiše \((\d+) mm u 3 dana\) – Una polako opada, oko/g, "No significant rain ($1 mm in 3 days) – the Una slowly falls, to about"], [/ za 3 dana\./g, " in 3 days."],
    [/Uzvodno brzo raste/g, "Rising fast upstream"], [/val stiže do Ripča za 4–9 h/g, "the wave reaches Ripač in 4–9 h"], [/Dio padavina je snijeg, pa porast može kasniti\./g, "Part of it is snow, so the rise may be delayed."],
    [/\bupozorenje\b/g, "warning"], [/hladnoća/g, "cold"], [/vjetar/g, "wind"], [/grmljavina/g, "thunderstorm"], [/poledica/g, "ice"], [/snijeg/g, "snow"], [/vrućina/g, "heat"],
    [/\bsutra\b/g, "tomorrow"], [/\bdanas\b/g, "today"], [/\bu srijedu\b/g, "on Wednesday"], [/\bu četvrtak\b/g, "on Thursday"], [/\bu petak\b/g, "on Friday"],
    [/\bu subotu\b/g, "on Saturday"], [/\bu nedjelju\b/g, "on Sunday"], [/\bu ponedjeljak\b/g, "on Monday"], [/\bu utorak\b/g, "on Tuesday"],
    [/Kuća radi na solaru/g, "House is running on solar"], [/Potrošnja /g, "Usage "], [/ · kuća /g, " · house "], [/, višak puni bateriju/g, ", surplus charges the battery"], [/Kuća je na mreži/g, "House is on the grid"], [/, solar puni bateriju/g, ", solar charges the battery"],
    [/^prognoza /, "forecast "], [/ cikl\./g, " cycles"], [/ kWh danas/g, " kWh today"], [/ ciklusa/g, " cycles"], [/^daje /, "gives "], [/^puni /, "charging "],
    [/(\d+) uređaja/g, "$1 devices"], [/ · AP offline/g, " · AP offline"], [/^čeka /, "standby "], [/^AKTIVNA /, "ACTIVE "], [/4G ovaj mj\./g, "4G this month"], [/(\d+) nova SMS/g, "$1 new SMS"], [/SMS: nema novih/g, "SMS: none new"], [/ ovaj mj\./g, " this month"], [/glavna veza · /g, "main link · "], [/^čeka · /, "standby · "], [/^AKTIVNA · /, "ACTIVE · "],
    [/u vidnom polju/g, "in view"], [/iznad horizonta/g, "above horizon"], [/^(danas|sutra) · za (.+)$/, (m, d, r) => `${d === "danas" ? "today" : "tomorrow"} · in ${r}`],
    [/satelita iznad horizonta, nijedan u vidnom polju tanjira/g, "satellites above horizon, none in the dish's view"],
  ];
  const orig = new WeakMap();
  const isEN = () => document.querySelector("home-assistant")?.hass?.states["input_boolean.sazetak_engleski"]?.state === "on";
  const trText = (t) => {
    const k = t.trim();
    if (!k) return t;
    if (EXACT[k]) return t.replace(k, EXACT[k]);
    let o = t;
    for (const [re, rep] of SUBS) o = o.replace(re, rep);
    return o;
  };
  const svgCache = new Map();
  const trImg = (img, en) => {
    const src = img.getAttribute("src") || "";
    if (en) {
      if (!src.startsWith("data:image/svg+xml;base64,") || [...svgCache.values()].includes(src)) return;
      let out = svgCache.get(src);
      if (!out) {
        try {
          let svg = decodeURIComponent(escape(atob(src.slice(26))));
          const before = svg;
          svg = svg.replace(/>([^<>]{2,40})</g, (m, t) => (EXACT[t.trim()] ? `>${EXACT[t.trim()]}<` : m));
          out = svg === before ? src : "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
        } catch (e) { out = src; }
        svgCache.set(src, out);
      }
      if (out !== src) { img.dataset.bsSrc = src; img.setAttribute("src", out); }
    } else if (img.dataset.bsSrc) { img.setAttribute("src", img.dataset.bsSrc); delete img.dataset.bsSrc; }
  };
  const walk = (node, en) => {
    if (!node) return;
    if (node.nodeType === 3) {
      if (en) {
        const cur = node.nodeValue;
        if (orig.has(node) && orig.get(node).en === cur) return;
        const t = trText(cur);
        if (t !== cur) { orig.set(node, { bs: cur, en: t }); node.nodeValue = t; }
      } else if (orig.has(node)) {
        const o = orig.get(node);
        if (node.nodeValue === o.en) node.nodeValue = o.bs;
        orig.delete(node);
      }
      return;
    }
    if (node.nodeType !== 1 && node.nodeType !== 11) return;
    const tag = node.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "HA-SIDEBAR" || tag === "HA-MORE-INFO-DIALOG") return;
    if (tag === "IMG") trImg(node, en);
    if (node.shadowRoot) walk(node.shadowRoot, en);
    for (let c = node.firstChild; c; c = c.nextSibling) walk(c, en);
  };
  let last = null;
  window.__ripacTr = (root) => { const en = isEN(); if (en || last) walk(root || document.querySelector("home-assistant"), en); };
  const tick = () => {
    const en = isEN();
    if (!/ripac-|\/lovelace/.test(location.pathname)) { last = en; return; }
    if (en || last) walk(document.querySelector("home-assistant"), en);
    last = en;
  };
  setInterval(tick, 1200);
  // translate custom cards right after each render
  for (const name of ["ripac-security-card", "ripac-una-card", "ripac-solar-card", "ripac-care-card", "ripac-net-card", "ripac-ac-chip", "ripac-switch-chip", "ripac-sky-card"]) {
    const run = () => {
      const C = customElements.get(name);
      if (!C || C.prototype.__trWrapped) return;
      const r = C.prototype._render;
      C.prototype._render = function (...a) { const out = r.apply(this, a); if (isEN() && this.shadowRoot) walk(this.shadowRoot, true); return out; };
      C.prototype.__trWrapped = true;
    };
    customElements.whenDefined(name).then(run);
  }
})();
