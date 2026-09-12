/**
 * 《周庸诗集》- Service Worker 离线缓存
 * 确保海内外读者及老先生在断网/离线环境下依然可极速加载全部诗卷
 */

const CACHE_NAME = "zhouyong-poetry-v1.8.2";
const ASSETS_TO_CACHE = [
  "./",
  "./manifest.json",
  "./css/main.css",
  "./css/book.css",
  "./js/seal.js",
  "./js/search.js",
  "./js/card-exporter.js",
  "./js/app.js",
  "./data/volumes.json",
  "./data/poems.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-192.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 预存首页 HTML 并同时映射 ./ 与 ./index.html 键名，确保无论是哪种路径都能命中缓存
      try {
        const rootRes = await fetch("./");
        if (rootRes && rootRes.ok) {
          await cache.put("./", rootRes.clone());
          await cache.put("./index.html", rootRes.clone());
        }
      } catch (e) {
        console.warn("预存首页失败:", e);
      }
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
  const url = new URL(event.request.url);

  // 0. 绝不拦截安卓安装包、压缩包、快捷方式及资产校验文件，确保原生直连下载
  if (
    url.pathname.endsWith(".apk") || 
    url.pathname.endsWith(".aab") || 
    url.pathname.endsWith(".url") ||
    url.pathname.includes(".well-known")
  ) {
    return; // 浏览器原生发起直接下载，绝不拦截重定向至首页！
  }

  // 1. 处理页面导航请求 (PWA桌面启动、浏览器回车、普通Reload刷新、路由切换)
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // 优先请求网络根路径 ./，彻底避开 Cloudflare 对 /index.html 抛出的 307 重定向
          const networkResponse = await fetch("./", { cache: "no-cache" });
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put("./", networkResponse.clone());
            cache.put("./index.html", networkResponse.clone());
            return networkResponse;
          }
        } catch (err) {
          // 网络失败（离线、飞行模式或弱网），进入回退
        }

        // 离线或网络异常时，从本地缓存极速回退
        const cached = (await caches.match("./", { ignoreSearch: true }))
                    || (await caches.match("./index.html", { ignoreSearch: true }));
        if (cached) {
          return cached;
        }

        // 若缓存完全为空且离线，提供兜底页避免浏览器 ERR_FAILED
        return new Response(
          "<!DOCTYPE html><html><head><meta charset='utf-8'><title>周庸诗集</title></head><body><h3>《周庸诗集》离线中，请检查网络连接后刷新。</h3></body></html>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      })()
    );
    return;
  }

  // 2. 核心诗作数据请求 (poems.json, volumes.json) -> 网络优先，离线回退
  // 保证只要用户在线，就能秒级获取周老最新诗篇；断网时无缝回退本地缓存
  const isPoetryData = url.pathname.endsWith("/data/poems.json") || url.pathname.endsWith("/data/volumes.json");
  if (isPoetryData) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request, { cache: "no-cache" });
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }
        } catch (err) {
          // 离线或弱网时静默回退
        }

        const cached = await caches.match(event.request, { ignoreSearch: true });
        if (cached) {
          return cached;
        }
        return new Response("[]", { headers: { "Content-Type": "application/json; charset=utf-8" } });
      })()
    );
    return;
  }

  // 3. 静态前端资源请求处理 (CSS, JS, SVG, 图标等) -> 缓存优先
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request, { ignoreSearch: true });
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(event.request);
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.method === "GET" &&
          url.protocol.startsWith("http")
        ) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        return new Response(null, { status: 404, statusText: "Offline Resource Unavailable" });
      }
    })()
  );
});
