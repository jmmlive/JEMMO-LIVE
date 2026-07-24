const CACHE = 'jemmo-live-v1-recarga-global-02-20260724';
const APP_SHELL = [
  './','./index.html','./acceso.html','./inicio.html','./live.html','./salas.html','./mensajes.html','./yo.html',
  './app.css','./inicio.css','./jemmo.css','./app.js','./jemmo-session.js','./pwa-register.js','./jemmo-wallet.js',
  './salas-v1.css','./salas-v1.js',
  './manifest.webmanifest','./jemmo-logo-header.webp','./jemmo-fish-nav.webp',
  './icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./offline.html'
];


self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(APP_SHELL.map(path => cache.add(path).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const networkFirst = request.mode === 'navigate' || /\.(?:html|js|css|json|webmanifest)$/i.test(url.pathname);
  if (networkFirst) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      } catch {
        return await caches.match(request) || (request.mode === 'navigate' ? await caches.match('./offline.html') : Response.error());
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
      }
      return response;
    }))
  );
});
