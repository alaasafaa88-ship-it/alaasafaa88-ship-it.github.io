/* عامل الخدمة — يتيح تشغيل عمران بدون إنترنت بعد أول زيارة */
const CACHE = 'omran-v1';
const FILES = ['./', 'index.html', 'css/tokens.css', 'css/style.css', 'landing.html', 'privacy.html', 'assets/landing-shot.png', 'js/catalog.js', 'js/materials.js', 'js/state.js', 'js/editor2d.js', 'js/view3d.js', 'js/ai.js', 'js/templates.js', 'js/app.js', 'vendor/three.min.js', 'vendor/OrbitControls.js', 'assets/icon.svg', 'assets/icon-192.png', 'assets/icon-512.png', 'manifest.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => { if (res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return res; }).catch(() => hit)));
});
