import { promises as fs } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import sharp from 'sharp';

const ROOT = path.resolve('public');
const IMAGES = path.join(ROOT, 'images');
const TEXTURES = path.join(ROOT, 'textures');

type Mode = 'lossless' | 'photo';
type Thumb = { size: number; mode: Mode } | null;

const THUMBS: Record<string, Thumb> = {
  guides: { size: 160, mode: 'photo' },
  buildings: { size: 160, mode: 'photo' },
  vehicles: { size: 128, mode: 'lossless' }
};

const pathMap = new Map<string, string>();
const thumbMap = new Map<string, string>();
const neededGuideThumbs = new Set<string>();

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

function isImage(file: string): boolean {
  return /\.(png|jpe?g)$/i.test(file);
}

function webpOptions(mode: Mode) {
  return mode === 'lossless'
    ? { lossless: true, effort: 5 as const }
    : { quality: 82, effort: 5 as const };
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function convert(file: string) {
  const rel = './' + path.relative(ROOT, file).split(path.sep).join('/');
  const folder = path.relative(IMAGES, file).split(path.sep)[0];
  const ext = path.extname(file).toLowerCase();
  const mode: Mode =
    folder === 'buildings' || ext === '.jpg' || ext === '.jpeg' ? 'photo' : 'lossless';

  const out = file.replace(/\.(png|jpe?g)$/i, '.webp');
  const outRel = rel.replace(/\.(png|jpe?g)$/i, '.webp');
  pathMap.set(rel, outRel);

  if (!(await exists(out))) {
    await sharp(file).webp(webpOptions(mode)).toFile(out);
  }

  const thumb = THUMBS[folder];
  const wantsThumb =
    thumb &&
    (folder !== 'guides' ||
      neededGuideThumbs.has(rel) ||
      neededGuideThumbs.has(rel.replace(/\.(png|jpe?g)$/i, '.webp')));
  if (wantsThumb && thumb) {
    const thumbFile = out.replace(/\.webp$/, '-thumb.webp');
    const thumbRel = outRel.replace(/\.webp$/, '-thumb.webp');
    thumbMap.set(outRel, thumbRel);
    if (!(await exists(thumbFile))) {
      await sharp(file)
        .resize(thumb.size, thumb.size, { fit: 'cover', position: 'centre' })
        .webp(webpOptions(thumb.mode))
        .toFile(thumbFile);
    }
  }
}

function mapPath(value: string): string {
  return pathMap.get(value) ?? value;
}

function mapDeep(value: unknown): unknown {
  if (typeof value === 'string') return mapPath(value);
  if (Array.isArray(value)) return value.map(mapDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = mapDeep(v);
    return out;
  }
  return value;
}

function parseObject(text: string, prefix: string): { start: number; end: number; data: unknown } {
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
      if (depth === 0) {
        return { start, end: i + 1, data: JSON.parse(text.slice(start, i + 1)) };
      }
    }
  }
  throw new Error(`unclosed object for ${prefix}`);
}

function addThumbs(obj: any) {
  for (const key of ['story', 'npcs', 'vehicles']) {
    const list = obj?.[key];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (item && typeof item.image === 'string') {
        const t = thumbMap.get(item.image);
        if (t) item.thumb = t;
      }
    }
  }
}

async function rewriteGuides() {
  const file = path.join(ROOT, 'data', 'guides.js');
  const text = await fs.readFile(file, 'utf8');
  const { start, end, data } = parseObject(text, 'window.WZ_GUIDES');
  const mapped = mapDeep(data) as any;
  addThumbs(mapped);
  const out = text.slice(0, start) + JSON.stringify(mapped) + text.slice(end);
  await fs.writeFile(file, out);
}

async function rewriteGunsmith() {
  const file = path.join(ROOT, 'data', 'gunsmith.js');
  const text = await fs.readFile(file, 'utf8');
  const { start, end, data } = parseObject(text, 'window.WZ_GUNSMITH');
  const mapped = mapDeep(data);
  const out = text.slice(0, start) + JSON.stringify(mapped) + text.slice(end);
  await fs.writeFile(file, out);
}

