// Pokreni u browser konzoli na https://ripac.selimovic.ba (prijavljen).
// 1) Obavijest o pokretu (kamera_pokret_obavijest):
//    - Reolink kamere (Ulaz, Iza): čeka 8 s; ako je kamera vidjela SAMO životinju (bez osobe/vozila) → nema obavijesti.
//    - Sve kamere: obavijest dobija tag "pokret-<kamera>", da je obavijest o životinji može zamijeniti.
// 2) Prepoznavanje životinja (zivotinje_prepoznavanje + script.zivotinja_prepoznaj):
//    - svako čekanje (wait_template / wait_for_trigger) bez timeouta dobija timeout 3 min → više ne može visiti satima
//    - automatizacija prelazi na mode: restart (nova životinja prekida staru analizu)
//    - obavijest o životinji koristi isti tag "pokret-<kamera>" → na mobitelu ZAMIJENI obavijest o pokretu
(async () => {
  const h = document.querySelector("home-assistant").hass; await h.auth.refreshAccessToken();
  const H = { Authorization: "Bearer " + h.auth.data.access_token, "Content-Type": "application/json" };
  const get = (k, id) => fetch(`/api/config/${k}/config/${id}`, { headers: H }).then((r) => r.json());
  const put = (k, id, c) => fetch(`/api/config/${k}/config/${id}`, { method: "POST", headers: H, body: JSON.stringify(c) }).then((r) => r.status);
  const walk = (o, f) => { if (Array.isArray(o)) o.forEach((x) => walk(x, f)); else if (o && typeof o === "object") { f(o); Object.values(o).forEach((x) => walk(x, f)); } };
  const isNotify = (a) => typeof (a.action || a.service) === "string" && /^notify\./.test(a.action || a.service);
  const TAG = "pokret-{{ (kamera | default(nvr_kamera | default(trigger.entity_id | default('kamera')))) | string | lower | replace(' ', '_') }}";
  const backup = {};

  // ---- 1) obavijest o pokretu
  const P = await get("automation", "kamera_pokret_obavijest"); backup.pokret = JSON.parse(JSON.stringify(P));
  if (!JSON.stringify(P).includes("samo_zivotinja")) {
    P.actions.unshift(
      { variables: { reo_cam: "{% set e = trigger.entity_id | default('') %}{{ 'ulaz' if 'ulaz' in e else ('iza' if 'iza' in e else '') }}" } },
      { if: [{ condition: "template", value_template: "{{ reo_cam != '' }}" }], then: [{ delay: { seconds: 8 } }] },
      { variables: { samo_zivotinja: "{% if reo_cam %}{% set a = ['binary_sensor.' ~ reo_cam ~ '_vikendica_animal', 'binary_sensor.' ~ reo_cam ~ '_vikendica_pet'] %}{% set an = a | select('is_state','on') | list | count > 0 or (a | map('states') | list | count > 0 and (a | select('has_value') | map('as_entity') | map(attribute='last_changed') | select('>', now() - timedelta(seconds=40)) | list | count > 0)) %}{{ an and not is_state('binary_sensor.' ~ reo_cam ~ '_vikendica_person','on') and not is_state('binary_sensor.' ~ reo_cam ~ '_vikendica_vehicle','on') }}{% else %}false{% endif %}" } },
      { condition: "template", value_template: "{{ not samo_zivotinja }}" }
    );
  }
  walk(P.actions, (a) => { if (isNotify(a)) { a.data = a.data || {}; a.data.data = a.data.data || {}; if (!a.data.data.tag) a.data.data.tag = TAG; } });
  P.description = (P.description || "") + " Ako Reolink vidi samo životinju, nema obavijesti o pokretu (javi se prepoznavanje životinje).";

  // ---- 2) prepoznavanje životinja
  const Z = await get("automation", "zivotinje_prepoznavanje"); backup.zivotinje = JSON.parse(JSON.stringify(Z));
  const S = await get("script", "zivotinja_prepoznaj"); backup.script = JSON.parse(JSON.stringify(S));
  for (const c of [Z, S]) walk(c, (a) => {
    if ((a.wait_template || a.wait_for_trigger) && !a.timeout) { a.timeout = "00:03:00"; a.continue_on_timeout = false; }
    if (isNotify(a)) { a.data = a.data || {}; a.data.data = a.data.data || {}; a.data.data.tag = TAG; }
  });
  Z.mode = "restart";
  window.__ripacBackup = backup;
  const r = { pokret: await put("automation", "kamera_pokret_obavijest", P), zivotinje: await put("automation", "zivotinje_prepoznavanje", Z), script: await put("script", "zivotinja_prepoznaj", S) };
  console.log("Rezultat", r, "Backup u window.__ripacBackup");
  return r;
})();
