import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type User = { id: string; email: string; name: string; salt: string; hash: string; createdAt: number };
type Post = { id: string; userId: string; user: string; text: string; ts: number };
type Store = { users: User[]; posts: Post[] };

const dataPath = process.env.COMMUNITY_DATA || path.resolve(process.cwd(), '.data/community.json');
const SESSION_COOKIE = 'wz_session';
const sessions = new Map<string, { userId: string; exp: number }>();

function load(): Store {
  try {
    if (existsSync(dataPath)) return JSON.parse(readFileSync(dataPath, 'utf8')) as Store;
  } catch {}
  return { users: [], posts: [] };
}
let store = load();

function save() {
  mkdirSync(path.dirname(dataPath), { recursive: true });
  writeFileSync(dataPath, JSON.stringify(store, null, 2), 'utf8');
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

community.get('/health', (c) => c.json({ ok: true, service: 'wzsj-community' }));
community.get('/config', (c) => c.json({ ready: true, provider: 'email' }));
community.get('/me', (c) => c.json({ user: publicUser(currentUser(c)) }));

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
  store.users.push(user); save();
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

community.get('/posts', (c) => c.json({ posts: store.posts.slice(-100) }));
community.post('/posts', async (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: '请先登录' }, 401);
  const body = await c.req.json().catch(() => null) as any;
  const text = String(body?.text || '').trim().slice(0, 500);
  if (!text) return c.json({ error: '内容不能为空' }, 400);
  const last = store.posts.filter((p) => p.userId === user.id).slice(-1)[0];
  if (last && Date.now() - last.ts < 1500) return c.json({ error: '发送太快，稍后再试' }, 429);
  const post: Post = { id: randomBytes(8).toString('hex'), userId: user.id, user: user.name, text, ts: Date.now() };
  store.posts.push(post);
  if (store.posts.length > 2000) store.posts = store.posts.slice(-2000);
  save();
  return c.json({ post });
});

community.get('/photos', (c) => c.json({ photos: [] }));
community.get('/explored', (c) => c.json({ explored: [] }));
