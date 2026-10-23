/* 亡者世界图鉴 · 离线缓存 */
const CACHE = "wz-guide-v3.9.0";
const ASSETS = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/music.js",
  "./js/seed.js",
  "./js/gunsmith.js",
  "./audio/search.m4a",
  "./audio/hope.m4a",
  "./audio/forgotten.m4a",
  "./audio/silhouettes.m4a",
  "./audio/transformation.m4a",
  "./audio/we.m4a",
  "./audio/broken.m4a",
  "./data/loot.js",
  "./data/textures.js",
  "./data/guides.js",
  "./data/gunsmith.js",
  "./textures/atlas.webp",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.webp",
  "./icons/icon-512.webp",
  "./icons/apple-touch-icon.webp",
  "./images/monsters/normal.webp",
  "./images/monsters/flesh.webp",
  "./images/monsters/tongue.webp",
  "./images/monsters/nurse.webp",
  "./images/monsters/soldier.webp",
  "./images/monsters/skinner.webp",
  "./images/monsters/skinner_thumb.webp",
  "./images/manifest.json"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS).then(function () {
        // 预缓存所有攻略图片；清单由 build_guides.py 生成
        return fetch("./images/manifest.json").then(function (res) {
          return res.ok ? res.json() : [];
        }).then(function (list) {
          return cache.addAll(list);
        }).catch(function () {});
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put("./index.html", copy); });
        return res;
      }).catch(function () {
        return caches.match("./index.html");
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      });
    })
  );
});
