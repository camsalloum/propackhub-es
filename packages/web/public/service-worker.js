const CACHE_NAME = 'es-static-v3';

function isSkippableRequest(url, request) {
  if (url.pathname.startsWith('/api/')) return true;
  if (request.mode === 'navigate') return true;
  // Vite dev / source maps — never cache in SW (prod builds use /assets/)
  if (url.pathname.startsWith('/@')) return true;
  if (url.pathname.startsWith('/src/')) return true;
  if (url.pathname.includes('node_modules')) return true;
  return false;
}

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
  if (isSkippableRequest(url, request)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone).catch(() => {});
            });
          }
          return resp;
        })
        .catch(() => cached);

      if (cached) {
        void networkFetch.catch(() => {});
        return cached;
      }

      return networkFetch.then((resp) => {
        if (resp) return resp;
        return new Response('Network unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      });
    })
  );
});
