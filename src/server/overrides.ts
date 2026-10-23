/* 在线换图：服务端覆盖层。
   本地图在 dist 里被改名成 `<名>.<8位内容哈希>.webp` 且带 1 年 immutable，
   所以「替换桶里的对象」对那批引用一张都不生效；这里把请求路径剥回逻辑路径，
   命中覆盖表就从对象存储回新图。带 `?v=<sha10>` 的请求可以长缓存，
   不带的（CSS 里直接写的地址）走 no-cache + ETag 让浏览器每次复核。 */
import { Hono } from 'hono';
import type { Context } from 'hono';
import sharp from 'sharp';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import { DATA_DIR, db, hydrate, scheduleMirror } from './db.js';
import { adminSession, requireAdmin } from './admin-auth.js';
import { deleteObject, getObjectBytes, hasObjectStore, mediaKey, putObjectBytes } from './objects.js';

const IMAGE_EXT = /\.(?:webp|png|jpe?g|gif|avif)$/i;
const FINGERPRINT = /\.[0-9a-f]{8}(\.[a-z0-9]+)$/i;
const ALLOWED_PREFIX = '/images/';
const KEEP_VERSIONS = 3;
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const LONG_EDGE = 2048;
const OBJECT_DIR = path.join(DATA_DIR, 'overrides');

interface CurrentOverride {
  path: string;
  sha: string;
  v: string;
  objectKey: string;
  width: number;
  height: number;
  bytes: number;
}

interface Preview {
  buffer: Buffer;
  sha: string;
  width: number;
  height: number;
  bytes: number;
  at: number;
}

const current = new Map<string, CurrentOverride>();
/** 逻辑路径 → 磁盘上的实际文件（构建后文件名带 8 位指纹）。 */
const allowed = new Map<string, string>();
const previews = new Map<string, Preview>();
const byteCache = new Map<string, Buffer>();
let byteCacheBytes = 0;
const BYTE_CACHE_LIMIT = 8 * 1024 * 1024;

let staticRoot = '';
let readyPromise: Promise<void> | null = null;

/** index.ts 启动时调用：确定静态根目录并预热允许清单。 */
export function configureOverrides(root: string): void {
  staticRoot = root;
  readyPromise = null;
}

export function overridesReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      await hydrate();
      const root = path.join(staticRoot, 'images');
      if (existsSync(root)) {
        for (const rel of walkImages(root)) {
          const onDisk = '/images/' + rel;
          // dist 里的文件名带指纹，覆盖表与校验都用逻辑路径（去掉 8 位哈希）
          const logical = logicalImagePath(onDisk) ?? onDisk;
          allowed.set(logical, path.join(root, rel));
        }
      }
      loadCurrent();
      if (!existsSync(OBJECT_DIR)) {
        try {
          mkdirSync(OBJECT_DIR, { recursive: true });
        } catch {
          // 只读卷：第一次写入时再报
        }
      }
    })();
  }
  return readyPromise;
}

function walkImages(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) out.push(...walkImages(path.join(dir, entry.name), rel));
    else if (IMAGE_EXT.test(entry.name)) out.push(rel);
  }
  return out;
}

function loadCurrent(): void {
  current.clear();
  const rows = db()
    .prepare(
      `SELECT c.path, v.sha, v.object_key, v.width, v.height, v.bytes
         FROM override_current c JOIN override_versions v ON v.id = c.version_id`
    )
    .all() as { path: string; sha: string; object_key: string; width: number; height: number; bytes: number }[];
  for (const row of rows) {
    current.set(row.path, {
      path: row.path,
      sha: row.sha,
      v: row.sha.slice(0, 10),
      objectKey: row.object_key,
      width: row.width,
      height: row.height,
      bytes: row.bytes
    });
  }
}

/** 请求路径 → 逻辑图片路径（剥 /media 前缀与 8 位指纹哈希）。 */
export function logicalImagePath(rawPath: string): string | null {
  let p = rawPath.split('?')[0].split('#')[0];
  try {
    p = decodeURIComponent(p);
  } catch {
    return null;
  }
  if (p.startsWith('/media/')) {
    if (!p.startsWith('/media/images/')) return null;
    p = p.slice('/media'.length);
  }
  if (!p.startsWith(ALLOWED_PREFIX)) return null;
  if (p.includes('..') || p.includes('\\')) return null;
  p = p.replace(FINGERPRINT, '$1');
  return p;
}

