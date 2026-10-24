import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { timeout } from 'hono/timeout';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mediaHandler } from './media.js';
import { community } from './community.js';
import { adminApi } from './admin-auth.js';
import { adminImages, configureOverrides, imageVersionsScript, overridesReady, serveOverride } from './overrides.js';

// /media 请求上限：media.ts 自己的 S3 abort 通常先返回 504，这一层是最后一道网。
const MEDIA_TIMEOUT_MS = 5000;

const app = new Hono();
app.route('/api', community);
app.route('/api', adminApi);
app.route('/api', adminImages);

const here = path.dirname(fileURLToPath(import.meta.url));

function resolveStaticRoot(): string {
  if (process.env.STATIC_ROOT) return path.resolve(process.env.STATIC_ROOT);
  const guideCandidates = [
    path.resolve(process.cwd(), 'public/guide'),
    path.resolve(here, '../client/guide'),
    path.resolve(here, '../../public/guide')
  ];
  const guide = guideCandidates.find((p) => existsSync(path.join(p, 'index.html')));
  if (guide) return guide;
  const candidates = [
    path.resolve(here, '../client'),
    path.resolve(here, '../../public'),
    path.resolve(process.cwd(), 'public')
  ];
  return candidates.find((p) => existsSync(p)) ?? path.resolve(process.cwd(), 'public');
}

const staticRoot = resolveStaticRoot();
configureOverrides(staticRoot);

app.get('/api/health', (c) => c.json({ ok: true, service: 'wzsj-atlas' }));

/* 管理员换图后的「逻辑路径 → 版本号」必须在首屏渲染之前到页面，而且不能被边缘缓存拦住。
   Cloudflare 对 .js 走「缓存一切 + 4 小时边缘 TTL」，连 origin 的 no-cache 都会被改写成
   max-age=14400；所以不单独发一个 js 文件，而是把它内联进 index.html（HTML 是 DYNAMIC + no-cache）。 */
const DYNAMIC_SCRIPT_TAG = '<script src="/data/image-versions.js"></script>';
let htmlCache: { mtime: number; html: string } | null = null;

async function indexHtml(): Promise<string> {
  const file = path.join(staticRoot, 'index.html');
  const info = await stat(file).catch(() => null);
  if (htmlCache && info && htmlCache.mtime === info.mtimeMs) return htmlCache.html;
  const html = await readFile(file, 'utf8');
  htmlCache = { mtime: info ? info.mtimeMs : 0, html };
  return html;
}

app.get('/', serveIndex);
app.get('/index.html', serveIndex);

async function serveIndex(c: Context) {
  const html = await indexHtml();
  const inline = '<script>' + (await imageVersionsScript()).trim() + '</script>';
  const body = html.includes(DYNAMIC_SCRIPT_TAG) ? html.replace(DYNAMIC_SCRIPT_TAG, inline) : html;
  c.header('Content-Type', 'text/html; charset=utf-8');
  c.header('Cache-Control', 'no-cache');
  c.header('X-Content-Type-Options', 'nosniff');
  return c.body(body);
}

// 兼容：老 HTML（浏览器缓存里的）仍可能请求这个文件；正常路径不会用到它
app.get('/data/image-versions.js', async (c) => {
  c.header('Content-Type', 'application/javascript; charset=utf-8');
  c.header('Cache-Control', 'no-cache');
  return c.body(await imageVersionsScript());
});

// 覆盖层先于静态文件：命中就把桶里的新图顶上去，未命中继续往下走
app.use('/images/*', async (c, next) => {
  const hit = await serveOverride(c);
  if (hit) return hit;
  await next();
});

// 必须在 /media 路由之前注册，作为整体兜底（避免单个媒体请求挂到 CF 的 100s origin 超时）。
app.use('/media/*', timeout(MEDIA_TIMEOUT_MS));
app.use('/media/*', async (c, next) => {
  const hit = await serveOverride(c);
  if (hit) return hit;
  await next();
});

app.all('/media/:path{.+}', mediaHandler);

// PR 的 /guide/ 静态副本已并入根站：旧入口一律 404（不做兼容重定向，见 docs/merge-plan.md）

app.use(
  '*',
  serveStatic({
    root: staticRoot,
    precompressed: true,
    onFound: (_filePath, c) => {
      const p = c.req.path;
      if (p.endsWith('.m4a')) c.header('Content-Type', 'audio/mp4');
      const immutable =
        /^\/(?:assets|audio|images|textures|icons)\//.test(p) &&
        !p.endsWith('/manifest.json');
      c.header('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
      c.header('X-Content-Type-Options', 'nosniff');
    }
  })
);

app.notFound((c) => {
  if ((c.req.header('Accept') ?? '').includes('text/html')) {
    return c.redirect('/');
  }
  return c.json({ error: 'not found' }, 404);
});

const port = Number(process.env.PORT) || 8787;

// 预热覆盖表（本地库为空时会从 RustFS 的 admin/state.json 回灌）
await overridesReady();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`wzsj-atlas listening on http://localhost:${info.port} (static root: ${staticRoot})`);
});
