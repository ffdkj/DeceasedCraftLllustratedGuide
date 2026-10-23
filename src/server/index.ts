import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { timeout } from 'hono/timeout';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mediaHandler } from './media.js';
import { community } from './community.js';

// /media 请求上限：media.ts 自己的 S3 abort 通常先返回 504，这一层是最后一道网。
const MEDIA_TIMEOUT_MS = 5000;

const app = new Hono();
app.route('/api', community);

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

app.get('/api/health', (c) => c.json({ ok: true, service: 'wzsj-atlas' }));

// 必须在 /media 路由之前注册，作为整体兜底（避免单个媒体请求挂到 CF 的 100s origin 超时）。
app.use('/media/*', timeout(MEDIA_TIMEOUT_MS));

app.all('/media/:path{.+}', mediaHandler);

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

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`wzsj-atlas listening on http://localhost:${info.port} (static root: ${staticRoot})`);
});
