/* 唯一管理员账号：凭据只来自环境变量（ADMIN_EMAIL + ADMIN_PASSWORD），不落库、不可注册第二个人。
   会话写 SQLite（重启/重部署不掉线），登录失败按 IP 计数（5 次 / 10 分钟）。 */
import { Hono } from 'hono';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { db, scheduleMirror } from './db.js';

const COOKIE = 'wz_admin';
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;
const FAIL_WINDOW_MS = 10 * 60 * 1000;
const FAIL_LIMIT = 5;

export const ADMIN_NAME = (process.env.ADMIN_EMAIL ?? process.env.ADMIN_USER ?? '').trim();
const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? '';
export const adminConfigured = ADMIN_NAME.length > 0 && ADMIN_PASS.length > 0;

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function sameSecret(given: string, expected: string): boolean {
  // 先各自哈希成等长摘要，再定长比较：不泄露长度与逐字节时间差
  const a = Buffer.from(sha256(given), 'hex');
  const b = Buffer.from(sha256(expected), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function clientIp(c: Context): string {
  const cf = c.req.header('cf-connecting-ip');
  if (cf) return cf;
  const xff = c.req.header('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}

export interface AdminSession {
  name: string;
  tokenHash: string;
  expiresAt: number;
}

export function adminSession(c: Context): AdminSession | null {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  const tokenHash = sha256(token);
  const row = db()
    .prepare('SELECT token_hash, expires_at FROM admin_sessions WHERE token_hash = ?')
    .get(tokenHash) as { token_hash: string; expires_at: number } | undefined;
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db().prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash);
    scheduleMirror();
    return null;
  }
  return { name: ADMIN_NAME, tokenHash, expiresAt: row.expires_at };
}

export function adminName(c: Context): string | null {
  const session = adminSession(c);
  return session ? session.name : null;
}

/** 没登录就 401，登录了就继续 —— 供管理端点复用。 */
export function requireAdmin(c: Context): Response | null {
  if (adminSession(c)) return null;
  return c.json({ error: '请先登录管理员账号' }, 401);
}

function failCount(ip: string): number {
  const since = Date.now() - FAIL_WINDOW_MS;
  const row = db()
    .prepare('SELECT COUNT(*) AS n FROM login_fails WHERE ip = ? AND ts > ?')
    .get(ip, since) as { n: number } | undefined;
  return row?.n ?? 0;
}

function noteFail(ip: string): void {
  db().prepare('INSERT INTO login_fails (ip, ts) VALUES (?, ?)').run(ip, Date.now());
  db().prepare('DELETE FROM login_fails WHERE ts < ?').run(Date.now() - FAIL_WINDOW_MS);
  scheduleMirror();
}

export const adminApi = new Hono();

adminApi.get('/admin/config', (c) =>
  c.json({ configured: adminConfigured, name: adminConfigured ? ADMIN_NAME : '' })
);

adminApi.get('/admin/session', (c) => {
  const session = adminSession(c);
  return c.json({ admin: session ? { name: session.name, expiresAt: session.expiresAt } : null });
});

adminApi.post('/admin/login', async (c) => {
  if (!adminConfigured) return c.json({ error: '服务器未配置管理员账号（ADMIN_EMAIL / ADMIN_PASSWORD）' }, 503);
  const ip = clientIp(c);
  if (failCount(ip) >= FAIL_LIMIT) return c.json({ error: '尝试次数过多，请 10 分钟后再试' }, 429);

  const body = (await c.req.json().catch(() => null)) as { user?: string; password?: string } | null;
  const user = String(body?.user ?? '').trim();
  const password = String(body?.password ?? '');
  const okUser = user.length > 0 && user.toLowerCase() === ADMIN_NAME.toLowerCase();
  const okPass = sameSecret(password, ADMIN_PASS);
  if (!okUser || !okPass) {
    noteFail(ip);
    const left = Math.max(0, FAIL_LIMIT - failCount(ip));
    return c.json({ error: '账号或密码不正确', left }, 401);
  }

  const token = randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db()
    .prepare('INSERT INTO admin_sessions (token_hash, created_at, expires_at, ip, ua) VALUES (?, ?, ?, ?, ?)')
    .run(tokenHash, Date.now(), expiresAt, ip, String(c.req.header('user-agent') ?? '').slice(0, 200));
  db().prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(Date.now());
  db().prepare('DELETE FROM login_fails WHERE ip = ?').run(ip);
  scheduleMirror();
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    secure: process.env.NODE_ENV === 'production'
  });
  return c.json({ admin: { name: ADMIN_NAME, expiresAt } });
});

adminApi.post('/admin/logout', (c) => {
  const session = adminSession(c);
  if (session) {
    db().prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(session.tokenHash);
    scheduleMirror();
  }
  deleteCookie(c, COOKIE, { path: '/' });
  return c.json({ ok: true });
});
