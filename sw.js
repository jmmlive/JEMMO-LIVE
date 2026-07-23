const CACHE = 'jemmo-live-v1-correccion-global-02-20260723';
const APP_SHELL = [
  './','./index.html','./acceso.html','./inicio.html','./live.html','./salas.html','./mensajes.html','./yo.html','./offline.html',
  './acceso.css','./app.css','./inicio.css','./jemmo.css','./live.css',
  './app.js','./live.js','./jemmo-session.js','./pwa-register.js','./jemmo-wallet.js',
  './manifest.webmanifest','./jemmo-logo-header.webp','./jemmo-logo-header-wide.webp','./jemmo-fish-nav.webp',
  './icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('jemmo-live-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch {
    return (await cache.match(request, { ignoreSearch: true })) || (await cache.match('./offline.html'));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: false });
  const refresh = fetch(request).then(response => {
    if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  }).catch(() => null);
  return cached || (await refresh) || Response.error();
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') event.respondWith(networkFirst(request));
  else event.respondWith(staleWhileRevalidate(request));
});
