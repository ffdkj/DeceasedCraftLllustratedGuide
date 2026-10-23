import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { timeout } from 'hono/timeout';
import { existsSync } from 'node:fs';
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
  const candidates = [
    path.resolve(here, '../client'), // dist/server -> dist/client
    path.resolve(here, '../../public'), // src/server -> public (dev)
    path.resolve(process.cwd(), 'public')
  ];
  return candidates.find((p) => existsSync(p)) ?? path.resolve(process.cwd(), 'public');
}

const staticRoot = resolveStaticRoot();
configureOverrides(staticRoot);

app.get('/api/health', (c) => c.json({ ok: true, service: 'wzsj-atlas' }));

// 管理员换图后在首屏渲染之前就把「逻辑路径 → 版本号」发下去（同步脚本，避免晚于首次渲染）
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
app.all('/guide/*', (c) => c.json({ error: 'not found' }, 404));

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
