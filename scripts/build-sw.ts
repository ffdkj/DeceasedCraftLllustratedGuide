import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIST = path.resolve('dist/client');

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
const SHELL_CACHE = "wz-shell-" + VERSION;
const IMAGE_CACHE = "wz-images-" + VERSION;
const AUDIO_CACHE = "wz-audio-" + VERSION;
const PRECACHE = ${JSON.stringify(shell, null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, IMAGE_CACHE, AUDIO_CACHE]);
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isAudio(url) {
  return url.pathname.startsWith("/media/audio/");
}

function isMediaImage(url) {
  return url.pathname.startsWith("/media/") && !isAudio(url);
}

function isLocalImage(url) {
  return url.pathname.startsWith("/images/") && !url.pathname.endsWith("/manifest.json");
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreSearch: false });
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.status === 200) cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Let the browser handle range requests and the SW itself.
  if (req.headers.get("range") || url.pathname === "/sw.js") return;
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put("./index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Audio is streamed and cached only by the explicit offline pack.
  if (isAudio(url)) return;

  if (isMediaImage(url) || isLocalImage(url)) {
    event.respondWith(cacheFirst(req, IMAGE_CACHE).catch(() => caches.match(req)));
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});

async function fetchJson(url) {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

async function prefetch(urls, cacheName, kind, source) {
  const cache = await caches.open(cacheName);
  let done = 0;
  let failed = 0;
  const total = urls.length;
  const queue = [...urls];

  async function worker() {
    for (;;) {
      const url = queue.shift();
      if (!url) return;
      try {
        const hit = await cache.match(url);
        if (!hit) {
          const res = await fetch(url);
          if (res && res.status === 200) await cache.put(url, res);
          else failed++;
        }
      } catch {
        failed++;
      }
      done++;
      if (done % 10 === 0 || done === total) {
        source && source.postMessage({ type: "prefetch-progress", kind, done, total, failed });
      }
    }
  }

  await Promise.all(Array.from({ length: 4 }, () => worker()));
  source && source.postMessage({ type: "prefetch-done", kind, done, total, failed });
}

async function clearOfflineCache() {
  await Promise.all([caches.delete(IMAGE_CACHE), caches.delete(AUDIO_CACHE)]);
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  const source = event.source;

  if (data.type === "prefetch-images") {
    event.waitUntil((async () => {
      const [local, media] = await Promise.all([
        fetchJson("./images/manifest.json"),
        fetchJson("./media-manifest.json")
      ]);
      const images = media.filter((u) => !u.startsWith("/media/audio/"));
      await prefetch([...local, ...images], IMAGE_CACHE, "images", source);
    })());
  }

  if (data.type === "prefetch-audio") {
    event.waitUntil((async () => {
      const media = await fetchJson("./media-manifest.json");
      await prefetch(media.filter((u) => u.startsWith("/media/audio/")), AUDIO_CACHE, "audio", source);
    })());
  }

  if (data.type === "clear-offline") {
    event.waitUntil(clearOfflineCache().then(() => source && source.postMessage({ type: "offline-cleared" })));
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
