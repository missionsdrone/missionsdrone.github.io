/* Premier lancement : présentation, acceptation de l'avertissement, mission de démonstration */
const Onboarding = (() => {
  const KEY = 'osd-onboarded';
  const seen = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return true; } };
  const STEPS = [
    ['🗺️', 'Dessinez la zone de vol', 'L\'outil vérifie aussitôt la carte officielle des restrictions drones, les CTR, les aérodromes, les zones peuplées, les sites militaires et les espaces protégés.'],
    ['🚦', 'Lisez le verdict', '🟢 prêt à voler, 🟠 possible après démarches, 🔴 impossible en l\'état. Chaque contrainte dit en une phrase comment la lever.'],
    ['✉️', 'Envoyez les bons courriers', 'Cerfa préfecture prérempli, demandes aux tours de contrôle et aux bases militaires avec l\'adresse officielle quand elle est publiée.'],
    ['📒', 'Volez, puis notez le vol', 'Check-list prévol, carnet de vol, suivi des heures et de la maintenance.']
  ];

  function show(force) {
    if (!force && seen()) return;
    let i = 0;
    const render = () => {
      const last = i === STEPS.length;
      UI.$('#modalBody').innerHTML = `<div class="wizard-steps">${STEPS.concat([0]).map((_, k) => `<span class="${k <= i ? 'on' : ''}"></span>`).join('')}</div>` + (last
        ? `<h2>Avant de commencer</h2><p>${esc(APP.name)} est une <b>aide à la préparation</b> : il ne délivre aucune autorisation et ne remplace pas l'information aéronautique officielle (AIP, NOTAM) ni votre responsabilité de télépilote. Vos données restent dans ce navigateur.</p>
          <label class="check"><input type="checkbox" id="obOk"> J'ai compris</label>
          <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn" id="obDemo" disabled>🎮 Essayer avec une mission de démo</button><button class="btn primary" id="obGo" disabled>Commencer</button></div>`
        : `<div style="font-size:44px">${STEPS[i][0]}</div><h2>${STEPS[i][1]}</h2><p>${STEPS[i][2]}</p>
          <div class="row" style="margin-top:16px;justify-content:space-between"><button class="btn" id="obSkip">Passer</button><button class="btn primary" id="obNext">Suivant</button></div>`);
      if (last) {
        const ok = UI.$('#obOk');
        ok.onchange = () => { UI.$('#obDemo').disabled = UI.$('#obGo').disabled = !ok.checked; };
        const done = () => { try { localStorage.setItem(KEY, '1'); } catch (e) { } UI.closeModal(); };
        UI.$('#obGo').onclick = () => { done(); location.hash = Store.operator().company ? '#/mission/new' : '#/settings'; };
        UI.$('#obDemo').onclick = () => { done(); demo(); };
      } else {
        UI.$('#obNext').onclick = () => { i++; render(); };
        UI.$('#obSkip').onclick = () => { i = STEPS.length; render(); };
      }
    };
    UI.$('#modal').classList.remove('hidden'); render();
  }
  const esc = UI.esc;

  /* Mission de démonstration : prises de vue d'une maison à Lyon, près de l'aérodrome de Bron */
  function demo() {
    const p = Store.upsert('pilots', { demo: true, firstName: 'Camille', lastName: 'Démo', phone: '06 00 00 00 00', email: 'camille.demo@example.com', a1a3: 'DEMO-A1A3', a1a3Exp: '2030-01-01', a2: 'DEMO-A2', a2Exp: '2030-01-01' });
    const d = Store.upsert('drones', { demo: true, name: 'Drone démo', maker: 'Constructeur', model: 'Modèle C2', classMark: 'C2', mtom: 900, registration: 'UAS-FR-000000', maxWind: 38, status: 'Opérationnel' });
    const date = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
    const m = Store.upsert('missions', { demo: true, name: 'Démo – maison à Bron', client: 'Agence immobilière (démo)', purpose: 'Prises de vue d\'une maison pour une annonce', date, startTime: '10:00', endTime: '11:00',
      category: 'A2', maxHeight: 80, vlos: 'VLOS', takeoff: 'client', status: 'Brouillon', pilotId: p.id, droneId: d.id, address: 'Avenue Franklin Roosevelt 69500 Bron',
      zone: turf.circle([4.93, 45.735], 0.08, { steps: 48 }), steps: {}, checklist: {}, pieces: {} });
    UI.toast('Mission de démo créée : analyse en cours…');
    location.hash = '#/mission/' + m.id + '/zone';
  }
  function clearDemo() {
    ['missions', 'pilots', 'drones'].forEach(c => Store.all(c).filter(x => x.demo).forEach(x => Store.remove(c, x.id)));
    UI.toast('Données de démo supprimées'); App.route();
  }
  return { show, demo, clearDemo, seen };
})();
