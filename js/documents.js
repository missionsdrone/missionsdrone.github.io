/* Génération des courriers et formulaires préremplis */
const Docs = (() => {
  const { esc } = UI;

  const dms = (v, pos, neg) => {
    const a = Math.abs(v), d = Math.floor(a), mf = (a - d) * 60, m = Math.floor(mf), s = ((mf - m) * 60).toFixed(1);
    return `${d}°${String(m).padStart(2, '0')}'${String(s).padStart(4, '0')}" ${v >= 0 ? pos : neg}`;
  };
  const coord = (lat, lon) => `${dms(lat, 'N', 'S')} / ${dms(lon, 'E', 'O')} (${lat.toFixed(5)}, ${lon.toFixed(5)})`;

  function facts(m, ctx) {
    const op = Store.operator();
    const p = Store.get('pilots', m.pilotId), d = Store.get('drones', m.droneId);
    const c = m.zone ? turf.centroid(m.zone).geometry.coordinates : null;
    const area = m.zone ? turf.area(m.zone) : 0;
    const commune = ctx && ctx.commune;
    return {
      op, p, d, commune,
      center: c ? coord(c[1], c[0]) : 'non définie',
      areaTxt: area ? (area > 10000 ? (area / 10000).toFixed(2) + ' ha' : Math.round(area) + ' m²') : '—',
      place: commune ? `${commune.nom} (${commune.codeDepartement})` : (m.place || 'à préciser'),
      dateTxt: m.date ? new Date(m.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'à préciser',
      hours: `${m.startTime || '--:--'} – ${m.endTime || '--:--'}`,
      sign: op.signature || [op.managerFirstName, op.managerLastName].filter(Boolean).join(' ') || op.company || '[Votre nom]',
      vertices: m.zone ? m.zone.geometry.coordinates[0].slice(0, -1).map(([lo, la], i) => `  P${i + 1} : ${coord(la, lo)}`).join('\n') : ''
    };
  }

  function opBlock(f) {
    const o = f.op;
    return [o.company, o.address, [o.zip, o.city].filter(Boolean).join(' '), o.siret && 'SIRET : ' + o.siret, o.operatorId && 'N° exploitant UAS : ' + o.operatorId, o.phone, o.email].filter(Boolean).join('\n') || '[Coordonnées de l\'exploitant – à compléter dans « Exploitant »]';
  }

  function missionBlock(m, f) {
    return `• Objet : ${m.purpose || '—'}${m.client ? ' pour ' + m.client : ''}
• Date : ${f.dateTxt}, de ${m.startTime || '--:--'} à ${m.endTime || '--:--'}${m.altDate ? ' (report possible : ' + new Date(m.altDate).toLocaleDateString('fr-FR') + ')' : ''}
• Lieu : ${m.address ? m.address + ', ' : ''}${f.place}
• Centre de la zone : ${f.center} — superficie ${f.areaTxt}
• Hauteur maximale : ${m.maxHeight || '—'} m sol
• Catégorie / scénario : ${m.category || '—'}${m.vlos === 'BVLOS' ? ' — hors vue (BVLOS)' : ' — en vue directe (VLOS)'}
• Télépilote : ${f.p ? Fleet.pilotName(f.p) + (f.p.pilotId ? ' (' + f.p.pilotId + ')' : '') + (f.p.phone ? ' – ' + f.p.phone : '') : 'à préciser'}
• Aéronef : ${f.d ? [f.d.maker, f.d.model].filter(Boolean).join(' ') + (f.d.classMark ? ', classe ' + f.d.classMark : '') + (f.d.mtom ? ', ' + f.d.mtom + ' g' : '') + (f.d.registration ? ', ' + f.d.registration : '') : 'à préciser'}`;
  }

  const TEMPLATES = {
    prefecture: (m, f) => ({
      subject: `Déclaration préalable de vol de drone en zone peuplée – ${f.place} – ${m.date || ''}`,
      body: `Madame, Monsieur,

Conformément à la réglementation relative à l'utilisation de l'espace aérien par les aéronefs sans équipage à bord, nous vous informons de l'opération suivante en agglomération / zone peuplée, déclarée également sur AlphaTango :

${missionBlock(m, f)}

Mesures de sécurité prévues :
${m.security || '• Périmètre de sécurité balisé et interdit au public, personnel au sol dédié\n• Information préalable des riverains / occupants\n• Procédures d\'urgence et de récupération du drone'}

Coordonnées des points de la zone d'évolution :
${f.vertices}

Vous trouverez ci-joint le plan de la zone, l'attestation d'assurance et la déclaration d'exploitation.
Nous restons à votre disposition pour tout complément.

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

${f.sign}
${opBlock(f)}`
    }),
    prefecture_info: (m, f, t) => ({
      subject: `Demande d'accord – opération de drone à proximité de ${t && t.name ? t.name : 'un site sensible'} – ${m.date || ''}`,
      body: `Madame, Monsieur,

Nous envisageons une opération de drone à proximité de ${t && t.name ? t.name : 'un site sensible'} et sollicitons votre accord préalable ainsi que vos éventuelles prescriptions. Aucune prise de vue du site ne sera réalisée.

${missionBlock(m, f)}

Coordonnées des points de la zone :
${f.vertices}

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

${f.sign}
${opBlock(f)}`
    }),
    police: (m, f, t) => ({
      subject: `Information – opération de drone déclarée – ${f.place} – ${m.date || ''}`,
      body: `Madame, Monsieur,

Pour votre information, et afin d'éviter toute intervention inutile sur signalement, nous vous informons qu'une opération de drone professionnelle aura lieu sur votre secteur${t && t.name ? ' (' + t.name + ')' : ''}. Elle a fait l'objet d'une déclaration préalable auprès de la préfecture.

${missionBlock(m, f)}

Un périmètre de sécurité sera mis en place. Le télépilote sera joignable en permanence au ${f.p && f.p.phone ? f.p.phone : '[téléphone]'} et tient à votre disposition la déclaration, son certificat et l'enregistrement du drone.

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

${f.sign}
${opBlock(f)}`
    }),
    mairie: (m, f) => ({
      subject: `Demande d'autorisation d'occupation du domaine public – décollage drone – ${f.place} – ${m.date || ''}`,
      body: `Madame, Monsieur le Maire,

Dans le cadre d'une opération par drone déclarée en préfecture, nous sollicitons l'autorisation d'occuper temporairement le domaine public pour le décollage et l'atterrissage (et, si nécessaire, un arrêté de circulation / stationnement).

${missionBlock(m, f)}

Un périmètre de sécurité sera mis en place pendant toute la durée du vol. La déclaration réglementaire a été effectuée auprès de la préfecture.

Nous vous prions d'agréer, Madame, Monsieur le Maire, l'expression de notre haute considération.

${f.sign}
${opBlock(f)}`
    }),
    atc: (m, f, t) => ({
      subject: `Demande d'accord – vol de drone ${t && t.icao ? (Regulation.ctrName(t.icao) ? 'en ' + Regulation.ctrName(t.icao).replace(/ \(.*/, '') : 'zone ' + t.icao) + ' (' + t.icao + ')' : 'en espace contrôlé'} – ${m.date || ''}`,
      body: `Madame, Monsieur,

Nous sollicitons votre accord (ou l'application du protocole en vigueur) pour une opération de drone à proximité de ${t ? ('l\'aérodrome ' + (t.name || '') + (t.icao ? ' (' + t.icao + ')' : '')) : 'votre aérodrome'} :

${missionBlock(m, f)}

Le télépilote sera joignable en permanence au ${f.p && f.p.phone ? f.p.phone : '[téléphone]'} et pourra interrompre le vol immédiatement sur demande. Nous vous appellerons avant le décollage et après l'atterrissage si vous le souhaitez.

Coordonnées des points de la zone :
${f.vertices}

Dans l'attente de votre retour, veuillez agréer, Madame, Monsieur, nos salutations distinguées.

${f.sign}
${opBlock(f)}`
    }),
    military: (m, f, t) => ({
      subject: `Demande d'accord – vol de drone ${t && t.icao && Regulation.ctrName(t.icao) ? 'en ' + Regulation.ctrName(t.icao).replace(/ \(.*/, '') + ' (' + t.icao + ')' : '– ' + (t && t.name ? t.name : 'emprise militaire')} – ${m.date || ''}`,
      body: `Mon Commandant, Madame, Monsieur,

Nous sollicitons l'autorisation de réaliser une opération de drone à proximité ${t && t.name ? 'de ' + t.name : 'd\'une emprise militaire'} :

${missionBlock(m, f)}

Aucune prise de vue des installations militaires ne sera réalisée sans votre accord exprès. Nous nous conformerons à toute prescription complémentaire.

Veuillez agréer l'expression de nos salutations respectueuses.

${f.sign}
${opBlock(f)}`
    }),
    nature: (m, f, t) => ({
      subject: `Demande d'accord – survol par drone – ${t && t.name ? t.name : 'espace naturel protégé'} – ${m.date || ''}`,
      body: `Madame, Monsieur,

Nous souhaitons réaliser une opération de drone ${t && t.name ? 'à proximité de / dans « ' + t.name + ' »' : 'à proximité d\'un espace naturel protégé'} et sollicitons votre accord ainsi que vos éventuelles prescriptions (périodes de sensibilité de la faune, hauteur minimale, itinéraires à éviter) :

${missionBlock(m, f)}

Veuillez agréer, Madame, Monsieur, nos salutations distinguées.

${f.sign}
${opBlock(f)}`
    }),
    owner: (m, f) => ({
      subject: `Autorisation de décollage / atterrissage – drone – ${m.date || ''}`,
      body: `Madame, Monsieur,

Dans le cadre d'une opération par drone, nous sollicitons votre autorisation pour utiliser votre terrain comme zone de décollage et d'atterrissage, et pour survoler votre propriété :

${missionBlock(m, f)}

Notre responsabilité civile est couverte par ${f.op.insurer || '[assureur]'}${f.op.policy ? ' (police n° ' + f.op.policy + ')' : ''}.

Cordialement,

${f.sign}
${opBlock(f)}`
    }),
    generic: (m, f, t) => ({
      subject: `Information – vol de drone à proximité – ${m.date || ''}`,
      body: `Madame, Monsieur,

Nous vous informons qu'une opération de drone aura lieu à proximité de ${t && t.name ? t.name : 'votre site'} :

${missionBlock(m, f)}

Le télépilote sera joignable au ${f.p && f.p.phone ? f.p.phone : '[téléphone]'} et interrompra le vol immédiatement en cas d'activité aérienne.

Cordialement,

${f.sign}
${opBlock(f)}`
    })
  };

  const TEMPLATE_LABELS = { mairie: 'Mairie (domaine public)', atc: 'Aérodrome / ATC', military: 'Autorité militaire', nature: 'Gestionnaire espace naturel', police: 'Police / gendarmerie', prefecture_info: 'Préfecture (site sensible)', owner: 'Propriétaire du terrain', generic: 'Information générique' };
  const TO_TYPE = { prefecture: 'Préfecture', prefecture_info: 'Préfecture', mairie: 'Mairie', atc: 'Aérodrome / ATC', military: 'Autorité militaire', nature: 'Gestionnaire d\'espace naturel', owner: 'Propriétaire de terrain', police: 'Police / gendarmerie' };

  function openMail(key, m, ctx, target) {
    const f = facts(m, ctx);
    const { subject, body } = TEMPLATES[key](m, f, target);
    const pool = [...((ctx && ctx.contacts) || []), ...Store.all('contacts')];
    const aip = target && target.icao ? Regulation.aipInfo(target.icao) : null;
    const saved = target && Store.all('contacts').find(c => c.email && ((target.icao && (c.name || '').includes(target.icao)) || (target.name && c.name === target.name)));
    const guess = (saved && saved.email) || (aip && aip.bestEmail) || (target && target.contact && target.contact.email) || (!target ? (pool.find(c => c.type === TO_TYPE[key] && c.email) || {}).email : '') || '';
    const src = saved ? 'votre annuaire' : aip && aip.bestEmail ? `fiche AIP officielle ${target.icao} (cycle du ${UI.fmtDate(Regulation.AIPDIR().airac)})` : '';
    const aipBox = aip ? `<div class="alert info" style="margin:0 0 10px">📖 <b>${esc(target.icao)} – ${esc(aip.name || '')}</b>${aip.airspaces ? ' · ' + esc(aip.airspaces.join(', ')) + (aip.airspaceClass ? ' (classe ' + esc(aip.airspaceClass) + ')' : '') : ''}${aip.service ? ' · ' + esc(aip.service) : ''}<br>
      ${aip.atsPhones ? `☎ Contrôle : ${aip.atsPhones.map(esc).join(' / ')} · ` : ''}${aip.phones ? `☎ Gestionnaire : ${aip.phones.slice(0, 2).map(esc).join(' / ')}` : ''}
      ${!aip.bestEmail ? `<br>⚠️ <b>Aucune adresse « contrôle » ou « drones » publiée dans l'AIP pour ce terrain.</b> ${aip.military ? 'Appelez les opérations de la base pour obtenir l\'adresse.' : 'Utilisez Clearance (terrains DSNA) ou appelez le contrôle pour obtenir l\'adresse, puis enregistrez-la dans vos Contacts.'}` : ''}
      ${[...(aip.emails || []), ...(aip.otherEmails || [])].length ? `<br>✉ Autres adresses publiées (souvent commerciales) : ${[...new Set([...(aip.emails || []), ...(aip.otherEmails || [])])].filter(e => e !== guess).slice(0, 4).map(e => `<a href="#" data-mail="${esc(e)}">${esc(e)}</a>`).join(', ')}` : ''}
      ${aip.drone ? `<br>🚁 <b>Règle locale drones (AIP) :</b> <i>${esc(aip.drone[0].slice(0, 260))}…</i>` : ''}
      ${!aip.military ? '<br>ℹ️ Terrain contrôlé par la DSNA : la demande peut aussi se faire via Clearance (plateforme retenue par la DSNA).' : ''}</div>` : (target && (target.icao || target.name) ? `<div class="alert" style="margin:0 0 10px">Aucune adresse officielle publiée pour ${esc(target.icao || target.name)} : cherchez-la sur la carte VAC (ligne ATS / exploitant) puis enregistrez-la dans vos Contacts — elle sera reprise automatiquement.</div>` : '');
    UI.modal(`<h2>✉️ Courrier – ${TEMPLATE_LABELS[key]}</h2>${aipBox}
      <div class="fields" style="display:grid;gap:10px">
        <label>Destinataire${src ? ` <span class="legend">(source : ${esc(src)} – vérifiez avant envoi)</span>` : ''}<input id="mTo" value="${esc(guess)}" placeholder="adresse@exemple.fr" list="mailList"><datalist id="mailList">${pool.filter(c => c.email).map(c => `<option value="${esc(c.email)}">${esc(c.name)}</option>`).join('')}</datalist></label>
        <label>Objet<input id="mSubj" value="${esc(subject)}"></label>
        <label>Message<textarea id="mBody" style="min-height:340px">${esc(body)}</textarea></label>
      </div>
      <p class="legend">Le message s'ouvre dans votre messagerie : pensez à joindre le plan de zone (export depuis la mission), l'attestation d'assurance et vos documents.</p>
      <div class="row" style="justify-content:flex-end;margin-top:10px">
        <button class="btn" id="mCopy">Copier le texte</button>
        <button class="btn primary" id="mSend">Ouvrir dans la messagerie</button></div>`, (root) => {
      root.querySelectorAll('[data-mail]').forEach(a => a.onclick = (e) => { e.preventDefault(); UI.$('#mTo').value = a.dataset.mail; });
      UI.$('#mSend', root).disabled = !UI.$('#mTo').value; UI.$('#mTo').oninput = () => { UI.$('#mSend', root).disabled = !/@/.test(UI.$('#mTo').value); };
      UI.$('#mCopy', root).onclick = () => UI.copy(`Objet : ${UI.$('#mSubj').value}\n\n${UI.$('#mBody').value}`);
      UI.$('#mSend', root).onclick = () => {
        const href = `mailto:${encodeURIComponent(UI.$('#mTo').value)}?subject=${encodeURIComponent(UI.$('#mSubj').value)}&body=${encodeURIComponent(UI.$('#mBody').value)}`;
        if (href.length > 1900) UI.copy(UI.$('#mBody').value), UI.toast('Message long : texte copié, collez-le dans le corps du mail');
        location.href = href;
      };
    });
  }

  return { openMail, TEMPLATE_LABELS, facts };
})();
