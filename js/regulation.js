/* Moteur d'analyse : sources ouvertes officielles (IGN / DGAC) + règles réglementaires
 * Références principales :
 *  - Arrêté du 3 décembre 2020 relatif à l'utilisation de l'espace aérien par les aéronefs sans équipage à bord (« arrêté espace »)
 *  - Cerfa 15476*04 et sa notice 52053#04 (déclaration préalable au vol en zone peuplée)
 *  - Règlement d'exécution (UE) 2019/947
 */
const Regulation = (() => {

  const LINKS = [
    { t: 'Géoportail – Carte des restrictions UAS', url: 'https://www.geoportail.gouv.fr/donnees/restrictions-uas-categorie-ouverte-et-aeromodelisme', d: 'Carte officielle IGN/DGAC des zones de restriction' },
    { t: 'AlphaTango', url: 'https://alphatango.aviation-civile.gouv.fr/', d: 'Enregistrement exploitant/drones, déclarations STS, notifications de vol' },
    { t: 'SIA – Visualiseur AIP (carte des terrains, VAC, espaces)', url: 'https://bo-prod-sofia-vac.sia-france.fr/vaipEx/?lang=fr', d: 'Carte interactive officielle : cliquer sur un terrain pour sa carte VAC' },
    { t: 'NOTAM – SOFIA-Briefing', url: 'https://sofia-briefing.aviation-civile.gouv.fr/sofia', d: 'NOTAM du jour (compte gratuit)' },
    { t: 'SUP AIP Métropole', url: 'https://www.sia.aviation-civile.gouv.fr/documents/supaip/aip/id/6', d: 'Zones temporaires, événements' },
    { t: 'Activité AZBA / RTBA', url: 'https://www.sia.aviation-civile.gouv.fr/schedules', d: 'Horaires du réseau très basse altitude (publiés la veille dès 17h)' },
    { t: 'DGAC – Drones (usages professionnels)', url: 'https://www.ecologie.gouv.fr/politiques-publiques/drones-usages-professionnels', d: 'Catégories, scénarios STS, formulaires (dérogations, Cerfa 15478…)' },
    { t: 'Cerfa 15476*04 (déclaration zone peuplée)', url: 'assets/cerfa_15476-04.pdf', d: 'Formulaire officiel vierge' },
    { t: 'Notice 52053#04', url: 'assets/notice_52053-04.pdf', d: 'Notice officielle du Cerfa 15476*04 (pièces justificatives, définitions)' },
    { t: 'Dérogation ZICAD', url: 'https://www.demarches-simplifiees.fr/commencer/derogation-zicad', d: 'Zones interdites à la captation aérienne de données' },
    { t: 'Fox Alpha Tango – formations', url: 'https://fox-alphatango.aviation-civile.gouv.fr/', d: 'Formation et examen A1/A3' },
    { t: 'Règlement d\'exécution (UE) 2019/947', url: 'https://eur-lex.europa.eu/eli/reg_impl/2019/947/oj', d: 'Règles et procédures d\'exploitation des UAS' },
    { t: 'Arrêté « espace » du 3 décembre 2020', url: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000042837116', d: 'Utilisation de l\'espace aérien par les aéronefs sans équipage à bord' },
    { t: 'Météo aéronautique (Aviation Météo-France)', url: 'https://aviation.meteo.fr/', d: 'METAR/TAF, cartes TEMSI (inscription gratuite)' }
  ];

  const NATIONAL_CONTACTS = [
    { name: 'DGAC / DSAC – Pôle drones', role: 'Autorisations catégorie spécifique, déclarations STS, dérogations', url: 'https://www.ecologie.gouv.fr/politiques-publiques/drones-usages-professionnels' },
    { name: 'AlphaTango', role: 'Portail exploitants : enregistrement, déclarations, notifications', url: 'https://alphatango.aviation-civile.gouv.fr/' },
    { name: 'SIA', role: 'NOTAM, AIP, fiches VAC (téléphones des tours et organismes de contrôle civils et militaires)', url: 'https://www.sia.aviation-civile.gouv.fr/' },
    { name: 'Préfecture de police – survol de Paris', role: 'Démarche en ligne pour Paris et petite couronne', url: 'https://demarche.numerique.gouv.fr/commencer/survol-drone-paris' },
    { name: 'BA 126 Solenzara – demande de vol', role: 'Démarche en ligne pour les zones gérées par le CMC de Solenzara', url: 'https://demarche.numerique.gouv.fr/commencer/drones-solenzara' },
    { name: 'Annuaire de l\'administration', role: 'Coordonnées des préfectures, mairies, polices municipales', url: 'https://lannuaire.service-public.fr/' }
  ];

  /* ---------- Liens directs SIA (calculés selon le cycle AIRAC en vigueur) ---------- */
  const AIRAC_REF = Date.UTC(2026, 9, 29); // cycle du 29/10/2026, puis tous les 28 jours
  function airac(date = new Date()) {
    const n = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - AIRAC_REF) / (28 * 86400000));
    const d = new Date(AIRAC_REF + n * 28 * 86400000);
    const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][d.getUTCMonth()];
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return { folder: `eAIP_${dd}_${MON}_${d.getUTCFullYear()}`, iso: d.toISOString().slice(0, 10) };
  }
  const SIA = {
    aip: (icao) => { const a = airac(); return `https://www.sia.aviation-civile.gouv.fr/media/dvd/${a.folder}/FRANCE/AIRAC-${a.iso}/html/eAIP/FR-AD-2.${icao}-fr-FR.html`; },
    atlasVac: () => `https://www.sia.aviation-civile.gouv.fr/documents/htmlshow?f=dvd/${airac().folder}/Atlas-VAC/home.htm`,
    viewer: 'https://bo-prod-sofia-vac.sia-france.fr/vaipEx/?lang=fr',
    notam: 'https://sofia-briefing.aviation-civile.gouv.fr/sofia',
    supaip: 'https://www.sia.aviation-civile.gouv.fr/documents/supaip/aip/id/6',
    azba: 'https://www.sia.aviation-civile.gouv.fr/schedules'
  };
  /* ---------- Annuaire officiel des terrains (extrait des fiches eAIP AD 2 du SIA, voir tools/) ---------- */
  let AIPDIR = { aerodromes: {} };
  const aipReady = fetch('data/aip-aerodromes.json').then(r => r.json()).then(d => (AIPDIR = d)).catch(() => AIPDIR);
  const aipInfo = (icao) => (icao && AIPDIR.aerodromes[icao]) || null;
  /* Adresses « drones » des préfectures (publiées sur leurs sites) */
  let PREFS = { departements: {} };
  const prefReady = fetch('data/prefectures-drones.json').then(r => r.json()).then(d => (PREFS = d)).catch(() => PREFS);
  const prefDrone = (dep) => (dep && PREFS.departements[dep]) || null;
  // Adresse mémorisée par l'utilisateur pour ce département (prioritaire)
  // Adresse mémorisée : d'abord pour l'arrondissement exact, sinon pour le département
  const prefSaved = (dep, arr) => { const L = Store.all('contacts').filter(c => c.type === 'Préfecture' && c.email && c.dep === dep && c.drones); return L.find(c => arr && c.arr === arr) || L.find(c => !c.arr); };
  let CTRS = { features: [] };
  const ctrReady = fetch('data/aip-ctr.geojson').then(r => r.json()).then(d => (CTRS = d)).catch(() => CTRS);
  const ctrsAt = (zone) => { const seen = new Set(); return CTRS.features.filter(f => { try { if (seen.has(f.properties.name) || !turf.booleanIntersects(f, zone)) return false; seen.add(f.properties.name); return true; } catch (e) { return false; } }); };
  const aipStale = () => { const cur = airac().iso; return AIPDIR.airac && AIPDIR.airac < cur ? { have: AIPDIR.airac, current: cur } : null; };
  const ctrName = (icao) => { const a = aipInfo(icao); return a && a.airspaces ? a.airspaces[0] + (a.airspaceClass ? ` (classe ${a.airspaceClass})` : '') : ''; };

  // CTR militaires où la catégorie ouverte est interdite (accord préalable en catégorie spécifique)
  const MIL_CTR = { LFOA: 'Avord', LFBC: 'Cazaux', LFMI: 'Istres', LFRJ: 'Landivisiau', LFMY: 'Salon-de-Provence', LFPV: 'Villacoublay' };

  const CATEGORIES = [
    ['A1', 'Ouverte – A1'], ['A2', 'Ouverte – A2'], ['A3', 'Ouverte – A3'],
    ['STS-01', 'Spécifique – STS-01'], ['STS-02', 'Spécifique – STS-02'],
    ['PDRA', 'Spécifique – autorisation / LUC (SORA, PDRA)'], ['Autre', 'Autre / aéromodélisme']
  ];

  /* ---------- Jours ouvrables & préavis (Cerfa 15476*04 §4) ---------- */
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(y, month - 1, day));
  }
  const iso = (d) => d.toISOString().slice(0, 10);
  const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
  const holidaysCache = {};
  function holidays(y, dep) {
    const k = y + '-' + dep; if (holidaysCache[k]) return holidaysCache[k];
    const E = easter(y);
    const s = new Set([`${y}-01-01`, `${y}-05-01`, `${y}-05-08`, `${y}-07-14`, `${y}-08-15`, `${y}-11-01`, `${y}-11-11`, `${y}-12-25`,
      iso(addDays(E, 1)), iso(addDays(E, 39)), iso(addDays(E, 50))]);
    if (['57', '67', '68'].includes(dep)) { s.add(iso(addDays(E, -2))); s.add(`${y}-12-26`); }
    return (holidaysCache[k] = s);
  }
  // Jour ouvrable = hors dimanche et jour férié
  const isWorking = (d, dep) => d.getUTCDay() !== 0 && !holidays(d.getUTCFullYear(), dep).has(iso(d));
  const utc = (s) => new Date(s + 'T00:00:00Z');

  /** Préavis : jours ouvrables pleins entre l'envoi et le 1er jour de vol (exclus tous deux). */
  function notice(flightDate, dep, sendDate = new Date().toISOString().slice(0, 10)) {
    if (!flightDate) return null;
    const F = utc(flightDate), S = utc(sendDate);
    let full = 0; for (let d = addDays(S, 1); d < F; d = addDays(d, 1)) if (isWorking(d, dep)) full++;
    let d = addDays(F, -1), n = 0; while (n < 10) { if (isWorking(d, dep)) n++; d = addDays(d, -1); }
    const latest = iso(d); // dernier jour d'envoi possible
    const earliest = (() => { const x = utc(flightDate); x.setUTCMonth(x.getUTCMonth() - 1); return iso(x); })();
    return { full, ok: full >= 10, latest, earliest, tooEarly: sendDate < earliest };
  }

  /* ---------- Sources ---------- */
  async function fetchJSON(url, opts = {}, retry = 1) {
    try {
      const r = await fetch(url, { ...opts, signal: AbortSignal.timeout ? AbortSignal.timeout(opts.timeout || 20000) : undefined });
      if (!r.ok) throw new Error(r.status + ' ' + url);
      return await r.json();
    } catch (e) {
      // Le service renvoie parfois une réponse parasite : on relance sans cache
      if (retry > 0 && !(e.name === 'TimeoutError')) return fetchJSON(url, { ...opts, cache: 'reload' }, retry - 1);
      throw e;
    }
  }
  const WFS = 'https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&OUTPUTFORMAT=application/json';
  const wkt = (feat) => {
    const g = turf.truncate(turf.simplify(feat, { tolerance: 0.00005, highQuality: false }), { precision: 6 }).geometry;
    const ring = (r) => '(' + r.map(c => c[0] + ' ' + c[1]).join(',') + ')';
    return g.type === 'Polygon' ? `SRID=4326;POLYGON(${g.coordinates.map(ring).join(',')})` : `SRID=4326;MULTIPOLYGON(${g.coordinates.map(p => '(' + p.map(ring).join(',') + ')').join(',')})`;
  };
  const bboxCql = (zone, km) => { const [w, s, e, n] = turf.bbox(turf.buffer(zone, km, { units: 'kilometers' })); return `BBOX(geometrie,${w},${s},${e},${n},'EPSG:4326')`; };
  const ign = (type, cql, props, count = 500) => fetchJSON(`${WFS}&TYPENAMES=${type}&COUNT=${count}&CQL_FILTER=${encodeURIComponent(cql)}${props ? '&PROPERTYNAME=' + props : ''}`).then(r => r.features || []);

  // Zones de restriction UAS officielles (DGAC, diffusées par l'IGN)
  async function fetchRestrictions(zone) {
    const [w, s, e, n] = turf.bbox(turf.buffer(zone, 0.1, { units: 'kilometers' }));
    const fc = await fetchJSON(`${WFS}&TYPENAMES=TRANSPORTS.DRONES.RESTRICTIONS:carte_restriction_drones_lf&COUNT=500&BBOX=${s},${w},${n},${e},urn:ogc:def:crs:EPSG::4326`);
    const z50 = turf.buffer(zone, 0.05, { units: 'kilometers' }); // zone peuplée : < 50 m d'une agglomération
    return (fc.features || []).filter(f => { try { return turf.booleanIntersects(f, /agglom/i.test(f.properties.remarque || '') ? z50 : zone); } catch (err) { return true; } });
  }

  // Points sensibles (BD TOPO IGN) : aérodromes, militaire, pénitentiaire, santé, sport, forces de l'ordre, espaces protégés, lignes
  async function fetchSensitive(zone) {
    const Z = wkt(zone), Z1 = wkt(turf.buffer(zone, 1, { units: 'kilometers' })), Z100 = wkt(turf.buffer(zone, 0.1, { units: 'kilometers' }));
    const NAT = ['Etablissement pénitentiaire', 'Enceinte militaire', 'Champ de tir', 'Hôpital', 'Etablissement hospitalier', 'Stade'];
    const settle = (p) => p.then(v => v, () => null);
    const [aero, zai, police, parcsNear, parcsIn, elec, rail] = await Promise.all([
      settle(ign('BDTOPO_V3:aerodrome', bboxCql(zone, 12), 'toponyme,nature,usage,code_icao,categorie,geometrie')),
      settle(ign('BDTOPO_V3:zone_d_activite_ou_d_interet', `nature IN (${NAT.map(n => `'${n}'`).join(',')}) AND ${bboxCql(zone, 2)}`, 'nature,nature_detaillee,toponyme,geometrie')),
      settle(ign('BDTOPO_V3:zone_d_activite_ou_d_interet', `nature IN ('Police','Gendarmerie') AND ${bboxCql(zone, 8)}`, 'nature,nature_detaillee,toponyme,geometrie')),
      settle(ign('BDTOPO_V3:parc_ou_reserve', `INTERSECTS(geometrie,${Z1})`, 'nature,nature_detaillee,toponyme', 60)),
      settle(ign('BDTOPO_V3:parc_ou_reserve', `INTERSECTS(geometrie,${Z})`, 'nature,nature_detaillee,toponyme', 60)),
      settle(ign('BDTOPO_V3:ligne_electrique', `INTERSECTS(geometrie,${Z100})`, 'voltage', 3)),
      settle(ign('BDTOPO_V3:troncon_de_voie_ferree', `INTERSECTS(geometrie,${Z100})`, 'nature', 3))
    ]);
    const out = []; const errors = [aero, zai, police, parcsNear].filter(x => x === null).length;
    const push = (f, kind, extra = {}) => { const p = f.properties || {}; const d = f.geometry ? distToZone(f, zone) : null; const c = f.geometry ? turf.centroid(f).geometry.coordinates : null; out.push({ kind, name: p.toponyme || '', d, lat: c && c[1], lon: c && c[0], props: p, ...extra }); };
    (aero || []).forEach(f => push(f, f.properties.nature === 'Héliport' ? 'heliport' : 'aerodrome', { military: /milit/i.test(f.properties.usage || ''), icao: f.properties.code_icao || '' }));
    (zai || []).forEach(f => {
      const n = f.properties.nature;
      push(f, n === 'Etablissement pénitentiaire' ? 'prison' : (n === 'Enceinte militaire' || n === 'Champ de tir') ? 'military' : n === 'Stade' ? 'stadium' : 'hospital');
    });
    (police || []).forEach(f => push(f, 'police', { gendarmerie: f.properties.nature === 'Gendarmerie' }));
    const inNames = new Set((parcsIn || []).map(f => f.properties.toponyme));
    (parcsNear || []).forEach(f => out.push({ kind: 'nature', name: f.properties.toponyme || '', nature: f.properties.nature, detail: f.properties.nature_detaillee, d: inNames.has(f.properties.toponyme) ? 0 : 1 }));
    if (elec && elec.length) out.push({ kind: 'power', d: 0.1, name: 'Ligne électrique', props: elec[0].properties });
    if (rail && rail.length) out.push({ kind: 'rail', d: 0.1, name: 'Voie ferrée' });
    return { items: out, errors };
  }

  function distToZone(f, zone) {
    try {
      if (turf.booleanIntersects(f, zone)) return 0;
      const line = turf.polygonToLine(zone); const coords = turf.coordAll(f);
      const step = Math.max(1, Math.floor(coords.length / 200)); let min = Infinity;
      for (let i = 0; i < coords.length; i += step) min = Math.min(min, turf.pointToLineDistance(turf.point(coords[i]), line, { units: 'kilometers' }));
      return min;
    } catch (e) { return null; }
  }

  async function fetchCommune(pt) {
    const [lon, lat] = pt.geometry.coordinates;
    try { // Géocodage inverse IGN (rapide)
      const r = await fetchJSON(`https://data.geopf.fr/geocodage/reverse?lon=${lon}&lat=${lat}&limit=1`, { timeout: 6000 });
      const p = r.features && r.features[0] && r.features[0].properties;
      if (p && p.citycode) {
        const [dep, depName] = (p.context || '').split(',').map(s => s.trim());
        let arr = '';
        try { const c = await ign('BDTOPO_V3:commune', `code_insee='${p.citycode}'`, 'code_insee_de_l_arrondissement', 1); arr = c[0] ? c[0].properties.code_insee_de_l_arrondissement : ''; } catch (e) { }
        return { nom: p.city, code: p.citycode, codeDepartement: dep || p.citycode.slice(0, 2), departement: { nom: depName || dep }, codesPostaux: [p.postcode], address: p.label, district: p.district, arr };
      }
    } catch (e) { /* repli */ }
    const r = await fetchJSON(`https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}&fields=nom,code,codeDepartement,departement,codesPostaux`, { timeout: 15000 });
    return r[0] || null;
  }

  // Préfecture, mairie, police municipale (Annuaire de l'administration)
  async function fetchAdminContacts(commune) {
    if (!commune) return [];
    const B = 'https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records';
    const sel = 'nom,adresse_courriel,telephone,site_internet,code_insee_commune';
    const q = (where) => fetchJSON(`${B}?where=${encodeURIComponent(where)}&limit=10&select=${sel}`).then(r => r.results || []).catch(() => []);
    const dep = commune.codeDepartement;
    const isPP = ['75', '92', '93', '94'].includes(dep);
    const [prefs, mairies, pm, pp] = await Promise.all([
      q(`search(pivot,"\\"prefecture\\"") and code_insee_commune like "${dep}*"`),
      q(`search(pivot,"\\"mairie\\"") and code_insee_commune="${commune.code}"`),
      q(`search(pivot,"\\"police_municipale\\"") and code_insee_commune="${commune.code}"`),
      isPP ? q(`search(nom,"Préfecture de police")`) : Promise.resolve([])
    ]);
    const parse = (s) => { try { return JSON.parse(s || '[]'); } catch (e) { return []; } };
    const norm = (r, type) => ({ name: r.nom, type, email: r.adresse_courriel || '', phone: (parse(r.telephone)[0] || {}).valeur || '', website: (parse(r.site_internet)[0] || {}).valeur || '', area: `${commune.nom} (${dep})` });
    const out = [];
    if (pp[0]) out.push({ ...norm(pp[0], 'Préfecture'), website: 'https://demarche.numerique.gouv.fr/commencer/survol-drone-paris' });
    else {
      const pref = prefs.find(r => /^Préfecture - /i.test(r.nom)) || prefs.find(r => /^Préfecture/i.test(r.nom) && !/région/i.test(r.nom));
      if (pref) {
        const c = norm(pref, 'Préfecture'), pd = prefDrone(dep), arr = commune.arr, saved = prefSaved(dep, arr);
        const sub = pd && pd.arrondissements && pd.arrondissements[arr];
        c.dep = dep; c.arr = sub ? arr : '';
        if (sub) { c.name = sub.service; c.website = sub.source || c.website; }
        if (saved) { c.email = saved.email; c.emailSource = 'votre annuaire'; c.drones = true; if (saved.service) c.name = saved.service; }
        else if (sub && sub.email) { c.email = sub.email; c.emailSource = sub.service; c.drones = true; }
        else if (pd && pd.email) { c.email = pd.email; c.emailSource = pd.sourceLabel || 'site de la préfecture'; c.drones = true; c.website = pd.source || c.website; c.altEmail = pd.alt || ''; if (pd.service) c.name = pd.service; }
        else { c.genericEmail = c.email; c.email = ''; c.website = (pd && pd.site ? pd.site.replace(/\/$/, '') + '/content/search?SearchText=drone' : c.website); }
        out.push(c);
      }
    }
    const m = mairies.find(r => /^Mairie/i.test(r.nom)) || mairies[0]; if (m) out.push(norm(m, 'Mairie'));
    if (pm[0]) out.push(norm(pm[0], 'Police / gendarmerie'));
    return out;
  }

  async function fetchWeather(pt, date) {
    const [lon, lat] = pt.geometry.coordinates;
    const days = (new Date(date) - new Date(new Date().toISOString().slice(0, 10))) / 86400000;
    if (days < 0 || days > 15) return null; // prévision disponible jusqu'à J+15
    return fetchJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation_probability,visibility,cloud_cover&daily=sunrise,sunset&wind_speed_unit=kmh&timezone=Europe%2FParis&start_date=${date}&end_date=${date}`);
  }

  /* ---------- Espaces aériens (optionnel) : OpenAIP, clé gratuite à créer sur openaip.net ---------- */
  const ASP = { 1: ['R', 'Zone réglementée (R)'], 2: ['D', 'Zone dangereuse (D)'], 3: ['P', 'Zone interdite (P)'], 4: ['CTR', 'CTR'], 7: ['TMA', 'TMA'], 8: ['TRA', 'TRA'], 9: ['TSA', 'TSA'], 13: ['ATZ', 'ATZ'], 14: ['MATZ', 'MATZ'], 16: ['MTR', 'Route militaire (MTR/RTBA)'], 19: ['PROT', 'Zone protégée'], 26: ['CTA', 'CTA'], 29: ['LAOR', 'Restriction de survol basse altitude'], 31: ['TFR', 'Restriction temporaire'] };
  const fmtLim = (l) => !l ? '?' : l.referenceDatum === 0 && l.value === 0 ? 'SFC' : `${l.value} ${({ 0: 'm', 1: 'ft', 6: 'FL' })[l.unit] || ''} ${({ 0: 'sol', 1: 'AMSL', 2: '' })[l.referenceDatum] || ''}`.trim();
  async function fetchAirspaces(zone, key) {
    if (!key) return undefined;
    const [w, s, e, n] = turf.bbox(zone);
    const r = await fetchJSON(`https://api.core.openaip.net/api/airspaces?bbox=${w},${s},${e},${n}&limit=200&apiKey=${encodeURIComponent(key)}`, { timeout: 12000 });
    const out = [];
    (r.items || []).forEach(a => {
      const t = ASP[a.type]; if (!t || !a.geometry) return;
      // ne garder que ce qui commence sous 150 m sol / 500 ft
      const lo = a.lowerLimit || {}; const loM = lo.unit === 1 ? lo.value * 0.3048 : lo.unit === 6 ? lo.value * 30.48 : lo.value;
      if (loM > 300 && lo.referenceDatum !== 0) return;
      try { if (!turf.booleanIntersects({ type: 'Feature', geometry: a.geometry }, zone)) return; } catch (err) { return; }
      const [code, label] = t;
      const rule = code === 'P' ? 'Vol interdit sauf conditions de pénétration publiées.' : (code === 'R' || code === 'D') ? 'Catégorie ouverte : vol interdit pendant les horaires d\'activation. Spécifique : accord de l\'organisme désigné dans l\'AIP.' :
        code === 'CTR' ? 'CTR : voir la contrainte « Zone UAS » associée (accord du contrôle selon hauteur).' : code === 'MTR' || code === 'LAOR' ? 'Activité militaire très basse altitude : vérifier les horaires AZBA.' : 'Espace contrôlé ou réglementé : vérifier les conditions dans l\'AIP.';
      out.push({ code, label, name: a.name, limits: `De ${fmtLim(a.lowerLimit)} à ${fmtLim(a.upperLimit)}`, rule, level: code === 'P' ? 'bad' : ['R', 'D', 'CTR', 'MTR', 'LAOR', 'TFR'].includes(code) ? 'warn' : 'info' });
    });
    return out;
  }

  function parseLimit(limite) {
    if (!limite) return null;
    if (/interdit/i.test(limite) && !/120/.test(limite)) return 0;
    const m = limite.match(/(\d+)\s*m/); return m ? Number(m[1]) : null;
  }

  /* Cohérence des dates et horaires d'une mission → liste de messages */
  function whenErrors(m) {
    const E = [];
    if (m.endDate && m.date && m.endDate < m.date) E.push('La date de fin est antérieure à la date du vol.');
    if (m.altDate && m.date && m.altDate < m.date) E.push('La date de report est antérieure à la date du vol.');
    if (m.startTime && m.endTime && (!m.endDate || m.endDate === m.date) && m.endTime <= m.startTime) E.push('L\'heure de fin doit être après l\'heure de début.');
    return E;
  }

  /* ---------- Règles ----------
   * Contrainte : { level: bad|warn|info|ok, title, text, contact?, actions: [{type:'dossier'|'mail'|'link', template?, label, target?, url?}] }
   * Les actions de même destinataire (template + cible) sont regroupées en une seule démarche dans l'onglet 3.
   */
  function buildConstraints(m, ctx) {
    const C = []; const add = (o) => C.push(Object.assign({ actions: [] }, o));
    const h = Number(m.maxHeight) || 0, cat = m.category || '';
    const isOpen = /^A[123]$/.test(cat);
    const pilot = ctx.pilot, drone = ctx.drone, S = ctx.sensitive || [];
    const fmtD = (d) => d == null ? 'à proximité' : d === 0 ? 'dans la zone' : `à ${d < 1 ? Math.round(d * 1000) + ' m' : d.toFixed(1) + ' km'}`;
    const restr = ctx.restrictions || [];
    const aeros = S.filter(o => o.kind === 'aerodrome' || o.kind === 'heliport').sort((a, b) => (a.d ?? 99) - (b.d ?? 99));

    /* 0. Dates incohérentes */
    const we = whenErrors(m);
    if (we.length) add({ level: 'bad', blocking: true, title: 'Dates ou horaires incohérents', text: we.join(' '), fix: 'Corriger la date / les heures dans l\'onglet Informations.' });

    /* 1. Zone peuplée → déclaration préalable préfecture (art. 6 1° arrêté espace) — UNE seule contrainte */
    const agglo = restr.some(f => /agglom/i.test(f.properties.remarque || ''));
    if (agglo || m.crowd) {
      const nt = notice(m.date, ctx.commune && ctx.commune.codeDepartement);
      const pp = ctx.commune && ['75', '92', '93', '94'].includes(ctx.commune.codeDepartement);
      let text = `${agglo ? 'La zone de vol est en agglomération ou à moins de 50 m de celle-ci' : ''}${agglo && m.crowd ? ' et ' : ''}${m.crowd ? 'à moins de 150 m d\'un rassemblement de personnes' : ''} : c'est une « zone peuplée ». ` +
        `Déclaration préalable obligatoire au préfet (Cerfa 15476*04 ou AlphaTango), avec un préavis de 10 jours ouvrables pleins (hors dimanches et jours fériés, sans compter le jour d'envoi ni le 1er jour de vol) et au plus tôt 1 mois avant. Ce n'est pas une autorisation : la préfecture peut interdire ou restreindre le vol.`;
      if (isOpen) text += ` En catégorie ouverte, le survol de l'espace public en agglomération n'est admis que dans le cadre de l'activité professionnelle de l'exploitant (art. 5 de l'arrêté espace), sous réserve de cette déclaration.`;
      if (m.takeoff !== 'public') text += ' Si le vol et la zone de sécurité au sol restent hors espace public (ex. jardin privé), la case correspondante du Cerfa sera cochée.';
      if (nt) text += nt.ok ? ` Préavis respecté : envoi au plus tard le ${UI.fmtDate(nt.latest)}${nt.tooEarly ? ` (mais pas avant le ${UI.fmtDate(nt.earliest)} : préavis maximal d'un mois)` : ''}.`
        : ` ⚠ Préavis insuffisant (${nt.full} jour(s) ouvrable(s) plein(s) seulement) : la case « Impossibilité de respecter le préavis » sera cochée et un motif est obligatoire ; le vol ne pourra avoir lieu qu'après accord explicite de la préfecture.`;
      if (pp) text += ' Paris / petite couronne : déclaration auprès de la Préfecture de police (démarche en ligne dédiée).';
      add({ level: nt && !nt.ok ? 'bad' : 'warn', title: 'Zone peuplée : déclaration préalable en préfecture', text, group: 'prefecture',
        actions: [{ type: 'dossier', label: 'Préparer le Cerfa et le mail préfecture', template: 'prefecture' }, ...(pp ? [{ type: 'link', label: 'Démarche Préfecture de police', url: 'https://demarche.numerique.gouv.fr/commencer/survol-drone-paris' }] : [])] });
      if (cat === 'A3') add({ level: 'bad', blocking: true, title: 'A3 incompatible avec une zone urbaine', text: 'La sous-catégorie A3 impose de voler à au moins 150 m des zones résidentielles, commerciales, industrielles ou récréatives. Utilisez A1, A2 ou STS-01.' });
    }

    /* 2. Autres zones UAS officielles (hors agglomération déjà traitée) */
    if (ctx.restrictions === null) add({ level: 'warn', title: 'Carte des restrictions UAS indisponible', text: 'Le service IGN n\'a pas répondu. Vérifiez sur Géoportail avant le vol.', actions: [{ type: 'link', label: 'Ouvrir Géoportail', url: LINKS[0].url }] });
    const others = restr.filter(f => !/agglom/i.test(f.properties.remarque || ''));
    const tooHighPre = (lim) => lim > 0 && h > lim;
    const seen = new Set();
    others.forEach(f => {
      const p = f.properties; const key = p.limite + '|' + p.remarque; if (seen.has(key)) return; seen.add(key);
      const lim = parseLimit(p.limite);
      const isAero = /aérodrome/i.test(p.remarque || '');
      const isNotif = /notification/i.test(p.limite || '');
      // Rattacher la zone à l'aérodrome le plus proche (y compris les zones « Vol interdit » sans remarque autour des bases militaires)
      const ad = isAero ? aeros.find(a => a.kind === 'aerodrome' && a.d != null && a.d < 15)
        : (lim === 0 || tooHighPre(lim)) ? aeros.find(a => a.kind === 'aerodrome' && a.military && a.d != null && a.d < 8) : null;
      const adName = ad ? `${ad.name}${ad.icao ? ' (' + ad.icao + ')' : ''}` : '';
      if (isNotif) {
        const heavy = drone && Number(drone.mtom) > 900;
        add({ level: heavy || m.vlos === 'BVLOS' ? 'warn' : 'info', title: 'Zone d\'entraînement militaire basse altitude : notification AlphaTango',
          text: `${p.limite} (AIP ENR 5.3.1.3). Du lundi au vendredi pendant les heures d'activité, tout vol d'un drone de plus de 900 g${heavy ? ' (c\'est votre cas)' : ''} ou hors vue doit être notifié au ministère des Armées via AlphaTango. Fenêtre : pour un vol entre 08h00 le jour J et 08h00 le lendemain, notification au plus tôt à 04h00 à J-2 et au plus tard à 04h00 le jour J. Pas de réponse à attendre. Des avions de combat peuvent y voler à très basse hauteur et très grande vitesse.`,
          actions: [{ type: 'link', label: 'Notifier sur AlphaTango', url: 'https://alphatango.aviation-civile.gouv.fr/' }, { type: 'link', label: 'Activité AZBA du jour', url: SIA.azba }] });
        return;
      }
      const tooHigh = lim > 0 && h > lim;
      let level = lim === 0 || tooHigh ? 'bad' : 'warn';
      let text = `${p.limite}${p.remarque ? ' — ' + p.remarque : ''}. `;
      if (lim === 0) text += 'Vol interdit sauf conditions particulières de l\'arrêté espace (protocole ou accord préalable du gestionnaire de l\'espace aérien). ';
      else if (lim > 0) text += tooHigh ? `⚠ Votre hauteur prévue (${h} m) dépasse la limite de ${lim} m : réduisez la hauteur ou obtenez un accord. ` : `Hauteur prévue ${h} m : conforme à la limite de ${lim} m. `;
      const actions = [];
      const milCtr = ad && ad.military && MIL_CTR[ad.icao];
      if (ad && ad.military) {
        if (milCtr && isOpen) { level = 'bad'; text += `CTR militaire de ${milCtr} : en catégorie ouverte, le vol est interdit dans toute la CTR, même avec accord. Seule une opération en catégorie spécifique (STS / autorisation) peut être envisagée, avec accord préalable. `; }
        text += `Zone de protection de la base militaire ${adName}. Peut-on voler ? Uniquement avec l'accord préalable écrit de l'organisme de contrôle militaire de la base (ou dans le cadre d'un protocole) : sans cet accord, le vol est interdit. Demande écrite précisant date, horaires, zone, hauteur et drone (prévoir 2 à 4 semaines). Coordonnées (téléphone et e-mail des opérations) : fiche AIP « AD 2 » de ${ad.icao || 'la base'}, rubrique AD 2.2. Si la zone est aussi en agglomération, la déclaration préfectorale reste nécessaire en plus.`;
        if (ad.icao === 'LFKS') actions.push({ type: 'link', label: 'Démarche Solenzara', url: 'https://demarche.numerique.gouv.fr/commencer/drones-solenzara' });
        actions.push({ type: 'mail', label: `Demande d'accord – ${ad.icao || 'base'}`, template: 'military', target: { id: 'ad-' + (ad.icao || ad.name), name: ad.name, icao: ad.icao } });
      } else if (isAero && (lim === 0 || tooHigh)) {
        text += `Zone de ${adName || 'l\'aérodrome'}. En CTR civile : accord préalable du contrôle requis dès 50 m de hauteur en catégorie ouverte, au-delà de 50 m en vue et pour tout vol hors vue en catégorie spécifique. Interlocuteur, dans l'ordre : contrôle aérien (TWR), sinon agent AFIS, sinon exploitant de l'aérodrome (coordonnées : fiche AIP / VAC, ligne ATS). Sur les terrains contrôlés par la DSNA, les demandes sont traitées via la plateforme Clearance retenue par la DSNA en 2024 (dépôt indiqué comme gratuit sur les terrains partenaires) ; ailleurs, demande écrite.`;
        actions.push({ type: 'mail', label: `Demande d'accord – ${ad ? (ad.icao || ad.name) : 'aérodrome'}`, template: 'atc', target: ad ? { id: 'ad-' + (ad.icao || ad.name), name: ad.name, icao: ad.icao } : null });
        actions.push({ type: 'link', label: 'Demande DSNA (Clearance)', url: 'https://clearance.aero/deposer-une-demande-dautorisation-de-vol-drone-aupres-dun-aeroport-partenaire-de-clearance/' });
      } else if (isAero) {
        level = 'info'; text += `Zone de ${adName || 'l\'aérodrome'} : vol possible sans accord en respectant la hauteur maximale indiquée. Restez vigilant (trafic à basse hauteur).`;
      } else if (lim === 0) {
        text += 'Zone interdite (P), réglementée (R), dangereuse (D) ou site sensible (AIP ENR 5.7.1). Catégorie ouverte : vol interdit. Catégorie spécifique : accord de l\'organisme désigné dans l\'AIP (s\'il n\'y en a pas, vol interdit). Les zones R/D ne s\'appliquent que pendant leurs horaires d\'activation (AIP ENR 5.1, NOTAM, SUP AIP).';
      }
      if (ad && ad.icao && aipInfo(ad.icao)) actions.push({ type: 'link', label: `Fiche AIP ${ad.icao} (contacts)`, url: SIA.aip(ad.icao) });
      else actions.push({ type: 'link', label: 'Visualiseur AIP (SIA)', url: SIA.viewer });
      const ctr = ad && ctrName(ad.icao);
      add({ level, title: ad ? `${ctr ? ctr + ' – ' : 'Zone UAS '}${adName}${ad.military ? ' – militaire' : ''} : ${p.limite}` : `Zone UAS : ${p.limite}`, text, actions, blocking: !!(milCtr && isOpen) || (tooHigh && !isAero) });
    });
    if (ctx.restrictions && !restr.length) add({ level: 'ok', title: 'Aucune zone de restriction UAS officielle', text: 'La zone ne recoupe aucune zone de la carte « Restrictions UAS » (DGAC/IGN). Restent applicables : NOTAM, zones temporaires, propriété privée, règles de la catégorie.' });

    /* 2 bis. Espaces ATS de l'AIP (CTR, ATZ, RMZ, TMZ) recoupant la zone */
    ctrsAt(m.zone ? m.zone : turf.point([0, 0])).forEach(f => {
      const p = f.properties, a = aipInfo(p.icao) || {}, mil = MIL_CTR[p.icao];
      const target = { id: 'ad-' + p.icao, name: a.name || p.icao, icao: p.icao };
      const lim = `${p.name} – classe ${p.cls || '?'}, du sol à ${p.upper || '?'} – ${a.name || p.icao} (${p.icao})`;
      const already = C.find(c => c.level !== 'info' && (c.title.includes('(' + p.icao + ')') || c.text.includes('(' + p.icao + ')')));
      if (already) { already.text += ` Espace : ${lim}.`; return; } // même terrain, même démarche : une seule contrainte
      const links = [{ type: 'link', label: `Fiche AIP ${p.icao} (contacts)`, url: SIA.aip(p.icao) }];
      if (p.type !== 'CTR') { add({ level: 'info', title: `${p.name} (${p.icao})`, text: `${lim}. Zone associée à l'aérodrome : respecter les hauteurs de la carte UAS ; accord de l'organisme si vous les dépassez.`, actions: links }); return; }
      if (mil) {
        if (isOpen) add({ level: 'bad', blocking: true, title: `${p.name} (militaire) : catégorie ouverte interdite`, text: `${lim}. Dans les CTR militaires d'Avord, Cazaux, Istres, Landivisiau, Salon et Villacoublay, tout vol en catégorie ouverte est interdit, même à faible hauteur. En catégorie spécifique : accord préalable obligatoire de la base.`, actions: [{ type: 'mail', label: `Demande d'accord – ${p.icao}`, template: 'military', target }, ...links] });
        else add({ level: 'warn', title: `${p.name} (militaire) : accord préalable obligatoire`, text: `${lim}. Catégorie spécifique : tout vol nécessite l'accord préalable de la base (prévoir 2 à 4 semaines).`, actions: [{ type: 'mail', label: `Demande d'accord – ${p.icao}`, template: 'military', target }, ...links] });
        return;
      }
      const needs = isOpen ? h >= 50 : (h > 50 || m.vlos === 'BVLOS');
      const tpl = a.military ? 'military' : 'atc';
      add({ level: needs ? 'warn' : 'info', title: `${p.name} : ${needs ? 'accord du contrôle nécessaire' : 'vol possible sans accord sous 50 m'}`,
        text: `${lim}. Règle CTR : ${isOpen ? 'en catégorie ouverte, accord préalable dès 50 m de hauteur' : 'en catégorie spécifique, accord au-delà de 50 m en vue et pour tout vol hors vue'}. Hauteur prévue : ${h} m${needs ? '' : ' → pas d\'accord nécessaire, hors zones plus restrictives de la carte UAS'}.${needs && !a.military ? ' Terrain DSNA : demande via Clearance ou par écrit à l\'organisme de contrôle.' : ''}`,
        actions: needs ? [{ type: 'mail', label: `Demande d'accord – ${p.icao}`, template: tpl, target }, ...(a.military ? [] : [{ type: 'link', label: 'Demande DSNA (Clearance)', url: 'https://clearance.aero/deposer-une-demande-dautorisation-de-vol-drone-aupres-dun-aeroport-partenaire-de-clearance/' }]), ...links] : links,
        fix: needs ? `Voler sous 50 m de hauteur, ou obtenir l'accord du contrôle de ${p.icao} (mail prérempli ci-dessous).` : 'Rien à faire : restez sous 50 m.' });
    });

    /* 3. Aérodromes proches sans zone UAS directe (information) */
    [...aeros.filter(a => a.kind === 'aerodrome' && a.d != null && a.d < 10).slice(0, 3), ...aeros.filter(a => a.kind === 'heliport' && a.d != null && a.d < 2).slice(0, 2)].forEach(a => {
      if (a.icao && C.some(c => c.title.includes(a.icao) || c.text.includes('(' + a.icao + ')'))) return;
      add({ level: 'info', title: `${a.kind === 'heliport' ? 'Héliport' : 'Aérodrome'} ${a.name || ''}${a.icao ? ' (' + a.icao + ')' : ''}${a.military ? ' – militaire' : ''} ${fmtD(a.d)}`,
        text: (a.military ? 'Activité aérienne militaire possible à basse hauteur, y compris hors des zones publiées.' : a.kind === 'heliport' ? 'Hélistation : trafic d\'hélicoptères à très basse hauteur (les hélistations privées n\'apparaissent pas toujours sur la carte UAS).' : 'Trafic à basse hauteur possible (tours de piste).') + ' Consultez les NOTAM du terrain.',
        actions: a.icao && aipInfo(a.icao) ? [{ type: 'link', label: `Fiche AIP ${a.icao} (contacts)`, url: SIA.aip(a.icao) }] : a.icao ? [{ type: 'link', label: 'Atlas VAC (contacts)', url: SIA.atlasVac() }] : [] });
    });

    /* 4. Points sensibles BD TOPO */
    const near = (k, km) => S.filter(o => o.kind === k && o.d != null && o.d <= km).sort((a, b) => a.d - b.d);
    near('prison', 1).forEach(a => add({ level: a.d < 0.3 ? 'bad' : 'warn', title: `Établissement pénitentiaire ${a.name} ${fmtD(a.d)}`,
      text: 'Les établissements pénitentiaires font l\'objet d\'interdictions de survol (souvent visibles sur la carte UAS) et la captation d\'images y est interdite. Toute opération à proximité nécessite l\'accord préalable de la préfecture et de l\'administration pénitentiaire.',
      actions: [{ type: 'mail', label: 'Demande préfecture', template: 'prefecture_info', target: { id: 'prison-' + a.name, name: a.name } }] }));
    // Une base militaire proche regroupe les demandes (même destinataire → une seule démarche)
    const base = aeros.find(a => a.military && a.d != null && a.d < 6);
    near('military', 1.5).forEach(a => add({ level: a.d === 0 ? 'bad' : 'warn', title: `${a.props.nature} ${a.name || ''} ${fmtD(a.d)}`,
      text: `Le survol et la prise de vue d'installations militaires sont soumis à l'accord de l'autorité militaire${base ? ` (${base.name}${base.icao ? ', ' + base.icao : ''} : une seule demande couvre la base et ses emprises)` : ''}. Certaines emprises sont des ZICAD (zones interdites à la captation aérienne de données) : la dérogation se demande en ligne et doit être mentionnée dans la déclaration préfectorale le cas échéant.`,
      actions: [base ? { type: 'mail', label: `Demande d'accord – ${base.icao || base.name}`, template: 'military', target: { id: 'ad-' + (base.icao || base.name), name: base.name, icao: base.icao } }
        : { type: 'mail', label: 'Demande autorité militaire', template: 'military', target: { id: 'mil-' + a.name, name: a.name || a.props.nature } },
        { type: 'link', label: 'Dérogation ZICAD', url: 'https://www.demarches-simplifiees.fr/commencer/derogation-zicad' }] }));
    near('hospital', 0.8).slice(0, 2).forEach(a => add({ level: 'info', title: `${a.props.nature} ${a.name} ${fmtD(a.d)}`, text: 'Hélisurface possible et vols sanitaires (HEMS) à basse hauteur : ils sont prioritaires, posez-vous immédiatement si un hélicoptère approche.' }));
    near('stadium', 0.5).slice(0, 2).forEach(a => add({ level: 'info', title: `Stade ${a.name} ${fmtD(a.d)}`, text: 'Survol de rassemblements interdit. Vérifiez les événements à la date du vol (zone peuplée < 150 m d\'un rassemblement, zones temporaires).' }));
    const nat = S.filter(o => o.kind === 'nature');
    const strict = nat.filter(o => /réserve|parc national|protection|zone naturelle/i.test(o.nature + ' ' + (o.detail || '')));
    const loose = nat.filter(o => !strict.includes(o));
    strict.slice(0, 5).forEach(a => { const forbid = /réserve naturelle|parc national/i.test(a.nature + ' ' + (a.detail || '')); add({ level: a.d === 0 ? (forbid ? 'bad' : 'warn') : 'info', title: `${a.detail || a.nature} : ${a.name} ${a.d === 0 ? '(dans la zone)' : '(< 1 km)'}`,
      text: forbid ? 'Parcs nationaux (cœur) et réserves naturelles : survol interdit sauf si l\'information aéronautique (AIP ENR 5.7.3) ou le texte de création l\'autorise, souvent avec une hauteur minimale. Accord du gestionnaire (établissement du parc, conservateur de la réserve) indispensable.' : 'Arrêté de protection de biotope ou zone protégée : l\'arrêté peut interdire ou limiter le survol (hauteur minimale, périodes de nidification). Renseignez-vous auprès de la DDT(M) et du gestionnaire.',
      actions: [{ type: 'mail', label: 'Demande gestionnaire', template: 'nature', target: { id: 'nat-' + a.name, name: a.name } }] }); });
    if (loose.length) add({ level: 'info', title: `Espaces naturels : ${[...new Set(loose.map(a => a.nature))].join(', ')}`, text: `${loose.map(a => a.name).filter(Boolean).slice(0, 5).join(' ; ')}. Pas d'interdiction de survol générale, mais un arrêté préfectoral peut interdire temporairement le vol (ex. période de nidification) : ces interdictions ne figurent sur aucune carte, renseignez-vous auprès de la préfecture / DDT(M). Dérangement d'espèces protégées interdit.` });
    if (S.some(o => o.kind === 'power')) add({ level: 'info', title: 'Ligne électrique à moins de 100 m', text: 'Obstacle filaire et perturbations du compas. Accord du gestionnaire (RTE / Enedis) pour une inspection.' });
    if (S.some(o => o.kind === 'rail')) add({ level: 'info', title: 'Voie ferrée à moins de 100 m', text: 'Ne pas survoler les emprises ferroviaires sans accord de SNCF Réseau.' });

    /* 5. Décollage sur la voie publique → mairie (autorisation d'occupation du domaine public) */
    if (m.takeoff === 'public') add({ level: 'warn', title: 'Décollage depuis la voie / le domaine public', text: 'Une autorisation d\'occupation temporaire du domaine public (et éventuellement un arrêté de circulation) est à demander à la mairie, en général 2 à 3 semaines avant.', group: 'mairie', actions: [{ type: 'mail', label: 'Demande mairie', template: 'mairie' }] });
    if (m.takeoff === 'third') add({ level: 'info', title: 'Décollage depuis un terrain privé d\'un tiers', text: 'Accord écrit du propriétaire nécessaire.', actions: [{ type: 'mail', label: 'Demande propriétaire', template: 'owner' }] });

    /* 6. Forces de l'ordre */
    const polAll = near('police', 8).filter(o => o.name && !/municipale|aérienne|motoris|autoroute|nautique|saisonni|CRS|mobile|peloton|PSIG|intervention|escadron|groupement|compagnie|recherche/i.test(o.name + ' ' + ((o.props || {}).nature_detaillee || '')));
    const pol = polAll.find(o => /brigade|commissariat|hôtel de police|police nationale/i.test(o.name)) || polAll[0];
    if (agglo || m.takeoff === 'public' || m.crowd) {
      add({ level: 'info', title: `Information des forces de l'ordre${pol ? ' – ' + pol.name : ''}`,
        text: `Pas d'obligation réglementaire générale : la déclaration est adressée à la préfecture, qui peut imposer des prescriptions. Il est toutefois recommandé de prévenir ${pol ? (pol.gendarmerie ? 'la brigade de gendarmerie compétente' : 'le commissariat compétent') + ' (' + pol.name + ', ' + fmtD(pol.d) + ')' : 'le commissariat ou la brigade de gendarmerie compétent'} pour une opération visible en ville ou sur la voie publique (évite les interventions sur signalement), ainsi que la police municipale. Obligatoire si la préfecture ou la mairie le prescrit.`,
        actions: [{ type: 'mail', label: 'Mail police / gendarmerie', template: 'police', target: pol ? { id: 'pol', name: pol.name } : null }] });
    }

    /* 7. Catégorie, hauteur, nuit */
    const catRules = {
      A1: 'Drone C0 (< 250 g) ou C1. Pas de survol de rassemblements ; C1 : pas de survol intentionnel de personnes non impliquées. VLOS, 120 m max.',
      A2: 'Drone C2. ≥ 30 m horizontalement des personnes non impliquées (5 m en mode basse vitesse). Brevet A2 obligatoire. VLOS, 120 m max.',
      A3: 'Aucune personne non impliquée en danger ; ≥ 150 m des zones résidentielles, commerciales, industrielles ou récréatives.',
      'STS-01': 'Drone C5, VLOS, zone d\'évolution contrôlée au sol, 120 m max. Déclaration STS (accusé de réception DSAC) et certificat STS + attestation pratique du télépilote.',
      'STS-02': 'Drone C6, BVLOS jusqu\'à 2 km (1 km sans observateur), zone non peuplée, 120 m max, zone tampon contrôlée.',
      PDRA: 'Respect strict des conditions de l\'autorisation d\'exploitation ou du LUC (à joindre aux déclarations).',
      Autre: 'Vérifiez le cadre réglementaire applicable.'
    };
    if (cat) add({ level: 'info', title: `Catégorie ${cat} – règles d'exploitation`, text: catRules[cat] || '' });
    if (h > 120) add({ level: 'bad', title: `Hauteur prévue ${h} m > 120 m`, text: 'Les vols en vue au-dessus de 120 m nécessitent une autorisation préalable (Cerfa 15478, demande séparée) et, hors STS, une autorisation d\'exploitation ou un LUC. Impossible en STS-01.', actions: [{ type: 'link', label: 'Formulaires DGAC', url: LINKS[3].url }] });
    if (ctx.weather && ctx.weather.daily && m.startTime) {
      const sr = ctx.weather.daily.sunrise[0].slice(11, 16), ss = ctx.weather.daily.sunset[0].slice(11, 16);
      const et = m.endTime || m.startTime;
      if (m.startTime < sr || et > ss) add({ level: 'bad', title: 'Vol de nuit prévu', text: `Lever ${sr} / coucher ${ss}. Les vols de nuit hors espace ségrégué nécessitent une dérogation préfectorale demandée séparément (art. 9 de l'arrêté espace, formulaire de dérogation DGAC, au moins 30 jours avant). Feu vert clignotant obligatoire${drone && !drone.lightGreen ? ' (⚠ non indiqué pour ce drone)' : ''}.`, actions: [{ type: 'link', label: 'Formulaires DGAC', url: LINKS[3].url }] });
      else add({ level: 'ok', title: 'Vol de jour', text: `Lever du soleil ${sr}, coucher ${ss}.` });
    }

    /* 8. Météo */
    if (ctx.weather && ctx.weather.hourly && m.startTime) {
      const hr = Number(m.startTime.slice(0, 2)); const H = ctx.weather.hourly;
      const w = H.wind_speed_10m[hr], g = H.wind_gusts_10m[hr];
      const max = drone && drone.maxWind ? Number(drone.maxWind) : 36;
      if (g > max) add({ level: 'warn', title: `Rafales ${Math.round(g)} km/h > limite ${max} km/h`, text: 'Conditions défavorables à l\'heure prévue (prévision à confirmer la veille).' });
      else if (w > max * 0.7) add({ level: 'warn', title: `Vent soutenu : ${Math.round(w)} km/h (rafales ${Math.round(g)})`, text: 'Proche des limites du drone.' });
      if (H.precipitation_probability[hr] > 50) add({ level: 'warn', title: `Risque de précipitations ${H.precipitation_probability[hr]} %`, text: 'Vérifiez l\'indice de protection (IP) du drone.' });
    }

    /* 9. Télépilote / drone */
    if (!pilot) add({ level: 'warn', title: 'Aucun télépilote affecté', text: 'Affectez un télépilote pour vérifier ses qualifications.' });
    else {
      const exp = (d) => d && UI.daysUntil(d) < 0, nm = Fleet.pilotName(pilot);
      const cc = Fleet.certs(pilot);
      // A2 ou STS incluent les connaissances A1/A3
      if (isOpen && !cc.a1a3Ok && !cc.a2Ok && !cc.stsOk) add({ level: 'bad', title: 'Attestation A1/A3 manquante ou expirée', text: `${nm} : renseignez la date de fin de validité dans la fiche Télépilote.` });
      if (cat === 'A2' && !cc.a2Ok) add({ level: 'bad', title: 'Brevet A2 manquant ou expiré', text: `${nm} : renseignez la date de fin de validité du brevet A2 dans la fiche Télépilote.` });
      if (cat.startsWith('STS') && (!cc.stsOk || !cc.practical)) add({ level: 'bad', title: 'Certificat STS ou attestation pratique manquant', text: `${nm} : certificat théorique STS + attestation de formation pratique requis.` });
    }
    if (!drone) add({ level: 'warn', title: 'Aucun drone affecté', text: 'Affectez un drone pour vérifier sa classe et son assurance.' });
    else {
      const need = { A2: ['C2'], 'STS-01': ['C5'], 'STS-02': ['C6'], A1: ['C0', 'C1'] }[cat];
      const legacyOk = cat === 'A1' && Number(drone.mtom) < 250;
      if (need && !need.includes(drone.classMark) && !legacyOk) add({ level: 'bad', title: `Classe ${drone.classMark || 'non marquée'} incompatible avec ${cat}`, text: `Classe attendue : ${need.join(' ou ')}${cat === 'A1' ? ' (ou drone < 250 g sans marquage)' : ''}.` });
      const ins = Fleet.insurance(drone);
      if (!ins.insurer) add({ level: 'warn', title: 'Assurance non renseignée', text: 'Renseignez votre assureur RC drone dans la fiche Exploitant (obligatoire pour la déclaration préfecture).' });
      else if (ins.exp && UI.daysUntil(ins.exp) < 0) add({ level: 'bad', title: 'Assurance expirée', text: `${Fleet.droneName(drone)} – contrat ${ins.own ? 'du drone' : 'de l\'exploitant'} échu le ${UI.fmtDate(ins.exp)}.` });
      if (Number(drone.mtom) >= 800 && !drone.registration) add({ level: 'warn', title: 'Enregistrement AlphaTango manquant', text: 'Drones ≥ 800 g : enregistrement et signalement électronique obligatoires (n° UAS-FR-… demandé dans le Cerfa).' });
      if (drone.status && drone.status !== 'Opérationnel') add({ level: 'bad', title: 'Drone non opérationnel', text: `Statut : ${drone.status}` });
    }

    /* 10. Rappels */
    add({ level: 'info', title: 'À vérifier la veille et le jour du vol : NOTAM, SUP AIP, AZBA', text: 'Les zones temporaires (ZRT, ZIT, zones dangereuses temporaires, événements, exercices) et les horaires d\'activation des zones R/D ne figurent pas sur la carte UAS. NOTAM : SOFIA-Briefing (gratuit, avec compte). SUP AIP : liste Métropole. Réseau très basse altitude (RTBA/AZBA) : horaires publiés la veille dès 17h, ou par téléphone au 0800 24 54 66.',
      actions: [{ type: 'link', label: 'NOTAM (SOFIA-Briefing)', url: SIA.notam }, { type: 'link', label: 'SUP AIP Métropole', url: SIA.supaip }, { type: 'link', label: 'Activité AZBA / RTBA', url: SIA.azba }, { type: 'link', label: 'Visualiseur AIP', url: SIA.viewer }] });
    add({ level: 'info', title: 'ZICAD : captation de données interdite sur certains sites', text: 'Si vous prenez des images, vérifiez qu\'aucune zone interdite à la captation aérienne de données (ZICAD) ne recoupe la zone de vol et la zone de sécurité. Leur liste fixée par arrêté n\'est pas diffusée en données ouvertes : en cas de doute (site industriel, militaire, énergétique), demandez une dérogation.', actions: [{ type: 'link', label: 'Dérogation ZICAD', url: 'https://www.demarches-simplifiees.fr/commencer/derogation-zicad' }] });
    if (m.vlos === 'BVLOS') add({ level: 'warn', title: 'Vol hors vue : notification au ministère des Armées', text: 'Tout vol hors vue doit être notifié via AlphaTango (fenêtre de J-2 04h00 à J 04h00), partout en France. Un protocole avec l\'organisme de contrôle est obligatoire à proximité d\'un aérodrome.', actions: [{ type: 'link', label: 'AlphaTango', url: 'https://alphatango.aviation-civile.gouv.fr/' }] });
    (ctx.airspaces || []).forEach(a => add({ level: a.level, title: `Espace aérien ${a.label} : ${a.name}`, text: `${a.limits}. ${a.rule}`, actions: [{ type: 'link', label: 'Visualiseur AIP (SIA)', url: SIA.viewer }] }));
    if (ctx.airspaces === null) add({ level: 'info', title: 'Espaces aériens OpenAIP indisponibles', text: 'La clé OpenAIP est renseignée mais le service n\'a pas répondu.' });
    const st = aipStale();
    if (st) add({ level: 'warn', title: 'Données CTR / contacts AIP à mettre à jour', text: `Les contours de CTR et les contacts proviennent du cycle AIP du ${UI.fmtDate(st.have)} ; le cycle du ${UI.fmtDate(st.current)} est en vigueur. Vérifiez la fiche AIP du terrain avant d'envoyer une demande.`, fix: 'Lancer la mise à jour (tools/update_aip.py) — automatique si la tâche planifiée est installée.' });
    if (ctx.sensitiveError) add({ level: 'warn', title: 'Points sensibles partiellement vérifiés', text: 'Une partie des données IGN (aérodromes, sites militaires, établissements pénitentiaires, espaces protégés) n\'a pas répondu. Relancez l\'analyse.' });

    /* « Pour lever » : l'action concrète, en une phrase */
    const nt = notice(m.date, ctx.commune && ctx.commune.codeDepartement);
    const FIX = [
      [/Zone peuplée/, () => nt && !nt.ok ? 'Envoyer le Cerfa à la préfecture avec le motif d\'urgence et attendre son accord écrit (ou reporter le vol de 10 jours ouvrables).' : `Envoyer le Cerfa 15476*04 à la préfecture${nt ? ' au plus tard le ' + UI.fmtDate(nt.latest) : ''} (bouton ci-dessous).`],
      [/A3 incompatible/, () => 'Passer en A1, A2 ou STS-01.'],
      [/militaire.*Vol interdit|militaire : /, (c) => /catégorie ouverte, le vol est interdit/.test(c.text) ? 'Passer en catégorie spécifique (STS-01) ou déplacer la zone hors de la CTR, puis obtenir l\'accord écrit de la base.' : 'Obtenir l\'accord écrit de la base (mail prérempli ci-dessous).'],
      [/^CTR |Zone UAS .*\(/, (c) => c.level === 'info' ? 'Rien à faire si vous restez sous la hauteur indiquée.' : 'Rester sous la hauteur autorisée, ou obtenir l\'accord du contrôle (Clearance ou mail ci-dessous).'],
      [/^Zone UAS : Vol interdit/, () => 'Déplacer la zone, ou obtenir l\'accord de l\'organisme gestionnaire indiqué dans l\'AIP (catégorie spécifique uniquement).'],
      [/^Zone UAS : Hauteur/, (c) => c.level === 'bad' ? 'Réduire la hauteur de vol sous la limite.' : 'Rien à faire si vous restez sous la limite.'],
      [/entraînement militaire/, () => 'Notifier le vol sur AlphaTango entre J-2 4h00 et J 4h00.'],
      [/pénitentiaire/, () => 'Éloigner la zone, ou obtenir l\'accord de la préfecture et de l\'administration pénitentiaire.'],
      [/Enceinte militaire|Champ de tir|Ouvrage militaire/, () => 'Ne pas filmer le site ; demander l\'accord de l\'autorité militaire (mail ci-dessous).'],
      [/Réserve naturelle|Parc national|parc national/i, (c) => c.level === 'bad' ? 'Déplacer la zone ou obtenir l\'accord écrit du gestionnaire.' : 'Vérifier les textes du site ; accord du gestionnaire conseillé.'],
      [/biotope|protection/i, () => 'Se renseigner auprès de la DDT(M) / du gestionnaire.'],
      [/voie \/ le domaine public/, () => 'Demander l\'autorisation d\'occupation du domaine public à la mairie (mail ci-dessous).'],
      [/terrain privé d'un tiers/, () => 'Obtenir l\'accord écrit du propriétaire.'],
      [/forces de l'ordre/, () => 'Facultatif : envoyer le mail d\'information.'],
      [/Vol de nuit/, () => 'Voler de jour, ou demander une dérogation préfectorale au moins 30 jours avant.'],
      [/Hauteur prévue .* > 120/, () => 'Réduire la hauteur à 120 m, ou demander l\'autorisation (Cerfa 15478 + autorisation DSAC).'],
      [/Rafales|Vent soutenu|précipitations/, () => 'Décaler l\'heure ou la date du vol.'],
      [/Aucun télépilote|Certificat|Brevet|Attestation A1/, () => 'Affecter un télépilote qualifié (fiche Télépilotes).'],
      [/Aucun drone|Classe .* incompatible/, () => 'Choisir un drone de la bonne classe ou changer de catégorie.'],
      [/Assurance non renseignée/, () => 'Compléter l\'assureur dans la fiche Exploitant.'],
      [/Assurance expirée/, () => 'Renouveler l\'assurance et mettre à jour la fiche du drone.'],
      [/Enregistrement AlphaTango/, () => 'Enregistrer le drone sur AlphaTango et reporter le n° UAS-FR dans sa fiche.'],
      [/non opérationnel/, () => 'Remettre le drone en service ou en choisir un autre.'],
      [/hors vue : notification/, () => 'Notifier le vol sur AlphaTango (J-2 4h00 → J 4h00).'],
      [/^Espace aérien/, (c) => c.level === 'info' ? 'Vérifier les conditions dans l\'AIP.' : 'Vérifier l\'activation (NOTAM/AZBA) et obtenir l\'accord de l\'organisme si actif.']
    ];
    C.forEach(c => { if (c.level === 'ok' || c.fix) return; const f = FIX.find(([re]) => re.test(c.title)); if (f) c.fix = f[1](c); });

    const order = { bad: 0, warn: 1, info: 2, ok: 3 };
    return C.sort((a, b) => order[a.level] - order[b.level]);
  }

  return { LINKS, NATIONAL_CONTACTS, CATEGORIES, SIA, airac, whenErrors, aipInfo, aipReady, aipStale, prefReady, prefDrone, prefSaved, PREFS: () => PREFS, ctrName, ctrReady, ctrsAt, CTRS: () => CTRS, MIL_CTR, AIPDIR: () => AIPDIR, fetchAirspaces, notice, fetchRestrictions, fetchSensitive, fetchCommune, fetchAdminContacts, fetchWeather, buildConstraints, parseLimit };
})();
