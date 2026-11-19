/* À propos : avertissement, mentions légales, sources et licences, confidentialité */
const About = (() => {
  const { esc } = UI;
  const SOURCES = [
    ['Zones de restriction UAS', 'DGAC, diffusées par l\'IGN (Géoplateforme)', 'Licence Ouverte Etalab 2.0'],
    ['CTR/ATZ, contacts des aérodromes, liens AIP', 'SIA – eAIP France (fiches AD 2)', 'Licence open data du SIA (réutilisation libre avec mention de la source)'],
    ['Aérodromes, sites militaires, établissements pénitentiaires, espaces protégés, forces de l\'ordre, lignes, voies ferrées', 'IGN – BD TOPO®', 'Licence Ouverte Etalab 2.0'],
    ['Natura 2000, parcs, réserves, biotopes', 'PatriNat (OFB / MNHN / CNRS / IRD) via l\'IGN', 'Licence Ouverte Etalab 2.0'],
    ['Fonds de carte, photos aériennes, géocodage', 'IGN – Géoplateforme', 'Licence Ouverte Etalab 2.0'],
    ['Fond OpenStreetMap', '© contributeurs OpenStreetMap', 'ODbL'],
    ['Préfectures, mairies, polices municipales', 'Annuaire de l\'administration – DILA (service-public.fr)', 'Licence Ouverte Etalab 2.0'],
    ['Communes (secours)', 'geo.api.gouv.fr', 'Licence Ouverte Etalab 2.0'],
    ['Météo, lever et coucher du soleil', 'Open-Meteo.com', 'CC BY 4.0'],
    ['Espaces aériens (option)', 'openAIP', 'CC BY-NC 4.0 – usage non commercial ; clé personnelle de l\'utilisateur'],
    ['Formulaire Cerfa 15476*04 et notice 52053#04', 'Ministère chargé des transports', 'Document administratif public']
  ];

  function page() {
    const P = APP.publisher, missing = !P.name || !P.email || !P.host || (P.status !== 'particulier' && (!P.address || !P.siret));
    const airac = Regulation.AIPDIR().airac;
    UI.view().innerHTML = `<div class="prose"><h1>À propos de ${esc(APP.name)}</h1><p class="sub">Version ${esc(APP.version)}${airac ? ` · données AIP du cycle du ${UI.fmtDate(airac)}` : ''}</p>
      <div class="alert"><b>Avertissement.</b> ${esc(APP.name)} est une aide à la préparation des vols. Il ne délivre aucune autorisation et ne remplace ni la réglementation, ni la consultation de l'information aéronautique officielle (AIP, NOTAM, SUP AIP, cartes VAC), ni le jugement du télépilote et de l'exploitant, qui restent seuls responsables du vol. Les données proviennent de sources publiques qui peuvent comporter des erreurs ou des retards de mise à jour. Vérifiez toujours avant d'envoyer une demande ou de voler.</div>

      <h2>Ce que fait l'outil</h2>
      <ul><li>Détecte les zones de restriction UAS, CTR, abords d'aérodromes, zones peuplées, sites sensibles et espaces protégés à partir des données officielles.</li>
      <li>Indique pour chaque contrainte comment la lever et prépare le courrier au bon organisme.</li>
      <li>Préremplit le Cerfa 15476*04 et le mail à la préfecture, avec les pièces justificatives.</li>
      <li>Gère télépilotes, drones, documents, contacts et carnet de vol.</li></ul>
      <h2>Ce qu'il ne fait pas</h2>
      <ul><li>Il ne lit pas les NOTAM ni les SUP AIP (pas de source publique ouverte) : des liens directs sont fournis.</li>
      <li>Il ne connaît pas la liste des ZICAD (non publiée) ni les arrêtés préfectoraux temporaires.</li>
      <li>Il n'envoie aucun courrier lui-même : vous gardez la main sur chaque envoi.</li></ul>

      <h2>Mentions légales</h2>
      ${missing ? '<div class="alert">⚠️ À compléter par l\'éditeur avant publication (fichier <code>js/config.js</code>).</div>' : ''}
      <p><b>Éditeur :</b> ${esc(P.name || '[raison sociale]')}${P.status === 'particulier' ? ', particulier (éditeur non professionnel)' : ''}${P.siret ? ' – SIRET ' + esc(P.siret) : ''}<br>${P.address ? esc(P.address) : P.status === 'particulier' ? 'Coordonnées postales communiquées à l\'hébergeur (art. 6 III-2 de la loi n° 2004-575 du 21 juin 2004)' : '[adresse]'}<br>Contact : ${P.email ? `<a href="mailto:${esc(P.email)}">${esc(P.email)}</a>` : '[e-mail]'}<br>
      <b>Directeur de la publication :</b> ${esc(P.director || '[nom]')}<br><b>Hébergeur :</b> ${esc(P.host || '[nom, adresse et téléphone de l\'hébergeur]')}</p>
      <p>${esc(APP.name)} est un outil indépendant. Il n'est ni affilié ni approuvé par la DGAC, la DSNA, le SIA, l'IGN, les préfectures ou les armées.</p>

      <h2>Confidentialité</h2>
      <ul><li><b>Aucun compte, aucun cookie, aucune mesure d'audience.</b> Vos données (exploitant, télépilotes, drones, documents, missions, carnet) sont enregistrées uniquement dans votre navigateur. L'éditeur n'y a pas accès.</li>
      <li>Pour analyser une zone, le navigateur interroge directement des services publics : IGN (cartes, zones, BD TOPO, géocodage), Annuaire de l'administration, geo.api.gouv.fr, Open-Meteo et, si vous l'activez, openAIP. Seules les coordonnées de la zone, la commune et la date leur sont transmises, jamais vos données personnelles.</li>
      <li>Les courriers s'ouvrent dans votre propre messagerie ; rien ne transite par ce site.</li>
      <li>Pensez à faire des sauvegardes (menu Exploitant) : vider les données du navigateur efface tout.</li></ul>

      <h2>Sources des données et licences</h2>
      <div class="table-wrap"><table><thead><tr><th>Donnée</th><th>Source</th><th>Licence</th></tr></thead><tbody>
      ${SOURCES.map(s => `<tr>${s.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="legend">Bibliothèques : Leaflet (BSD-2), Leaflet-Geoman Free (MIT), Turf.js (MIT), pdf-lib (MIT) — voir <a href="lib/LICENSES.txt" target="_blank">lib/LICENSES.txt</a>.</p>
      <p class="row"><button class="btn" onclick="Onboarding.show(true)">Revoir la présentation</button></p></div>`;
  }
  return { page };
})();
