const CACHE_NAME = 'esqueleto-3d-v22';
const CORE_ASSETS = [
  './',
  './index.html',
  './atlas.html',
  './menu.css',
  './menu.js',
  './systems.js',
  './register-sw.js',
  './app.js',
  './styles.css',
  './study.js',
  './study-logic.js',
  './specimen-gallery.js',
  './anatomy-catalog.js',
  './manifest.json',
  './icon.svg',
  './esqueleto-anatomico.glb',
  './draco/draco_decoder.js',
  './draco/draco_decoder.wasm',
  './draco/draco_wasm_wrapper.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key))))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const shouldRefresh =
    event.request.mode === 'navigate' ||
    (url.origin === self.location.origin && /\.(?:html|js|json|css)$/.test(url.pathname));

  if (shouldRefresh) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            const page = url.pathname.endsWith('/atlas.html') ? './atlas.html' : './index.html';
            return (await caches.match(page)) || Response.error();
          }
          return Response.error();
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }))
  );
});
