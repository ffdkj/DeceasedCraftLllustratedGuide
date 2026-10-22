import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIST = path.resolve('dist/client');

// 运行时请求超时：任何一次 fetch 超过该时间就 abort，避免单张图永久 pending 拖死队列。
const FETCH_TIMEOUT_MS = 5000;
// 预缓存单项超时：单个 shell 资源卡住不会拖住整个 install。
const SHELL_ADD_TIMEOUT_MS = 5000;
// 图片/音频缓存名与构建版本解耦，部署不再触发全量重下。
const IMAGE_CACHE_VERSION = 'v1';

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const html = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');
  const refs = new Set<string>();
  for (const m of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) {
    const url = m[1];
    if (/\.(?:js|css|webp|png|svg|json|webmanifest)$/.test(url)) refs.add(url);
  }

  const shell = Array.from(new Set([
    './',
    './index.html',
    ...Array.from(refs).map((u) => '.' + u),
    './data/loot.js',
    './data/textures.js',
    './data/guides.js',
    './data/gunsmith.js',
    './data/compat.js',
    './data/recipes.js',
    './data/tiers.js',
    './data/changelog.js',
    './data/monsters-difficulty.js',
    './data/horde-buildings.js',
    './data/monster-spawn-tiers.js',
    './textures/atlas.webp',
    './manifest.webmanifest',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon.png',
    './images/manifest.json',
    './media-manifest.json'
  ]));

  // Version from the content of the shell files so data edits bump the cache.
  const hash = crypto.createHash('sha1');
  for (const rel of shell) {
    if (rel === './' || rel === './index.html') {
      hash.update(html);
      continue;
    }
    const file = path.join(DIST, rel.replace('./', ''));
    if (await exists(file)) hash.update(await fs.readFile(file));
    else hash.update(rel);
  }
  const version = hash.digest('hex').slice(0, 10);

  const source = `/* 亡者世界图鉴 · Service Worker（自动生成） */
const VERSION = ${JSON.stringify(version)};
const FETCH_TIMEOUT_MS = ${FETCH_TIMEOUT_MS};
const SHELL_ADD_TIMEOUT_MS = ${SHELL_ADD_TIMEOUT_MS};
const SHELL_CACHE = "wz-shell-" + VERSION;
// 图片/音频缓存与 shell 版本解耦：换版本只重下 shell，不再全量重下 763 张图。
const IMAGE_CACHE = "wz-images-${IMAGE_CACHE_VERSION}";
const AUDIO_CACHE = "wz-audio-${IMAGE_CACHE_VERSION}";
const PRECACHE = ${JSON.stringify(shell, null, 2)};

/* ---------------- 超时工具 ---------------- */

function timeoutSignal(ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, ms);
  return {
    signal: ctrl.signal,
    clear: function () { clearTimeout(timer); }
  };
}

// 只约束到响应头到达为止：响应体仍可自由流式传输（图片本身是流）。
function fetchWithTimeout(input, init) {
  const t = timeoutSignal(FETCH_TIMEOUT_MS);
  const opts = Object.assign({}, init || {}, { signal: t.signal });
  return fetch(input, opts).finally(function () { t.clear(); });
}

// 连同响应体一起约束在超时窗口内，用于必须完整读取的场景（离线包缓存）。
async function fetchBuffer(input, init) {
  const t = timeoutSignal(FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(input, Object.assign({}, init || {}, { signal: t.signal }));
    if (!res || res.status !== 200) return { ok: false, status: res ? res.status : 0 };
    const buf = await res.arrayBuffer();
    return { ok: true, buf: buf, headers: cacheableHeaders(res.headers) };
  } finally {
    t.clear();
  }
}

// 从已解码的 body 重建响应时，必须剔除这些头，否则会二次解码 / 长度不符。
function cacheableHeaders(headers) {
  const out = {};
  headers.forEach(function (value, key) {
    const k = key.toLowerCase();
    if (k === "content-encoding" || k === "content-length" || k === "vary" || k === "transfer-encoding") return;
    out[key] = value;
  });
  return out;
}

/* ---------------- 写缓存：必须 waitUntil ---------------- */

// 原实现是 cache.put(...) 裸调用：既可能被 SW 回收丢弃，也会让 tee 分支反压页面流。
// 这里立即抽干克隆体并挂到 event.waitUntil，写入失败也不影响已返回的响应。
function stash(event, cacheName, request, response) {
  if (!response || response.status !== 200) return;
  const copy = response.clone();
  event.waitUntil((async function () {
    try {
      const buf = await copy.arrayBuffer();
      const cache = await caches.open(cacheName);
      await cache.put(request, new Response(buf, {
        status: 200,
        statusText: copy.statusText,
        headers: cacheableHeaders(copy.headers)
      }));
    } catch (err) {
      // 缓存写入失败（配额 / SW 终止）不影响页面已经拿到的响应
    }
  })());
}

/* ---------------- install / activate ---------------- */

// 逐项 add + 单项超时：替代 addAll 的全有全无语义。超时会真正 abort 该请求，不只是放弃等待。
function addWithTimeout(cache, url) {
  return new Promise(function (resolve) {
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); resolve(null); }, SHELL_ADD_TIMEOUT_MS);
    const href = new URL(url, self.location.href).href;
    cache.add(new Request(href, { signal: ctrl.signal })).then(
      function () { clearTimeout(timer); resolve(url); },
      function () { clearTimeout(timer); resolve(null); }
    );
  });
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(function (cache) {
        return Promise.all(PRECACHE.map(function (url) {
          return addWithTimeout(cache, url);
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  const keep = {};
  keep[SHELL_CACHE] = true;
  keep[IMAGE_CACHE] = true;
  keep[AUDIO_CACHE] = true;
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return !keep[k]; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* ---------------- 路由判定 ---------------- */

function isAudio(url) {
  return url.pathname.indexOf("/media/audio/") === 0;
}

function isMediaImage(url) {
  return url.pathname.indexOf("/media/") === 0 && !isAudio(url);
}

function isLocalImage(url) {
  return url.pathname.indexOf("/images/") === 0 && url.pathname.slice(-13) !== "/manifest.json";
}

/* ---------------- 缓存优先 ---------------- */

async function cacheFirst(event, request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreSearch: false });
  if (hit) return hit;
  const res = await fetchWithTimeout(request);
  stash(event, cacheName, request, res);
  return res;
}

self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Let the browser handle range requests and the SW itself.
  if (req.headers.get("range") || url.pathname === "/sw.js") return;
  if (url.pathname.indexOf("/api/") === 0) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetchWithTimeout(req)
        .then(function (res) {
          if (res && res.ok) stash(event, SHELL_CACHE, "./index.html", res);
          return res;
        })
        .catch(function () { return caches.match("./index.html"); })
    );
    return;
  }

  // Audio is streamed and cached only by the explicit offline pack.
  if (isAudio(url)) return;

  if (isMediaImage(url) || isLocalImage(url)) {
    event.respondWith(
      cacheFirst(event, req, IMAGE_CACHE).catch(function () {
        // 单张图失败（超时 / 源站错误）只影响它自己，其余图片照常加载。
        return caches.match(req).then(function (hit) { return hit || Response.error(); });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetchWithTimeout(req).then(function (res) {
        if (res && res.status === 200) stash(event, SHELL_CACHE, req, res);
        return res;
      });
    })
  );
});

/* ---------------- 离线包 ---------------- */

async function fetchJson(url) {
  try {
    const res = await fetchWithTimeout(url, { cache: "no-cache" });
    return res.ok ? await res.json() : [];
  } catch (e) {
    return [];
  }
}

async function prefetch(urls, cacheName, kind, source) {
  const cache = await caches.open(cacheName);
  let done = 0;
  let failed = 0;
  const total = urls.length;
  const queue = urls.slice();
  const CONCURRENCY = 4;

  async function worker() {
    for (;;) {
      const url = queue.shift();
      if (!url) return;
      try {
        const hit = await cache.match(url);
        if (!hit) {
          // 5s 超时，超时计入 failed 并继续下一个：一个坏 URL 不会卡死整轮下载。
          const got = await fetchBuffer(url);
          if (got.ok) await cache.put(url, new Response(got.buf, { status: 200, headers: got.headers }));
          else failed++;
        }
      } catch (e) {
        failed++;
      }
      done++;
      if (done % 10 === 0 || done === total) {
        source && source.postMessage({ type: "prefetch-progress", kind: kind, done: done, total: total, failed: failed });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, function () { return worker(); }));
  source && source.postMessage({ type: "prefetch-done", kind: kind, done: done, total: total, failed: failed });
}

async function clearOfflineCache() {
  await Promise.all([caches.delete(IMAGE_CACHE), caches.delete(AUDIO_CACHE)]);
}

self.addEventListener("message", function (event) {
  const data = event.data || {};
  const source = event.source;

  if (data.type === "prefetch-images") {
    event.waitUntil((async function () {
      const both = await Promise.all([
        fetchJson("./images/manifest.json"),
        fetchJson("./media-manifest.json")
      ]);
      const local = both[0];
      const media = both[1];
      const images = media.filter(function (u) { return u.indexOf("/media/audio/") !== 0; });
      await prefetch(local.concat(images), IMAGE_CACHE, "images", source);
    })());
  }

  if (data.type === "prefetch-audio") {
    event.waitUntil((async function () {
      const media = await fetchJson("./media-manifest.json");
      await prefetch(media.filter(function (u) { return u.indexOf("/media/audio/") === 0; }), AUDIO_CACHE, "audio", source);
    })());
  }

  if (data.type === "clear-offline") {
    event.waitUntil(clearOfflineCache().then(function () {
      source && source.postMessage({ type: "offline-cleared" });
    }));
  }
});
`;

  await fs.writeFile(path.join(DIST, 'sw.js'), source);
  console.log(`sw.js generated: version ${version}, ${shell.length} shell entries`);

  for (const rel of shell) {
    const file = path.join(DIST, rel.replace('./', ''));
    if (rel !== './' && !(await exists(file))) {
      console.warn(`missing shell asset: ${rel}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