async function rewriteLoot() {
  const file = path.join(ROOT, 'data', 'loot.js');
  const text = await fs.readFile(file, 'utf8');
  const { start, end, data } = parseObject(text, 'window.WZ_DATA');
  const mapped = mapDeep(data);
  const out = text.slice(0, start) + JSON.stringify(mapped) + text.slice(end);
  await fs.writeFile(file, out);
}

async function rewriteSeed() {
  const file = path.resolve('src/client/legacy/seed.js');
  const text = await fs.readFile(file, 'utf8');
  // seed.js uses JS object literal syntax with unquoted keys, so evaluate it
  // in an isolated context instead of JSON.parse.
  const sandbox: { window: Record<string, unknown> } = { window: {} };
  vm.runInNewContext(text, sandbox, { timeout: 5000 });
  const seed = sandbox.window.WZ_SEED;
  const thumbs = sandbox.window.WZ_BUILDING_THUMBS;
  const mappedSeed = mapDeep(seed);
  const mappedThumbs = mapDeep(thumbs) as Record<string, string>;
  const small: Record<string, string> = {};
  for (const [id, value] of Object.entries(mappedThumbs ?? {})) {
    const t = thumbMap.get(value);
    if (t) small[id] = t;
  }
  const header = text.slice(0, text.indexOf('window.WZ_SEED'));
  const out =
    header +
    'window.WZ_SEED = ' + JSON.stringify(mappedSeed) + ';\n\n' +
    'window.WZ_BUILDING_THUMBS = ' + JSON.stringify(mappedThumbs) + ';\n\n' +
    'window.WZ_BUILDING_THUMBS_SMALL = ' + JSON.stringify(small) + ';\n';
  await fs.writeFile(file, out);
}

async function rewriteCss() {
  const file = path.join(ROOT, 'css', 'app.css');
  let text = await fs.readFile(file, 'utf8');
  text = text.replace('../textures/atlas.png', '../textures/atlas.webp');
  await fs.writeFile(file, text);
}

async function rewriteSw() {
  const file = path.join(ROOT, 'sw.js');
  if (!(await exists(file))) return; // generated by scripts/build-sw.ts
  let text = await fs.readFile(file, 'utf8');
  for (const [from, to] of pathMap) {
    text = text.split(from.replace('./', './')).join(to);
  }
  text = text.replace('./textures/atlas.png', './textures/atlas.webp');
  await fs.writeFile(file, text);
}

async function rewriteManifest() {
  const files = (await walk(IMAGES)).filter((f) => f.endsWith('.webp')).sort();
  const entries = files.map((f) => './' + path.relative(ROOT, f).split(path.sep).join('/'));
  await fs.writeFile(
    path.join(IMAGES, 'manifest.json'),
    JSON.stringify(entries, null, 0)
  );
}

async function deleteOriginals() {
  const files = await walk(IMAGES);
  for (const f of files) if (isImage(f)) await fs.rm(f);
  const atlas = path.join(TEXTURES, 'atlas.png');
  if (await exists(atlas)) await fs.rm(atlas);
}

async function main() {
  const guidesText = await fs.readFile(path.join(ROOT, 'data', 'guides.js'), 'utf8');
  const guides = parseObject(guidesText, 'window.WZ_GUIDES').data as any;
  for (const key of ['story', 'npcs']) {
    for (const item of guides?.[key] ?? []) {
      if (item && typeof item.image === 'string') neededGuideThumbs.add(item.image);
    }
  }

  const files = (await walk(IMAGES)).filter(isImage);
  console.log(`converting ${files.length} images...`);
  for (const file of files) await convert(file);

  // atlas
  const atlas = path.join(TEXTURES, 'atlas.png');
  if (await exists(atlas)) {
    const out = path.join(TEXTURES, 'atlas.webp');
    if (!(await exists(out))) {
      await sharp(atlas).webp({ lossless: true, effort: 6 }).toFile(out);
    }
    pathMap.set('./textures/atlas.png', './textures/atlas.webp');
  }

  console.log('rewriting data references...');
  await rewriteGuides();
  await rewriteGunsmith();
  await rewriteLoot();
  await rewriteSeed();
  await rewriteCss();
  await rewriteSw();
  await rewriteManifest();
  await deleteOriginals();

  const originals = files.length;
  console.log(`done. full images: ${pathMap.size}, thumbs: ${thumbMap.size}, sources: ${originals}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
