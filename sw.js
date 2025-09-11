// sw.js - A new implementation based on "The Offline Cookbook"

// 'tccc-static' 用於存放 App Shell - 那些構成應用程式核心、不常變動的檔案。
const STATIC_CACHE_NAME = 'tccc-static-v1';

// App Shell 檔案列表
// 這些是在 Service Worker 安裝時必須快取的核心資源。
// 如果其中任何一個檔案快取失敗，整個安裝過程都會失敗。
const URLS_TO_CACHE = [
  'index.html', // 明確地快取主檔案
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
  'https://cdn.jsdelivr.net/npm/cbor-x@1.6.0/dist/index.min.js'
];

/**
 * On Install: 作為依賴項快取 App Shell
 * 這是 Service Worker 生命週期的第一步。
 * 我們會快取所有核心靜態資源。
 * event.waitUntil 會確保 Service Worker 在快取操作完成前不會被安裝。
 */
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    (async () => {
      // 1. 打開我們定義的靜態快取
      const cache = await caches.open(STATIC_CACHE_NAME);
      console.log('[Service Worker] Caching all: app shell and content');
      // 2. 將所有 App Shell 檔案加入快取
      // cache.addAll 是一個原子操作，如果任何一個檔案下載失敗，整個操作都會失敗。
      await cache.addAll(URLS_TO_CACHE);
      console.log('[Service Worker] App shell cached successfully');
    })()
  );
});

/**
 * On Activate: 清理舊快取
 * 當新的 Service Worker 啟用時觸發。
 * 這是管理舊快取的最佳時機。
 */
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    (async () => {
      // 1. 獲取所有現有的快取名稱
      const cacheNames = await caches.keys();
      // 2. 遍歷所有快取，刪除不屬於當前版本的靜態快取
      await Promise.all(
        cacheNames
          .filter(cacheName => {
            // 篩選出以 'tccc-static-' 開頭但不是目前版本的快取
            return cacheName.startsWith('tccc-static-') && cacheName !== STATIC_CACHE_NAME;
          })
          .map(cacheName => {
            console.log(`[Service Worker] Clearing old cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
      );
    })()
  );
  // 讓 Service Worker 立即控制頁面
  return self.clients.claim();
});

/**
 * On Fetch: 提供快取或網路的回應
 * 這是實現離線優先的核心策略：Cache, falling back to network。
 */
self.addEventListener('fetch', event => {
  // 我們只對 GET 請求進行快取處理
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    (async () => {
      // 1. 嘗試從快取中尋找匹配的請求
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        // 如果快取命中，直接回傳快取的回應
        // console.log(`[Service Worker] Returning cached response for: ${event.request.url}`);
        return cachedResponse;
      }
      
      // 2. 如果快取中沒有，則從網路請求
      // console.log(`[Service Worker] No cache match for: ${event.request.url}. Fetching from network.`);
      try {
        const networkResponse = await fetch(event.request);
        // 如果網路請求成功，直接回傳
        return networkResponse;
      } catch (error) {
        // 如果網路請求也失敗了（例如，使用者真的離線了），我們可以提供一個通用的離線備援頁面
        console.error(`[Service Worker] Fetch failed for: ${event.request.url}`, error);
        // 可以在此回傳一個預先快取的離線頁面，但目前應用中，快取優先策略已能處理大部分情況
        // const offlineFallback = await caches.match('/offline.html');
        // if (offlineFallback) return offlineFallback;
        
        // 如果連備援頁面都沒有，就讓瀏覽器處理錯誤
        throw error;
      }
    })()
  );
});

/**
 * On Message: 處理來自頁面的指令
 * 保持這個邏輯，讓頁面可以觸發更新和查詢版本。
 */
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