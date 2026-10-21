import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = new Hono();

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
