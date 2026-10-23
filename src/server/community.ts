import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import path from 'node:path';
import { checkText } from './moderation.js';
import { adminName } from './admin-auth.js';

/* 对象存储（RustFS）：上传图与社区状态都放这里，容器重新部署不会丢。
   没配凭证时自动退回容器本地盘，方便本地开发。 */
const endpoint = process.env.RUSTFS_ENDPOINT;
const bucket = process.env.RUSTFS_BUCKET ?? 'wzsj-media';
const accessKeyId = process.env.RUSTFS_ACCESS_KEY;
const secretAccessKey = process.env.RUSTFS_SECRET_KEY;
const s3 =
  endpoint && accessKeyId && secretAccessKey
    ? new S3Client({ endpoint, region: 'us-east-1', forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } })
    : null;
const STORE_KEY = 'public/community/community.json';

type User = { id: string; email: string; name: string; salt: string; hash: string; createdAt: number };
type Post = { id: string; userId: string; user: string; text: string; image?: string; ts: number };
type Photo = { id: string; userId: string; user: string; image: string; caption: string; ts: number };
type Store = { users: User[]; posts: Post[]; photos: Photo[] };

const dataPath = process.env.COMMUNITY_DATA || path.resolve(process.cwd(), '.data/community.json');
const SESSION_COOKIE = 'wz_session';
const sessions = new Map<string, { userId: string; exp: number }>();

function normalize(d: Store | null): Store {
  const out = d || ({} as Store);
  out.users ||= [];
  out.posts ||= [];
  out.photos ||= [];
  return out;
}

/** 本地缓存优先；本地没有（新容器）时从对象存储拉一份回来。 */
async function loadStore(): Promise<Store> {
  try {
    if (existsSync(dataPath)) return normalize(JSON.parse(readFileSync(dataPath, 'utf8')) as Store);
  } catch {}
  if (s3) {
    try {
      const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: STORE_KEY }));
      const text = res.Body ? await res.Body.transformToString() : '';
      if (text) {
        const parsed = normalize(JSON.parse(text) as Store);
        try {
          mkdirSync(path.dirname(dataPath), { recursive: true });
          writeFileSync(dataPath, text, 'utf8');
        } catch {}
        return parsed;
      }
    } catch {
      // 对象还不存在：当作空库
    }
  }
  return normalize(null);
}

let store: Store = normalize(null);
let storeLoaded: Promise<void> | null = null;
/** 第一次用到时加载；之后 save() 负责双向同步。 */
function ensureStore(): Promise<void> {
  if (!storeLoaded) storeLoaded = loadStore().then((d) => { store = d; });
  return storeLoaded;
}

/** 本地立即落盘（快），再异步推到对象存储（跨部署持久）。 */
async function save(): Promise<void> {
  const text = JSON.stringify(store, null, 2);
  try {
    mkdirSync(path.dirname(dataPath), { recursive: true });
    writeFileSync(dataPath, text, 'utf8');
  } catch {}
  if (s3) {
    try {
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: STORE_KEY, Body: text, ContentType: 'application/json' }));
    } catch (err) {
      console.error('community store push failed:', (err as Error)?.message ?? err);
    }
  }
}

/** 裁掉过期条目时，把对应的上传图也从对象存储删掉，避免只增不减。 */
async function dropObjects(urls: string[]): Promise<void> {
  if (!s3) return;
  for (const url of urls) {
    if (!url || url.indexOf('/media/uploads/') !== 0) continue;
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: 'public/' + url.replace(/^\/media\//, '') }));
    } catch {}
  }
}
function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') };
}
function verify(user: User, password: string) {
  const got = Buffer.from(hashPassword(password, user.salt).hash, 'hex');
  const want = Buffer.from(user.hash, 'hex');
  return got.length === want.length && timingSafeEqual(got, want);
}
function currentUser(c: any) {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  const s = sessions.get(token);
  if (!s || s.exp < Date.now()) { sessions.delete(token); return null; }
  const user = store.users.find((u) => u.id === s.userId);
  return user || null;
}
function publicUser(u: User | null) {
  return u ? { id: u.id, email: u.email, name: u.name } : null;
}
function setSession(c: any, userId: string) {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { userId, exp: Date.now() + 7 * 24 * 3600 * 1000 });
  setCookie(c, SESSION_COOKIE, token, { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 7 * 24 * 3600, secure: process.env.NODE_ENV === 'production' });
}
function clearSession(c: any) {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) sessions.delete(token);
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

export const community = new Hono();

// 所有端点先确保状态已加载（首次请求会从对象存储拉回 community.json）
community.use('*', async (_c, next) => {
  await ensureStore();
  await next();
});

community.get('/health', (c) => c.json({ ok: true, service: 'wzsj-community' }));
community.get('/config', (c) => c.json({ ready: true, provider: 'email' }));
// 管理员会话是独立 cookie（wz_admin），与社区账号会话互不影响
community.get('/me', (c) => c.json({ user: publicUser(currentUser(c)), admin: adminName(c) }));

community.post('/auth/register', async (c) => {
  const body = await c.req.json().catch(() => null) as any;
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  const name = String(body?.name || '').trim().slice(0, 24) || email.split('@')[0];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: '邮箱格式不正确' }, 400);
  if (password.length < 8) return c.json({ error: '密码至少 8 位' }, 400);
  if (store.users.some((u) => u.email === email)) return c.json({ error: '邮箱已注册' }, 409);
  const { salt, hash } = hashPassword(password);
  const user: User = { id: randomBytes(12).toString('hex'), email, name, salt, hash, createdAt: Date.now() };
  store.users.push(user); await save();
  setSession(c, user.id);
  return c.json({ user: publicUser(user) });
});

