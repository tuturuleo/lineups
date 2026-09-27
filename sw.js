/* Service Worker Lineup: офлайн-просмотр. Версия и список файлов подставляются при сборке. */
const VERSION = '1a5b804a95';
const PRECACHE = ["./","./assets/inter-cyrillic-wght-normal-DqGufNeO.woff2","./assets/inter-vietnamese-wght-normal-CBcvBZtf.woff2","./assets/inter-greek-wght-normal-CkhJZR-_.woff2","./assets/inter-cyrillic-ext-wght-normal-BOeWTOD4.woff2","./assets/inter-greek-ext-wght-normal-DlzME5K_.woff2","./assets/inter-latin-wght-normal-Dx4kXJAl.woff2","./assets/inter-latin-ext-wght-normal-DO1Apj_S.woff2","./assets/index-BiGyPvqB.css","./assets/index-DZJXwCeR.js","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];
const SHELL = `lineup-shell-${VERSION}`;
const DATA = 'lineup-data';
const IMAGES = 'lineup-images';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      await cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith('lineup-shell-') && key !== SHELL) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

/** Сеть, при ошибке — кэш. Ответ из кэша помечается заголовком x-lineup-cache. */
async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request, { cache: 'no-cache' });
    if (res.ok) await cache.put(fallbackUrl ?? request, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(fallbackUrl ?? request);
    if (!cached) throw e;
    const headers = new Headers(cached.headers);
    headers.set('x-lineup-cache', '1');
    return new Response(await cached.blob(), { status: 200, headers });
  }
}

/** Кэш, при промахе — сеть (для неизменяемых файлов: изображения по хэшу, assets с хэшем). */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) await cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;

  if (p.endsWith('/data/db.json')) return event.respondWith(networkFirst(req, DATA));
  if (p.includes('/data/images/')) return event.respondWith(cacheFirst(req, IMAGES));
  if (req.mode === 'navigate') {
    return event.respondWith(networkFirst(req, SHELL, new URL('./', self.registration.scope).href));
  }
  if (p.includes('/assets/')) return event.respondWith(cacheFirst(req, SHELL));
  event.respondWith(
    caches.open(SHELL).then(async (cache) => (await cache.match(req)) ?? fetch(req)),
  );
});
