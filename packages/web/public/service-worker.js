const CACHE_NAME = 'es-static-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => {
      if (k !== CACHE_NAME) return caches.delete(k);
    })))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  // Only handle http/https requests — skip chrome-extension, etc.
  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((resp) => {
      if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
      const responseClone = resp.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
      return resp;
    })).catch(() => caches.match('/index.html'))
  );
});