function cacheGet(sha: string): Buffer | null {
  const hit = byteCache.get(sha);
  if (!hit) return null;
  byteCache.delete(sha);
  byteCache.set(sha, hit);
  return hit;
}

function cacheSet(sha: string, buf: Buffer): void {
  if (buf.byteLength > BYTE_CACHE_LIMIT) return;
  if (byteCache.has(sha)) cacheDelete(sha);
  byteCache.set(sha, buf);
  byteCacheBytes += buf.byteLength;
  while (byteCacheBytes > BYTE_CACHE_LIMIT) {
    const oldest = byteCache.keys().next();
    if (oldest.done) break;
    cacheDelete(oldest.value);
  }
}

function cacheDelete(sha: string): void {
  const hit = byteCache.get(sha);
  if (!hit) return;
  byteCache.delete(sha);
  byteCacheBytes -= hit.byteLength;
}

function localObject(sha: string): string {
  return path.join(OBJECT_DIR, sha.slice(0, 16) + '.webp');
}

async function readOverrideBytes(item: CurrentOverride): Promise<Buffer | null> {
  const cached = cacheGet(item.sha);
  if (cached) return cached;
  let buf: Buffer | null = null;
  const file = localObject(item.sha);
  if (existsSync(file)) {
    try {
      buf = readFileSync(file);
    } catch {
      buf = null;
    }
  }
  if (!buf) buf = await getObjectBytes(mediaKey(item.objectKey));
  if (!buf) return null;
  cacheSet(item.sha, buf);
  return buf;
}

/** 覆盖层命中就返回图片，未命中返回 null 交给后续静态/媒体处理。 */
export async function serveOverride(c: Context): Promise<Response | null> {
  await overridesReady();
  const logical = logicalImagePath(c.req.path);
  if (!logical) return null;
  const item = current.get(logical);
  if (!item) return null;
  const requested = c.req.query('v') ?? '';
  const etag = '"' + item.sha + '"';
  if (c.req.header('if-none-match') === etag) {
    return c.body(null, 304, { ETag: etag });
  }
  const bytes = await readOverrideBytes(item);
  if (!bytes) {
    // 覆盖对象丢了（桶被清 / 迁移）：回退成原图，别让页面 404
    console.warn('override object missing, falling back to original:', logical);
    return null;
  }
  const data = new Uint8Array(bytes);
  return c.body(data.buffer as ArrayBuffer, 200, {
    'Content-Type': 'image/webp',
    'Content-Length': String(data.byteLength),
    'Cache-Control': requested && requested === item.v ? 'public, max-age=31536000, immutable' : 'no-cache',
    ETag: etag,
    'X-Content-Type-Options': 'nosniff',
    'X-Image-Override': '1'
  });
}

/* ---------------- 管理端点 ---------------- */

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function requireLogin(c: Context): Response | null {
  return requireAdmin(c);
}

function audit(action: string, target: string, detail: unknown, c: Context, name: string): void {
  const ip = c.req.header('cf-connecting-ip') ?? (c.req.header('x-forwarded-for') ?? '').split(',')[0].trim();
  db()
    .prepare('INSERT INTO audit (ts, action, path, detail, ip, ua) VALUES (?, ?, ?, ?, ?, ?)')
    .run(
      Date.now(),
      action,
      target,
      typeof detail === 'string' ? detail : JSON.stringify(detail ?? null),
      ip,
      String(c.req.header('user-agent') ?? '').slice(0, 200) || name
    );
}

function originalFile(logical: string): string | null {
  const file = allowed.get(logical);
  return file && existsSync(file) ? file : null;
}

async function convert(input: Buffer): Promise<{ buffer: Buffer; width: number; height: number }> {
  const meta = await sharp(input, { failOn: 'error' }).metadata();
  if (!meta.width || !meta.height) throw new Error('无法解析图片尺寸');
  if (meta.width * meta.height > 40_000_000) throw new Error('图片像素过多（超过 4000 万）');
  const buffer = await sharp(input, { failOn: 'error' })
    .rotate()
    .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100, effort: 4 })
    .toBuffer();
  const out = await sharp(buffer).metadata();
  return { buffer, width: out.width ?? 0, height: out.height ?? 0 };
}

