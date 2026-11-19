/* Missions (prévol) : informations, zone sur carte, analyse des contraintes, démarches */
const Mission = (() => {
  const { esc } = UI;
  let map, zoneLayer, overlay, ctx = {};

  const STATUS = ['Brouillon', 'Planifiée', 'Autorisations en cours', 'Prête', 'Réalisée', 'Annulée'];
  const STEP_STATUS = ['À faire', 'Prêt à envoyer', 'Envoyé', 'Accordé', 'Refusé', 'Non nécessaire'];
  const CHECKLIST = [
    'NOTAM et zones temporaires consultés la veille et le jour du vol',
    'Météo vérifiée (vent, rafales, précipitations, visibilité)',
    'Déclaration / accords reçus et imprimés (récépissé préfecture, accords ATC/militaire)',
    'Documents à bord : déclarations, assurance, certificats, enregistrement',
    'Batteries chargées (drone, radiocommande, écran)',
    'Inspection visuelle : hélices, bras, nacelle, capteurs',
    'Firmware et base de données géozones à jour',
    'Signalement électronique actif, numéro d\'exploitant apposé',
    'Périmètre de sécurité balisé, briefing équipe',
    'Point et hauteur de retour automatique (RTH) configurés',
    'Calibration compas / IMU si nécessaire',
    'Contacts d\'urgence à portée (ATC, préfecture, forces de l\'ordre, client)'
  ];

  const FIELDS = [
    { k: 'name', l: 'Nom de la mission', full: true },
    { k: 'client', l: 'Commanditaire (client)' }, { k: 'purpose', l: 'Objet précis (ex. prises de vue pour…, inspection de…)' },
    { k: 'date', l: 'Date du vol', type: 'date' }, { k: 'altDate', l: 'Date de report', type: 'date' },
    { k: 'startTime', l: 'Heure de début', type: 'time' }, { k: 'endTime', l: 'Heure de fin', type: 'time' },
    { k: 'category', l: 'Catégorie / scénario', type: 'select', opts: [['', '— choisir —'], ...Regulation.CATEGORIES] },
    { k: 'maxHeight', l: 'Hauteur max. (m sol)', type: 'number', def: 120 },
    { k: 'vlos', l: 'Mode', type: 'select', opts: [['VLOS', 'En vue (VLOS)'], ['EVLOS', 'Vue étendue (EVLOS)'], ['BVLOS', 'Hors vue (BVLOS)']] },
    { k: 'status', l: 'Statut', type: 'select', opts: STATUS },
    { k: 'pilotId', l: 'Télépilote', type: 'select', opts: [] }, { k: 'droneId', l: 'Drone', type: 'select', opts: [] },
    { k: 'observer', l: 'Observateur / assistant' }, { k: 'address', l: 'Adresse du site (avec code postal)' },
    { k: 'takeoff', l: 'Lieu de décollage / atterrissage', type: 'select', opts: [['client', 'Propriété privée du client'], ['third', 'Terrain privé d\'un tiers'], ['operator', 'Terrain de l\'exploitant'], ['public', 'Voie publique / domaine public']] },
    { k: 'crowd', l: 'À moins de 150 m d\'un rassemblement de personnes', type: 'checkbox' },
    { k: 'security', l: 'Mesures de sécurité', type: 'textarea' },
    { k: 'notes', l: 'Notes', type: 'textarea' }
  ];

  /* ---------- Liste ---------- */
  function list() {
    const ms = Store.all('missions').slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const lvl = (m) => { if (!m.analysis) return '<span class="badge">non analysée</span>'; const c = constraintsOf(m); const b = c.filter(x => x.level === 'bad').length, w = c.filter(x => x.level === 'warn').length; return `${b ? `<span class="badge bad">${b} bloquant${b > 1 ? 's' : ''}</span> ` : ''}${w ? `<span class="badge warn">${w} à traiter</span>` : ''}${!b && !w ? '<span class="badge ok">RAS</span>' : ''}`; };
    UI.view().innerHTML = `<div class="head"><div><h1>Missions</h1><p class="sub">Préparez chaque vol : informations, zone, contraintes et démarches.</p></div>
      <button class="btn primary" onclick="location.hash='#/mission/new'">+ Nouvelle mission</button></div>
      <div class="card table-wrap"><table><thead><tr><th>Mission</th><th>Date</th><th>Lieu</th><th>Catégorie</th><th>Contraintes</th><th>Statut</th><th></th></tr></thead><tbody>
      ${ms.length ? ms.map(m => `<tr><td><a href="#/mission/${m.id}"><b>${esc(m.name || 'Sans nom')}</b></a><div class="legend">${esc(m.client || '')}</div></td>
        <td>${UI.fmtDate(m.date)} ${esc(m.startTime || '')}</td><td>${esc(m.analysis && m.analysis.commune ? m.analysis.commune.nom : '—')}</td>
        <td>${esc(m.category || '—')}</td><td>${lvl(m)}</td><td><span class="badge info">${esc(m.status || 'Brouillon')}</span></td>
        <td class="row" style="justify-content:flex-end"><button class="btn sm" data-dup="${m.id}">Dupliquer</button><button class="btn sm danger" data-del="${m.id}">Suppr.</button></td></tr>`).join('')
        : '<tr><td colspan="7" class="empty">Aucune mission. Créez-en une pour lancer la préparation de vol.</td></tr>'}
      </tbody></table></div>`;
    UI.view().onclick = (e) => {
      const { dup, del } = e.target.dataset;
      if (del && confirm('Supprimer cette mission ?')) { Store.remove('missions', del); list(); }
      if (dup) { const o = JSON.parse(JSON.stringify(Store.get('missions', dup))); delete o.id; o.name = (o.name || '') + ' (copie)'; o.status = 'Brouillon'; o.steps = {}; o.checklist = {}; o.pieces = {}; Store.upsert('missions', o); list(); }
    };
  }

  /* Contexte d'analyse reconstruit depuis le cache → les contraintes suivent toujours les données actuelles de la mission */
  function ctxOf(m) {
    const A = m.analysis || {};
    return { restrictions: A.restrictions ? A.restrictions.map(p => ({ properties: p })) : null, sensitive: A.sensitive || [], sensitiveError: A.sensitiveError,
      commune: A.commune, contacts: A.contacts || [], weather: A.weather, airspaces: A.airspaces, pilot: Store.get('pilots', m.pilotId), drone: Store.get('drones', m.droneId) };
  }
  const constraintsOf = (m) => m.analysis ? Regulation.buildConstraints(m, ctxOf(m)) : [];

  /* ---------- Édition ---------- */
  function edit(id, tab) {
    const isNew = id === 'new';
    const P0 = Store.all('pilots'), D0 = Store.all('drones');
    let m = isNew ? { name: `Mission du ${new Date().toLocaleDateString('fr-FR')}`, status: 'Brouillon', maxHeight: 120, vlos: 'VLOS', takeoff: 'client', category: 'A2',
      date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), startTime: '10:00', endTime: '11:00',
      pilotId: P0.length === 1 ? P0[0].id : '', droneId: D0.length === 1 ? D0[0].id : '', steps: {}, checklist: {}, pieces: {} } : Store.get('missions', id);
    if (!m) { location.hash = '#/missions'; return; }
    if (m.analysis && !m.analysis.v2) delete m.analysis; // anciennes analyses : à relancer
    ctx = ctxOf(m);
    FIELDS.find(f => f.k === 'pilotId').opts = [['', '— aucun —'], ...Store.all('pilots').map(p => [p.id, Fleet.pilotName(p)])];
    FIELDS.find(f => f.k === 'droneId').opts = [['', '— aucun —'], ...Store.all('drones').map(d => [d.id, Fleet.droneName(d)])];

    UI.view().innerHTML = `
      <div class="head"><div><a href="#/missions" class="legend">← Missions</a><h1>${esc(m.name || 'Nouvelle mission')}</h1></div>
        <div class="row"><button class="btn desk" id="exportGeo">⬇ GeoJSON</button><button class="btn desk" id="exportKml">⬇ KML</button><button class="btn desk" id="exportPlan">⬇ Plan PNG</button><button class="btn" id="logBtn">📒 Ajouter au carnet de vol</button><button class="btn primary" id="saveBtn">Enregistrer</button></div></div>
      <div class="tabs" id="tabs"><button data-t="info" class="active">1. Informations</button><button data-t="zone">2. Zone & contraintes</button><button data-t="steps">3. Démarches & contacts</button><button data-t="check">4. Check-list</button></div>
      <a href="#" id="miniVerdict" class="mini-verdict" hidden></a>
      ${isNew ? '<div class="alert info" id="newHint">👋 <b>Étape 1 :</b> vérifiez les informations de la mission (date, catégorie, hauteur, télépilote, drone). <b>Étape 2 :</b> cherchez l\'adresse et dessinez la zone : l\'analyse se lance toute seule. Les informations restent modifiables à tout moment.</div>' : ''}
      <section data-p="info"><div class="card"><form id="mf"><div class="fields">${UI.formFields(FIELDS, m)}</div></form>
        <div class="row next-step"><button class="btn primary" data-go="zone">Étape suivante : la zone de vol →</button></div></div></section>
      <section data-p="zone" hidden>
        <div class="card">
          <div class="map-tools">
            <input id="addr" placeholder="Rechercher une adresse ou une commune…" style="flex:1;min-width:200px"><button class="btn" id="addrBtn">Chercher</button>
            <button class="btn" id="drawPoly">⬠ Polygone</button><button class="btn" id="drawRect">▭ Rectangle</button><button class="btn" id="drawCircle">◯ Cercle</button>
            <button class="btn danger" id="clearZone">Effacer</button><button class="btn primary" id="analyze" title="Relancer l'analyse">🔄 Actualiser l'analyse</button>
          </div>
          <div id="map"></div>
          <p class="legend" id="zoneInfo" style="margin:8px 0 0"></p>
        </div>
        <div class="grid g2">
          <div class="card"><h2>Contraintes identifiées</h2><div id="progress"></div><div id="constraints"><p class="legend">Dessinez la zone de vol : l'analyse se lance automatiquement.</p></div></div>
          <div><div class="card"><h2>Météo à l'heure prévue</h2><div id="weather"><p class="legend">Renseignez la date (≤ 16 jours) et l'heure, puis analysez.</p></div></div>
          <div class="card"><h2>Sources</h2><p class="legend">Zones UAS : DGAC, diffusées par l'IGN (Géoplateforme). Aérodromes, sites militaires, établissements pénitentiaires, espaces protégés, forces de l'ordre : BD TOPO IGN. Contacts : Annuaire de l'administration. Météo : Open-Meteo. Règles : arrêté espace du 3/12/2020, Cerfa 15476*04 et notice 52053#04, règlement (UE) 2019/947. <b>Aide à la préparation : ne remplace pas la consultation du SIA (NOTAM, AIP, VAC).</b></p></div></div>
        </div>
        <div class="row next-step"><button class="btn" data-go="info">← Informations</button><button class="btn primary" data-go="steps">Étape suivante : démarches et courriers →</button></div>
      </section>
      <section data-p="steps" hidden><div id="stepsPane"></div><div class="row next-step"><button class="btn" data-go="zone">← Zone & contraintes</button><button class="btn primary" data-go="check">Étape suivante : la check-list →</button></div></section>
      <section data-p="check" hidden><div class="card"><h2>Check-list prévol</h2><div class="checklist" id="checklist"></div></div><div class="row next-step"><button class="btn" data-go="steps">← Démarches</button></div></section>`;

    UI.$('#tabs').onclick = (e) => {
      const t = e.target.dataset.t; if (!t) return;
      UI.$$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.t === t));
      UI.$$('section[data-p]').forEach(s => s.hidden = s.dataset.p !== t);
      if (t === 'zone') { initMap(m); setTimeout(() => map.invalidateSize(), 50); renderAnalysis(m); }
      if (t === 'steps') renderSteps(m);
    };

    const collect = () => { Object.assign(m, UI.readForm(UI.$('#mf'), FIELDS)); ctx.pilot = Store.get('pilots', m.pilotId); ctx.drone = Store.get('drones', m.droneId); return m; };
    const save = (quiet) => { collect(); m = Store.upsert('missions', m); if (id === 'new') history.replaceState(null, '', '#/mission/' + m.id); id = m.id; if (!quiet) UI.toast('Mission enregistrée'); };
    UI.$('#saveBtn').onclick = () => save();
    UI.$('#logBtn').onclick = () => { save(true); const c = m.analysis && m.analysis.commune; Logbook.open({ missionId: m.id, pilotId: m.pilotId, droneId: m.droneId, category: m.category, date: m.date, takeoff: m.startTime, landing: m.endTime, place: c ? c.nom : (m.address || ''), sorties: 1 }); };
    let lastWhen = m.date + m.startTime;
    UI.$('#mf').onchange = async () => {
      save(true);
      if (m.analysis && m.zone && m.date + m.startTime !== lastWhen) { // la date change : nouvelle météo
        lastWhen = m.date + m.startTime;
        try { m.analysis.weather = await Regulation.fetchWeather(turf.centroid(m.zone), m.date); } catch (e) { m.analysis.weather = null; }
        save(true);
      }
      renderAnalysis(m);
    };
    UI.$('#exportGeo').onclick = () => m.zone ? UI.download(`${slug(m.name)}.geojson`, JSON.stringify(m.zone), 'application/geo+json') : UI.toast('Aucune zone');
    UI.$('#exportKml').onclick = () => m.zone ? UI.download(`${slug(m.name)}.kml`, toKML(m), 'application/vnd.google-earth.kml+xml') : UI.toast('Aucune zone');
    UI.$('#exportPlan').onclick = async () => { if (!m.zone) return UI.toast('Aucune zone'); UI.toast('Génération du plan…'); UI.download(`plan-${slug(m.name)}.png`, await Cerfa.renderPlan(collect()), 'image/png'); };

    const cl = UI.$('#checklist');
    cl.innerHTML = CHECKLIST.map((c, i) => `<label><input type="checkbox" data-i="${i}" ${m.checklist && m.checklist[i] ? 'checked' : ''}> ${esc(c)}</label>`).join('') +
      `<div class="row" style="margin-top:12px"><button class="btn" onclick="window.print()">🖨 Imprimer</button></div>`;
    cl.onchange = (e) => { m.checklist = m.checklist || {}; m.checklist[e.target.dataset.i] = e.target.checked; save(true); };

    Mission._current = { m: () => collect(), save };
    // Navigation « étape suivante »
    UI.view().onclick = (e) => { const g = e.target.dataset && e.target.dataset.go; if (!g) return; UI.$(`[data-t=${g}]`).click(); window.scrollTo(0, 0); UI.view().scrollTop = 0; if (UI.$('#newHint')) UI.$('#newHint').remove(); };
    // Nouvelle mission : on commence par l'étape 1 (Informations) ; la démo et les liens directs ouvrent la zone
    if (tab === 'zone' || (!isNew && m.zone && !tab && !m.analysis)) UI.$('[data-t=zone]').click();
    else if (tab && UI.$(`[data-t=${tab}]`)) UI.$(`[data-t=${tab}]`).click();
  }

  const slug = (s) => (s || 'mission').toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
  const toKML = (m) => `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>${esc(m.name || 'Zone')}</name><Polygon><outerBoundaryIs><LinearRing><coordinates>${m.zone.geometry.coordinates[0].map(c => c.join(',') + ',0').join(' ')}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>`;

  /* ---------- Carte ---------- */
  const wmts = (layer, fmt = 'image/png') => `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=normal&TILEMATRIXSET=PM&FORMAT=${fmt}&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`;

  function initMap(m) {
    if (map && map._container === UI.$('#map')) return;
    if (map) { try { map.remove(); } catch (e) { } }
    zoneLayer = null;
    map = L.map('map').setView([46.6, 2.4], 6);
    const ign = L.tileLayer(wmts('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2'), { maxZoom: 19, attribution: '© IGN' });
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
    const ortho = L.tileLayer(wmts('ORTHOIMAGERY.ORTHOPHOTOS', 'image/jpeg'), { maxZoom: 19, attribution: '© IGN' });
    const uas = L.tileLayer(wmts('TRANSPORTS.DRONES.RESTRICTIONS'), { maxZoom: 19, opacity: 0.6, attribution: 'Restrictions UAS © DGAC/IGN' });
    const wms = (layers, opacity) => L.tileLayer.wms('https://data.geopf.fr/wms-v/ows', { layers, format: 'image/png', transparent: true, opacity, version: '1.3.0', attribution: 'Espaces protégés © PatriNat / IGN' });
    const natura = wms('Patrinat_SIC_France,Patrinat_ZPS_France', 0.45);
    const reserves = wms('Patrinat_Parc_national,Patrinat_RNN_France,Patrinat_RNR_France,Patrinat_APB_France', 0.55);
    const terrains = L.layerGroup();
    const ctrLayer = L.geoJSON(Regulation.CTRS(), {
      style: (f) => ({ color: Regulation.MIL_CTR[f.properties.icao] || f.properties.military ? '#b91c1c' : '#1d4ed8', weight: 2, dashArray: '6 4', fillOpacity: 0.03 }),
      onEachFeature: (f, l) => { const p = f.properties; l.bindPopup(`<b>${esc(p.name)}</b> (${esc(p.icao)})<br>Classe ${esc(p.cls)} · du sol à ${esc(p.upper)}<br>${Regulation.MIL_CTR[p.icao] ? '<b style="color:#b91c1c">CTR militaire : catégorie ouverte interdite</b>' : 'Accord du contrôle dès 50 m (catégorie ouverte)'}<br><a href="${Regulation.SIA.aip(p.icao)}" target="_blank" rel="noopener">Fiche AIP ${esc(p.icao)}</a>`); }
    });
    ign.addTo(map); uas.addTo(map); terrains.addTo(map); ctrLayer.addTo(map);
    const overlays = { 'Restrictions UAS (DGAC)': uas, 'CTR / ATZ (AIP officiel)': ctrLayer, 'Aérodromes et hélistations': terrains, 'Natura 2000 (Habitats + Oiseaux)': natura, 'Parcs nationaux, réserves, biotopes': reserves };
    const key = Store.operator().openaipKey;
    if (key) overlays['Espaces aériens (OpenAIP)'] = L.tileLayer(`https://api.tiles.openaip.net/api/data/openaip/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(key)}`, { maxZoom: 14, maxNativeZoom: 14, attribution: '© openAIP' }).addTo(map);
    L.control.layers({ 'Plan IGN': ign, 'OpenStreetMap': osm, 'Photos aériennes': ortho }, overlays, { collapsed: true }).addTo(map);
    // Aérodromes et hélistations (BD TOPO) de la vue courante, avec liens directs SIA
    let tTimer;
    const loadTerrains = () => { clearTimeout(tTimer); tTimer = setTimeout(async () => {
      if (!map.hasLayer(terrains)) return;
      if (map.getZoom() < 8) { terrains.clearLayers(); return; }
      const b = map.getBounds();
      try {
        const url = `https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&OUTPUTFORMAT=application/json&TYPENAMES=BDTOPO_V3:aerodrome&COUNT=400&PROPERTYNAME=toponyme,nature,usage,code_icao,geometrie&CQL_FILTER=${encodeURIComponent(`BBOX(geometrie,${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()},'EPSG:4326')`)}`;
        const fc = await fetch(url).then(r => r.json());
        terrains.clearLayers();
        (fc.features || []).forEach(f => {
          const p = f.properties, [lon, lat] = turf.centroid(f).geometry.coordinates;
          const heli = p.nature === 'Héliport', mil = /milit/i.test(p.usage || '');
          const label = p.code_icao || (heli ? 'H' : '');
          const ai = Regulation.aipInfo(p.code_icao);
          const links = ai ? `${Regulation.ctrName(p.code_icao) ? esc(Regulation.ctrName(p.code_icao)) + '<br>' : ''}${(ai.atsPhones || ai.phones) ? '☎ ' + esc((ai.atsPhones || ai.phones)[0]) + '<br>' : ''}<a href="${Regulation.SIA.aip(p.code_icao)}" target="_blank" rel="noopener">Fiche AIP ${p.code_icao} (contacts, horaires)</a><br>` : p.code_icao ? `<a href="${Regulation.SIA.atlasVac()}" target="_blank" rel="noopener">Atlas VAC (contacts du terrain)</a><br>` : '';
          L.marker([lat, lon], { icon: L.divIcon({ className: '', iconSize: null, html: `<div class="ad-mk ${mil ? 'mil' : ''} ${heli ? 'heli' : ''}">${heli ? 'H' : '✈'}${label && label !== 'H' ? ' ' + label : ''}</div>` }) })
            .bindPopup(`<b>${esc(p.toponyme || p.nature)}</b><br>${esc(p.nature)} – ${esc(p.usage || '')}<br>${links}<a href="${Regulation.SIA.viewer}" target="_blank" rel="noopener">Carte VAC (Visualiseur AIP)</a><br><a href="${Regulation.SIA.notam}" target="_blank" rel="noopener">NOTAM (SOFIA-Briefing)</a>`).addTo(terrains);
        });
      } catch (e) { /* silencieux */ }
    }, 350); };
    map.on('moveend overlayadd', loadTerrains);
    L.control.scale({ imperial: false }).addTo(map);
    overlay = L.layerGroup().addTo(map);
    map.pm.setLang('fr');
    map.pm.setGlobalOptions({ pathOptions: { color: '#2563eb', weight: 3, fillOpacity: 0.15 } });
    const setZone = (layer) => {
      if (zoneLayer && zoneLayer !== layer) map.removeLayer(zoneLayer);
      zoneLayer = layer;
      let feat;
      if (layer instanceof L.Circle) { const c = layer.getLatLng(); feat = turf.circle([c.lng, c.lat], layer.getRadius() / 1000, { steps: 64 }); }
      else feat = layer.toGeoJSON();
      feat.properties = {};
      m.zone = feat; delete m.analysis; updateZoneInfo(m); overlay.clearLayers();
      layer.on('pm:edit', () => setZone(layer));
      Mission._current.save(true);
      clearTimeout(Mission._t); Mission._t = setTimeout(() => analyze(Mission._current.m()), 500);
    };
    map.on('pm:create', (e) => setZone(e.layer));
    if (m.zone) {
      zoneLayer = L.geoJSON(m.zone, { style: { color: '#2563eb', weight: 3, fillOpacity: 0.15 } }).getLayers()[0].addTo(map);
      zoneLayer.on('pm:edit', () => setZone(zoneLayer));
      map.fitBounds(zoneLayer.getBounds(), { maxZoom: 16 });
      updateZoneInfo(m);
      if (!m.analysis) setTimeout(() => analyze(Mission._current.m()), 300);
    } else setTimeout(() => UI.$('#addr') && UI.$('#addr').focus(), 100);
    UI.$('#drawPoly').onclick = () => map.pm.enableDraw('Polygon');
    UI.$('#drawRect').onclick = () => map.pm.enableDraw('Rectangle');
    UI.$('#drawCircle').onclick = () => map.pm.enableDraw('Circle');
    UI.$('#clearZone').onclick = () => { if (zoneLayer) map.removeLayer(zoneLayer); zoneLayer = null; m.zone = null; delete m.analysis; overlay.clearLayers(); updateZoneInfo(m); };
    const search = async () => {
      const q = UI.$('#addr').value.trim(); if (!q) return;
      try {
        const r = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(q)}&limit=1`).then(r => r.json());
        const f = r.features && r.features[0]; if (!f) return UI.toast('Adresse introuvable');
        const [lon, lat] = f.geometry.coordinates; map.setView([lat, lon], 18);
        if (!UI.$('[name=address]').value) { UI.$('[name=address]').value = f.properties.label; Mission._current.save(true); }
        // Épingle sur le lieu exact + zone en un clic
        if (Mission._pin) map.removeLayer(Mission._pin);
        Mission._pin = L.marker([lat, lon], { icon: L.divIcon({ className: '', iconSize: [30, 42], iconAnchor: [15, 40], html: '<div class="pin">📍</div>' }), pmIgnore: true }).addTo(map);
        const box = document.createElement('div');
        box.innerHTML = `<b>${esc(f.properties.label)}</b><br><span class="legend">Créer la zone de vol ici :</span><div class="row" style="margin-top:6px">${[50, 100, 200, 500].map(r => `<button class="btn sm" data-r="${r}">◯ ${r} m</button>`).join('')}</div><span class="legend">ou dessinez-la librement (polygone, rectangle).</span>`;
        box.onclick = (e) => { const r = Number(e.target.dataset.r); if (!r) return; const c = L.circle([lat, lon], { radius: r, color: '#2563eb', weight: 3, fillOpacity: 0.15 }).addTo(map); map.closePopup(); map.fire('pm:create', { layer: c }); map.setView([lat, lon], r <= 60 ? 18 : r <= 120 ? 17 : r <= 250 ? 16 : 15); };
        Mission._pin.bindPopup(box, { minWidth: 220 }).openPopup();
      } catch (e) { UI.toast('Recherche indisponible'); }
    };
    UI.$('#addrBtn').onclick = search; UI.$('#addr').onkeydown = (e) => { if (e.key === 'Enter') search(); };
    UI.$('#analyze').onclick = () => analyze(Mission._current.m());
  }

  function updateZoneInfo(m) {
    const el = UI.$('#zoneInfo'); if (!el) return;
    if (!m.zone) { el.textContent = 'Aucune zone définie.'; return; }
    const a = turf.area(m.zone), c = turf.centroid(m.zone).geometry.coordinates;
    const bb = turf.bbox(m.zone); const diag = turf.distance([bb[0], bb[1]], [bb[2], bb[3]], { units: 'meters' });
    el.textContent = `Zone : ${a > 10000 ? (a / 10000).toFixed(2) + ' ha' : Math.round(a) + ' m²'} — centre ${c[1].toFixed(5)}, ${c[0].toFixed(5)} — étendue max ≈ ${Math.round(diag)} m`;
  }

  /* ---------- Analyse (avec jauge de progression) ---------- */
  async function analyze(m) {
    if (!m.zone) return UI.toast('Dessinez d\'abord la zone de vol');
    const key = Store.operator().openaipKey;
    const STEPS = [['restr', 'Zones UAS officielles'], ['sens', 'Aérodromes, sites militaires et sensibles'], ['commune', 'Commune'], ['contacts', 'Préfecture, mairie, police'], ['meteo', 'Météo'], ...(key ? [['asp', 'Espaces aériens (OpenAIP)']] : [])];
    const state = {}; const t0 = performance.now();
    const draw = () => {
      const done = STEPS.filter(([k]) => state[k]).length;
      UI.$('#progress').innerHTML = `<div class="progress"><b>${done < STEPS.length ? '⏳ Analyse en cours…' : `✅ Analyse terminée en ${((performance.now() - t0) / 1000).toFixed(1)} s`}</b>
        <div class="bar"><i style="width:${Math.round(done / STEPS.length * 100)}%"></i></div>
        <ul>${STEPS.map(([k, l]) => `<li class="${state[k] === 'ok' ? 'done' : state[k] === 'err' ? 'err' : ''}">${state[k] === 'ok' ? '✓' : state[k] === 'err' ? '✗' : '…'} ${l}</li>`).join('')}</ul></div>`;
    };
    draw(); UI.$('#analyze').disabled = true;
    const track = (k, p) => p.then(v => { state[k] = 'ok'; draw(); return v; }, () => { state[k] = 'err'; draw(); return null; });
    const center = turf.centroid(m.zone);
    const communeP = track('commune', Regulation.fetchCommune(center));
    const aspP = key ? track('asp', Regulation.fetchAirspaces(m.zone, key)) : Promise.resolve(undefined);
    const [restr, sens, commune, weather, contacts, airspaces] = await Promise.all([
      track('restr', Regulation.fetchRestrictions(m.zone)),
      track('sens', Regulation.fetchSensitive(m.zone)),
      communeP,
      track('meteo', m.date ? Regulation.fetchWeather(center, m.date) : Promise.resolve(null)),
      track('contacts', communeP.then(c => c ? Regulation.fetchAdminContacts(c) : [])),
      aspP
    ]);
    UI.$('#analyze').disabled = false;
    // Contacts complémentaires issus de la BD TOPO
    const cts = [...(contacts || [])];
    const sensitive = sens ? sens.items : [];
    sensitive.filter(o => o.kind === 'police').sort((a, b) => a.d - b.d).slice(0, 2).forEach(o => cts.push({ name: o.name || (o.gendarmerie ? 'Gendarmerie' : 'Commissariat'), type: 'Police / gendarmerie', area: `${o.d.toFixed(1)} km`, email: '', phone: '', website: o.gendarmerie ? 'https://www.gendarmerie.interieur.gouv.fr/' : 'https://www.police-nationale.interieur.gouv.fr/' }));
    sensitive.filter(o => o.kind === 'aerodrome' && o.d < 15).slice(0, 4).forEach(o => cts.push({ name: `${o.name}${o.icao ? ' (' + o.icao + ')' : ''}`, type: o.military ? 'Autorité militaire' : 'Aérodrome / ATC', area: `${o.d.toFixed(1)} km${Regulation.ctrName(o.icao) ? ' – ' + Regulation.ctrName(o.icao) : ''}`, website: o.icao ? Regulation.SIA.aip(o.icao) : Regulation.SIA.viewer, email: (Regulation.aipInfo(o.icao) || {}).bestEmail || '', phone: ((Regulation.aipInfo(o.icao) || {}).atsPhones || (Regulation.aipInfo(o.icao) || {}).phones || [])[0] || '', notes: o.icao ? 'Téléphone / e-mail : fiche AIP, rubrique AD 2.2 (lien « site »)' : 'Coordonnées sur la carte VAC' }));
    m.analysis = { v2: true, at: new Date().toISOString(), commune, contacts: cts, weather, restrictions: restr ? restr.map(f => f.properties) : null,
      airspaces: key ? airspaces : undefined,
      sensitive: sensitive.map(({ props, ...o }) => ({ ...o, props: props ? { nature: props.nature, usage: props.usage } : undefined })), sensitiveError: !sens || sens.errors > 0 };
    if (m.status === 'Brouillon') m.status = 'Planifiée';
    Mission._current.save(true);
    ctx = ctxOf(m);
    overlay.clearLayers();
    (restr || []).forEach(f => {
      const lim = Regulation.parseLimit(f.properties.limite);
      L.geoJSON(f, { style: { color: lim === 0 ? '#b91c1c' : '#d97706', weight: 1, fillOpacity: 0.1, dashArray: '4' } }).bindPopup(`<b>${esc(f.properties.limite)}</b><br>${esc(f.properties.remarque || '')}`).addTo(overlay);
    });
    const ICON = { aerodrome: '✈', heliport: 'H', prison: '⛓', military: '★', stadium: '🏟', hospital: '✚', police: '👮' };
    sensitive.filter(o => ICON[o.kind] && o.lat && (o.kind === 'aerodrome' || o.d < 2)).forEach(o => L.marker([o.lat, o.lon], { icon: L.divIcon({ className: '', html: `<div style="background:#fff;border:2px solid ${o.military || o.kind === 'military' ? '#b91c1c' : '#0f1b2d'};border-radius:50%;width:24px;height:24px;display:grid;place-items:center;font-size:12px">${ICON[o.kind]}</div>`, iconSize: [24, 24] }) })
      .bindPopup(`<b>${esc(o.name || o.kind)}</b>${o.icao ? ' (' + o.icao + ')' : ''}<br>${o.d === 0 ? 'Dans la zone' : (o.d || 0).toFixed(2) + ' km'}`).addTo(overlay));
    renderAnalysis(m);
  }

  /* Verdict : feu tricolore + progression des démarches */
  function stepsOf(list) {
    const steps = new Map();
    list.forEach(c => c.actions.filter(a => a.type !== 'link').forEach(a => {
      const key = a.type === 'dossier' ? 'prefecture' : a.template + (a.target && a.target.id ? ':' + a.target.id : '');
      if (!steps.has(key)) steps.set(key, { key, action: a, c, reasons: [] });
      steps.get(key).reasons.push(c.title);
    }));
    return [...steps.values()];
  }
  function verdict(m, list) {
    const required = stepsOf(list.filter(c => c.level === 'bad' || c.level === 'warn'));
    const st = m.steps || {};
    const done = required.filter(s => ['Accordé', 'Non nécessaire'].includes(st[s.key])).length;
    const blockers = list.filter(c => c.level === 'bad' && (c.blocking || !c.actions.some(a => a.type !== 'link')));
    const pending = required.length - done;
    let cls, icon, title, sub;
    if (blockers.length) { cls = 'bad'; icon = '🔴'; title = 'Vol impossible en l\'état'; sub = `${blockers.length} point(s) à corriger dans la mission (voir « Pour lever »).`; }
    else if (pending) { cls = 'warn'; icon = '🟠'; title = 'Vol possible après démarches'; sub = `${pending} démarche(s) à obtenir sur ${required.length}.`; }
    else { cls = 'ok'; icon = '🟢'; title = 'Prêt à voler'; sub = required.length ? 'Toutes les autorisations sont obtenues.' : 'Aucune autorisation nécessaire.'; }
    const pct = required.length ? Math.round(done / required.length * 100) : 100;
    return `<div class="verdict ${cls}"><div class="big">${icon}</div><div style="flex:1"><b>${title}</b><div class="legend">${sub} Pensez aux NOTAM la veille.</div>
      ${required.length ? `<div class="bar"><i style="width:${pct}%"></i></div><div class="legend">Démarches : ${done}/${required.length} obtenues · <a href="#" onclick="document.querySelector('[data-t=steps]').click();return false">suivre les démarches →</a></div>` : ''}</div></div>`;
  }

  function runAction(a, c) {
    const mm = Mission._current.m();
    if (a.type === 'mail') Docs.openMail(a.template, mm, ctx, a.target ? { ...a.target, contact: c && c.contact } : null);
    if (a.type === 'dossier') Cerfa.openDossier(mm, ctx, () => Mission._current.save(true));
    if (a.type === 'link') window.open(a.url, '_blank', 'noopener');
  }

  function renderAnalysis(m) {
    const box = UI.$('#constraints'); if (!box || !m.analysis) return;
    const A = m.analysis; ctx = ctxOf(Mission._current.m());
    const list = Regulation.buildConstraints(m, ctx);
    const counts = ['bad', 'warn', 'info', 'ok'].map(l => list.filter(c => c.level === l).length);
    const v = verdict(m, list);
    const mv = UI.$('#miniVerdict');
    if (mv) { const tmp = document.createElement('div'); tmp.innerHTML = v; const big = tmp.querySelector('.big').textContent, ttl = tmp.querySelector('b').textContent, prog = (tmp.querySelector('.legend:last-child') || {}).textContent || '';
      mv.hidden = false; mv.className = 'mini-verdict ' + tmp.firstElementChild.classList[1]; mv.innerHTML = `${big} <b>${esc(ttl)}</b> <span>${esc(prog.split('·')[0].trim())}</span> <span class="go">voir ↓</span>`;
      mv.onclick = (e) => { e.preventDefault(); if (UI.$('section[data-p=zone]').hidden) UI.$('[data-t=zone]').click(); UI.$('#constraints').scrollIntoView({ behavior: 'smooth' }); }; }
    box.innerHTML = v + `<p class="legend">Analyse du ${new Date(A.at).toLocaleString('fr-FR')}${A.commune ? ` — ${esc(A.commune.nom)} (${esc(A.commune.codeDepartement)})` : ''}<br>
      <span class="badge bad">${counts[0]} bloquant(s)</span> <span class="badge warn">${counts[1]} à traiter</span> <span class="badge info">${counts[2]} info</span> <span class="badge ok">${counts[3]} OK</span></p>` +
      list.map((c, i) => `<div class="constraint ${c.level}"><div class="t">${{ bad: '⛔', warn: '⚠️', info: 'ℹ️', ok: '✅' }[c.level]} ${esc(c.title)}</div>${c.fix ? `<p class="fix">👉 <b>Pour lever :</b> ${esc(c.fix)}</p>` : ''}
        ${c.actions.length ? `<div class="row actions">${c.actions.map((a, j) => `<button class="btn sm ${a.type !== 'link' ? 'primary' : ''}" data-c="${i}" data-a="${j}">${a.type === 'dossier' ? '📝' : a.type === 'link' ? '🔗' : '✉️'} ${esc(a.label)}</button>`).join('')}</div>` : ''}
        ${c.fix || c.actions.length ? `<details><summary>Pourquoi ?</summary><p>${esc(c.text)}</p></details>` : `<p>${esc(c.text)}</p>`}</div>`).join('');
    box.onclick = (e) => { const c = list[e.target.dataset.c]; if (c) runAction(c.actions[e.target.dataset.a], c); };
    const W = A.weather, wbox = UI.$('#weather');
    if (W && W.hourly && m.startTime) {
      const h = Number(m.startTime.slice(0, 2)), H = W.hourly;
      const dir = (d) => ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(d / 45) % 8];
      wbox.innerHTML = `<div class="weather">
        <div>Vent<b>${Math.round(H.wind_speed_10m[h])} km/h</b>${dir(H.wind_direction_10m[h])}</div><div>Rafales<b>${Math.round(H.wind_gusts_10m[h])} km/h</b></div>
        <div>Température<b>${Math.round(H.temperature_2m[h])} °C</b></div><div>Pluie<b>${H.precipitation_probability[h] ?? '—'} %</b></div>
        <div>Nuages<b>${H.cloud_cover[h]} %</b></div><div>Visibilité<b>${H.visibility[h] != null ? (H.visibility[h] / 1000).toFixed(1) + ' km' : '—'}</b></div>
        <div>Lever<b>${W.daily.sunrise[0].slice(11)}</b></div><div>Coucher<b>${W.daily.sunset[0].slice(11)}</b></div></div>
        <p class="legend">Prévision Open-Meteo pour ${m.startTime} le ${UI.fmtDate(m.date)}.</p>`;
    } else if (m.date) wbox.innerHTML = '<p class="legend">Prévision indisponible (date au-delà de 16 jours ou heure non renseignée).</p>';
  }

  /* ---------- Démarches : une seule ligne par destinataire ---------- */
  function renderSteps(m0) {
    const m = Mission._current.m(); const pane = UI.$('#stepsPane');
    if (!m.analysis) { pane.innerHTML = '<div class="card empty">Analysez d\'abord la zone (onglet 2) pour générer la liste des démarches.</div>'; return; }
    ctx = ctxOf(m);
    const list = Regulation.buildConstraints(m, ctx);
    m.steps = m.steps || {};
    const rows = stepsOf(list);
    const nt = Regulation.notice(m.date, ctx.commune && ctx.commune.codeDepartement);
    pane.innerHTML = `<div class="card"><h2>Démarches à effectuer</h2>
      ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Démarche</th><th>Motif(s)</th><th>Document</th><th>Suivi</th></tr></thead><tbody>
        ${rows.map((s, i) => `<tr><td><b>${esc(s.action.type === 'dossier' ? 'Déclaration préalable préfecture (Cerfa 15476*04)' : s.action.label)}</b>${s.key === 'prefecture' && nt ? `<div class="legend">${nt.ok ? 'Envoi au plus tard le ' + UI.fmtDate(nt.latest) : '⚠ Préavis de 10 jours ouvrables dépassé'}</div>` : ''}</td>
        <td class="legend">${[...new Set(s.reasons)].map(esc).join('<br>')}</td>
        <td><button class="btn sm ${s.action.type === 'dossier' ? 'primary' : ''}" data-s="${i}">${s.action.type === 'dossier' ? '📝 Préparer le dossier' : '✉️ Rédiger'}</button></td>
        <td><select data-step="${esc(s.key)}">${STEP_STATUS.map(st => `<option ${m.steps[s.key] === st ? 'selected' : ''}>${st}</option>`).join('')}</select></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="legend">Aucune démarche particulière détectée.</p>'}
      <h3>Autres courriers</h3><div class="row">${Object.entries(Docs.TEMPLATE_LABELS).map(([k, l]) => `<button class="btn sm" data-tpl="${k}">✉️ ${esc(l)}</button>`).join('')}</div></div>
      <div class="card"><h2>Contacts de la zone</h2><div class="table-wrap"><table><tbody>
      ${(m.analysis.contacts || []).map((c, i) => `<tr><td><b>${esc(c.name)}</b><div class="legend">${esc(c.type)} ${esc(c.area || '')}${c.notes ? ' – ' + esc(c.notes) : ''}</div></td>
        <td>${c.phone ? `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : ''}</td><td>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}</td>
        <td>${c.website ? `<a href="${esc(c.website)}" target="_blank" rel="noopener">site</a>` : ''}</td><td><button class="btn sm" data-save="${i}">+ Annuaire</button></td></tr>`).join('') || '<tr><td class="empty">Aucun contact trouvé.</td></tr>'}
      </tbody></table></div><p class="legend">Les adresses e-mail « drones » des préfectures et les coordonnées des organismes de contrôle (fiches VAC) ne sont pas publiées en données ouvertes : ajoutez-les une fois dans vos Contacts, elles seront ensuite proposées automatiquement.</p></div>`;
    pane.onclick = (e) => {
      const d = e.target.dataset;
      if (d.s) { const s = rows[d.s]; runAction(s.action, s.c); }
      if (d.tpl) Docs.openMail(d.tpl, Mission._current.m(), ctx);
      if (d.save) { const c = m.analysis.contacts[d.save]; if (Store.all('contacts').some(x => x.name === c.name)) return UI.toast('Déjà dans l\'annuaire'); Store.upsert('contacts', { ...c }); UI.toast('Contact ajouté à l\'annuaire'); }
    };
    pane.onchange = (e) => { if (e.target.dataset.step) { m.steps[e.target.dataset.step] = e.target.value; Mission._current.save(true); } };
  }

  return { list, edit };
})();
