/* Carnet de vol : vols, heures par télépilote et par drone, alertes maintenance */
const Logbook = (() => {
  const { esc } = UI;

  const minutesOf = (f) => {
    if (f.takeoff && f.landing) { const [a, b] = [f.takeoff, f.landing].map(t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; }); return Math.max(0, b >= a ? b - a : b + 1440 - a); }
    return Number(f.minutes) || 0;
  };
  const hm = (min) => `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')}`;
  const flights = () => Store.all('flights').slice().sort((a, b) => (b.date + (b.takeoff || '')).localeCompare(a.date + (a.takeoff || '')));
  const daysAgo = (d) => (new Date() - new Date(d)) / 86400000;

  /* ---------- Statistiques ---------- */
  function pilotStats(pid) {
    const F = flights().filter(f => f.pilotId === pid);
    const min = F.reduce((s, f) => s + minutesOf(f), 0);
    const recent = F.filter(f => daysAgo(f.date) <= 90);
    const byCat = {}; F.forEach(f => { const c = f.category || '—'; byCat[c] = (byCat[c] || 0) + minutesOf(f); });
    return { count: F.reduce((s, f) => s + (Number(f.sorties) || 1), 0), min, last: F[0] && F[0].date, recentCount: recent.length, recentMin: recent.reduce((s, f) => s + minutesOf(f), 0), byCat };
  }
  function droneStats(d) {
    const F = flights().filter(f => f.droneId === d.id);
    const logMin = F.reduce((s, f) => s + minutesOf(f), 0);
    const totalMin = logMin + (Number(d.flightHours) || 0) * 60;
    const sinceMaint = F.filter(f => !d.lastMaintenance || f.date >= d.lastMaintenance).reduce((s, f) => s + minutesOf(f), 0);
    const every = Number(d.maintenanceEvery) || 0;
    return { count: F.reduce((s, f) => s + (Number(f.sorties) || 1), 0), logMin, totalMin, sinceMaint, every, due: every > 0 && sinceMaint / 60 >= every, soon: every > 0 && sinceMaint / 60 >= every * 0.85, last: F[0] && F[0].date, incidents: F.filter(f => f.incident && f.incident !== 'Aucun').length };
  }

  /* ---------- Formulaire ---------- */
  function fields() {
    return [
      { k: 'date', l: 'Date', type: 'date', def: new Date().toISOString().slice(0, 10) },
      { k: 'missionId', l: 'Mission', type: 'select', opts: [['', '— aucune —'], ...Store.all('missions').slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(m => [m.id, `${m.name || 'Sans nom'} (${UI.fmtDate(m.date)})`])] },
      { k: 'pilotId', l: 'Télépilote', type: 'select', opts: [['', '— choisir —'], ...Store.all('pilots').map(p => [p.id, Fleet.pilotName(p)])] },
      { k: 'droneId', l: 'Drone', type: 'select', opts: [['', '— choisir —'], ...Store.all('drones').map(d => [d.id, Fleet.droneName(d)])] },
      { k: 'takeoff', l: 'Heure de décollage (1er vol)', type: 'time' }, { k: 'landing', l: 'Heure d\'atterrissage (dernier vol)', type: 'time' },
      { k: 'minutes', l: 'Ou durée totale en vol (min)', type: 'number' }, { k: 'sorties', l: 'Nombre de vols (batteries)', type: 'number', def: 1 },
      { k: 'place', l: 'Lieu' }, { k: 'category', l: 'Catégorie / scénario', type: 'select', opts: [['', '—'], ...Regulation.CATEGORIES] },
      { k: 'maxHeight', l: 'Hauteur max. atteinte (m)', type: 'number' }, { k: 'batteries', l: 'Batteries utilisées (n°)' },
      { k: 'incident', l: 'Événement', type: 'select', opts: ['Aucun', 'Anomalie technique', 'Incident', 'Incident grave', 'Accident'] },
      { k: 'notes', l: 'Observations', type: 'textarea' }
    ];
  }

  function open(f = {}) {
    const F = fields();
    UI.modal(`<h2>${f.id ? 'Modifier le vol' : '✈️ Ajouter au carnet de vol'}</h2><form id="lf"><div class="fields">${UI.formFields(F, f)}</div>
      <div id="lfInfo" class="legend" style="margin-top:10px"></div>
      <div class="row" style="margin-top:16px;justify-content:flex-end"><button type="button" class="btn" onclick="UI.closeModal()">Annuler</button><button class="btn primary">Enregistrer</button></div></form>`, (root) => {
      const form = UI.$('#lf', root);
      const info = () => {
        const o = UI.readForm(form, F); const min = minutesOf(o);
        const inc = o.incident && o.incident !== 'Aucun' && o.incident !== 'Anomalie technique';
        UI.$('#lfInfo', root).innerHTML = `Durée retenue : <b>${hm(min)}</b>` + (inc ? `<div class="alert" style="margin-top:8px">${o.incident === 'Incident' ? 'Les incidents sont à signaler' : 'Signalement obligatoire'} dans les 72 h (règlement (UE) 376/2014) via le <a href="https://aviationreporting.eu/" target="_blank" rel="noopener">portail européen de notification d'événements</a>${/grave|Accident/.test(o.incident) ? ' ; accident ou incident grave : informez aussi le BEA sans délai' : ''}.</div>` : '');
      };
      form.oninput = form.onchange = (e) => {
        if (e && e.target.name === 'missionId' && e.target.value) { // préremplissage depuis la mission
          const m = Store.get('missions', e.target.value);
          [['pilotId', m.pilotId], ['droneId', m.droneId], ['category', m.category], ['date', m.date], ['takeoff', m.startTime], ['landing', m.endTime], ['place', m.analysis && m.analysis.commune ? m.analysis.commune.nom : m.address]].forEach(([k, v]) => { if (v && form.elements[k]) form.elements[k].value = v; });
        }
        info();
      };
      info();
      form.onsubmit = (e) => {
        e.preventDefault();
        const o = Object.assign({}, f, UI.readForm(form, F));
        if (!o.pilotId || !o.droneId) return UI.toast('Choisissez le télépilote et le drone');
        if (!minutesOf(o)) return UI.toast('Indiquez les heures ou la durée');
        Store.upsert('flights', o);
        if (o.missionId) { const m = Store.get('missions', o.missionId); if (m && m.status !== 'Réalisée') { m.status = 'Réalisée'; Store.upsert('missions', m); } }
        const d = Store.get('drones', o.droneId), s = d && droneStats(d);
        UI.closeModal(); UI.toast(s && s.due ? `Vol enregistré – ⚠ maintenance due pour ${Fleet.droneName(d)}` : 'Vol enregistré');
        App.route();
      };
    });
  }

  /* ---------- Page ---------- */
  function page() {
    const P = Store.all('pilots'), D = Store.all('drones');
    const all = flights();
    const totalMin = all.reduce((s, f) => s + minutesOf(f), 0);
    UI.view().innerHTML = `<div class="head"><div><h1>Carnet de vol</h1><p class="sub">Vols réalisés, heures par télépilote et par drone, suivi de maintenance.</p></div>
      <div class="row"><button class="btn" id="csv">⬇ Export CSV</button><button class="btn primary" id="add">+ Ajouter un vol</button></div></div>
      <div class="grid g4">
        <div class="card"><div class="stat">${all.reduce((s, f) => s + (Number(f.sorties) || 1), 0)}</div><div class="stat-label">Vols</div></div>
        <div class="card"><div class="stat">${hm(totalMin)}</div><div class="stat-label">Temps de vol total</div></div>
        <div class="card"><div class="stat">${all.filter(f => daysAgo(f.date) <= 90).length}</div><div class="stat-label">Sessions sur 90 jours</div></div>
        <div class="card"><div class="stat">${all.filter(f => f.incident && f.incident !== 'Aucun').length}</div><div class="stat-label">Événements signalés</div></div>
      </div>
      <div class="tabs" id="lt"><button data-t="vols" class="active">Vols</button><button data-t="pil">Par télépilote</button><button data-t="dro">Par drone</button></div>
      <section data-p="vols"><div class="card">
        <div class="row" style="margin-bottom:10px"><select id="fp" style="width:auto"><option value="">Tous les télépilotes</option>${P.map(p => `<option value="${p.id}">${esc(Fleet.pilotName(p))}</option>`).join('')}</select>
        <select id="fd" style="width:auto"><option value="">Tous les drones</option>${D.map(d => `<option value="${d.id}">${esc(Fleet.droneName(d))}</option>`).join('')}</select>
        <input type="date" id="f1" style="width:auto" title="Du"><input type="date" id="f2" style="width:auto" title="Au"></div>
        <div class="table-wrap"><table><thead><tr><th>Date</th><th>Télépilote</th><th>Drone</th><th>Mission / lieu</th><th>Cat.</th><th>Vols</th><th>Durée</th><th>Événement</th><th></th></tr></thead><tbody id="lrows"></tbody></table></div></div></section>
      <section data-p="pil" hidden><div class="card table-wrap"><table><thead><tr><th>Télépilote</th><th>Vols</th><th>Temps total</th><th>90 derniers jours</th><th>Dernier vol</th><th>Répartition par catégorie</th></tr></thead><tbody>
        ${P.map(p => { const s = pilotStats(p.id); return `<tr><td><b>${esc(Fleet.pilotName(p))}</b></td><td>${s.count}</td><td>${hm(s.min)}</td><td>${s.recentCount} session(s) – ${hm(s.recentMin)}</td><td>${s.last ? UI.fmtDate(s.last) + (daysAgo(s.last) > 90 ? ' <span class="badge warn">> 90 j</span>' : '') : '—'}</td><td class="legend">${Object.entries(s.byCat).map(([c, mn]) => `${esc(c)} : ${hm(mn)}`).join('<br>') || '—'}</td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">Aucun télépilote.</td></tr>'}
      </tbody></table><p class="legend">Le maintien de compétence n'est pas chiffré par la réglementation en catégorie ouverte, mais un entraînement régulier est recommandé et souvent exigé par le MANEX en catégorie spécifique.</p></div></section>
      <section data-p="dro" hidden><div class="card table-wrap"><table><thead><tr><th>Drone</th><th>Vols</th><th>Heures (carnet)</th><th>Heures totales</th><th>Depuis maintenance</th><th>Dernier vol</th><th>Événements</th></tr></thead><tbody>
        ${D.map(d => { const s = droneStats(d); return `<tr><td><b>${esc(Fleet.droneName(d))}</b><div class="legend">${d.lastMaintenance ? 'Maintenance le ' + UI.fmtDate(d.lastMaintenance) : 'Maintenance non renseignée'}</div></td><td>${s.count}</td><td>${hm(s.logMin)}</td><td>${hm(s.totalMin)}</td>
          <td>${hm(s.sinceMaint)}${s.every ? ` / ${s.every} h ${s.due ? '<span class="badge bad">maintenance due</span>' : s.soon ? '<span class="badge warn">bientôt</span>' : '<span class="badge ok">OK</span>'}` : ' <span class="legend">(intervalle non défini)</span>'}</td>
          <td>${s.last ? UI.fmtDate(s.last) : '—'}</td><td>${s.incidents || '—'}</td></tr>`; }).join('') || '<tr><td colspan="7" class="empty">Aucun drone.</td></tr>'}
      </tbody></table><p class="legend">Renseignez dans la fiche du drone la date de dernière maintenance et l'intervalle (en heures) pour être alerté.</p></div></section>`;

    UI.$('#lt').onclick = (e) => { const t = e.target.dataset.t; if (!t) return; UI.$$('#lt button').forEach(b => b.classList.toggle('active', b.dataset.t === t)); UI.$$('section[data-p]').forEach(s => s.hidden = s.dataset.p !== t); };
    const filtered = () => all.filter(f => (!UI.$('#fp').value || f.pilotId === UI.$('#fp').value) && (!UI.$('#fd').value || f.droneId === UI.$('#fd').value) && (!UI.$('#f1').value || f.date >= UI.$('#f1').value) && (!UI.$('#f2').value || f.date <= UI.$('#f2').value));
    const draw = () => {
      const L = filtered();
      UI.$('#lrows').innerHTML = L.length ? L.map(f => { const m = Store.get('missions', f.missionId); return `<tr><td>${UI.fmtDate(f.date)}<div class="legend">${esc(f.takeoff || '')}${f.landing ? '–' + esc(f.landing) : ''}</div></td>
        <td>${esc(Fleet.pilotName(Store.get('pilots', f.pilotId)))}</td><td>${esc(Fleet.droneName(Store.get('drones', f.droneId)))}</td>
        <td>${m ? `<a href="#/mission/${m.id}">${esc(m.name || 'Mission')}</a><br>` : ''}<span class="legend">${esc(f.place || '')}</span></td><td>${esc(f.category || '—')}</td><td>${Number(f.sorties) || 1}</td><td>${hm(minutesOf(f))}</td>
        <td>${f.incident && f.incident !== 'Aucun' ? `<span class="badge ${/grave|Accident/.test(f.incident) ? 'bad' : 'warn'}">${esc(f.incident)}</span>` : '—'}</td>
        <td class="row" style="justify-content:flex-end"><button class="btn sm" data-e="${f.id}">Modifier</button><button class="btn sm danger" data-d="${f.id}">Suppr.</button></td></tr>`; }).join('')
        : '<tr><td colspan="9" class="empty">Aucun vol enregistré.</td></tr>';
    };
    draw(); ['#fp', '#fd', '#f1', '#f2'].forEach(s => UI.$(s).onchange = draw);
    UI.$('#lrows').onclick = (e) => { const { e: ed, d } = e.target.dataset; if (ed) open(Store.get('flights', ed)); if (d && confirm('Supprimer ce vol du carnet ?')) { Store.remove('flights', d); page(); } };
    UI.$('#add').onclick = () => open();
    UI.$('#csv').onclick = () => {
      const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const rows = [['Date', 'Décollage', 'Atterrissage', 'Durée (min)', 'Vols', 'Télépilote', 'Drone', 'N° enregistrement', 'Mission', 'Lieu', 'Catégorie', 'Hauteur max (m)', 'Batteries', 'Événement', 'Observations']]
        .concat(filtered().map(f => { const d = Store.get('drones', f.droneId) || {}; const m = Store.get('missions', f.missionId) || {}; return [f.date, f.takeoff, f.landing, minutesOf(f), Number(f.sorties) || 1, Fleet.pilotName(Store.get('pilots', f.pilotId)), Fleet.droneName(d), d.registration, m.name, f.place, f.category, f.maxHeight, f.batteries, f.incident, f.notes]; }));
      UI.download(`carnet-de-vol-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + rows.map(r => r.map(q).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
    };
  }

  return { page, open, pilotStats, droneStats, hm };
})();
