const CACHE_NAME = 'es-static-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add('/index.html'))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : undefined)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin !== self.location.origin) return;

  // Skip API calls — let them go through to the dev server proxy
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip navigation in dev — causes issues with dev server proxy/HMR
  // In dev, Vite handles SPA routing directly
  if (request.mode === 'navigate') {
    return;
  }

  // Vite build assets (/assets/*.js, *.css) — stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((resp) => {
          // Only cache successful responses
          if (!resp || resp.status !== 200 || resp.type !== 'basic') {
            return resp;
          }
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone).catch(() => {
              // Silently ignore cache write errors
            });
          });
          return resp;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
