/* Télépilotes, drones, documentation, contacts, exploitant */
const Fleet = (() => {
  const { esc } = UI;

  // Catégories alignées sur les pièces justificatives de la notice 52053#04 §7
  const DOC_CATEGORIES = ['Pièce d\'identité', 'Accusé de déclaration d\'exploitant (DGAC)', 'Extrait registre AlphaTango', 'Attestation d\'assurance',
    'Certificat télépilote (A1/A3, A2, STS)', 'Attestation de formation pratique', 'Déclaration STS (accusé DSAC)', 'Autorisation / LUC',
    'Bon de commande / contrat client', 'Manuel d\'exploitation (MANEX)', 'Documentation drone', 'Protocole ATC / militaire', 'Réglementation', 'Autre'];

  const PILOT_FIELDS = [
    { k: 'lastName', l: 'Nom' }, { k: 'firstName', l: 'Prénom' },
    { k: 'email', l: 'E-mail', type: 'email' }, { k: 'phone', l: 'Téléphone', type: 'tel' },
    { k: 'birthDate', l: 'Date de naissance', type: 'date' }, { k: 'birthPlace', l: 'Lieu de naissance (ville, pays)' },
    { k: 'address', l: 'Adresse postale', full: true },
    { k: 'employer', l: 'Employeur (si salarié)' }, { k: 'independent', l: 'Indépendant', type: 'select', opts: ['Non', 'Oui'] },
    { k: 'pilotId', l: 'N° télépilote (AlphaTango / FRA-RP-…)' },
    { k: 'a1a3', l: 'Formation A1/A3 – n° attestation' }, { k: 'a1a3Exp', l: 'A1/A3 – expiration', type: 'date' },
    { k: 'a2', l: 'Brevet A2 (CATT) – n°' }, { k: 'a2Exp', l: 'A2 – expiration', type: 'date' },
    { k: 'sts', l: 'Certificat STS / CATS – n°' }, { k: 'stsExp', l: 'STS – expiration', type: 'date' },
    { k: 'nationalCert', l: 'Ancien certificat théorique national (CATT)' },
    { k: 'practical', l: 'Attestation formation pratique (STS-01/02)' }, { k: 'practicalDate', l: 'Date attestation pratique', type: 'date' },
    { k: 'medical', l: 'Autres qualifications (nuit, BVLOS…)', full: true },
    { k: 'notes', l: 'Notes', type: 'textarea' }
  ];

  const DRONE_FIELDS = [
    { k: 'name', l: 'Nom / surnom' }, { k: 'maker', l: 'Constructeur' }, { k: 'model', l: 'Modèle' },
    { k: 'serial', l: 'N° de série' },
    { k: 'type', l: 'Type', type: 'select', opts: ['Multirotors', 'Voilure fixe', 'Hélicoptère', 'Ballon', 'Captif dirigeable', 'Autre'] },
    { k: 'captive', l: 'Aéronef captif', type: 'checkbox' },
    { k: 'classMark', l: 'Marquage de classe', type: 'select', opts: [['', '— aucun (legacy / construction privée)'], 'C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6'] },
    { k: 'mtom', l: 'Masse max. au décollage (g)', type: 'number' },
    { k: 'registration', l: "N° d'enregistrement AlphaTango (UAS-FR-…)" },
    { k: 'remoteId', l: 'Identifiant signalement électronique / Remote ID' },
    { k: 'maxWind', l: 'Vent max. supporté (km/h)', type: 'number' },
    { k: 'endurance', l: 'Autonomie (min)', type: 'number' },
    { k: 'parachute', l: 'Parachute / limiteur d\'énergie', type: 'checkbox' },
    { k: 'lightGreen', l: 'Feu vert clignotant (vol de nuit)', type: 'checkbox' },
    { k: 'insurer', l: 'Assureur' }, { k: 'insuranceExp', l: 'Assurance – expiration', type: 'date' },
    { k: 'lastMaintenance', l: 'Dernière maintenance', type: 'date' }, { k: 'flightHours', l: 'Heures de vol antérieures au carnet', type: 'number', step: '0.1' },
    { k: 'maintenanceEvery', l: 'Maintenance toutes les … heures de vol', type: 'number' },
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
    { k: 'legalType', l: 'Statut de l\'exploitant', type: 'select', opts: [['morale', 'Personne morale (société, association…)'], ['physique', 'Personne physique (auto-entrepreneur…)']] },
    { k: 'company', l: 'Raison sociale (ou nom si personne physique)' }, { k: 'siret', l: 'SIREN / SIRET / RCS / RNE' },
    { k: 'operatorId', l: "N° d'exploitant UAS (FRA…)" }, { k: 'subcontractor', l: 'Si sous-traitant : SIRET du donneur d\'ordre' },
    { k: 'address', l: 'Adresse du siège / postale', full: true }, { k: 'zip', l: 'Code postal' }, { k: 'city', l: 'Ville' },
    { k: 'email', l: 'E-mail', type: 'email' }, { k: 'phone', l: 'Téléphone fixe' }, { k: 'mobile', l: 'Téléphone portable' },
    { k: 'managerLastName', l: 'Dirigeant / déclarant – nom' }, { k: 'managerFirstName', l: 'Dirigeant / déclarant – prénom' },
    { k: 'managerBirth', l: 'Dirigeant – date et lieu de naissance', ph: '01/01/1980, Lyon (France)' }, { k: 'managerRole', l: 'Qualité / fonction', ph: 'Gérant' },
    { k: 'managerAddress', l: 'Dirigeant – adresse postale', full: true },
    { k: 'managerEmail', l: 'Dirigeant – e-mail', type: 'email' }, { k: 'managerMobile', l: 'Dirigeant – portable' },
    { k: 'insurer', l: 'Assureur RC' }, { k: 'policy', l: 'N° de police' },
    { k: 'stsDecl', l: 'Déclaration STS (n° / date)' }, { k: 'authorization', l: 'Autorisation catégorie spécifique (n°)' },
    { k: 'signature', l: 'Signature (nom pour les courriers)', full: true },
    { k: 'openaipKey', l: 'Clé API OpenAIP (optionnelle : affiche et analyse les CTR, TMA, zones P/R/D – compte gratuit sur openaip.net)', full: true }
  ];

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
      emptyText: 'Aucun télépilote. Ajoutez-en un pour l\'associer à vos missions.',
      columns: [
        { l: 'Nom', r: p => `<b>${esc(pilotName(p))}</b><div class="legend">${esc(p.email || '')} ${esc(p.phone || '')}</div>` },
        { l: 'N° télépilote', r: p => esc(p.pilotId || '—') },
        { l: 'A1/A3', r: p => p.a1a3 ? UI.expiryBadge(p.a1a3Exp) : '<span class="badge">—</span>' },
        { l: 'A2', r: p => p.a2 ? UI.expiryBadge(p.a2Exp) : '<span class="badge">—</span>' },
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
        { l: 'Assurance', r: d => UI.expiryBadge(d.insuranceExp) },
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

  function settings() {
    const op = Store.operator();
    UI.view().innerHTML = `<h1>Exploitant</h1><p class="sub">Ces informations servent à préremplir les formulaires et courriers.</p>
      <div class="card"><form id="opf"><div class="fields">${UI.formFields(OPERATOR_FIELDS, op)}</div>
      <div class="row" style="margin-top:16px"><button class="btn primary">Enregistrer</button></div></form></div>
      <div class="card"><h2>Sauvegarde</h2><p class="legend">Toutes les données sont stockées dans ce navigateur. Exportez-les régulièrement (la sauvegarde inclut les documents joints).</p>
      <div class="row"><button class="btn" id="exp">⬇ Exporter (JSON)</button><label class="btn">⬆ Importer<input type="file" id="imp" accept=".json" hidden></label></div></div>`;
    UI.$('#opf').onsubmit = (e) => { e.preventDefault(); Store.setOperator(UI.readForm(e.target, OPERATOR_FIELDS)); UI.toast('Exploitant enregistré'); };
    UI.$('#exp').onclick = async () => { UI.toast('Préparation de la sauvegarde…'); UI.download(`sauvegarde-drone-${new Date().toISOString().slice(0, 10)}.json`, await Store.exportFull()); try { localStorage.setItem('osd-last-backup', new Date().toISOString()); } catch (e) { } };
    UI.$('#imp').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (!confirm('Remplacer toutes les données actuelles par celles du fichier ?')) return;
      try { await Store.importFull(await f.text()); UI.toast('Restauration réussie'); App.route(); } catch (err) { UI.toast('Fichier invalide'); }
    };
  }

  return { pilots, drones, docs, contacts, settings, openFile, pilotName, droneName, DOC_CATEGORIES };
})();