function pruneVersions(logical: string): void {
  const rows = db()
    .prepare('SELECT id, sha, object_key FROM override_versions WHERE path = ? ORDER BY id DESC')
    .all(logical) as { id: number; sha: string; object_key: string }[];
  for (const row of rows.slice(KEEP_VERSIONS)) {
    db().prepare('DELETE FROM override_versions WHERE id = ?').run(row.id);
    const still = db()
      .prepare('SELECT COUNT(*) AS n FROM override_versions WHERE sha = ?')
      .get(row.sha) as { n: number };
    if ((still?.n ?? 0) > 0) continue;
    void deleteObject(mediaKey(row.object_key));
    try {
      const file = localObject(row.sha);
      if (existsSync(file)) unlinkSync(file);
    } catch {
      // 本地清理失败无所谓
    }
    cacheDelete(row.sha);
  }
}

export const adminImages = new Hono();

adminImages.post('/admin/image/preview', async (c) => {
  const denied = requireLogin(c);
  if (denied) return denied;
  const form = (await c.req.parseBody().catch(() => null)) as Record<string, unknown> | null;
  const file = form?.file;
  if (!file || typeof file === 'string') return c.json({ error: '请选择图片' }, 400);
  const upload = file as File;
  if (upload.size > MAX_INPUT_BYTES) return c.json({ error: '图片不能超过 10MB' }, 413);
  const logical = String(form?.path ?? '').trim();
  if (logical && !allowed.has(logical)) return c.json({ error: '这张图不在可替换清单里' }, 404);

  let result: { buffer: Buffer; width: number; height: number };
  try {
    result = await convert(Buffer.from(await upload.arrayBuffer()));
  } catch (err) {
    return c.json({ error: (err as Error)?.message || '图片解析失败' }, 422);
  }

  let aspectDelta = 0;
  let originalSize: { width: number; height: number } | null = null;
  const file0 = logical ? originalFile(logical) : null;
  if (file0) {
    try {
      const meta = await sharp(file0).metadata();
      if (meta.width && meta.height) {
        originalSize = { width: meta.width, height: meta.height };
        const before = meta.width / meta.height;
        const after = result.width / result.height;
        aspectDelta = before > 0 ? Math.abs(after - before) / before : 0;
      }
    } catch {
      originalSize = null;
    }
  }

  const sha = sha256(result.buffer);
  const token = randomBytes(12).toString('hex');
  for (const [key, item] of previews) {
    if (Date.now() - item.at > 10 * 60 * 1000) previews.delete(key);
  }
  while (previews.size >= 8) {
    const oldest = previews.keys().next();
    if (oldest.done) break;
    previews.delete(oldest.value);
  }
  previews.set(token, { buffer: result.buffer, sha, width: result.width, height: result.height, bytes: result.buffer.byteLength, at: Date.now() });

  return c.json({
    token,
    sha,
    width: result.width,
    height: result.height,
    bytes: result.buffer.byteLength,
    original: originalSize,
    aspectDelta,
    dataUrl: 'data:image/webp;base64,' + result.buffer.toString('base64')
  });
});

adminImages.post('/admin/image/commit', async (c) => {
  const denied = requireLogin(c);
  if (denied) return denied;
  const body = (await c.req.json().catch(() => null)) as { path?: string; token?: string } | null;
  const logical = String(body?.path ?? '').trim();
  const token = String(body?.token ?? '');
  if (!logical || !allowed.has(logical)) return c.json({ error: '这张图不在可替换清单里' }, 404);
  const preview = previews.get(token);
  if (!preview) return c.json({ error: '预览已过期，请重新选择图片' }, 410);

  const objectKey = 'overrides/' + preview.sha.slice(0, 16) + '.webp';
  const file = localObject(preview.sha);
  try {
    mkdirSync(OBJECT_DIR, { recursive: true });
    writeFileSync(file, preview.buffer);
  } catch (err) {
    return c.json({ error: '本地写入失败：' + ((err as Error)?.message || '未知错误') }, 500);
  }
  if (hasObjectStore) {
    try {
      await putObjectBytes(mediaKey(objectKey), preview.buffer, 'image/webp');
    } catch (err) {
      return c.json({ error: '对象存储写入失败：' + ((err as Error)?.message || '未知错误') }, 502);
    }
  }

  const session = adminSession(c);
  const created = Date.now();
  const info = db()
    .prepare(
      `INSERT INTO override_versions (path, sha, object_key, bytes, width, height, action, admin, ip, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'replace', ?, ?, ?)`
    )
    .run(
      logical,
      preview.sha,
      objectKey,
      preview.bytes,
      preview.width,
      preview.height,
      session?.name ?? 'admin',
      c.req.header('cf-connecting-ip') ?? '',
      created
    );
  const versionId = Number(info.lastInsertRowid);
  db()
    .prepare(
      `INSERT INTO override_current (path, version_id, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(path) DO UPDATE SET version_id = excluded.version_id, updated_at = excluded.updated_at`
    )
    .run(logical, versionId, created);
  audit('replace', logical, { sha: preview.sha, width: preview.width, height: preview.height, bytes: preview.bytes }, c, session?.name ?? 'admin');
  previews.delete(token);
  pruneVersions(logical);
  loadCurrent();
  scheduleMirror();
  return c.json({ path: logical, v: preview.sha.slice(0, 10), versionId, width: preview.width, height: preview.height, bytes: preview.bytes });
});

