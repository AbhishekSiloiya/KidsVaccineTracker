// Service Worker for PWA functionality (network-first for app assets)

const CACHE_NAME = 'vaccination-tracker-v4';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/responsive.css',
  '/js/app.js',
  '/js/storage.js',
  '/js/validation.js'
];

// Install event - pre-cache core assets and take control immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate event - clean old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
          return undefined;
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch event -
// - Ignore cross-origin requests (e.g., Google Fonts) to avoid errors
// - Network-first for same-origin HTML/CSS/JS; fall back to cache when offline
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle same-origin GET requests
  let isSameOrigin = false;
  try {
    isSameOrigin = new URL(req.url).origin === self.location.origin;
  } catch (_) {
    // In rare cases (opaque requests), skip SW handling
    isSameOrigin = false;
  }
  if (req.method !== 'GET' || !isSameOrigin) {
    return; // Let the browser handle it
  }

  const acceptHeader = req.headers.get('accept') || '';
  const isDocument = acceptHeader.includes('text/html');
  const isStyle = req.destination === 'style' || req.url.endsWith('.css');
  const isScript = req.destination === 'script' || req.url.endsWith('.js');

  if (isDocument || isStyle || isScript) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return networkRes;
        })
        .catch(() => caches.match(req))
    );
  } else {
    // Cache-first for other same-origin assets (e.g., images)
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      }))
    );
  }
});