/* Stockage local : entités en localStorage, fichiers en IndexedDB */
const Store = (() => {
  const KEY = window.OSD_STORE_KEY || 'osd-data-v1'; // clé distincte pour la page de tests
  const empty = { pilots: [], drones: [], docs: [], missions: [], flights: [], contacts: [], operator: {} };
  let data;
  try { data = Object.assign({}, empty, JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch (e) { data = { ...empty }; }

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { UI && UI.toast('Stockage local indisponible'); } };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const api = {
    all: (col) => data[col] || [],
    _ensure: (col) => (data[col] = data[col] || []),
    get: (col, id) => (data[col] || []).find(x => x.id === id),
    upsert(col, obj) {
      api._ensure(col);
      if (!obj.id) { obj.id = uid(); obj.createdAt = new Date().toISOString(); data[col].push(obj); }
      else { const i = data[col].findIndex(x => x.id === obj.id); i >= 0 ? data[col][i] = obj : data[col].push(obj); }
      obj.updatedAt = new Date().toISOString();
      save(); return obj;
    },
    remove(col, id) { data[col] = data[col].filter(x => x.id !== id); save(); },
    operator: () => data.operator || {},
    setOperator(o) { data.operator = o; save(); },
    exportJSON: () => JSON.stringify(data, null, 2),
    importJSON(txt) { const d = JSON.parse(txt); data = Object.assign({}, empty, d); save(); },
    /* Sauvegarde complète : données + fichiers joints (encodés en base64) */
    async exportFull() {
      const files = {};
      for (const doc of data.docs || []) {
        if (!doc.fileId) continue;
        const b = await api.getFile(doc.fileId); if (!b) continue;
        const buf = new Uint8Array(await b.arrayBuffer()); let s = '';
        for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        files[doc.fileId] = { type: b.type || doc.fileType || '', data: btoa(s) };
      }
      return JSON.stringify({ format: 'osd-backup-1', exportedAt: new Date().toISOString(), data, files });
    },
    async importFull(txt) {
      const j = JSON.parse(txt);
      if (j.format === 'osd-backup-1') {
        for (const [id, f] of Object.entries(j.files || {})) {
          const bin = atob(f.data); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
          await api.putFile(id, new Blob([u], { type: f.type }));
        }
        data = Object.assign({}, empty, j.data);
      } else data = Object.assign({}, empty, j); // ancien format (données seules)
      save();
    },
    uid
  };

  // --- IndexedDB pour les pièces jointes ---
  let dbp;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('osd-files', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  api.putFile = async (id, blob) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('files', 'readwrite'); t.objectStore('files').put(blob, id); t.oncomplete = res; t.onerror = () => rej(t.error); }); };
  api.getFile = async (id) => { const d = await db(); return new Promise((res, rej) => { const r = d.transaction('files').objectStore('files').get(id); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); };
  api.delFile = async (id) => { const d = await db(); return new Promise(res => { const t = d.transaction('files', 'readwrite'); t.objectStore('files').delete(id); t.oncomplete = res; }); };
  return api;
})();
