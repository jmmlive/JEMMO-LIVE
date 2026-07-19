const CACHE = 'jemmo-live-v0.6.13-20260720';
const APP_SHELL = [
  './','./index.html','./acceso.html','./inicio.html','./live.html','./salas.html','./mensajes.html','./yo.html',
  './app.css','./inicio.css','./jemmo.css','./app.js','./jemmo-session.js','./pwa-register.js',
  './manifest.webmanifest','./jemmo-logo-header.webp','./jemmo-fish-nav.webp',
  './icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./offline.html'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('./offline.html'))));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) { const copy=response.clone(); caches.open(CACHE).then(cache => cache.put(request,copy)); }
    return response;
  })));
});
