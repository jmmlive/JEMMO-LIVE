const CACHE='jemmo-live-v1-camera-vertical-51-20260729';
const CORE=[
  './','./inicio.html','./yo.html','./live.html','./perfil-publico.html','./directos.html','./salas.html','./configuracion.html','./chili-ia.html',
  './pwa-register.js','./jemmo-live-presence.js','./jemmo-live-rtc-config.js','./jemmo-live-webrtc.js','./jemmo-wallet.js','./jemmo-official-policies.js','./jemmo-settings.js','./jemmo-chili.js','./jemmo-chili-knowledge.js',
  './configuracion.css','./chili-ia.css','./jemmo-house-finance.js','./jemmo-house-activity.js','./jemmo-host-task-rewards.js',
  './jemmo-messages-realtime.js','./jemmo-house-operations.js','./jemmo-room-realtime.js','./jemmo-house-room-ui.js',
  './jemmo-house-pet.js','./jemmo-house-pet.css','./manifest.webmanifest'
];
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.allSettled(CORE.map(url=>cache.add(new Request(url,{cache:'reload'}))));await self.skipWaiting()})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key!==CACHE&&key.startsWith('jemmo')).map(key=>caches.delete(key)));await self.clients.claim()})())});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
async function networkFirst(request){const cache=await caches.open(CACHE);try{const response=await fetch(request);if(response&&response.ok)cache.put(request,response.clone()).catch(()=>{});return response}catch(error){const cached=await cache.match(request,{ignoreSearch:true});if(cached)return cached;if(request.mode==='navigate')return(await cache.match('./inicio.html'))||(await cache.match('./'));throw error}}
async function cacheFirst(request){const cache=await caches.open(CACHE);const cached=await cache.match(request,{ignoreSearch:true});if(cached)return cached;const response=await fetch(request);if(response&&response.ok)cache.put(request,response.clone()).catch(()=>{});return response}
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;if(request.mode==='navigate'||['script','style','worker'].includes(request.destination)||/\.(?:html|js|css|webmanifest)$/i.test(url.pathname)){event.respondWith(networkFirst(request));return}if(['image','font'].includes(request.destination)||/\.(?:png|jpg|jpeg|webp|svg|gif|woff2?)$/i.test(url.pathname)){event.respondWith(cacheFirst(request))}});
