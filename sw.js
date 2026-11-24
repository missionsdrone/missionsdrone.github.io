/* Service worker : l'application s'ouvre même sans réseau (sur le terrain).
   Stratégie : réseau d'abord, cache en secours (hors connexion). Services externes : jamais mis en cache ici. */
const VERSION = 'osd-1.0.14';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'css/style.css', 'icons/icon.svg', 'icons/icon-192.png',
  'lib/leaflet/leaflet.js', 'lib/leaflet/leaflet.css', 'lib/geoman/leaflet-geoman.js', 'lib/geoman/leaflet-geoman.css', 'lib/turf.min.js', 'lib/pdf-lib.min.js', 'lib/pdfjs/pdf.min.js', 'lib/pdfjs/pdf.worker.min.js',
  'js/config.js', 'js/store.js', 'js/ui.js', 'js/fleet.js', 'js/regulation.js', 'js/documents.js', 'js/cerfa.js', 'js/mission.js', 'js/logbook.js', 'js/guide.js', 'js/about.js', 'js/onboarding.js', 'js/app.js',
  'data/aip-aerodromes.json', 'data/aip-ctr.geojson', 'data/prefectures-drones.json', 'assets/cerfa_15476-04.pdf'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Réseau d'abord (toujours la dernière version en ligne), cache seulement hors connexion
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
});
