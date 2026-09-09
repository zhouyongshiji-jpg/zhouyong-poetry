/**
 * 《周庸诗集》- Service Worker 离线缓存
 * 确保海内外读者及老先生在断网/离线环境下依然可极速加载全部诗卷
 */

const CACHE_NAME = "zhouyong-poetry-v1.4.1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/main.css",
  "./css/book.css",
  "./js/seal.js",
  "./js/search.js",
  "./js/card-exporter.js",
  "./js/app.js",
  "./data/volumes.json",
  "./data/poems.json",
  "./assets/icons/icon-192.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // 缓存优先，回退网络策略
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // 若为同源数据或样式，写入缓存副本
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.method === "GET"
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // 网络失败且无缓存时
        if (event.request.headers.get("accept").includes("text/html")) {
          return caches.match("./index.html");
        }
      });
    })
  );
});
