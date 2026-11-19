/* Dossier préfecture : Cerfa 15476*04 officiel prérempli + pièces justificatives (notice 52053#04 §7) + mail prêt à envoyer */
const Cerfa = (() => {
  const { esc } = UI;
  const PDF_URL = 'assets/cerfa_15476-04.pdf';

  const fr = (d) => d ? d.split('-').reverse().join('/') : '';
  const W1252 = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
  const clean = (s) => String(s ?? '').normalize('NFC').replace(/[^\x20-\xFF\n]/g, c => W1252.includes(c) ? c : ({ '≤': '<=', '≥': '>=', '→': '->', '…': '...' }[c] || ''));
  const postcode = (m, ctx) => (m.address && (m.address.match(/\b\d{5}\b/) || [])[0]) || (ctx.commune && ctx.commune.codesPostaux && ctx.commune.codesPostaux[0]) || '';

  /* ---------- Correspondance mission → champs du PDF ---------- */
  function build(m, ctx) {
    const op = Store.operator(), p = Store.get('pilots', m.pilotId) || {}, d = Store.get('drones', m.droneId) || {};
    const T = {}, X = [], R = {}, missing = [];
    const need = (val, label, where) => { if (val === undefined || val === null || String(val).trim() === '') missing.push({ label, where }); return val || ''; };
    const morale = (op.legalType || 'morale') === 'morale';
    const nt = Regulation.notice(m.date, ctx.commune && ctx.commune.codeDepartement);

    // §1 Exploitant
    if (morale) {
      T['Raison sociale ou dénomination'] = need(op.company, 'Raison sociale', 'settings');
      T['Adresse du siège social'] = need([op.address, [op.zip, op.city].filter(Boolean).join(' ')].filter(Boolean).join(', '), 'Adresse du siège', 'settings');
      T['Identifiant SIRENSIRET RCSRNE'] = need(op.siret, 'SIREN/SIRET', 'settings');
      T['Nom_2'] = need(op.managerLastName, 'Nom du dirigeant', 'settings');
      T['Prénom_2'] = need(op.managerFirstName, 'Prénom du dirigeant', 'settings');
      T['Date et lieu de naissance ville et pays_2'] = need(op.managerBirth, 'Date et lieu de naissance du dirigeant', 'settings');
      T['Adresse postale_2'] = need(op.managerAddress || op.address, 'Adresse du dirigeant', 'settings');
      T['Qualité'] = need(op.managerRole, 'Qualité du dirigeant', 'settings');
      T['Texte38'] = op.phone || ''; T['Texte39'] = need(op.managerMobile || op.mobile, 'Portable du dirigeant', 'settings');
      T['Fixe  Portable Courriel_2'] = need(op.managerEmail || op.email, 'E-mail du dirigeant', 'settings');
    } else {
      T['Nom'] = need(op.managerLastName, 'Nom du déclarant', 'settings'); T['Prénom'] = need(op.managerFirstName, 'Prénom du déclarant', 'settings');
      T['Date et lieu de naissance ville et pays'] = need(op.managerBirth, 'Date et lieu de naissance du déclarant', 'settings');
      T['Adresse postale'] = need([op.address, op.zip, op.city].filter(Boolean).join(' '), 'Adresse du déclarant', 'settings');
      T['Fonction Profession'] = need(op.managerRole, 'Fonction / profession', 'settings');
      T['Texte36'] = op.phone || ''; T['Texte37'] = need(op.mobile, 'Portable du déclarant', 'settings');
      T['Fixe  Portable Courriel'] = need(op.email, 'E-mail du déclarant', 'settings');
    }
    if (op.subcontractor) T['Si soustraitant identifiant SIRENSIRET RCS RNE'] = op.subcontractor;
    // Contact présent pendant les vols = télépilote
    T['Texte52'] = p.lastName || ''; T['Texte51'] = p.firstName || ''; T['Texte50'] = 'Télépilote';
    T['Texte48'] = need(p.phone, 'Portable du télépilote', 'pilots'); T['Texte49'] = p.email || '';

    // §2 Télépilote (tous les champs requis par la notice)
    T['Télépilote 1Nom'] = need(p.lastName, 'Nom du télépilote', 'pilots');
    T['Télépilote 1Prénom'] = need(p.firstName, 'Prénom du télépilote', 'pilots');
    T['Télépilote 1Date et lieu de naissance ville et pays'] = [fr(need(p.birthDate, 'Date de naissance du télépilote', 'pilots')), need(p.birthPlace, 'Lieu de naissance du télépilote', 'pilots')].filter(Boolean).join(', ');
    T['Télépilote 1Adresse postale'] = need(p.address, 'Adresse du télépilote', 'pilots');
    T['Télépilote 1Employeur Salarié'] = p.independent === 'Oui' ? '-' : need(p.employer, 'Employeur du télépilote (ou « Indépendant : Oui »)', 'pilots');
    T['Télépilote 1Indépendant OuiNon'] = p.independent || 'Non';
    T['Télépilote 1Téléphone portable'] = p.phone || '';
    T['Télépilote 1Courriel'] = need(p.email, 'E-mail du télépilote', 'pilots');
    if (m.observer) T['Accompagnant  ObservateurNom'] = m.observer;

    // §3 Régime
    const cat = need(m.category, 'Catégorie / scénario', 'mission');
    if (/^A[123]$/.test(cat)) { X.push('Catégorie ouverte', 'Souscatégorie ' + cat); }
    else if (cat === 'STS-01') X.push('Scénario standard européen STS01 joindre une copie de laccusé de réception de déclaration dactivité émis par la DGAC');
    else if (cat) { X.push('Autres cas voir notice joindre une copie le cas échéant de lautorisationLUC délivré par la DGAC  autorisationLUC n'); need(op.authorization, 'N° d\'autorisation / LUC', 'settings'); }

    // §4 Dates
    const [sh, sm] = (need(m.startTime, 'Heure de début', 'mission') || ':').split(':');
    const [eh, em] = (need(m.endTime, 'Heure de fin', 'mission') || ':').split(':');
    T['Texte53'] = fr(need(m.date, 'Date du vol', 'mission')); T['Texte54'] = sh; T['Texte55'] = sm;
    T['Texte56'] = fr(m.endDate || m.date); T['Texte57'] = eh; T['Texte58'] = em;
    T['Texte59'] = need(m.hoursReason, 'Raison des horaires déclarés', 'dossier');
    T['Texte60'] = m.siteRestrictions || 'Néant';
    const days = m.endDate && m.date ? (new Date(m.endDate) - new Date(m.date)) / 86400000 + 1 : 1;
    if (days > 7) X.push('Durée supérieure à sept jours jours de début et de fin compris  joindre les justifications appropriées voir notice');
    if (nt && !nt.ok) { X.push('Impossibilité de respecter le préavis de 10 jours'); T['Motifs du nonrespect du préavis de 10 jours ouvrables'] = need(m.shortNoticeReason, 'Motif du non-respect du préavis de 10 jours', 'dossier'); }

    // §5 Aéronef
    T['Texte61'] = need(d.maker, 'Constructeur du drone', 'drones'); T['Texte62'] = need(d.model, 'Modèle du drone', 'drones');
    T['Texte63'] = d.type || 'Multirotors'; T['Texte64'] = d.mtom ? String(Number(d.mtom) / 1000).replace('.', ',') : need('', 'Masse du drone', 'drones');
    T['Texte65'] = need(d.serial, 'N° de série du drone', 'drones');
    T['Texte114'] = (d.registration || '').replace(/^UAS-?/i, ''); if (Number(d.mtom) >= 800) need(d.registration, 'N° d\'enregistrement du drone', 'drones');
    T['Texte115'] = d.remoteId || '';
    R['Groupe43'] = d.classMark === 'C5' ? 'Choix2' : 'Choix4';
    R['Groupe44'] = d.captive ? 'Choix5' : 'Choix1';

    // §6 Site n°1
    const agglo = (ctx.restrictions || []).some(f => /agglom/i.test((f.properties || f).remarque || '')) || (m.analysis && (m.analysis.restrictions || []).some(r => /agglom/i.test(r.remarque || '')));
    if (agglo) X.push('Site n 1');
    if (m.crowd) { X.push('En agglomération'); T['Texte94'] = need(m.crowdDesc, 'Description du rassemblement', 'dossier'); }
    T['Texte95'] = need(m.purpose, 'Objet précis de la mission', 'mission');
    T['Texte96'] = need(m.client, 'Commanditaire de la mission', 'mission');
    const c = m.zone ? turf.centroid(m.zone).geometry.coordinates : null;
    T['Texte97'] = c ? `Centre ${c[1].toFixed(5)} N, ${c[0].toFixed(5)} E - rayon d'évolution ~${Math.round(zoneRadius(m.zone))} m (plan joint)` : need('', 'Zone de vol', 'mission');
    T['Code postalRow1'] = need(postcode(m, ctx), 'Code postal du site', 'mission');
    T['LocalitéRow1'] = need(ctx.commune ? ctx.commune.nom : '', 'Commune du site (lancer l\'analyse)', 'mission');
    T['AdresseRow1'] = need((m.address || '').replace(/\s*\d{5}.*$/, ''), 'Adresse du site', 'mission');
    if (m.takeoff !== 'public' && m.outsidePublic) X.push('Cocher la case si les vols auront lieu exclusivement en dehors de lespace public voir notice');
    X.push('Description du site  cocher la case si un descriptif détaillé est joint séparément');
    T['Tous ceux indiqués au  5'] = need(m.siteDescription, 'Description du site', 'dossier');
    R['5'] = 0; // « Tous ceux indiqués au § 5 »
    X.push('Dates');
    R['Groupe50'] = m.vlos === 'BVLOS' ? 'Choix1' : 'Choix2';
    T['Texte99'] = String(need(m.maxDistance, 'Éloignement maximal', 'dossier'));
    T['Texte100'] = String(need(m.maxHeight, 'Hauteur maximale', 'mission'));
    const A = m.analysis || {};
    const near = (A.sensitive || []).filter(o => (o.kind === 'aerodrome' && o.d < 10) || (o.kind === 'military' && o.d < 1.5)).sort((a, b) => a.d - b.d).slice(0, 3).map(o => `${o.name}${o.icao ? ' (' + o.icao + ')' : ''} à ${o.d.toFixed(1)} km`);
    const zones = [...new Set((A.restrictions || []).filter(r => !/agglom/i.test(r.remarque || '')).map(r => r.limite))];
    T['proximité des opérations'] = m.otherInfo || [zones.length ? 'Zones UAS : ' + zones.join(', ') : '', near.length ? 'A proximité : ' + near.join(' ; ') : ''].filter(Boolean).join(' - ');

    // §7 Engagements
    X.push('atteste la sincérité des informations déclarées et je mengage à réaliser les vols dans les conditions décrites',
      'reconnais être informé que la présente déclaration ne signifie pas que le vol est règlementairement possible et quil',
      'Je reconnais être informé que la préfecture peut interdire le vol ou apporter des restrictions à tout moment',
      'mengage à respecter lensemble des dispositions réglementaires applicables pour les opérations prévues et en particulier',
      'atteste lexactitude des documents justificatifs fournis conformément au 7 de la notice N5205303',
      'déclare quune assurance couvrant les risques liés aux opérations prévues a été contractée');
    T['Texte116'] = need(op.city, 'Ville de signature (Exploitant)', 'settings');
    T['Le  JJMMAAAA'] = new Date().toLocaleDateString('fr-FR');
    T['Texte117'] = op.managerLastName || ''; T['Texte118'] = op.managerFirstName || ''; T['Texte119'] = morale ? (op.managerRole || '') : '';
    if (!op.insurer) missing.push({ label: 'Assureur RC de l\'exploitant', where: 'settings' });
    Regulation.whenErrors(m).forEach(msg => missing.push({ label: msg, where: 'mission' }));
    return { T, X, R, missing };
  }
  const zoneRadius = (z) => { const c = turf.centroid(z); return Math.max(...turf.coordAll(z).map(p => turf.distance(c, turf.point(p), { units: 'meters' }))); };

  async function fillPdf(m, ctx) {
    const { T, X, R } = build(m, ctx);
    const bytes = await fetch(PDF_URL).then(r => r.arrayBuffer());
    const doc = await PDFLib.PDFDocument.load(bytes);
    const form = doc.getForm();
    const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    for (const [k, v] of Object.entries(T)) { try { const f = form.getTextField(k); const s = clean(v); f.setFontSize(s.length > 60 ? 7 : 9); f.setText(s); } catch (e) { console.warn('champ', k, e.message); } }
    for (const k of X) { try { form.getCheckBox(k).check(); } catch (e) { console.warn('case', k, e.message); } }
    for (const [k, v] of Object.entries(R)) { try { const g = form.getRadioGroup(k); const opts = g.getOptions(); g.select(typeof v === 'number' ? opts[v] : v); } catch (e) { console.warn('radio', k, e.message); } }
    try { form.getRadioGroup('Groupe51').clear(); } catch (e) { } // site n°2 non utilisé (pré-coché dans le formulaire vierge)
    form.updateFieldAppearances(font);
    return new Blob([await doc.save()], { type: 'application/pdf' });
  }

  /* ---------- Plan de la zone (PNG) à partir des fonds IGN ---------- */
  async function renderPlan(m, title) {
    if (!m.zone) return null;
    const W = 1200, H = 850, tile = 256;
    const [w, s, e, n] = turf.bbox(turf.buffer(m.zone, Math.max(0.15, zoneRadius(m.zone) / 1000 * 0.6), { units: 'kilometers' }));
    const px = (lon, lat, z) => { const k = tile * 2 ** z; const x = (lon + 180) / 360 * k; const r = lat * Math.PI / 180; const y = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * k; return [x, y]; };
    let z = 18; while (z > 5) { const a = px(w, n, z), b = px(e, s, z); if (b[0] - a[0] < W && b[1] - a[1] < H - 120) break; z--; }
    const cc = turf.centroid(m.zone).geometry.coordinates; const [cx, cy] = px(cc[0], cc[1], z);
    const ox = cx - W / 2, oy = cy - (H - 120) / 2;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    const load = (src) => new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
    const wm = (layer, fmt) => `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=normal&TILEMATRIXSET=PM&FORMAT=${fmt}`;
    const jobs = [];
    for (let tx = Math.floor(ox / tile); tx <= Math.floor((ox + W) / tile); tx++) for (let ty = Math.floor(oy / tile); ty <= Math.floor((oy + H - 120) / tile); ty++) {
      jobs.push(load(`${wm('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'image/png')}&TILEMATRIX=${z}&TILEROW=${ty}&TILECOL=${tx}`).then(im => im && g.drawImage(im, tx * tile - ox, ty * tile - oy)));
    }
    await Promise.all(jobs);
    const ov = []; for (let tx = Math.floor(ox / tile); tx <= Math.floor((ox + W) / tile); tx++) for (let ty = Math.floor(oy / tile); ty <= Math.floor((oy + H - 120) / tile); ty++) ov.push(load(`${wm('TRANSPORTS.DRONES.RESTRICTIONS', 'image/png')}&TILEMATRIX=${z}&TILEROW=${ty}&TILECOL=${tx}`).then(im => { if (im) { g.globalAlpha = 0.45; g.drawImage(im, tx * tile - ox, ty * tile - oy); g.globalAlpha = 1; } }));
    await Promise.all(ov);
    // Zone
    g.beginPath(); m.zone.geometry.coordinates[0].forEach(([lo, la], i) => { const [x, y] = px(lo, la, z); i ? g.lineTo(x - ox, y - oy) : g.moveTo(x - ox, y - oy); });
    g.closePath(); g.fillStyle = 'rgba(37,99,235,.18)'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#1d4ed8'; g.stroke();
    g.beginPath(); g.arc(W / 2, (H - 120) / 2, 6, 0, 7); g.fillStyle = '#b91c1c'; g.fill();
    // Échelle et nord
    const mpp = 156543.03392 * Math.cos(cc[1] * Math.PI / 180) / 2 ** z; const nice = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find(v => v / mpp > 120) || 100;
    g.fillStyle = '#fff'; g.fillRect(16, H - 172, nice / mpp + 20, 40); g.fillStyle = '#000'; g.fillRect(26, H - 150, nice / mpp, 6); g.font = '14px Helvetica'; g.fillText(nice >= 1000 ? nice / 1000 + ' km' : nice + ' m', 26, H - 156);
    g.fillStyle = '#fff'; g.fillRect(W - 60, 16, 44, 54); g.fillStyle = '#000'; g.font = 'bold 22px Helvetica'; g.fillText('N', W - 46, 44); g.beginPath(); g.moveTo(W - 38, 50); g.lineTo(W - 46, 66); g.lineTo(W - 30, 66); g.fill();
    // Cartouche
    g.fillStyle = '#0f1b2d'; g.fillRect(0, H - 120, W, 120); g.fillStyle = '#fff'; g.font = 'bold 20px Helvetica';
    g.fillText(clean(title || m.name || 'Zone de vol'), 20, H - 88); g.font = '15px Helvetica';
    const area = turf.area(m.zone);
    g.fillText(`Centre : ${cc[1].toFixed(5)} N, ${cc[0].toFixed(5)} E  -  Surface : ${area > 10000 ? (area / 10000).toFixed(2) + ' ha' : Math.round(area) + ' m²'}  -  Hauteur max : ${m.maxHeight || '?'} m  -  Éloignement max : ${m.maxDistance || '?'} m`, 20, H - 60);
    g.fillText(`Date : ${fr(m.date)} ${m.startTime || ''}-${m.endTime || ''}  -  Fond : Plan IGN + restrictions UAS (DGAC/IGN)  -  Zone d'évolution en bleu`, 20, H - 34);
    return new Promise(res => cv.toBlob(res, 'image/png'));
  }

  /* ---------- E-mail .eml avec pièces jointes ---------- */
  const b64 = (buf) => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s).replace(/.{76}/g, '$&\r\n'); };
  const b64u = (str) => b64(new TextEncoder().encode(str));
  const hdr = (s) => `=?UTF-8?B?${b64u(s).replace(/\r\n/g, '')}?=`;
  const safeName = (n) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_');
  async function buildEml({ to, subject, body, files }) {
    const B = 'osd' + Math.random().toString(36).slice(2);
    let out = `To: ${to}\r\nSubject: ${hdr(subject)}\r\nX-Unsent: 1\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="${B}"\r\n\r\n`;
    out += `--${B}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64u(body)}\r\n`;
    for (const f of files) {
      const n = safeName(f.name);
      out += `--${B}\r\nContent-Type: ${f.blob.type || 'application/octet-stream'}; name="${n}"\r\nContent-Disposition: attachment; filename="${n}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(await f.blob.arrayBuffer())}\r\n`;
    }
    return new Blob([out + `--${B}--\r\n`], { type: 'message/rfc822' });
  }

  /* ---------- Pièces justificatives requises (notice §7) ---------- */
  function requiredPieces(m) {
    const p = Store.get('pilots', m.pilotId), d = Store.get('drones', m.droneId), cat = m.category || '', op = Store.operator();
    const norm = (x) => (x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const samePerson = p && norm(p.lastName) === norm(op.managerLastName) && norm(p.firstName) === norm(op.managerFirstName);
    const cert = /^A[13]$/.test(cat) ? 'attestation A1/A3' : cat === 'A2' ? 'brevet A2' : cat.startsWith('STS') ? 'certificat STS' : 'selon le régime';
    const L = [
      { key: 'id-declarant', label: samePerson ? 'Pièce d\'identité recto/verso du déclarant (et télépilote)' : 'Pièce d\'identité recto/verso du déclarant', cat: 'Pièce d\'identité' },
      ...(samePerson ? [] : [{ key: 'id-pilot', label: `Pièce d'identité recto/verso du télépilote${p ? ' (' + Fleet.pilotName(p) + ')' : ''}`, cat: 'Pièce d\'identité', link: p && 'pilot:' + p.id }]),
      { key: 'decl-exploitant', label: 'Accusé de réception de déclaration d\'exploitant (ou relevé de situation DGAC)', cat: 'Accusé de déclaration d\'exploitant (DGAC)' },
      { key: 'registre', label: 'Extrait du registre AlphaTango du drone', cat: 'Extrait registre AlphaTango', link: d && 'drone:' + d.id },
      { key: 'assurance', label: 'Attestation d\'assurance responsabilité civile drone', cat: 'Attestation d\'assurance' },
      { key: 'formation', label: `Certificat du télépilote (${cert})`, cat: 'Certificat télépilote (A1/A3, A2, STS)', link: p && 'pilot:' + p.id,
        words: cat === 'A2' ? /a2|brevet|aptitude|competency/ : cat.startsWith('STS') ? /sts|theori|license|licence|cats/ : /a1|a3|attestation/ },
      { key: 'commande', label: 'Justificatif de la raison professionnelle daté et signé (bon de commande, lettre de mission, contrat) mentionnant la date de l\'opération', cat: 'Bon de commande / contrat client' }
    ];
    if (cat === 'STS-01') L.push(
      { key: 'pratique', label: p && p.practicalBy === 'exploitant' ? 'Attestation de formation pratique STS-01 (délivrée par l\'exploitant)' : 'Attestation de formation pratique STS-01', cat: 'Attestation de formation pratique', link: p && 'pilot:' + p.id },
      { key: 'sts', label: 'Accusé de réception de la déclaration d\'exploitation STS-01 (DSAC)', cat: 'Déclaration STS (accusé DSAC)' });
    if (cat === 'PDRA' || cat === 'STS-02') L.push({ key: 'autorisation', label: 'Copie de l\'autorisation d\'exploitation / LUC', cat: 'Autorisation / LUC' });
    L.push({ key: 'activite', optional: true, label: 'Justificatif d\'activité : avis de situation SIRENE (INSEE) ou extrait Kbis — conseillé, parfois demandé', cat: 'Justificatif d\'activité (avis SIRENE / Kbis)' });
    return L;
  }

  /* ---------- Dialogue « Dossier préfecture » ---------- */
  async function openDossier(m, ctx, onSave) {
    const pref = (ctx.contacts || []).find(c => c.type === 'Préfecture') || {};
    const dep = ctx.commune && ctx.commune.codeDepartement;
    // Mémorise l'adresse « drones » saisie pour ce département (annuaire personnel)
    const rememberPref = (email) => {
      if (!dep || !/@/.test(email) || email === pref.email) return;
      const ex = Store.all('contacts').find(c => c.type === 'Préfecture' && c.dep === dep && c.drones);
      Store.upsert('contacts', Object.assign(ex || {}, { name: `${pref.name || 'Préfecture'} – déclarations drones`, type: 'Préfecture', email, dep, drones: true, area: dep, website: pref.website || '' }));
    };
    const nt = Regulation.notice(m.date, ctx.commune && ctx.commune.codeDepartement);
    const docs = Store.all('docs');
    m.pieces = m.pieces || {};
    const extra = {}; // fichiers ajoutés ponctuellement
    const FIELDS = [
      { k: 'hoursReason', l: 'Raisons des horaires de survol déclarés', type: 'textarea', def: 'Horaires définis avec le commanditaire en fonction de la lumière et de la moindre fréquentation du site.' },
      { k: 'siteDescription', l: 'Description du site (zone d\'évolution, zone de sécurité au sol, points de décollage)', type: 'textarea' },
      { k: 'maxDistance', l: 'Éloignement maximal télépilote ↔ drone (m)', type: 'number' },
      { k: 'endDate', l: 'Date de fin (si plage de dates, sinon vide)', type: 'date' },
      { k: 'outsidePublic', l: 'Vols et zone de sécurité exclusivement hors espace public', type: 'checkbox' },
      { k: 'siteRestrictions', l: 'Prescriptions restrictives imposées par les gestionnaires des sites (sinon « Néant »)' },
      { k: 'crowdDesc', l: 'Rassemblement de personnes à proximité (décrire)', show: m.crowd },
      { k: 'shortNoticeReason', l: 'Motif du non-respect du préavis de 10 jours ouvrables', type: 'textarea', show: nt && !nt.ok }
    ].filter(f => f.show !== false);
    if (!m.siteDescription && m.zone) m.siteDescription = `Zone d'évolution de ${Math.round(turf.area(m.zone))} m² (plan joint), décollage depuis ${({ public: 'la voie publique', third: 'un terrain privé (accord du propriétaire)', client: 'la propriété du commanditaire', operator: 'un terrain de l\'exploitant' })[m.takeoff || 'client']}. Périmètre de sécurité balisé et interdit au public pendant les vols.`;
    if (!m.maxDistance && m.zone) m.maxDistance = Math.max(50, Math.round(zoneRadius(m.zone) * 2 / 10) * 10);

    const WHERE = { settings: ['#/settings', 'Exploitant'], pilots: ['#/pilots', 'Télépilotes'], drones: ['#/drones', 'Drones'], mission: [null, 'Mission (onglet 1)'], dossier: [null, 'ci-dessous'] };
    UI.modal(`<h2>📝 Déclaration préalable – Cerfa 15476*04</h2>
      <div class="alert info">Formulaire officiel <b>Cerfa 15476*04</b> (arrêté du 3 décembre 2020, art. 6) prérempli à partir de l'exploitant, du télépilote, du drone et de la mission.
      À adresser à <b>${esc(pref.name || 'la préfecture du département')}</b>${nt ? ` – ${nt.ok ? `préavis OK, envoi au plus tard le <b>${UI.fmtDate(nt.latest)}</b>` : `<b>préavis de 10 jours ouvrables non respecté</b> (${nt.full} j.) : motif obligatoire, vol soumis à l'accord de la préfecture`}` : ''}.</div>
      <h3>1. Compléments pour le formulaire</h3><form id="dxf"><div class="fields">${UI.formFields(FIELDS, m)}</div></form>
      <h3>2. Champs obligatoires</h3><div id="dxMissing"></div>
      <h3>3. Pièces justificatives (notice 52053#04 §7)</h3><div id="dxPieces"></div>
      <h3>4. Mail à la préfecture</h3>
      <div class="fields" style="display:grid;gap:10px"><label>Destinataire${pref.email ? ` <span class="legend">(adresse « drones » – source : ${esc(pref.emailSource || 'préfecture')} – vérifiez avant envoi)</span>` : ''}<input id="dxTo" value="${esc(pref.email || '')}" placeholder="Adresse « drones » de la préfecture"></label>
      <label>Objet<input id="dxSubj"></label><label>Message<textarea id="dxBody" style="min-height:220px"></textarea></label></div>
      ${pref.email ? '' : `<div class="alert">⚠️ L'adresse « drones » de cette préfecture n'est pas encore connue. <a href="${esc(pref.website || '#')}" target="_blank" rel="noopener">Ouvrir le site de la préfecture (recherche « drone »)</a>, copiez l'adresse indiquée dans la rubrique Drones / Activités aériennes et collez-la ci-dessus : elle sera mémorisée pour vos prochaines missions dans ce département.${pref.genericEmail ? ` <br>Adresse générale (accueil, à éviter) : ${esc(pref.genericEmail)}` : ''}</div>`}
      <div class="row" style="justify-content:space-between;margin-top:14px">
        <div class="row"><button class="btn" id="dxPdf">👁 Aperçu du Cerfa</button><button class="btn" id="dxPlan">🗺 Plan de zone</button></div>
        <div class="row"><button class="btn" id="dxSep" disabled>⬇ Pièces + ouvrir la messagerie</button><button class="btn primary" id="dxEml" disabled>✉️ Télécharger le mail prêt à envoyer (.eml)</button></div></div>
      <p class="legend" id="dxState" style="text-align:right"></p>
      <p class="legend">Le fichier .eml s'ouvre dans Outlook, Apple Mail ou Thunderbird avec toutes les pièces jointes. Alternative : déclaration en ligne sur <a href="https://alphatango.aviation-civile.gouv.fr/" target="_blank" rel="noopener">AlphaTango</a>.</p>`, (root) => {
      const f = UI.$('#dxf', root);
      if (f.elements.endDate) f.elements.endDate.min = m.date || '';
      const op = Store.operator();
      const subj = UI.$('#dxSubj', root), body = UI.$('#dxBody', root);
      const defaultMail = () => {
        const p = Store.get('pilots', m.pilotId);
        subj.value = `Déclaration préalable de vol en zone peuplée (Cerfa 15476*04) – ${ctx.commune ? ctx.commune.nom : ''} – ${fr(m.date)}${nt && !nt.ok ? ' – PRÉAVIS < 10 JOURS' : ''}`;
        body.value = `Madame, Monsieur,

Conformément à l'article 6 de l'arrêté du 3 décembre 2020 relatif à l'utilisation de l'espace aérien par les aéronefs sans équipage à bord, veuillez trouver ci-joint notre déclaration préalable de vol en zone peuplée (Cerfa 15476*04) et les pièces justificatives associées.

• Objet : ${m.purpose || ''}${m.client ? ' pour ' + m.client : ''}
• Lieu : ${m.address || ''}${ctx.commune ? ' – ' + ctx.commune.nom : ''}
• Date : ${fr(m.date)}${m.endDate && m.endDate !== m.date ? ' au ' + fr(m.endDate) : ''}, de ${m.startTime || ''} à ${m.endTime || ''}
• Régime : ${m.category || ''} – hauteur max. ${m.maxHeight || ''} m
• Télépilote joignable pendant les vols : ${p ? Fleet.pilotName(p) + ' – ' + (p.phone || '') : ''}
${nt && !nt.ok ? `\nNous ne sommes pas en mesure de respecter le préavis de dix jours ouvrables (motif : ${m.shortNoticeReason || '…'}). Nous sollicitons donc votre accord préalable avant toute opération.\n` : ''}
Pièces jointes : Cerfa 15476*04, plan de la zone, ${requiredPieces(m).map(x => x.label.split(' (')[0].toLowerCase()).join(', ')}.

Nous restons à votre disposition pour tout complément d'information.

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

${[op.managerFirstName, op.managerLastName].filter(Boolean).join(' ')}${op.managerRole ? ', ' + op.managerRole : ''}
${op.company || ''}${op.operatorId ? ' – exploitant UAS ' + op.operatorId : ''}
${[op.phone, op.mobile, op.email].filter(Boolean).join(' – ')}`;
      };

      const pieces = requiredPieces(m);
      const sel = (pc) => {
        const cands = docs.filter(dc => dc.fileId && dc.category === pc.cat);
        const cur = m.pieces[pc.key];
        return `<select data-piece="${pc.key}" style="max-width:280px"><option value="">— choisir dans la Documentation —</option>${cands.map(dc => `<option value="${dc.id}" ${cur === dc.id ? 'selected' : ''}>${esc(dc.title)}${dc.expiry && UI.daysUntil(dc.expiry) < 0 ? ' (expiré)' : ''}</option>`).join('')}</select>`;
      };
      // Choix automatique : document de la bonne catégorie, lié à la bonne personne / au bon drone, et dont le titre correspond (A2, STS…)
      const auto = (pc) => {
        if (m.pieces[pc.key] && Store.get('docs', m.pieces[pc.key])) return;
        const txt = (dc) => (dc.title + ' ' + (dc.fileName || '')).toLowerCase();
        const valid = (dc) => !dc.expiry || UI.daysUntil(dc.expiry) >= 0;
        let c = docs.filter(dc => dc.fileId && dc.category === pc.cat && valid(dc));
        if (pc.link && c.some(dc => dc.linkedTo === pc.link)) c = c.filter(dc => dc.linkedTo === pc.link || !dc.linkedTo);
        const best = (pc.words && c.find(dc => pc.words.test(txt(dc)))) || c.find(dc => pc.link && dc.linkedTo === pc.link) || c[0];
        if (best) m.pieces[pc.key] = best.id;
      };
      pieces.forEach(auto);
      const renderPieces = () => {
        UI.$('#dxPieces', root).innerHTML = `<table><tbody>
          <tr><td>✅ Cerfa 15476*04 rempli</td><td class="legend">généré automatiquement</td></tr>
          <tr><td>✅ Plan de la zone de vol (carte)</td><td class="legend">généré automatiquement</td></tr>
          ${pieces.map(pc => { const ok = m.pieces[pc.key] || extra[pc.key]; return `<tr><td>${ok ? '✅' : pc.optional ? '⚪' : '❌'} ${esc(pc.label)}</td><td class="row">${sel(pc)}<label class="btn sm">⬆ Fichier<input type="file" hidden data-up="${pc.key}"></label>${extra[pc.key] ? `<span class="legend">${esc(extra[pc.key].name)}</span>` : ''}</td></tr>`; }).join('')}
        </tbody></table><p class="legend">Ajoutez vos documents une fois pour toutes dans <a href="#/docs" onclick="UI.closeModal()">Documentation</a> avec la bonne catégorie : ils seront proposés automatiquement. Pensez aussi à mentionner les ZICAD éventuelles de la zone.</p>`;
      };
      const check = () => {
        Object.assign(m, UI.readForm(f, FIELDS)); onSave && onSave();
        const { missing } = build(m, ctx);
        const pm = pieces.filter(pc => !pc.optional && !m.pieces[pc.key] && !extra[pc.key]);
        UI.$('#dxMissing', root).innerHTML = missing.length ? `<div class="alert">${missing.length} champ(s) à compléter :<ul style="margin:6px 0 0">${missing.map(x => `<li>${esc(x.label)} — ${WHERE[x.where][0] ? `<a href="${WHERE[x.where][0]}" onclick="UI.closeModal()">${WHERE[x.where][1]}</a>` : WHERE[x.where][1]}</li>`).join('')}</ul></div>` : '<p class="badge ok">Tous les champs obligatoires du Cerfa sont remplis</p>';
        const to = UI.$('#dxTo', root).value.trim();
        const ready = !missing.length && !pm.length && /@/.test(to);
        UI.$('#dxEml', root).disabled = UI.$('#dxSep', root).disabled = !ready;
        UI.$('#dxState', root).textContent = ready ? 'Dossier complet ✔' : `Envoi bloqué : ${[missing.length && missing.length + ' champ(s)', pm.length && pm.length + ' pièce(s) manquante(s)', !/@/.test(to) && 'destinataire'].filter(Boolean).join(', ')}`;
        return ready;
      };
      let edited = false;
      subj.oninput = body.oninput = () => { edited = true; };
      renderPieces(); defaultMail(); check();
      f.oninput = f.onchange = () => { check(); if (!edited) defaultMail(); };
      UI.$('#dxTo', root).oninput = check;
      UI.$('#dxPieces', root).onchange = (e) => {
        if (e.target.dataset.piece) { m.pieces[e.target.dataset.piece] = e.target.value; }
        if (e.target.dataset.up) { const file = e.target.files[0]; if (file) extra[e.target.dataset.up] = file; }
        renderPieces(); check();
      };
      const open = (blob) => window.open(URL.createObjectURL(blob), '_blank');
      const slug = (ctx.commune ? ctx.commune.nom : 'site') + '_' + (m.date || '');
      UI.$('#dxPdf', root).onclick = async () => { try { open(await fillPdf(m, ctx)); } catch (e) { console.error(e); UI.toast('Erreur lors du remplissage du PDF'); } };
      UI.$('#dxPlan', root).onclick = async () => { const b = await renderPlan(m); b ? open(b) : UI.toast('Aucune zone'); };
      const collect = async () => {
        const files = [{ name: `Cerfa_15476-04_${slug}.pdf`, blob: await fillPdf(m, ctx) }, { name: `Plan_zone_${slug}.png`, blob: await renderPlan(m) }];
        for (const pc of pieces) {
          if (extra[pc.key]) files.push({ name: pc.key + '_' + extra[pc.key].name, blob: extra[pc.key] });
          else { const dc = Store.get('docs', m.pieces[pc.key]); const b = dc && await Store.getFile(dc.fileId); if (b) files.push({ name: pc.key + '_' + (dc.fileName || 'document'), blob: b }); }
        }
        return files;
      };
      UI.$('#dxEml', root).onclick = async () => {
        if (!check()) return; UI.toast('Préparation du mail…');
        const files = await collect();
        const eml = await buildEml({ to: UI.$('#dxTo', root).value.trim(), subject: subj.value, body: body.value, files });
        UI.download(`Declaration_prefecture_${safeName(slug)}.eml`, eml, 'message/rfc822');
        rememberPref(UI.$('#dxTo', root).value.trim());
        m.steps = m.steps || {}; m.steps.prefecture = m.steps.prefecture === 'Accordé' ? 'Accordé' : 'Prêt à envoyer'; onSave && onSave();
        UI.toast('Mail prêt : ouvrez le fichier .eml puis cliquez sur Envoyer');
      };
      UI.$('#dxSep', root).onclick = async () => {
        if (!check()) return;
        for (const fl of await collect()) UI.download(safeName(fl.name), fl.blob, fl.blob.type);
        rememberPref(UI.$('#dxTo', root).value.trim());
        location.href = `mailto:${encodeURIComponent(UI.$('#dxTo', root).value.trim())}?subject=${encodeURIComponent(subj.value)}&body=${encodeURIComponent(body.value.slice(0, 1500))}`;
        UI.toast('Pièces téléchargées : joignez-les au mail ouvert');
      };
    });
  }

  return { openDossier, fillPdf, renderPlan, build, requiredPieces };
})();
