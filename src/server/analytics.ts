/* 轻量站点数据：页面上报 + 管理员统计。
   只记录匿名访问路径与随机访客 ID，不记录账号内容。 */
import { Hono } from 'hono';
import type { Context } from 'hono';
import { db } from './db.js';
import { requireAdmin } from './admin-auth.js';

export const analyticsApi = new Hono();

function clientIp(c: Context): string {
  const cf = c.req.header('cf-connecting-ip');
  if (cf) return cf;
  const xff = c.req.header('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}

function dayKey(ts: number): string {
  return new Date(ts + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

analyticsApi.post('/analytics/hit', async (c) => {
  const body = await c.req.json().catch(() => null) as any;
  const path = String(body?.path || '').slice(0, 240);
  if (!path) return c.json({ ok: false }, 400);
  const visitor = String(body?.visitor || '').slice(0, 80) || ('ip:' + clientIp(c));
  const now = Date.now();
  try {
    db().prepare('INSERT INTO page_views (ts, day, path, visitor, ip, ua) VALUES (?, ?, ?, ?, ?, ?)')
      .run(now, dayKey(now), path, visitor, clientIp(c), String(c.req.header('user-agent') ?? '').slice(0, 200));
    if (Math.random() < 0.02) db().prepare('DELETE FROM page_views WHERE ts < ?').run(now - 180 * 24 * 3600 * 1000);
  } catch (e) {
    return c.json({ ok: false }, 500);
  }
  return c.json({ ok: true });
});

analyticsApi.get('/admin/analytics', (c) => {
  const denied = requireAdmin(c);
  if (denied) return denied;
  const now = Date.now();
  const today = dayKey(now);
  const row = (sql: string, ...args: (string | number)[]) => db().prepare(sql).get(...args) as any;
  const all = (sql: string, ...args: (string | number)[]) => db().prepare(sql).all(...args) as any[];
  const online = row('SELECT COUNT(DISTINCT visitor) AS n FROM page_views WHERE ts > ?', now - 5 * 60 * 1000)?.n ?? 0;
  const todayViews = row('SELECT COUNT(*) AS n FROM page_views WHERE day = ?', today)?.n ?? 0;
  const todayVisitors = row('SELECT COUNT(DISTINCT visitor) AS n FROM page_views WHERE day = ?', today)?.n ?? 0;
  const total = row('SELECT COUNT(*) AS n FROM page_views')?.n ?? 0;
  const fromDay = dayKey(now - 13 * 24 * 3600 * 1000);
  const daily = all('SELECT day, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors FROM page_views WHERE day >= ? GROUP BY day ORDER BY day DESC', fromDay);
  return c.json({
    online,
    today: { views: todayViews, visitors: todayVisitors },
    total,
    daily,
    serverTime: now
  });
});