adminImages.post('/admin/image/revert', async (c) => {
  const denied = requireLogin(c);
  if (denied) return denied;
  const body = (await c.req.json().catch(() => null)) as { path?: string } | null;
  const logical = String(body?.path ?? '').trim();
  if (!logical) return c.json({ error: '缺少图片路径' }, 400);
  const now = db()
    .prepare('SELECT version_id FROM override_current WHERE path = ?')
    .get(logical) as { version_id: number } | undefined;
  if (!now) return c.json({ error: '这张图没有被替换过' }, 404);
  const prev = db()
    .prepare('SELECT id, sha FROM override_versions WHERE path = ? AND id < ? ORDER BY id DESC LIMIT 1')
    .get(logical, now.version_id) as { id: number; sha: string } | undefined;
  if (!prev) return c.json({ error: '没有更早的版本可回退' }, 404);
  db()
    .prepare('UPDATE override_current SET version_id = ?, updated_at = ? WHERE path = ?')
    .run(prev.id, Date.now(), logical);
  const session = adminSession(c);
  audit('revert', logical, { to: prev.sha }, c, session?.name ?? 'admin');
  loadCurrent();
  scheduleMirror();
  return c.json({ path: logical, v: prev.sha.slice(0, 10) });
});

adminImages.post('/admin/image/original', async (c) => {
  const denied = requireLogin(c);
  if (denied) return denied;
  const body = (await c.req.json().catch(() => null)) as { path?: string } | null;
  const logical = String(body?.path ?? '').trim();
  if (!logical) return c.json({ error: '缺少图片路径' }, 400);
  const info = db().prepare('DELETE FROM override_current WHERE path = ?').run(logical);
  if (!info.changes) return c.json({ error: '这张图没有被替换过' }, 404);
  const session = adminSession(c);
  audit('restore-original', logical, null, c, session?.name ?? 'admin');
  loadCurrent();
  scheduleMirror();
  return c.json({ path: logical, v: '' });
});

adminImages.get('/admin/image/history', async (c) => {
  const denied = requireLogin(c);
  if (denied) return denied;
  const logical = String(c.req.query('path') ?? '').trim();
  if (!logical) return c.json({ error: '缺少图片路径' }, 400);
  const now = db()
    .prepare('SELECT version_id FROM override_current WHERE path = ?')
    .get(logical) as { version_id: number } | undefined;
  const versions = db()
    .prepare(
      `SELECT id, sha, width, height, bytes, created_at, action FROM override_versions
        WHERE path = ? ORDER BY id DESC LIMIT 8`
    )
    .all(logical) as { id: number; sha: string; width: number; height: number; bytes: number; created_at: number; action: string }[];
  return c.json({
    path: logical,
    currentVersionId: now?.version_id ?? 0,
    versions: versions.map((v) => ({ ...v, v: v.sha.slice(0, 10), current: v.id === now?.version_id }))
  });
});

/** 供前端改写图片地址用的「逻辑路径 → 版本号」映射。 */
adminImages.get('/image-overrides', async (c) => {
  await overridesReady();
  const map: Record<string, string> = {};
  for (const [key, item] of current) map[key] = item.v;
  c.header('Cache-Control', 'no-cache');
  return c.json({ overrides: map });
});

/** 同步脚本：让页面在首屏渲染前就拿到版本串（异步 fetch 会晚于首次渲染）。 */
export async function imageVersionsScript(): Promise<string> {
  await overridesReady();
  const map: Record<string, string> = {};
  for (const [key, item] of current) map[key] = item.v;
  return 'window.WZ_IMAGE_VERSIONS = ' + JSON.stringify(map) + ';\n';
}
