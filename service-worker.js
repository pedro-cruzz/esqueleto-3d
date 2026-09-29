const CACHE_NAME = 'pose-lab-atlas-v30';
const CORE_ASSETS = [
  './',
  './index.html',
  './atlas.html',
  './radiologia.html',
  './src/styles/menu.css',
  './src/components/menu.js',
  './src/data/systems.js',
  './src/data/body-profiles.js',
  './src/core/register-sw.js',
  './src/core/app.js',
  './src/core/catalog-loader.js',
  './src/styles/atlas.css',
  './src/components/study.js',
  './src/components/body-context.js',
  './src/components/mobile-controls.js',
  './src/logic/study-logic.js',
  './src/logic/separation-worker.js',
  './src/logic/dissection-history.js',
  './src/components/specimen-gallery.js',
  './src/data/anatomy-catalog.js',
  './src/data/muscle-catalog.js',
  './public/manifest.json',
  './public/icon.svg',
  './public/images/skeleton-study.webp',
  './src/data/cardiovascular-catalog.js',
  './src/data/nervous-catalog.js',
  './src/data/organs-catalog.js',
  './public/draco/draco_decoder.js',
  './public/draco/draco_decoder.wasm',
  './public/draco/draco_wasm_wrapper.js',
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
      fetch(event.request, { cache: 'no-store' })
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
