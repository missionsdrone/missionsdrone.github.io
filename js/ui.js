/* Petits utilitaires d'interface */
const UI = {
  esc: (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  $: (sel, root = document) => root.querySelector(sel),
  $$: (sel, root = document) => [...root.querySelectorAll(sel)],
  view: () => document.getElementById('view'),
  toast(msg) {
    const t = document.getElementById('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(UI._t); UI._t = setTimeout(() => t.classList.add('hidden'), 2600);
  },
  modal(html, onReady) {
    UI.$('#modalBody').innerHTML = html; UI.$('#modal').classList.remove('hidden');
    onReady && onReady(UI.$('#modalBody'));
  },
  closeModal() { UI.$('#modal').classList.add('hidden'); UI.$('#modalBody').innerHTML = ''; },
  fmtDate: (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—',
  daysUntil: (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null,
  expiryBadge(d) {
    if (!d) return '<span class="badge">non renseigné</span>';
    const n = UI.daysUntil(d);
    if (n < 0) return `<span class="badge bad">expiré le ${UI.fmtDate(d)}</span>`;
    if (n <= 60) return `<span class="badge warn">expire dans ${n} j</span>`;
    return `<span class="badge ok">valide → ${UI.fmtDate(d)}</span>`;
  },
  /* Formulaire générique à partir d'une description de champs */
  formFields(fields, obj = {}) {
    return fields.map(f => {
      if (f.type === 'section') return `<div class="full form-section">${f.l}${f.hint ? `<span class="legend"> — ${f.hint}</span>` : ''}</div>`;
      const v = obj[f.k] ?? f.def ?? '';
      const cls = (f.full ? 'full' : '') + (f.showIf ? ' cond' : '');
      const hint = f.hint ? `<span class="hint">${f.hint}</span>` : '';
      if (f.type === 'select') return `<label class="${cls}" data-k="${f.k}">${f.l}${hint}<select name="${f.k}">${f.opts.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${UI.esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${UI.esc(lab)}</option>`; }).join('')}</select></label>`;
      if (f.type === 'textarea') return `<label class="${cls || 'full'}" data-k="${f.k}">${f.l}${hint}<textarea name="${f.k}">${UI.esc(v)}</textarea></label>`;
      if (f.type === 'checkbox') return `<label class="check ${cls}" data-k="${f.k}"><input type="checkbox" name="${f.k}" ${v ? 'checked' : ''}> ${f.l}${hint}</label>`;
      return `<label class="${cls}" data-k="${f.k}">${f.l}${hint}<input type="${f.type || 'text'}" name="${f.k}" value="${UI.esc(v)}" ${f.ph ? `placeholder="${UI.esc(f.ph)}"` : ''} ${f.step ? `step="${f.step}"` : ''}></label>`;
    }).join('');
  },
  /* Affiche / masque les champs conditionnels (showIf: (valeurs) => bool) */
  bindConditional(form, fields) {
    const apply = () => { const v = UI.readForm(form, fields); fields.filter(f => f.showIf).forEach(f => { const el = form.querySelector(`[data-k="${f.k}"]`); if (el) el.style.display = f.showIf(v) ? '' : 'none'; }); };
    form.addEventListener('change', apply); form.addEventListener('input', apply); apply();
  },
  readForm(form, fields) {
    const o = {};
    fields.forEach(f => {
      const el = form.elements[f.k]; if (!el) return;
      o[f.k] = f.type === 'checkbox' ? el.checked : (f.type === 'number' && el.value !== '' ? Number(el.value) : el.value.trim());
    });
    return o;
  },
  copy(text) { navigator.clipboard.writeText(text).then(() => UI.toast('Copié dans le presse-papiers'), () => UI.toast('Copie impossible')); },
  download(name, content, type = 'application/json') {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
};
document.addEventListener('click', (e) => { if (e.target.id === 'modalClose' || e.target.id === 'modal') UI.closeModal(); });
