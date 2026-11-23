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
  { e: "input_boolean.vikendica_prazna", n: "Vikendica prazna", on: "Čuvam kuću", off: "Neko je tu", i: "mdi:home-lock", c: "#607d8b" },
  { e: "input_boolean.gosti_rezim", n: "Gosti", on: "Alarmi pauzirani", off: "Isključeno", i: "mdi:account-group", c: "#26a69a" },
  { e: "alarm_control_panel.tpanel_sonoff_1001892dfe_alarm", n: "TPanel alarm", on: "Naoružan", off: "Razoružan", i: "mdi:shield-lock", c: "#ef6c00", alarm: true },
  { e: "input_boolean.hitni_alarm_poplave", n: "Alarm poplave", on: "AKTIVAN", off: "Mirno", i: "mdi:home-flood", c: "#e53935" },
  { e: "automation.obavijest_o_pokretu_na_kameri", n: "Obavijesti kamera", on: "Javljam pokret", off: "Utišano", i: "mdi:cctv", c: "#fb8c00" },
  { e: "automation.nocu_ugasi_vanjska_svjetla_bez_pokreta", n: "Noćno gašenje", on: "Gasi vanjska svjetla", off: "Isključeno", i: "mdi:weather-night", c: "#8e24aa" },
  { e: "input_boolean.vodostaj_na_zakljucanom_ekranu", n: "Una na ekranu", on: "Live Activity", off: "Isključeno", i: "mdi:cellphone-lock", c: "#1e88e5" },
  { e: "input_boolean.vikendica_na_zakljucanom_ekranu", n: "Kuća na ekranu", on: "Live Activity", off: "Isključeno", i: "mdi:cellphone-information", c: "#3949ab" },
];
const PRESENCE = "binary_sensor.presence_senzor_sonoff_a480133cc3_occupancy";

