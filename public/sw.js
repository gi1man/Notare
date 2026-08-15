// Notare Service Worker — Network-First with Offline Fallback
// Bump APP_VERSION on every deploy so Chrome detects an updated SW.
const APP_VERSION = '2.1.0';
const CACHE_NAME = `notare-${APP_VERSION}`;

// Only pre-cache the bare minimum needed for offline shell
const SHELL_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Install: pre-cache offline shell, immediately activate
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Activate: purge ALL old caches, claim all clients, notify them
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
     .then(() => {
       // Notify all open tabs that a new version is active
       return self.clients.matchAll({ type: 'window' }).then((clients) => {
         clients.forEach((client) => {
           client.postMessage({ type: 'SW_UPDATED', version: APP_VERSION });
         });
       });
     })
  );
});

// Fetch: NETWORK-FIRST for everything.
// - Online: always serve fresh from network, update cache as side-effect
// - Offline: fall back to cache (or offline shell for navigations)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests (POST, etc.)
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (CDN, analytics, Firebase APIs)
  if (!request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Cache a clone of the fresh response for offline fallback
        if (networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline: try cache, then fall back to shell for navigations
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
