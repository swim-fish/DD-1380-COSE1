// sw.js - Stale-While-Revalidate Implementation

const STATIC_CACHE_NAME = 'tccc-static-v9';

const URLS_TO_CACHE = [
  './', 
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/favicon.ico',
  'icons/apple-touch-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/core-js/3.45.1/minified.min.js',
  'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js',
  'https://cdn.jsdelivr.net/npm/cbor-x@1.6.0/dist/index.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js',
];

self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE_NAME);
      console.log('[Service Worker] Caching all: app shell');
      const requests = URLS_TO_CACHE.map(url => new Request(url, { cache: 'reload' }));
      await cache.addAll(requests);
      console.log('[Service Worker] App shell cached successfully');
    })()
  );
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(cacheName => cacheName.startsWith('tccc-static-') && cacheName !== STATIC_CACHE_NAME)
          .map(cacheName => {
            console.log(`[Service Worker] Clearing old cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
      );
    })()
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }
  
  if (event.request.url.includes('cdn.jsdelivr.net') || event.request.url.includes('cdnjs.cloudflare.com')) {
      event.respondWith(
          caches.match(event.request).then(cachedResponse => {
              return cachedResponse || fetch(event.request);
          })
      );
      return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE_NAME);
      const cachedResponse = await cache.match(event.request);

      const fetchPromise = fetch(event.request).then(networkResponse => {
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      }).catch(err => {
        console.warn(`[Service Worker] Fetch failed for ${event.request.url}; returning cached response if available.`, err);
        return new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
        });
      });

      return cachedResponse || await fetchPromise;
    })()
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.action === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.action === 'GET_VERSION') {
    event.source.postMessage({ 
        type: 'VERSION', 
        version: STATIC_CACHE_NAME, 
        action: event.data.fromUpdateCheck ? 'GET_VERSION_RESPONSE_FOR_UPDATE_CHECK' : undefined 
    });
  }
});