class RipacSecurityCard extends RipacBase {
  _watch() {
    return [...PROTOCOLS.map((p) => p.e), ...TOGGLES.map((t) => t.e), PRESENCE, "sensor.kamera_iza_kuce"];
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
      .map((p) => `<button class="pb ${this.st(p.e) === "on" ? "run" : ""}" data-e="${p.e}" style="--c:${p.c}">
          <div class="pi"><ha-icon icon="${p.i}"></ha-icon></div><div class="pn">${p.n}</div><div class="pd">${p.d}</div></button>`)
      .join("");
    const tg = TOGGLES.filter((t) => this._hass.states[t.e])
      .map((t) => {
        const v = this.st(t.e);
        const on = t.alarm ? v !== "disarmed" : v === "on";
        const sub = t.alarm && v === "triggered" ? "AKTIVIRAN!" : on ? t.on : t.off;
        return `<div class="t ${on ? "on" : ""}" data-e="${t.e}" style="--c:${t.c}">
          <div class="ti"><ha-icon icon="${t.i}"></ha-icon></div>
          <div class="tx"><div class="tn">${t.n}</div><div class="ts">${sub}</div></div><div class="sw"></div></div>`;
      })
      .join("");
    this.shadowRoot.innerHTML = `<style>${css}</style><ha-card>
      <div class="hd"><div class="shield" style="--c:${s.c}"><ha-icon icon="${s.i}"></ha-icon></div>
        <div><div class="ttl">${esc(s.t)}</div><div class="sub">${esc(s.s)}</div></div></div>
      <div class="lbl">Protokoli</div><div class="prot">${prot}</div>
      <div class="lbl">Režim i obavijesti</div><div class="tg">${tg}</div></ha-card>`;
    this.shadowRoot.querySelectorAll(".pb").forEach((b) =>
      b.addEventListener("click", () => {
        const p = PROTOCOLS.find((x) => x.e === b.dataset.e);
        if (p.q && !confirm(p.q)) return;
        this._hass.callService("script", "turn_on", { entity_id: p.e });
        b.classList.add("run");
      })
    );
    this.shadowRoot.querySelectorAll(".t").forEach((el) => {
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
      this._hist = (r[UNA] || []).map((p) => [(p.lu || p.lc) * 1000, parseFloat(p.s)]).filter((p) => !isNaN(p[1]));
      this._render();
    } catch (e) {}
  }
  async _loadWx() {
    try {
      const r = await this._hass.callWS({ type: "call_service", domain: "weather", service: "get_forecasts", service_data: { type: "daily" }, target: { entity_id: "weather.home" }, return_response: true });
      this._wx = r.response["weather.home"].forecast || [];
      this._render();
    } catch (e) {}
  }
  _spark(c) {
    const pts = this._hist || [];
    if (pts.length < 2) return "";
    const t0 = Date.now() - 48 * 3600 * 1000;
    const vals = pts.map((p) => p[1]);
    const lo = Math.min(...vals, 140), hi = Math.max(...vals, 200);
    const W = 300, H = 64;
    const x = (t) => ((Math.max(t, t0) - t0) / (48 * 3600 * 1000)) * W;
    const y = (v) => H - 4 - ((v - lo) / (hi - lo)) * (H - 8);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join("") + `L${W},${y(vals[vals.length - 1]).toFixed(1)}`;
    const ref = (v, col, lab) => (v > lo && v < hi ? `<line x1="0" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="${col}" stroke-dasharray="3 4" stroke-width="1" opacity=".7" vector-effect="non-scaling-stroke"/>` +
      `<text x="${W - 2}" y="${y(v) - 3}" text-anchor="end" font-size="9" fill="${col}">${lab}</text>` : "");
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs><linearGradient id="ug" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".45"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>
      ${ref(180, "#ffb300", "put 180")}${ref(200, "#e53935", "poplava 200")}
      <path d="${line}L${W},${H}L0,${H}Z" fill="url(#ug)"/><path d="${line}" fill="none" stroke="${c}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>
      <div class="axis"><span>prije 48 h</span><span>24 h</span><span>sada</span></div>`;
  }
  // rough expectation for the next 2-3 days from forecast rain, current trend and upstream stations
  _expect(l, tr, wx, prog) {
    const rain2 = wx.slice(0, 2).reduce((a, d) => a + (d.precipitation || 0), 0);
    const rain3 = wx.slice(0, 3).reduce((a, d) => a + (d.precipitation || 0), 0);
    const up = UPSTREAM.map(([e, r, n]) => [n, parseFloat(this.st(r)) || 0]);
    const wave = up.filter(([, d]) => d >= 15);
    const snow = wx.slice(0, 3).some((d) => /snow/.test(d.condition));
    let rise, txt, col = "#43a047", icon = "mdi:check-circle";
    if (wave.length) {
      rise = 40;
      txt = `Uzvodno brzo raste (${wave.map(([n, d]) => `${n} +${Math.round(d)} cm`).join(", ")}) – val stiže do Ripča za 4–9 h.`;
    } else if (rain2 >= 60) rise = 60;
    else if (rain2 >= 30) rise = 35;
    else if (rain3 >= 15) rise = 15;
    else rise = 0;
    if (tr >= 1 && rise < 15) rise = 15;
    const peak = Math.round(l + rise);
    if (!txt) {
      if (rise === 0) txt = tr <= -1 ? `Una opada i nema značajne kiše – put ostaje prohodan.` : `Nema značajne kiše (${Math.round(rain3)} mm u 3 dana) – Una ostaje mirna oko ${Math.round(l)} cm.`;
      else txt = `Kiša ${Math.round(rain2 >= 15 ? rain2 : rain3)} mm u ${rain2 >= 15 ? "2" : "3"} dana – Una bi mogla porasti za ~${rise} cm, do oko <b>${peak} cm</b>.`;
    }
    if (peak >= 200) { col = "#e53935"; icon = "mdi:home-flood"; txt += " <b>Put bi mogao biti poplavljen.</b>"; }
    else if (peak >= 180) { col = "#ffb300"; icon = "mdi:alert"; txt += " Voda bi mogla izaći na put."; }
    else if (rise) { col = "#42a5f5"; icon = "mdi:trending-up"; txt += " Put ostaje prohodan."; }
    if (snow && rise) txt += " Dio padavina je snijeg, pa porast može kasniti.";
    if (prog.startsWith("raste")) { col = "#42a5f5"; icon = "mdi:trending-up"; }
    return { txt, col, icon };
  }
  _render() {
    if (!this._hass) return;
    const l = parseFloat(this.st(UNA));
    const tr = parseFloat(this.st("sensor.hs_ripac")) || 0;
    const st = isNaN(l) ? null : l >= 250 ? ["#b71c1c", "PLACEVI", "voda na placevima"] : l >= 200 ? ["#e53935", "POPLAVA", "put poplavljen"] : l >= 180 ? ["#ffb300", "PRIPREMNO", "voda na dijelu puta"] : ["#43a047", "NORMALNO", "put suh i prohodan"];
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
    const ex = isNaN(l) ? null : this._expect(l, tr, wx, prog);
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
      .exp { display:flex; gap:10px; align-items:flex-start; margin-top:10px; padding:10px 12px; border-radius:12px;
        background:color-mix(in srgb,var(--c) 12%,transparent); font-size:13px; line-height:1.4; color:var(--primary-text-color); }
      .exp ha-icon { color:var(--c); --mdc-icon-size:20px; flex:none; margin-top:1px; }
      .exp small { display:block; font-size:10.5px; color:var(--secondary-text-color); margin-top:3px; }
    </style><ha-card>
      <div class="hd" style="margin-bottom:4px"><div class="shield" style="--c:${c}"><ha-icon icon="mdi:waves"></ha-icon></div>
        <div style="flex:1"><div class="ttl">Una kod Ripča</div><div class="sub">${st ? `${st[2]} · ${trend}` : "nema podataka"}</div></div>
        ${st ? `<div class="badge" style="--c:${c}">${st[1]}</div>` : ""}</div>
      <div class="big"><span class="lvl">${isNaN(l) ? "–" : l.toFixed(1)}</span><span class="unit">cm</span></div>
      ${this._spark(c)}
      ${ex ? `<div class="lbl">Šta očekivati</div><div class="exp" style="--c:${ex.col}"><ha-icon icon="${ex.icon}"></ha-icon><div>${ex.txt}<small>Procjena iz prognoze kiše i uzvodnih stanica</small></div></div>` : ""}
      ${wx.length ? `<div class="lbl">Vrijeme</div><div class="wk">${days}</div>` : ""}
      ${wrows ? `<div class="fc2" style="margin-top:8px">${wrows}</div>` : ""}
      ${ups ? `<div class="lbl">Uzvodno</div><div class="up">${ups}</div>` : ""}
    </ha-card>`;
    this.shadowRoot.querySelector(".big").addEventListener("click", () => this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: UNA }, bubbles: true, composed: true })));
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

if (!customElements.get("ripac-security-card")) customElements.define("ripac-security-card", RipacSecurityCard);
if (!customElements.get("ripac-una-card")) customElements.define("ripac-una-card", RipacUnaCard);
if (!customElements.get("ripac-net-card")) customElements.define("ripac-net-card", RipacNetCard);
if (!customElements.get("ripac-care-card")) customElements.define("ripac-care-card", RipacCareCard);
window.customCards = window.customCards || [];
window.customCards.push(
  { type: "ripac-security-card", name: "Ripač sigurnost", description: "Protokoli i režimi kuće" },
  { type: "ripac-una-card", name: "Ripač Una", description: "Vodostaj, prognoza, upozorenja i uzvodne stanice" }
);
