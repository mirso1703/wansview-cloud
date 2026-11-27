// Ručno punjenje baterije iz mreže – dugme koje se samo vrati na automatski kad je baterija puna.
// Pokreni u browser konzoli na https://ripac.selimovic.ba (prijavljen).
(async () => {
  const h = document.querySelector("home-assistant").hass; await h.auth.refreshAccessToken();
  const H = { Authorization: "Bearer " + h.auth.data.access_token, "Content-Type": "application/json" };
  const put = (k, id, c) => fetch(`/api/config/${k}/config/${id}`, { method: "POST", headers: H, body: JSON.stringify(c) }).then((r) => r.status);
  const N = "notify.mobile_app_vik_k7kt0wdxqg";
  const OUT = "select.ripac_q0048088723771_ripac_output_priority", CHG = "select.ripac_q0048088723771_ripac_charger_source_priority";
  const SOC = "sensor.baterija_soc_stabilno", SMART = "input_boolean.pametno_upravljanje_solarom";
  const out = {};

  if (!h.states["input_boolean.rucno_punjenje_baterije"])
    out.ib = await h.callWS({ type: "input_boolean/create", name: "Ručno punjenje baterije", icon: "mdi:battery-charging-high" }).then(() => "ok").catch((e) => e.message);
  if (!h.states["input_number.rucno_punjenje_do"])
    out.inum = await h.callWS({ type: "input_number/create", name: "Ručno punjenje do", min: 50, max: 100, step: 5, initial: 100, mode: "slider", unit_of_measurement: "%", icon: "mdi:battery-arrow-up" }).then(() => "ok").catch((e) => e.message);

  const A = {
    id: "rucno_punjenje_baterije",
    alias: "🔋 Ručno punjenje baterije",
    description: "Dugme „Ručno punjenje baterije“: isključi pametno upravljanje, kuća ide na mrežu (SOL), baterija se puni iz mreže + sunca (bez obzira na tarifu). Kad baterija dođe do „Ručno punjenje do“ (zadano 100 %), ili nakon 10 h, ili kad se dugme ugasi – vrati pametno (automatsko) upravljanje i javi. Zaštita od hladnoće (struja punjenja < 3 °C) i dalje radi.",
    mode: "restart",
    triggers: [
      { trigger: "state", entity_id: "input_boolean.rucno_punjenje_baterije", to: "on", id: "start" },
      { trigger: "state", entity_id: "input_boolean.rucno_punjenje_baterije", to: "off", id: "stop" },
      { trigger: "template", value_template: `{{ is_state('input_boolean.rucno_punjenje_baterije','on') and states('${SOC}')|float(0) >= states('input_number.rucno_punjenje_do')|float(100) }}`, for: { minutes: 5 }, id: "puna" },
      { trigger: "state", entity_id: "input_boolean.rucno_punjenje_baterije", to: "on", for: { hours: 10 }, id: "timeout" },
      { trigger: "homeassistant", event: "start", id: "restart" },
    ],
    actions: [{
      choose: [
        { conditions: [{ condition: "or", conditions: [{ condition: "trigger", id: "start" }, { condition: "and", conditions: [{ condition: "trigger", id: "restart" }, { condition: "state", entity_id: "input_boolean.rucno_punjenje_baterije", state: "on" }] }] }],
          sequence: [
            { action: "input_boolean.turn_off", target: { entity_id: SMART } },
            { action: "select.select_option", target: { entity_id: OUT }, data: { option: "SOL" }, continue_on_error: true },
            { delay: { seconds: 20 } },
            { action: "select.select_option", target: { entity_id: CHG }, data: { option: "PV Is At The Same Level As Utility" }, continue_on_error: true },
            { action: "logbook.log", data: { name: "Solar", message: `Ručno punjenje baterije: od {{ states('${SOC}')|int }} % do {{ states('input_number.rucno_punjenje_do')|int }} %`, entity_id: "input_boolean.rucno_punjenje_baterije" } },
            { action: N, data: { title: "🔋 Punim bateriju iz mreže", message: `Baterija {{ states('${SOC}')|int }} % → {{ states('input_number.rucno_punjenje_do')|int }} %. Kuća ide na mrežu dok se puni; kad bude puna, vraćam automatsko upravljanje.`, data: { tag: "rucno-punjenje", push: { "interruption-level": "passive" } } } },
          ] },
        { conditions: [{ condition: "trigger", id: ["puna", "timeout"] }],
          sequence: [{ action: "input_boolean.turn_off", target: { entity_id: "input_boolean.rucno_punjenje_baterije" } }] },
        { conditions: [{ condition: "trigger", id: "stop" }],
          sequence: [
            { action: "input_boolean.turn_on", target: { entity_id: SMART } },
            { action: "logbook.log", data: { name: "Solar", message: `Ručno punjenje završeno ({{ states('${SOC}')|int }} %) – vraćeno pametno upravljanje`, entity_id: "input_boolean.rucno_punjenje_baterije" } },
            { action: N, data: { title: "🔋 Punjenje završeno", message: `Baterija {{ states('${SOC}')|int }} %. Vraćeno automatsko (pametno) upravljanje.`, data: { tag: "rucno-punjenje", push: { "interruption-level": "passive" } } } },
          ] },
      ],
    }],
  };
  out.auto = await put("automation", "rucno_punjenje_baterije", A);

  // dugme na dashboardu (sekcija „Solar i baterija“)
  const c = await h.callWS({ type: "lovelace/config", url_path: "ripac-mobitel" });
  const sec = c.views[0].sections.find((s) => JSON.stringify(s).includes("ripac-solar-card"));
  if (sec && !JSON.stringify(sec).includes("rucno_punjenje_baterije")) {
    sec.cards.push(
      { type: "tile", entity: "input_boolean.rucno_punjenje_baterije", name: "Napuni bateriju iz mreže", icon: "mdi:battery-charging-high", tap_action: { action: "toggle" }, grid_options: { columns: 8 } },
      { type: "tile", entity: "input_number.rucno_punjenje_do", name: "Do", grid_options: { columns: 4 } }
    );
    await h.callWS({ type: "lovelace/config/save", url_path: "ripac-mobitel", config: c });
    out.dash = "ok";
  }
  // ---- Una: rizik izlijevanja → baterija puna za svaki slučaj
  // Nivoi HS Ripač: 195 voda na putu, 205 put plavi, 230 plavi se oko kuće.
  if (!h.states["binary_sensor.rizik_poplave_oko_kuce"]) {
    const T = "{% set nivo = states('sensor.hs_ripac_distance')|float(0) %}{% set vrh = states('input_number.una_predvideni_vrhunac')|float(0) %}{% set za = states('input_number.una_vrhunac_za_sati')|float(999) %}{{ nivo >= 215 or (vrh >= 215 and za <= 72) }}";
    const f = await h.callApi("POST", "config/config_entries/flow", { handler: "template" });
    const f2 = await h.callApi("POST", "config/config_entries/flow/" + f.flow_id, { next_step_id: "binary_sensor" });
    out.rizik = await h.callApi("POST", "config/config_entries/flow/" + f2.flow_id, { name: "Rizik poplave oko kuće", state: T, device_class: "safety" }).then((r) => r.type).catch((e) => e.message);
  }
  const C = await fetch("/api/config/automation/config/solar_cilj_punjenja_po_prognozi", { headers: H }).then((r) => r.json());
  const v = C.actions[0].variables;
  if (!v.cilj.includes("rizik_poplave")) v.cilj = "{% if is_state('binary_sensor.rizik_poplave_oko_kuce','on') %}100{% else %}" + v.cilj + "{% endif %}";
  if (!C.triggers.some((t) => t.entity_id === "binary_sensor.rizik_poplave_oko_kuce")) C.triggers.push({ trigger: "state", entity_id: "binary_sensor.rizik_poplave_oko_kuce", id: "poplava" });
  if (!C.description.includes("poplav")) C.description += " Ako Una prijeti izlijevanjem (nivo ili prognozirani vrh ≥ 215 cm u 72 h; oko kuće plavi na 230 cm), cilj je 100 %.";
  out.cilj = await put("automation", "solar_cilj_punjenja_po_prognozi", C);
  const U = {
    id: "una_baterija_za_svaki_slucaj",
    alias: "🌊 Una: napuni bateriju za svaki slučaj",
    description: "Kad prijeti izlijevanje Une (binary_sensor.rizik_poplave_oko_kuce): noćni cilj 100 % (jeftina struja). Ako je vrh blizu (≤ 12 h i ≥ 225 cm) ili nivo već ≥ 220 cm a baterija < 90 %, odmah pokreni ručno punjenje (bez obzira na tarifu) – poplava često znači i nestanak struje. Javi stanje.",
    mode: "single",
    triggers: [{ trigger: "state", entity_id: "binary_sensor.rizik_poplave_oko_kuce", to: "on" }, { trigger: "time_pattern", minutes: "/30" }],
    conditions: [{ condition: "state", entity_id: "binary_sensor.rizik_poplave_oko_kuce", state: "on" }],
    actions: [
      { variables: { nivo: "{{ states('sensor.hs_ripac_distance')|float(0) }}", vrh: "{{ states('input_number.una_predvideni_vrhunac')|float(0) }}", za: "{{ states('input_number.una_vrhunac_za_sati')|float(999) }}", soc: `{{ states('${SOC}')|float(0) }}` } },
      { if: [{ condition: "template", value_template: "{{ (nivo >= 220 or (vrh >= 225 and za <= 12)) and soc < 90 and is_state('input_boolean.rucno_punjenje_baterije','off') }}" }],
        then: [
          { action: "input_number.set_value", target: { entity_id: "input_number.rucno_punjenje_do" }, data: { value: 100 } },
          { action: "input_boolean.turn_on", target: { entity_id: "input_boolean.rucno_punjenje_baterije" } },
          { action: N, data: { title: "🌊 Una raste – punim bateriju odmah", message: "Una {{ nivo|int }} cm, prognoza vrha {{ vrh|int }} cm za ~{{ za|int }} h (oko kuće plavi na 230 cm). Baterija {{ soc|int }} % → punim do 100 % iz mreže za slučaj nestanka struje.", data: { tag: "una-baterija" } } }] },
      { if: [{ condition: "trigger", id: [] }], then: [] },
    ],
  };
  U.actions.pop();
  out.una = await put("automation", "una_baterija_za_svaki_slucaj", U);
  console.log(out);
  return out;
})();
