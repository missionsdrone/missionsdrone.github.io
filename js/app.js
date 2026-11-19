/* Routeur, tableau de bord et démarrage */
const App = (() => {
  const { esc } = UI;

  function dashboard() {
    const P = Store.all('pilots'), D = Store.all('drones'), M = Store.all('missions'), DOC = Store.all('docs');
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = M.filter(m => m.date >= today && m.status !== 'Annulée').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
    const alerts = [];
    const chk = (d, label) => { if (!d) return; const n = UI.daysUntil(d); if (n <= 60) alerts.push({ n, label, d }); };
    P.forEach(p => { chk(p.a1a3Exp, `A1/A3 – ${Fleet.pilotName(p)}`); chk(p.a2Exp, `A2 – ${Fleet.pilotName(p)}`); chk(p.stsExp, `STS – ${Fleet.pilotName(p)}`); });
    D.forEach(d => chk(d.insuranceExp, `Assurance – ${Fleet.droneName(d)}`));
    DOC.forEach(d => chk(d.expiry, `Document – ${d.title}`));
    const maint = D.map(d => [d, Logbook.droneStats(d)]).filter(([, s]) => s.soon);
    alerts.sort((a, b) => a.n - b.n);
    const op = Store.operator();
    // Mise en route : 4 étapes pour que les courriers et le Cerfa soient complets
    const setup = [
      ['Exploitant', !!(op.company && op.managerLastName && op.city), '#/settings'],
      ['Télépilote', P.some(p => !p.demo), '#/pilots'],
      ['Drone', D.some(d => !d.demo), '#/drones'],
      ['Documents (assurance, identité…)', DOC.filter(d => d.fileId).length >= 3, '#/docs']
    ];
    const setupDone = setup.filter(s => s[1]).length;
    const verdictOf = (m) => { if (!m.analysis) return '⚪'; const c = Regulation.buildConstraints(m, { restrictions: (m.analysis.restrictions || []).map(p => ({ properties: p })), sensitive: m.analysis.sensitive || [], commune: m.analysis.commune, weather: m.analysis.weather, pilot: Store.get('pilots', m.pilotId), drone: Store.get('drones', m.droneId) }); return c.some(x => x.level === 'bad') ? '🔴' : c.some(x => x.level === 'warn') ? '🟠' : '🟢'; };

    UI.view().innerHTML = `
      <div class="hero"><h2>Prêt à préparer un vol ?</h2><p>Dessinez la zone : les contraintes, les démarches et les courriers sont prêts en quelques secondes.</p>
        <div class="row"><a class="btn" href="#/mission/new">🗺️ Nouvelle mission</a>${M.length ? '' : '<button class="btn" onclick="Onboarding.demo()">🎮 Mission de démo</button>'}<a class="btn" href="#/guide">📘 Guide express</a></div></div>
      ${Regulation.aipStale() ? `<div class="alert">⚠️ Données AIP (CTR, contacts des terrains) du cycle du ${UI.fmtDate(Regulation.aipStale().have)} : un nouveau cycle est en vigueur depuis le ${UI.fmtDate(Regulation.aipStale().current)}. Vérifiez les fiches AIP avant d'envoyer une demande.</div>` : ''}
      ${setupDone < setup.length ? `<div class="card"><h2>Mise en route ${setupDone}/${setup.length}</h2><div class="verdict warn" style="margin:0"><div style="flex:1"><div class="bar"><i style="width:${setupDone / setup.length * 100}%"></i></div>
        <div class="row">${setup.map(([l, ok, href]) => `<a class="pill" href="${href}">${ok ? '✅' : '⬜'} ${esc(l)}</a>`).join('')}</div>
        <div class="legend">Ces informations préremplissent le Cerfa préfecture et les courriers.</div></div></div></div>` : ''}
      ${(() => { let last = null; try { last = localStorage.getItem('osd-last-backup'); } catch (e) { } const old = !last || (Date.now() - new Date(last)) > 30 * 86400000; return (M.length + P.length + DOC.length) && old ? `<div class="alert info">💾 ${last ? 'Dernière sauvegarde il y a plus de 30 jours.' : 'Aucune sauvegarde pour l\'instant.'} Vos données ne sont que dans ce navigateur : <a href="#/settings">faire une sauvegarde</a>.</div>` : ''; })()}
      ${M.some(m => m.demo) ? `<div class="alert info">Des données de démonstration sont présentes. <a href="#" onclick="Onboarding.clearDemo();return false">Les supprimer</a></div>` : ''}
      <div class="grid g4">
        <a class="card" href="#/missions" style="text-decoration:none;color:inherit"><div class="stat">${M.length}</div><div class="stat-label">Missions</div></a>
        <a class="card" href="#/pilots" style="text-decoration:none;color:inherit"><div class="stat">${P.length}</div><div class="stat-label">Télépilotes</div></a>
        <a class="card" href="#/drones" style="text-decoration:none;color:inherit"><div class="stat">${D.length}</div><div class="stat-label">Drones</div></a>
        <a class="card" href="#/logbook" style="text-decoration:none;color:inherit"><div class="stat">${Logbook.hm(D.reduce((s, d) => s + Logbook.droneStats(d).logMin, 0))}</div><div class="stat-label">Temps de vol au carnet</div></a>
      </div>
      <div class="grid g2">
        <div class="card"><div class="head"><h2>Prochaines missions</h2><a class="btn sm primary" href="#/mission/new">+ Mission</a></div>
          ${upcoming.length ? `<table><tbody>${upcoming.map(m => `<tr><td style="width:24px">${verdictOf(m)}</td><td><a href="#/mission/${m.id}"><b>${esc(m.name || 'Sans nom')}</b></a><div class="legend">${esc(m.analysis && m.analysis.commune ? m.analysis.commune.nom : '')}</div></td><td>${UI.fmtDate(m.date)}</td><td><span class="badge info">${esc(m.status)}</span></td></tr>`).join('')}</tbody></table>` : '<p class="legend">Aucune mission à venir.</p>'}</div>
        <div class="card"><h2>Échéances (≤ 60 jours)</h2>
          ${alerts.length || maint.length ? `<table><tbody>${maint.map(([d, s]) => `<tr><td>Maintenance – ${esc(Fleet.droneName(d))}</td><td><span class="badge ${s.due ? 'bad' : 'warn'}">${Logbook.hm(s.sinceMaint)} / ${s.every} h</span></td></tr>`).join('')}${alerts.map(a => `<tr><td>${esc(a.label)}</td><td>${UI.expiryBadge(a.d)}</td></tr>`).join('')}</tbody></table>` : '<p class="legend">Aucune échéance proche. 👍</p>'}</div>
      </div>
      <div class="card"><h2>Accès rapides</h2><div class="row">${Regulation.LINKS.slice(0, 6).map(l => `<a class="btn sm" href="${l.url}" target="_blank" rel="noopener">${esc(l.t)}</a>`).join('')}</div></div>`;
  }

  const routes = {
    dashboard, missions: Mission.list, pilots: Fleet.pilots, drones: Fleet.drones, docs: Fleet.docs, contacts: Fleet.contacts,
    settings: Fleet.settings, logbook: Logbook.page, guide: Guide.page, about: About.page
  };

  function route() {
    const [, name = 'dashboard', arg, tab] = (location.hash || '#/dashboard').split('/');
    UI.view().onclick = null; UI.view().scrollTop = 0; window.scrollTo(0, 0);
    UI.$$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.route === (name === 'mission' ? 'missions' : name)));
    document.querySelector('.sidebar').classList.remove('open');
    try {
      if (name === 'mission') Mission.edit(arg, tab);
      else (routes[name] || dashboard)();
    } catch (e) { console.error(e); UI.view().innerHTML = `<div class="card"><h2>Oups, cette page n'a pas pu s'afficher</h2><p class="legend">${esc(e.message)}</p><a class="btn" href="#/dashboard">Retour au tableau de bord</a></div>`; }
    if (!UI.$('.foot', UI.view())) UI.view().insertAdjacentHTML('beforeend', `<div class="foot">${esc(APP.name)} ${esc(APP.version)} · aide à la préparation, ne remplace pas l'AIP ni les NOTAM · <a href="#/about">À propos, mentions légales, sources</a></div>`);
  }

  window.addEventListener('hashchange', route);
  document.getElementById('menuBtn').onclick = () => document.querySelector('.sidebar').classList.toggle('open');
  window.addEventListener('unhandledrejection', (e) => { console.error(e.reason); UI.toast('Un service n\'a pas répondu. Réessayez dans un instant.'); });
  // Demander au navigateur de ne pas effacer les données locales
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
  // Application installable et utilisable hors ligne
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
  Promise.all([Regulation.aipReady, Regulation.ctrReady, Regulation.prefReady]).finally(() => { route(); Onboarding.show(); });
  return { route };
})();
