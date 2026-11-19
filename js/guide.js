/* Guide express : les règles en une page + liste des CTR (AIP) */
const Guide = (() => {
  const { esc } = UI;
  const RULES = [
    ['🏙️ Ville / zone peuplée', 'Agglomération (ou < 50 m) ou < 150 m d\'un rassemblement', 'Déclaration préalable (Cerfa 15476*04). Ouverte A1/A2 et STS-01 possibles en pro ; A3 interdite.', 'Préfecture', '10 jours ouvrables (max. 1 mois avant)'],
    ['✈️ CTR civile', 'Zone de contrôle autour d\'un aéroport', 'Ouverte : accord dès 50 m de hauteur. Spécifique : accord au-delà de 50 m et pour tout vol hors vue. Respecter la hauteur de la carte UAS.', 'Tour (TWR) → AFIS → exploitant. DSNA : via Clearance', 'Quelques jours à 2 semaines'],
    ['🎖️ CTR militaire', 'Avord, Cazaux, Istres, Landivisiau, Salon, Villacoublay', 'Ouverte : INTERDIT. Spécifique : accord préalable obligatoire.', 'Base aérienne (adresse AIP)', '2 à 4 semaines'],
    ['🛬 Abords d\'aérodrome', 'Jusqu\'à 5 ou 10 km des pistes', 'Hauteur max. selon la carte UAS (30 / 50 / 60 / 100 m). Au-dessus : accord.', 'Tour / AFIS / exploitant', '—'],
    ['⛔ Zone P (interdite)', 'Ex. P 23 Paris, centrales nucléaires', 'Interdit sauf conditions de pénétration publiées.', 'Organisme de l\'AIP / Préf. de police', 'Long'],
    ['⚠️ Zones R / D', 'Réglementées / dangereuses', 'Ouverte : interdit pendant l\'activation. Spécifique : accord de l\'organisme AIP (sinon interdit).', 'Organisme indiqué dans l\'AIP', 'Variable'],
    ['🛩️ Très basse altitude militaire', 'RTBA, AZBA, zones ENR 5.3.1.3 (hachurées)', 'Drone > 900 g ou hors vue : notification (pas de réponse à attendre). RTBA actif : ouverte interdite.', 'AlphaTango', 'Entre J-2 4h et J 4h'],
    ['🚁 Hélistation / hôpital', 'Hélicoptères à très basse hauteur', 'Priorité absolue aux hélicoptères ; prévenir l\'exploitant si proche.', 'Exploitant / établissement', '—'],
    ['🌲 Parc national, réserve', 'Cœur de parc, réserve naturelle', 'Survol interdit sauf si le texte du site l\'autorise.', 'Gestionnaire du site', '2 à 4 semaines'],
    ['🦅 Natura 2000, biotope', 'Sites protégés', 'Pas d\'interdiction générale, mais arrêtés possibles (nidification). Ne pas déranger la faune.', 'DDT(M) / gestionnaire', '—'],
    ['🔒 Prison, site sensible, ZICAD', 'Établissements pénitentiaires, sites militaires, industriels', 'Survol souvent interdit ; prise de vue interdite en ZICAD.', 'Préfecture / dérogation ZICAD en ligne', '2 à 4 semaines'],
    ['🌙 Vol de nuit', 'Entre coucher et lever du soleil', 'Dérogation préfectorale + feu vert clignotant.', 'Préfecture', '30 jours'],
    ['📏 Au-delà de 120 m', '—', 'Autorisation (Cerfa 15478) + autorisation d\'exploitation. Impossible en STS-01.', 'Préfecture / DSAC', 'Plusieurs semaines'],
    ['🛣️ Décollage sur voie publique', 'Rue, place, parc public', 'Autorisation d\'occupation du domaine public.', 'Mairie', '2 à 3 semaines'],
    ['📰 Temporaire (NOTAM, SUP AIP)', 'ZRT, ZIT, événements, exercices', 'Toujours vérifier la veille et le jour du vol.', 'SOFIA-Briefing / SIA', 'La veille']
  ];

  function page() {
    const dir = Regulation.AIPDIR();
    const ctrs = Object.entries(dir.aerodromes || {}).filter(([, a]) => a.airspaces && a.airspaces.some(s => /^CTR/.test(s)))
      .map(([icao, a]) => ({ icao, name: a.name, ctr: a.airspaces.find(s => /^CTR/.test(s)), cls: a.airspaceClass, mil: !!Regulation.MIL_CTR[icao] || a.military, email: a.bestEmail, phone: (a.atsPhones || a.phones || [])[0], drone: a.drone && a.drone[0] }))
      .sort((a, b) => a.ctr.localeCompare(b.ctr));
    UI.view().innerHTML = `<h1>📘 Guide express</h1><p class="sub">Les règles essentielles en une page. L'analyse de mission les applique automatiquement.</p>
      <div class="grid g4">
        ${[['1', '📍 Où ?', 'Dessinez la zone : la carte UAS, les CTR et les sites sensibles sont vérifiés.'], ['2', '🧭 Comment ?', 'Catégorie (A1/A2/A3, STS), hauteur, vue directe, drone et télépilote.'], ['3', '✉️ Qui prévenir ?', 'Chaque contrainte indique « Pour lever » et prépare le bon courrier.'], ['4', '📅 Quand ?', 'Respectez les délais ; NOTAM et AZBA la veille, puis la check-list.']]
          .map(([n, t, d]) => `<div class="card"><div class="stat-label">Étape ${n}</div><b>${t}</b><p class="legend" style="margin:6px 0 0">${d}</p></div>`).join('')}
      </div>
      <div class="card table-wrap"><h2>Zones et règles</h2><table class="guide-table"><thead><tr><th>Situation</th><th>C'est quoi ?</th><th>La règle</th><th>Qui contacter</th><th>Délai</th></tr></thead><tbody>
        ${RULES.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
        <p class="legend">Sources : arrêté « espace » du 3/12/2020, règlement (UE) 2019/947, Cerfa 15476*04 et notice 52053#04, AIP France. En cas de doute, l'AIP et les NOTAM font foi.</p></div>
      <div class="card"><div class="head"><h2>Les ${ctrs.length} CTR publiées dans l'AIP</h2><input id="ctrq" placeholder="Rechercher (ville, code OACI)…" style="width:240px"></div>
        <p class="legend">Issues des fiches AIP officielles (cycle du ${UI.fmtDate(dir.airac)}). En rouge : CTR militaires où la catégorie ouverte est interdite. Les petits aérodromes non contrôlés n'ont pas de CTR mais restent soumis aux hauteurs de la carte UAS.</p>
        <div class="table-wrap"><table><thead><tr><th>CTR</th><th>Aérodrome</th><th>Classe</th><th>Contact (AIP)</th><th></th></tr></thead><tbody id="ctrRows"></tbody></table></div></div>`;
    const draw = (q = '') => {
      const L = ctrs.filter(c => (c.ctr + c.name + c.icao).toLowerCase().includes(q.toLowerCase()));
      UI.$('#ctrRows').innerHTML = L.map(c => `<tr><td><span class="pill ${Regulation.MIL_CTR[c.icao] ? 'mil' : ''}">${esc(c.ctr)}</span>${Regulation.MIL_CTR[c.icao] ? ' <span class="badge bad">ouverte interdite</span>' : c.mil ? ' <span class="badge warn">militaire</span>' : ''}</td>
        <td>${esc(c.name)} <span class="legend">${esc(c.icao)}</span>${c.drone ? '<div class="legend">🚁 règle drones spécifique dans l\'AIP</div>' : ''}</td><td>${esc(c.cls || '—')}</td>
        <td class="legend">${c.phone ? '☎ ' + esc(c.phone) + '<br>' : ''}${c.email ? '✉ ' + esc(c.email) : ''}</td>
        <td><a class="btn sm" href="${Regulation.SIA.aip(c.icao)}" target="_blank" rel="noopener">Fiche AIP</a></td></tr>`).join('') || '<tr><td colspan="5" class="empty">Aucun résultat.</td></tr>';
    };
    draw(); UI.$('#ctrq').oninput = (e) => draw(e.target.value);
  }
  return { page };
})();
