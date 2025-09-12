// sw.js - Stale-While-Revalidate Implementation

// 更新版本號以觸發 Service Worker 的更新流程
const STATIC_CACHE_NAME = 'tccc-static-v2';

// 重要的 App Shell 檔案列表保持不變
const URLS_TO_CACHE = [
  './', // 快取根目錄，使其能對應到 index.html
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/favicon.ico',
  'icons/apple-touch-icon.png',
  // 所有外部 CDN 資源
  'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/core-js/3.45.1/minified.min.js',
  'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js',
  'https://cdn.jsdelivr.net/npm/cbor-x@1.6.0/dist/index.min.js',
    // --- START: 新增 Bootstrap CDN 資源 ---
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js',
  // --- END: 新增 Bootstrap CDN 資源 ---
];

// 'install' 事件：快取 App Shell
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE_NAME);
      console.log('[Service Worker] Caching all: app shell');
      // 使用 { cache: 'reload' } 確保我們獲取的是最新的檔案，而不是瀏覽器 HTTP 快取中的舊檔
      const requests = URLS_TO_CACHE.map(url => new Request(url, { cache: 'reload' }));
      await cache.addAll(requests);
      console.log('[Service Worker] App shell cached successfully');
    })()
  );
});

// 'activate' 事件：清理舊快取
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

/**
 * On Fetch: 實作 Stale-While-Revalidate 策略
 */
self.addEventListener('fetch', event => {
  // 只處理 GET 請求
  if (event.request.method !== 'GET') {
    return;
  }
  
  // 對於 CDN 資源，我們依然可以使用 Cache First 策略，因為它們不常變動
  if (event.request.url.startsWith('https://cdnjs.cloudflare.com/') || event.request.url.startsWith('https://cdn.jsdelivr.net/')) {
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request);
        })
    );
    return;
  }

  // 對於我們自己的 App Shell 資源 (html, css, js)，採用 Stale-While-Revalidate
  event.respondWith(
    (async () => {
      // 1. 嘗試打開快取
      const cache = await caches.open(STATIC_CACHE_NAME);
      // 2. 嘗試從快取中尋找匹配的回應
      const cachedResponse = await cache.match(event.request);

      // 3. 在背景發起網路請求
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // 如果請求成功，將新的回應放入快取中
        // 我們需要複製回應，因為 request 和 response 都是 stream，只能被使用一次
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      }).catch(err => {
        // 如果網路請求失敗，靜默處理錯誤，因為我們可能已經提供了快取版本
        console.warn(`[Service Worker] Fetch failed for ${event.request.url}; returning cached response if available.`, err);
        // 如果連快取都沒有，這裡可以回傳一個錯誤頁面，但通常 cachedResponse 會存在
        return new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
        });
      });

      // 4. 如果快取中有資料，立即回傳舊的快取版本 (Stale)
      //    同時讓背景的網路請求 (Revalidate) 繼續進行
      //    如果快取中沒有，則等待網路請求完成
      return cachedResponse || await fetchPromise;
    })()
  );
});

// 'message' 事件：處理來自頁面的指令
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
