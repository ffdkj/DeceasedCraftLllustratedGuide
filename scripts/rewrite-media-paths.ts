import { promises as fs } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const PUBLIC = path.resolve('public');

function parseObject(text: string, prefix: string): { start: number; end: number; data: any } {
  const at = text.indexOf(prefix);
  if (at < 0) throw new Error(`missing ${prefix}`);
  const start = text.indexOf('{', at);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return { start, end: i + 1, data: JSON.parse(text.slice(start, i + 1)) };
    }
  }
  throw new Error(`unclosed ${prefix}`);
}

function isLocalFullImage(value: string): boolean {
  if (value.endsWith('-thumb.webp')) return false;
  return (
    value.startsWith('./images/guides/') ||
    value.startsWith('./images/vehicles/') ||
    value.startsWith('./images/buildings/')
  );
}

function rewrite(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.startsWith('/media/')) return value;
    if (isLocalFullImage(value)) return '/media/images/' + value.slice('./images/'.length);
    return value;
  }
  if (Array.isArray(value)) return value.map(rewrite);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = rewrite(v);
    return out;
  }
  return value;
}

async function rewriteGuides() {
  const file = path.join(PUBLIC, 'data', 'guides.js');
  const text = await fs.readFile(file, 'utf8');
  const { start, end, data } = parseObject(text, 'window.WZ_GUIDES');
  await fs.writeFile(file, text.slice(0, start) + JSON.stringify(rewrite(data)) + text.slice(end));
}

async function rewriteTextures() {
  const file = path.join(PUBLIC, 'data', 'textures.js');
  let text = await fs.readFile(file, 'utf8');
  text = text.replace('./textures/atlas.png', './textures/atlas.webp');
  await fs.writeFile(file, text);
}

async function rewriteSeed() {
  const file = path.resolve('src/client/legacy/seed.js');
  const text = await fs.readFile(file, 'utf8');
  const sandbox: { window: Record<string, unknown> } = { window: {} };
  vm.runInNewContext(text, sandbox, { timeout: 5000 });

  const seed = sandbox.window.WZ_SEED;
  const thumbs = (sandbox.window.WZ_BUILDING_THUMBS ?? {}) as Record<string, string>;
  const small = (sandbox.window.WZ_BUILDING_THUMBS_SMALL ?? {}) as Record<string, string>;

  const mediaThumbs: Record<string, string> = {};
  for (const [id, value] of Object.entries(thumbs)) {
    mediaThumbs[id] = value.startsWith('/media/')
      ? value
      : '/media/images/' + value.slice('./images/'.length);
  }

  const header = text.slice(0, text.indexOf('window.WZ_SEED'));
  const out =
    header +
    'window.WZ_SEED = ' + JSON.stringify(seed) + ';\n\n' +
    'window.WZ_BUILDING_THUMBS = ' + JSON.stringify(mediaThumbs) + ';\n\n' +
    'window.WZ_BUILDING_THUMBS_SMALL = ' + JSON.stringify(small) + ';\n';
  await fs.writeFile(file, out);
}

async function rewriteMusic() {
  const file = path.resolve('src/client/legacy/music.js');
  let text = await fs.readFile(file, 'utf8');
  text = text.replace(/\.\/audio\//g, '/media/audio/');
  await fs.writeFile(file, text);
}

async function rewriteSw() {
  const file = path.join(PUBLIC, 'sw.js');
  let text = await fs.readFile(file, 'utf8');
  text = text
    .split('\n')
    .filter((line) => !line.includes('./audio/'))
    .join('\n')
    .replace('wz-guide-v5.11.19-20261021-cleanup', 'wz-guide-v5.11.19-rustfs');
  await fs.writeFile(file, text);
}

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

async function main() {
  await rewriteGuides();
  await rewriteTextures();
  await rewriteSeed();
  await rewriteMusic();
  await rewriteSw();

  // Manifest for the optional offline pack (full media + audio), built before
  // the local copies are removed.
  const media: string[] = [];
  for (const folder of ['guides', 'buildings', 'vehicles']) {
    for (const file of await walk(path.join(PUBLIC, 'images', folder))) {
      if (file.endsWith('.webp') && !file.endsWith('-thumb.webp')) {
        const rel = path.relative(path.join(PUBLIC, 'images'), file).split(path.sep).join('/');
        media.push('/media/images/' + rel);
      }
    }
  }
  for (const file of await walk(path.join(PUBLIC, 'audio'))) {
    if (file.endsWith('.m4a')) media.push('/media/audio/' + path.basename(file));
  }
  media.sort();
  await fs.writeFile(path.join(PUBLIC, 'media-manifest.json'), JSON.stringify(media, null, 0));

  // Remove local copies that now live in RustFS.
  let removed = 0;
  let bytes = 0;
  for (const folder of ['guides', 'buildings', 'vehicles']) {
    for (const file of await walk(path.join(PUBLIC, 'images', folder))) {
      if (!file.endsWith('.webp') || file.endsWith('-thumb.webp')) continue;
      bytes += (await fs.stat(file)).size;
      await fs.rm(file);
      removed++;
    }
  }
  for (const file of await walk(path.join(PUBLIC, 'audio'))) {
    if (!file.endsWith('.m4a')) continue;
    bytes += (await fs.stat(file)).size;
    await fs.rm(file);
    removed++;
  }

  // Regenerate the local manifest (thumbs + small icons + monsters).
  const local: string[] = [];
  for (const file of await walk(path.join(PUBLIC, 'images'))) {
    if (file.endsWith('.webp')) local.push('./' + path.relative(PUBLIC, file).split(path.sep).join('/'));
  }
  local.sort();
  await fs.writeFile(
    path.join(PUBLIC, 'images', 'manifest.json'),
    JSON.stringify(local, null, 0)
  );

  console.log(`removed local full media: ${removed} files, ${(bytes / 1048576).toFixed(2)}MB`);
  console.log(`local images: ${local.length}, media entries: ${media.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