community.post('/auth/login', async (c) => {
  const body = await c.req.json().catch(() => null) as any;
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  const user = store.users.find((u) => u.email === email);
  if (!user || !verify(user, password)) return c.json({ error: '邮箱或密码不正确' }, 401);
  setSession(c, user.id);
  return c.json({ user: publicUser(user) });
});

community.post('/auth/logout', (c) => { clearSession(c); return c.json({ ok: true }); });

const UPLOAD_DIR = path.resolve(process.cwd(), '.data/uploads');
/** 新上传在对象存储（/media/uploads/…），历史本地文件是 /api/uploads/…，两种都认。 */
function isUploadUrl(url: string): boolean {
  return url.startsWith('/media/uploads/') || url.startsWith(UPLOAD_PREFIX);
}
const UPLOAD_PREFIX = '/api/uploads/';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

community.post('/upload', async (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: '请先登录' }, 401);
  const form = await c.req.parseBody().catch(() => null) as any;
  const file = form?.file;
  if (!file || typeof file === 'string') return c.json({ error: '请选择图片' }, 400);
  if (file.size > MAX_IMAGE_BYTES) return c.json({ error: '图片不能超过 5MB' }, 413);
  const type = String(file.type || '');
  if (type && type !== 'application/octet-stream' && !['image/jpeg', 'image/png', 'image/webp'].includes(type)) return c.json({ error: '只支持 JPG / PNG / WebP' }, 415);
  const input = Buffer.from(await file.arrayBuffer());
  try {
    const probe = sharp(input, { failOn: 'error' });
    const meta = await probe.metadata();
    if (!meta.width || !meta.height || meta.width < 16 || meta.height < 16) return c.json({ error: '图片尺寸过小' }, 422);
    if (meta.width * meta.height > 40_000_000) return c.json({ error: '图片尺寸过大' }, 422);
    const output = await sharp(input).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const name = randomBytes(16).toString('hex') + '.webp';
    if (s3) {
      // 对象键与 /media 代理对齐：public/uploads/<name> → /media/uploads/<name>
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: 'public/uploads/' + name,
        Body: output,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      return c.json({ url: '/media/uploads/' + name, width: meta.width, height: meta.height });
    }
    // 没配对象存储（本地开发）才落容器本地盘
    mkdirSync(UPLOAD_DIR, { recursive: true });
    writeFileSync(path.join(UPLOAD_DIR, name), output);
    return c.json({ url: UPLOAD_PREFIX + name, width: meta.width, height: meta.height });
  } catch {
    return c.json({ error: '图片解析失败' }, 422);
  }
});

community.get('/uploads/:name', (c) => {
  const name = c.req.param('name');
  if (!/^[a-f0-9]{32}\.webp$/.test(name)) return c.json({ error: 'not found' }, 404);
  const file = path.join(UPLOAD_DIR, name);
  if (!existsSync(file)) return c.json({ error: 'not found' }, 404);
  c.header('Content-Type', 'image/webp');
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  return c.body(readFileSync(file));
});

community.post('/moderate', async (c) => {
  const body = await c.req.json().catch(() => null) as any;
  const text = String(body?.text || '').slice(0, 2000);
  const result = checkText(text);
  return c.json({ ok: result.ok, hits: result.hits });
});

community.get('/posts', (c) => c.json({ posts: store.posts.slice(-100) }));
community.post('/posts', async (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: '请先登录' }, 401);
  const body = await c.req.json().catch(() => null) as any;
  const text = String(body?.text || '').trim().slice(0, 500);
  const image = String(body?.image || '');
  if (!text && !image) return c.json({ error: '内容不能为空' }, 400);
  if (image && !isUploadUrl(image)) return c.json({ error: '图片地址无效' }, 400);
  const audit = checkText(text);
  if (!audit.ok) return c.json({ error: '内容包含不当词汇，请修改后重试', hits: audit.hits }, 422);
  const last = store.posts.filter((p) => p.userId === user.id).slice(-1)[0];
  if (last && Date.now() - last.ts < 1500) return c.json({ error: '发送太快，稍后再试' }, 429);
  const post: Post = { id: randomBytes(8).toString('hex'), userId: user.id, user: user.name, text, image: image || undefined, ts: Date.now() };
  store.posts.push(post);
  if (store.posts.length > 2000) {
    const dropped = store.posts.slice(0, store.posts.length - 2000);
    store.posts = store.posts.slice(-2000);
    await dropObjects(dropped.map((p) => p.image ?? ''));
  }
  await save();
  return c.json({ post });
});

community.get('/photos', (c) => c.json({ photos: store.photos.slice(-100) }));
community.post('/photos', async (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: '请先登录' }, 401);
  const body = await c.req.json().catch(() => null) as any;
  const image = String(body?.image || '');
  const caption = String(body?.caption || '').trim().slice(0, 120);
  if (!isUploadUrl(image)) return c.json({ error: '请先上传图片' }, 400);
  const audit = checkText(caption);
  if (!audit.ok) return c.json({ error: '图片说明包含不当词汇', hits: audit.hits }, 422);
  const photo: Photo = { id: randomBytes(8).toString('hex'), userId: user.id, user: user.name, image, caption, ts: Date.now() };
  store.photos.push(photo);
  if (store.photos.length > 500) {
    const dropped = store.photos.slice(0, store.photos.length - 500);
    store.photos = store.photos.slice(-500);
    await dropObjects(dropped.map((p) => p.image));
  }
  await save();
  return c.json({ photo });
});
community.get('/explored', (c) => c.json({ explored: [] }));
