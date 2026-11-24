/* Télépilotes, drones, documentation, contacts, exploitant */
const Fleet = (() => {
  const { esc } = UI;

  // Catégories alignées sur les pièces justificatives de la notice 52053#04 §7
  const DOC_CATEGORIES = ['Pièce d\'identité', 'Accusé de déclaration d\'exploitant (DGAC)', 'Extrait registre AlphaTango', 'Attestation d\'assurance',
    'Certificat télépilote (A1/A3, A2, STS)', 'Attestation de formation pratique', 'Déclaration STS (accusé DSAC)', 'Autorisation / LUC',
    'Bon de commande / contrat client', 'Justificatif d\'activité (avis SIRENE / Kbis)', 'Manuel d\'exploitation (MANEX)', 'Documentation drone', 'Protocole ATC / militaire', 'Réglementation', 'Autre'];

  const PILOT_FIELDS = [
    { type: 'section', l: 'Identité', hint: 'demandée par le Cerfa préfecture' },
    { k: 'lastName', l: 'Nom' }, { k: 'firstName', l: 'Prénom' },
    { k: 'email', l: 'E-mail', type: 'email' }, { k: 'phone', l: 'Téléphone portable', type: 'tel' },
    { k: 'birthDate', l: 'Date de naissance', type: 'date' }, { k: 'birthPlace', l: 'Lieu de naissance (ville, pays)' },
    { k: 'address', l: 'Adresse postale', full: true },
    { k: 'independent', l: 'Statut', type: 'select', opts: [['Oui', 'Indépendant / dirigeant de l\'exploitant'], ['Non', 'Salarié']] },
    { k: 'employer', l: 'Employeur', showIf: (v) => v.independent === 'Non' },
    { type: 'section', l: 'Certificats', hint: 'laissez vide ce que vous n\'avez pas' },
    { k: 'pilotId', l: 'N° de télépilote', ph: 'FRA-RP-…', hint: 'figure sur vos attestations A1/A3 et A2' },
    { k: 'a1a3Exp', l: 'A1/A3 – fin de validité', type: 'date' },
    { k: 'a2Exp', l: 'Brevet A2 – fin de validité', type: 'date', hint: 'même n° de télépilote, pas de n° séparé' },
    { k: 'sts', l: 'Certificat STS – n°', ph: 'FRA-RP-… ou NLD-RP-…', hint: 'si délivré par un autre pays, son n° propre' },
    { k: 'stsExp', l: 'Certificat STS – fin de validité', type: 'date' },
    { k: 'practicalDate', l: 'Formation pratique STS – date', type: 'date', hint: 'requise pour voler en STS' },
    { k: 'practicalBy', l: 'Formation pratique délivrée par', type: 'select', opts: [['', '—'], ['exploitant', 'L\'exploitant (auto-déclaration)'], ['organisme', 'Un organisme de formation']] },
    { k: 'medical', l: 'Autres qualifications (nuit, BVLOS…)', full: true },
    { k: 'notes', l: 'Notes', type: 'textarea' }
  ];

  const DRONE_FIELDS = [
    { type: 'section', l: 'Identification' },
    { k: 'name', l: 'Nom / surnom' }, { k: 'maker', l: 'Constructeur' }, { k: 'model', l: 'Modèle' },
    { k: 'serial', l: 'N° de série' },
    { k: 'type', l: 'Type', type: 'select', opts: ['Multirotors', 'Voilure fixe', 'Hélicoptère', 'Ballon', 'Captif dirigeable', 'Autre'] },
    { k: 'classMark', l: 'Marquage de classe', type: 'select', opts: [['', '— aucun (drone sans classe)'], 'C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6'] },
    { k: 'mtom', l: 'Masse max. au décollage (g)', type: 'number' },
    { k: 'registration', l: 'N° d\'enregistrement du drone', ph: 'UAS-FR-…', hint: 'obligatoire dès 800 g (AlphaTango)' },
    { k: 'remoteId', l: 'N° de signalement électronique', hint: 'si le drone en a un (souvent = n° de série)' },
    { k: 'captive', l: 'Aéronef captif', type: 'checkbox' },
    { type: 'section', l: 'Performances et équipements' },
    { k: 'maxWind', l: 'Vent max. supporté (km/h)', type: 'number' },
    { k: 'endurance', l: 'Autonomie (min)', type: 'number' },
    { k: 'parachute', l: 'Parachute / limiteur d\'énergie', type: 'checkbox' },
    { k: 'lightGreen', l: 'Feu vert clignotant (vol de nuit)', type: 'checkbox' },
    { type: 'section', l: 'Assurance', hint: 'par défaut, celle de l\'exploitant' },
    { k: 'ownInsurance', l: 'Contrat spécifique à ce drone (différent de celui de l\'exploitant)', type: 'checkbox', full: true },
    { k: 'insurer', l: 'Assureur', showIf: (v) => v.ownInsurance }, { k: 'insuranceExp', l: 'Échéance', type: 'date', showIf: (v) => v.ownInsurance },
    { type: 'section', l: 'Suivi' },
    { k: 'lastMaintenance', l: 'Dernière maintenance', type: 'date' }, { k: 'flightHours', l: 'Heures de vol antérieures au carnet', type: 'number', step: '0.1' },
    { k: 'maintenanceEvery', l: 'Maintenance toutes les … heures de vol', type: 'number', hint: 'facultatif' },
    { k: 'status', l: 'Statut', type: 'select', opts: ['Opérationnel', 'En maintenance', 'Hors service'] },
    { k: 'notes', l: 'Notes', type: 'textarea' }
  ];

  const DOC_FIELDS = [
    { k: 'title', l: 'Titre' },
    { k: 'category', l: 'Catégorie', type: 'select', opts: DOC_CATEGORIES },
    { k: 'linkedTo', l: 'Associé à', type: 'select', opts: [] },
    { k: 'expiry', l: 'Date d\'expiration', type: 'date' },
    { k: 'url', l: 'Lien (optionnel)', type: 'url', full: true },
    { k: 'notes', l: 'Notes', type: 'textarea' }
  ];

  const CONTACT_FIELDS = [
    { k: 'name', l: 'Nom / organisme' },
    { k: 'type', l: 'Type', type: 'select', opts: ['Préfecture', 'Mairie', 'Aérodrome / ATC', 'Autorité militaire', 'DSAC', 'Client', 'Propriétaire de terrain', 'Gestionnaire d\'espace naturel', 'Autre'] },
    { k: 'email', l: 'E-mail', type: 'email' }, { k: 'phone', l: 'Téléphone' },
    { k: 'website', l: 'Site web', type: 'url' }, { k: 'area', l: 'Zone / département' },
    { k: 'notes', l: 'Notes', type: 'textarea' }
  ];

  const OPERATOR_FIELDS = [
    { type: 'section', l: 'Exploitant' },
    { k: 'legalType', l: 'Statut de l\'exploitant', type: 'select', opts: [['morale', 'Personne morale (société, association…)'], ['physique', 'Personne physique (micro-entrepreneur…)']] },
    { k: 'company', l: 'Raison sociale (ou nom si personne physique)' }, { k: 'siret', l: 'SIRET' },
    { k: 'operatorId', l: 'N° d\'exploitant UAS', ph: 'FRA…', hint: 'celui apposé sur vos drones (AlphaTango › Exploitant)' },
    { k: 'subcontractor', l: 'Si sous-traitant : SIRET du donneur d\'ordre', hint: 'facultatif' },
    { k: 'address', l: 'Adresse du siège', full: true }, { k: 'zip', l: 'Code postal' }, { k: 'city', l: 'Ville' },
    { k: 'email', l: 'E-mail', type: 'email' }, { k: 'mobile', l: 'Téléphone portable' }, { k: 'phone', l: 'Téléphone fixe', hint: 'facultatif' },
    { type: 'section', l: 'Dirigeant / déclarant', hint: 'signe le Cerfa' },
    { k: 'managerLastName', l: 'Nom' }, { k: 'managerFirstName', l: 'Prénom' },
    { k: 'managerBirth', l: 'Date et lieu de naissance', ph: '01/01/1980, Lyon (France)' }, { k: 'managerRole', l: 'Qualité / fonction', ph: 'Gérant' },
    { k: 'managerAddress', l: 'Adresse postale', full: true, hint: 'vide = adresse du siège' },
    { k: 'managerEmail', l: 'E-mail', type: 'email', hint: 'vide = e-mail de l\'exploitant' }, { k: 'managerMobile', l: 'Portable', hint: 'vide = portable de l\'exploitant' },
    { type: 'section', l: 'Assurance responsabilité civile drone' },
    { k: 'insurer', l: 'Assureur' }, { k: 'policy', l: 'N° de police', hint: 'facultatif' },
    { k: 'insuranceTacit', l: 'Contrat à reconduction tacite (sans date de fin)', type: 'checkbox', full: true, def: true },
    { k: 'insuranceExp', l: 'Date de fin du contrat', type: 'date', showIf: (v) => !v.insuranceTacit },
    { type: 'section', l: 'Catégorie spécifique', hint: 'uniquement si vous volez en STS ou avec une autorisation' },
    { k: 'stsDecl', l: 'Déclaration d\'exploitation STS – n° d\'accusé de réception / date', hint: 'déclaration de l\'exploitant à la DSAC, différente du certificat du télépilote' },
    { k: 'authorization', l: 'Autorisation d\'exploitation / LUC – n°', hint: 'seulement si la DSAC vous en a délivré une (SORA/PDRA)' },
    { type: 'section', l: 'Courriers et options' },
    { k: 'signature', l: 'Signature (nom pour les courriers)', full: true, hint: 'vide = prénom et nom du dirigeant' },
    { k: 'openaipKey', l: 'Clé API OpenAIP', full: true, hint: 'facultatif : affiche les CTR, TMA, zones P/R/D (compte gratuit sur openaip.net)' }
  ];

  /* Certificats détenus : une date de validité OU un ancien n° saisi suffit */
  const certs = (p) => {
    p = p || {}; const valid = (d) => !d || UI.daysUntil(d) >= 0;
    return { a1a3: !!(p.a1a3Exp || p.a1a3), a1a3Ok: !!(p.a1a3Exp || p.a1a3) && valid(p.a1a3Exp),
      a2: !!(p.a2Exp || p.a2), a2Ok: !!(p.a2Exp || p.a2) && valid(p.a2Exp),
      sts: !!(p.stsExp || p.sts), stsOk: !!(p.stsExp || p.sts) && valid(p.stsExp),
      practical: !!(p.practicalDate || p.practical) };
  };
  /* Assurance effective d'un drone : son contrat propre, sinon celui de l'exploitant */
  const insurance = (d) => {
    const op = Store.operator(); const own = d && (d.ownInsurance || (d.ownInsurance === undefined && d.insuranceExp));
    if (own) return { insurer: d.insurer || op.insurer, exp: d.insuranceExp || '', tacit: false, own: true };
    return { insurer: op.insurer || '', exp: op.insuranceTacit === false ? (op.insuranceExp || '') : '', tacit: op.insuranceTacit !== false, own: false };
  };
  const insuranceBadge = (d) => { const i = insurance(d); if (!i.insurer) return '<span class="badge warn">non renseignée</span>'; if (i.exp) return UI.expiryBadge(i.exp); return `<span class="badge ok">${UI.esc(i.insurer)}${i.tacit ? ' · reconduction tacite' : ''}</span>`; };

  /* Correspondances exploitant ⇄ télépilote (évite de ressaisir les mêmes informations) */
  const splitBirth = (s) => { const m = (s || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*,?\s*(.*)/); return m ? { date: `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`, place: m[4].trim() } : { date: '', place: s || '' }; };
  const pilotFromOperator = (op) => { const b = splitBirth(op.managerBirth); return { lastName: op.managerLastName, firstName: op.managerFirstName, email: op.managerEmail || op.email, phone: op.managerMobile || op.mobile, birthDate: b.date, birthPlace: b.place, address: op.managerAddress || [op.address, op.zip, op.city].filter(Boolean).join(', '), independent: 'Oui' }; };
  const operatorFromPilot = (p) => ({ managerLastName: p.lastName, managerFirstName: p.firstName, managerBirth: [p.birthDate ? p.birthDate.split('-').reverse().join('/') : '', p.birthPlace].filter(Boolean).join(', '), managerEmail: p.email, managerMobile: p.phone, managerAddress: p.address });
  // Remplit seulement les champs vides
  const fill = (form, vals) => Object.entries(vals).forEach(([k, v]) => { const el = form.elements[k]; if (el && v && !el.value) { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); } });
  /* Contrôle de format des numéros faciles à confondre */
  function checkFormats(form) {
    const RULES = {
      operatorId: (v) => /^UAS-?FR/i.test(v) ? 'Ce format (UAS-FR-…) est celui d\'un drone. Le n° d\'exploitant commence par FRA (voir AlphaTango › Exploitant).' : v && !/^FRA/i.test(v) ? 'Le n° d\'exploitant commence normalement par FRA.' : '',
      authorization: (v) => /-RP-/i.test(v) ? 'Ceci ressemble à un n° de télépilote (…-RP-…), pas à une autorisation DSAC. Laissez vide si vous n\'avez pas d\'autorisation.' : '',
      stsDecl: (v) => /-RP-/i.test(v) ? 'Ceci est un n° de télépilote. Ici : l\'accusé de réception de la déclaration STS de l\'exploitant.' : '',
      registration: (v) => /^FRA/i.test(v) ? 'Le n° FRA… est celui de l\'exploitant. Le n° d\'enregistrement du drone est du type UAS-FR-…' : '',
      pilotId: (v) => v && !/-RP-/i.test(v) ? 'Le n° de télépilote est du type FRA-RP-…' : ''
    };
    const run = () => Object.entries(RULES).forEach(([k, rule]) => {
      const el = form.elements[k]; if (!el) return;
      const lab = el.closest('label'); let w = lab.querySelector('.field-warn');
      const msg = rule(el.value.trim());
      if (msg && !w) { w = document.createElement('span'); w.className = 'field-warn'; lab.appendChild(w); }
      if (w) { w.textContent = msg ? '⚠ ' + msg : ''; }
    });
    form.addEventListener('input', run); run();
  }

  const pilotName = (p) => p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Sans nom' : '—';
  const droneName = (d) => d ? `${d.name || d.model || 'Drone'}${d.classMark ? ' (' + d.classMark + ')' : ''}` : '—';

  /* ---------- Liste générique ---------- */
  function crudPage({ col, title, sub, fields, columns, emptyText, addLabel, beforeSave, extraFormHtml, afterRenderForm, afterSave }) {
    const items = Store.all(col);
    UI.view().innerHTML = `
      <div class="head"><div><h1>${title}</h1><p class="sub">${sub}</p></div>
      <div class="row"><input id="search" placeholder="Rechercher…" style="width:200px"><button class="btn primary" id="addBtn">+ ${addLabel}</button></div></div>
      <div class="card table-wrap"><table><thead><tr>${columns.map(c => `<th>${c.l}</th>`).join('')}<th></th></tr></thead>
      <tbody id="rows"></tbody></table></div>`;
    const draw = (q = '') => {
      const list = items.filter(it => JSON.stringify(it).toLowerCase().includes(q.toLowerCase()));
      UI.$('#rows').innerHTML = list.length ? list.map(it => `<tr>${columns.map(c => `<td>${c.r(it)}</td>`).join('')}
        <td class="row" style="justify-content:flex-end"><button class="btn sm" data-edit="${it.id}">Modifier</button><button class="btn sm danger" data-del="${it.id}">Suppr.</button></td></tr>`).join('')
        : `<tr><td colspan="${columns.length + 1}" class="empty">${emptyText}</td></tr>`;
    };
    draw();
    UI.$('#search').oninput = (e) => draw(e.target.value);
    const open = (obj = {}) => {
      UI.modal(`<h2>${obj.id ? 'Modifier' : 'Ajouter'}</h2><form id="f"><div class="fields">${UI.formFields(fields, obj)}</div>${extraFormHtml ? extraFormHtml(obj) : ''}
        <div class="row" style="margin-top:16px;justify-content:flex-end"><button type="button" class="btn" onclick="UI.closeModal()">Annuler</button><button class="btn primary">Enregistrer</button></div></form>`, (root) => {
        UI.bindConditional(UI.$('#f', root), fields);
        checkFormats(UI.$('#f', root));
        afterRenderForm && afterRenderForm(root, obj);
        UI.$('#f', root).onsubmit = async (e) => {
          e.preventDefault();
          let o = Object.assign({}, obj, UI.readForm(e.target, fields));
          if (beforeSave) o = await beforeSave(o, e.target);
          Store.upsert(col, o); afterSave && afterSave(o);
          UI.closeModal(); UI.toast('Enregistré'); App.route();
        };
      });
    };
    UI.$('#addBtn').onclick = () => open();
    UI.$('#rows').onclick = async (e) => {
      const ed = e.target.dataset.edit, del = e.target.dataset.del;
      if (ed) open(Store.get(col, ed));
      if (del && confirm('Supprimer cet élément ?')) {
        const it = Store.get(col, del); if (it && it.fileId) await Store.delFile(it.fileId);
        Store.remove(col, del); App.route();
      }
    };
  }

  function pilots() {
    crudPage({
      col: 'pilots', title: 'Télépilotes', sub: 'Identité, formations, brevets et dates de validité.', fields: PILOT_FIELDS, addLabel: 'Télépilote',
      afterRenderForm: (root) => {
        const op = Store.operator(); if (!op.managerLastName) return;
        const f = UI.$('#f', root);
        UI.$('.fields', f).insertAdjacentHTML('beforebegin', `<div class="prefill">👤 Vous êtes aussi le dirigeant de ${esc(op.company || 'l\'exploitant')} ? <button type="button" class="btn sm" id="fromOp">Reprendre mes informations d'exploitant</button></div>`);
        UI.$('#fromOp', root).onclick = () => { fill(f, pilotFromOperator(op)); UI.toast('Informations reprises : complétez les certificats'); };
      },
      emptyText: 'Aucun télépilote. Ajoutez-en un pour l\'associer à vos missions.',
      columns: [
        { l: 'Nom', r: p => `<b>${esc(pilotName(p))}</b><div class="legend">${esc(p.email || '')} ${esc(p.phone || '')}</div>` },
        { l: 'N° télépilote', r: p => esc(p.pilotId || '—') },
        { l: 'A1/A3', r: p => certs(p).a1a3 ? UI.expiryBadge(p.a1a3Exp) : '<span class="badge">—</span>' },
        { l: 'A2', r: p => certs(p).a2 ? UI.expiryBadge(p.a2Exp) : '<span class="badge">—</span>' },
        { l: 'STS', r: p => p.sts ? UI.expiryBadge(p.stsExp) : '<span class="badge">—</span>' }
      ]
    });
  }

  function drones() {
    crudPage({
      col: 'drones', title: 'Drones', sub: 'Flotte, classe, enregistrement, assurance et maintenance.', fields: DRONE_FIELDS, addLabel: 'Drone',
      emptyText: 'Aucun drone enregistré.',
      columns: [
        { l: 'Drone', r: d => `<b>${esc(droneName(d))}</b><div class="legend">${esc([d.maker, d.model].filter(Boolean).join(' '))}</div>` },
        { l: 'Masse', r: d => d.mtom ? `${d.mtom} g` : '—' },
        { l: 'Enregistrement', r: d => `<span class="mono">${esc(d.registration || '—')}</span>` },
        { l: 'Heures de vol', r: d => { const s = Logbook.droneStats(d); return `${Logbook.hm(s.totalMin)}${s.due ? ' <span class="badge bad">maintenance due</span>' : s.soon ? ' <span class="badge warn">maintenance bientôt</span>' : ''}`; } },
        { l: 'Assurance', r: d => insuranceBadge(d) },
        { l: 'Statut', r: d => `<span class="badge ${d.status === 'Opérationnel' || !d.status ? 'ok' : d.status === 'Hors service' ? 'bad' : 'warn'}">${esc(d.status || 'Opérationnel')}</span>` }
      ]
    });
  }

  function docs() {
    const opts = [['', '— Général —'], ...Store.all('pilots').map(p => ['pilot:' + p.id, '🧑‍✈️ ' + pilotName(p)]), ...Store.all('drones').map(d => ['drone:' + d.id, '🚁 ' + droneName(d)])];
    DOC_FIELDS.find(f => f.k === 'linkedTo').opts = opts;
    const labelOf = (v) => (opts.find(o => o[0] === v) || [, '—'])[1];
    crudPage({
      col: 'docs', title: 'Documentation', sub: 'MANEX, déclarations, assurances, certificats… Les fichiers restent dans votre navigateur.', fields: DOC_FIELDS, addLabel: 'Document',
      emptyText: 'Aucun document.',
      extraFormHtml: (o) => `<label class="full" style="margin-top:12px">Fichier (PDF, image…) ${o.fileName ? `— actuel : ${esc(o.fileName)}` : ''}<input type="file" name="file"></label>`,
      beforeSave: async (o, form) => {
        const f = form.elements.file.files[0];
        if (f) { o.fileId = o.fileId || Store.uid(); o.fileName = f.name; o.fileType = f.type; await Store.putFile(o.fileId, f); }
        return o;
      },
      columns: [
        { l: 'Document', r: d => `<b>${esc(d.title)}</b><div class="legend">${esc(d.category)}</div>` },
        { l: 'Associé à', r: d => esc(labelOf(d.linkedTo || '')) },
        { l: 'Expiration', r: d => d.expiry ? UI.expiryBadge(d.expiry) : '—' },
        { l: 'Fichier', r: d => [d.fileId ? `<button class="btn sm" onclick="Fleet.openFile('${d.fileId}')">📄 ${esc(d.fileName)}</button>` : '', d.url ? `<a class="btn sm" href="${esc(d.url)}" target="_blank" rel="noopener">🔗 Lien</a>` : ''].join(' ') || '—' }
      ]
    });
    // Liens réglementaires utiles
    UI.view().insertAdjacentHTML('beforeend', `<div class="card"><h2>Références réglementaires utiles</h2><ul>
      ${Regulation.LINKS.map(l => `<li><a href="${l.url}" target="_blank" rel="noopener">${esc(l.t)}</a> — <span class="legend">${esc(l.d)}</span></li>`).join('')}</ul></div>`);
  }

  async function openFile(id) {
    const b = await Store.getFile(id); if (!b) return UI.toast('Fichier introuvable');
    window.open(URL.createObjectURL(b), '_blank');
  }

  function contacts() {
    crudPage({
      col: 'contacts', title: 'Contacts', sub: 'Annuaire des interlocuteurs (préfectures, aérodromes, militaires, clients…). Les contacts trouvés lors de l\'analyse d\'une mission peuvent y être ajoutés en un clic.',
      fields: CONTACT_FIELDS, addLabel: 'Contact', emptyText: 'Aucun contact enregistré.',
      columns: [
        { l: 'Nom', r: c => `<b>${esc(c.name)}</b><div class="legend">${esc(c.area || '')}</div>` },
        { l: 'Type', r: c => `<span class="badge info">${esc(c.type)}</span>` },
        { l: 'E-mail', r: c => c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—' },
        { l: 'Téléphone', r: c => c.phone ? `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : '—' },
        { l: 'Web', r: c => c.website ? `<a href="${esc(c.website)}" target="_blank" rel="noopener">site</a>` : '—' }
      ]
    });
    UI.view().insertAdjacentHTML('beforeend', `<div class="card"><h2>Contacts nationaux de référence</h2><div class="table-wrap"><table><tbody>
      ${Regulation.NATIONAL_CONTACTS.map(c => `<tr><td><b>${esc(c.name)}</b><div class="legend">${esc(c.role)}</div></td><td><a href="${c.url}" target="_blank" rel="noopener">${esc(c.url.replace(/^https?:\/\//, ''))}</a></td></tr>`).join('')}
      </tbody></table></div></div>`);
  }

  /* ---------- Signature : dessin ou image, fond rendu transparent ---------- */
  function signaturePad(op) {
    const cv = UI.$('#sigPad'), g = cv.getContext('2d'); let drawing = false, dirty = false, last = null;
    const show = (src) => { const im = new Image(); im.onload = () => { g.clearRect(0, 0, cv.width, cv.height); const k = Math.min(cv.width / im.width, cv.height / im.height) * 0.9; g.drawImage(im, (cv.width - im.width * k) / 2, (cv.height - im.height * k) / 2, im.width * k, im.height * k); UI.$('#sigHint').hidden = true; }; im.src = src; };
    if (op.signatureImg) show(op.signatureImg);
    const pos = (e) => { const r = cv.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [(t.clientX - r.left) * cv.width / r.width, (t.clientY - r.top) * cv.height / r.height]; };
    const start = (e) => { e.preventDefault(); drawing = true; last = pos(e); UI.$('#sigHint').hidden = true; };
    const move = (e) => { if (!drawing) return; e.preventDefault(); const p = pos(e); g.strokeStyle = '#0b1f4d'; g.lineWidth = 3.2; g.lineCap = g.lineJoin = 'round'; g.beginPath(); g.moveTo(...last); g.lineTo(...p); g.stroke(); last = p; dirty = true; };
    const end = () => { drawing = false; };
    cv.addEventListener('mousedown', start); cv.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
    cv.addEventListener('touchstart', start, { passive: false }); cv.addEventListener('touchmove', move, { passive: false }); cv.addEventListener('touchend', end);
    UI.$('#sigClear').onclick = () => { g.clearRect(0, 0, cv.width, cv.height); dirty = false; UI.$('#sigHint').hidden = false; };
    // Image importée : fond clair rendu transparent, encre assombrie, recadrage
    UI.$('#sigFile').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const bmp = await createImageBitmap(f); const k = Math.min(1, 1200 / bmp.width);
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      const x = c.getContext('2d'); x.drawImage(bmp, 0, 0, c.width, c.height);
      const im = x.getImageData(0, 0, c.width, c.height), d = im.data;
      for (let i = 0; i < d.length; i += 4) { const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; if (l > 170) d[i + 3] = 0; else { d[i] = 11; d[i + 1] = 31; d[i + 2] = 77; d[i + 3] = Math.min(255, (170 - l) * 3); } }
      x.putImageData(im, 0, 0); show(c.toDataURL('image/png')); dirty = true;
    };
    UI.$('#sigSave').onclick = () => {
      if (!dirty && !op.signatureImg) return UI.toast('Signez d\'abord dans le cadre');
      Store.setOperator(Object.assign({}, Store.operator(), { signatureImg: trimCanvas(cv) })); UI.toast('Signature enregistrée'); App.route();
    };
    const del = UI.$('#sigDel'); if (del) del.onclick = () => { const o = Store.operator(); delete o.signatureImg; Store.setOperator(o); UI.toast('Signature supprimée'); App.route(); };
  }
  // Recadre la signature au plus juste (PNG transparent)
  function trimCanvas(cv) {
    const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data; let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    if (x1 <= x0) return cv.toDataURL('image/png');
    const w = x1 - x0 + 8, h = y1 - y0 + 8, c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(cv, x0 - 4, y0 - 4, w, h, 0, 0, w, h); return c.toDataURL('image/png');
  }

  function settings() {
    const op = Store.operator();
    UI.view().innerHTML = `<h1>Exploitant</h1><p class="sub">Ces informations servent à préremplir les formulaires et courriers.</p>
      <div class="card"><form id="opf"><div class="fields">${UI.formFields(OPERATOR_FIELDS, op)}</div>
      <div class="row" style="margin-top:16px"><button class="btn primary">Enregistrer</button></div></form></div>
      <div class="card"><h2>✍️ Signature pour le Cerfa</h2>
        <p class="legend">Signez dans le cadre avec la souris, le pavé tactile ou le doigt, ou importez une photo de votre signature (sur papier blanc). Elle sera apposée automatiquement en bas du Cerfa 15476*04.</p>
        <div class="sig-wrap"><canvas id="sigPad" width="600" height="200"></canvas><span class="sig-hint" id="sigHint">Signez ici</span></div>
        <div class="row" style="margin-top:8px"><button type="button" class="btn sm" id="sigClear">Effacer</button><label class="btn sm">📷 Importer une image<input type="file" id="sigFile" accept="image/*" hidden></label><button type="button" class="btn sm primary" id="sigSave">Enregistrer la signature</button><span class="legend" id="sigState">${op.signatureImg ? '✅ Signature enregistrée' : 'Aucune signature enregistrée'}</span>${op.signatureImg ? '<button type="button" class="btn sm danger" id="sigDel">Supprimer</button>' : ''}</div></div>
      <div class="card"><h2>Sauvegarde</h2><p class="legend">Toutes les données sont stockées dans ce navigateur. Exportez-les régulièrement (la sauvegarde inclut les documents joints).</p>
      <div class="row"><button class="btn" id="exp">⬇ Exporter (JSON)</button><label class="btn">⬆ Importer<input type="file" id="imp" accept=".json" hidden></label></div></div>`;
    const opf = UI.$('#opf');
    UI.bindConditional(opf, OPERATOR_FIELDS); checkFormats(opf);
    const P = Store.all('pilots').filter(p => !p.demo);
    if (P.length) {
      UI.$('.fields', opf).insertAdjacentHTML('beforebegin', `<div class="prefill">👤 Le dirigeant est aussi télépilote ? <select id="pPick" style="width:auto">${P.map(p => `<option value="${p.id}">${esc(pilotName(p))}</option>`).join('')}</select><button type="button" class="btn sm" id="fromPilot">Reprendre ses informations</button></div>`);
      UI.$('#fromPilot').onclick = () => { fill(opf, operatorFromPilot(Store.get('pilots', UI.$('#pPick').value))); UI.toast('Informations reprises dans « Dirigeant »'); };
    }
    // Valeurs reprises automatiquement si vides : adresse, e-mail, portable du dirigeant ; signature
    // On conserve les données hors formulaire (signature…)
    opf.onsubmit = (e) => { e.preventDefault(); Store.setOperator(Object.assign({}, Store.operator(), UI.readForm(e.target, OPERATOR_FIELDS))); UI.toast('Exploitant enregistré'); };
    signaturePad(op);
    UI.$('#exp').onclick = async () => { UI.toast('Préparation de la sauvegarde…'); UI.download(`sauvegarde-drone-${new Date().toISOString().slice(0, 10)}.json`, await Store.exportFull()); try { localStorage.setItem('osd-last-backup', new Date().toISOString()); } catch (e) { } };
    UI.$('#imp').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (!confirm('Remplacer toutes les données actuelles par celles du fichier ?')) return;
      try { await Store.importFull(await f.text()); UI.toast('Restauration réussie'); App.route(); } catch (err) { UI.toast('Fichier invalide'); }
    };
  }

  return { pilots, drones, docs, contacts, settings, openFile, pilotName, droneName, DOC_CATEGORIES, certs, insurance };
})();
