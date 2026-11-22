// Wansview NVR gallery card — preview of locally saved camera recordings.
class WansviewNvrCard extends HTMLElement {
  setConfig(config) {
    this._config = { limit: 60, columns: 2, title: "Snimci", ...config };
    this._filter = config.camera || "";
    this._items = [];
    this._cams = [];
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._render();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
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
      const msg = { type: "wansview_cloud/recordings", limit: this._config.limit };
      if (this._filter) msg.camera = this._filter;
      const res = await this._hass.callWS(msg);
      this._items = res.items || [];
      if (!this._filter) this._cams = res.cameras || [];
      this._error = null;
    } catch (e) {
      this._error = e.message || String(e);
    }
    this._render();
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
              ${it.image ? `<img loading="lazy" src="${it.image}">` : `<div class="noimg">🎞️</div>`}
              <div class="shade"></div>
              <div class="cam">${this._esc(it.camera)}</div>
              <div class="time">${this._esc(it.time.slice(0, 5))}</div>
              ${it.video ? `<div class="play">▶</div>` : ""}
            </div>`
            )
            .join("")}
        </div>`
      )
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
        .empty { padding:24px; text-align:center; color:var(--secondary-text-color); }
        .modal { position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.92); display:flex; flex-direction:column;
                 align-items:center; justify-content:center; padding:16px; }
        .modal video, .modal img { max-width:100%; max-height:78vh; border-radius:10px; background:#000; }
        .mhead { color:#fff; font-weight:600; margin-bottom:10px; font-size:15px; }
        .mbar { display:flex; gap:10px; margin-top:12px; }
        .mbar button, .mbar a { background:rgba(255,255,255,.12); color:#fff; border:0; border-radius:18px; padding:8px 16px;
                 font-size:14px; text-decoration:none; cursor:pointer; }
      </style>
      <ha-card>
        <div class="head"><div class="title">${this._esc(c.title)}</div><div class="count">${this._items.length} snimaka</div></div>
        ${this._cams.length > 1 ? `<div class="chips">${chips}</div>` : ""}
        ${this._error ? `<div class="empty">Greška: ${this._esc(this._error)}</div>` : ""}
        ${!this._error && !this._items.length ? `<div class="empty">Još nema snimaka.</div>` : days}
      </ha-card>`;
    this.shadowRoot.querySelectorAll(".chip").forEach((b) =>
      b.addEventListener("click", () => {
        this._filter = b.dataset.cam;
        this._load();
      })
    );
    this.shadowRoot.querySelectorAll(".tile").forEach((t) =>
      t.addEventListener("click", () => this._open(byDay[t.dataset.day][+t.dataset.i]))
    );
  }

  _open(it) {
    const m = document.createElement("div");
    m.className = "modal";
    const media = it.video
      ? `<video src="${it.video}" ${it.image ? `poster="${it.image}"` : ""} controls autoplay playsinline></video>`
      : `<img src="${it.image}">`;
    m.innerHTML = `<div class="mhead">${this._esc(it.camera)} · ${this._dayLabel(it.day)} ${this._esc(it.time)}</div>${media}
      <div class="mbar">${it.image ? `<a href="${it.image}" target="_blank">Slika</a>` : ""}${
        it.video ? `<a href="${it.video}" target="_blank">Preuzmi video</a>` : ""
      }<button>Zatvori</button></div>`;
    m.addEventListener("click", (e) => {
      if (e.target === m || e.target.tagName === "BUTTON") m.remove();
    });
    this.shadowRoot.appendChild(m);
  }
}

customElements.define("wansview-nvr-card", WansviewNvrCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "wansview-nvr-card", name: "Wansview NVR", description: "Pregled lokalnih snimaka kamera" });
