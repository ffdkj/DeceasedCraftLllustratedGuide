/* 管理端持久化：SQLite 存元数据（图片覆盖 / 管理员会话 / 审计 / 登录失败），
   整份状态再镜像到 RustFS —— Zeabur 目前没给 wzsj-atlas 挂卷，
   容器盘随时会被清空，桶里的镜像才是跨部署的真相源。

   启动顺序：openDb() → hydrate()（本地库为空就从镜像回灌）→ 之后每次改动 scheduleMirror()。 */
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getObjectText, putObjectBytes } from './objects.js';

/** DATA_DIR：优先环境变量，其次平台约定的 /data（挂卷），最后容器盘 .data/。 */
export const DATA_DIR = resolveDataDir();
export const STATE_KEY = 'public/admin/state.json';
const LOCAL_MIRROR = path.join(DATA_DIR, 'admin-state.json');

function resolveDataDir(): string {
  const env = (process.env.DATA_DIR ?? '').trim();
  if (env) return path.resolve(env);
  try {
    if (existsSync('/data')) return '/data';
  } catch {
    // ignore
  }
  return path.resolve(process.cwd(), '.data');
}

let handle: DatabaseSync | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS override_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  sha TEXT NOT NULL,
  object_key TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  action TEXT NOT NULL DEFAULT 'replace',
  admin TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_override_path ON override_versions(path, id DESC);
CREATE TABLE IF NOT EXISTS override_current (
  path TEXT PRIMARY KEY,
  version_id INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  ua TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS login_fails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_fails ON login_fails(ip, ts);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  action TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  ua TEXT NOT NULL DEFAULT ''
);
`;

export interface MirrorState {
  schema: number;
  savedAt: number;
  override_versions: Record<string, unknown>[];
  override_current: Record<string, unknown>[];
  admin_sessions: Record<string, unknown>[];
  audit: Record<string, unknown>[];
}

export function openDb(): DatabaseSync {
  if (handle) return handle;
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(path.join(DATA_DIR, 'admin.db'));
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 3000');
  db.exec(SCHEMA);
  handle = db;
  return db;
}

export function db(): DatabaseSync {
  return openDb();
}

function rows<T>(sql: string, ...params: (string | number)[]): T[] {
  return db().prepare(sql).all(...params) as T[];
}

function insertMany(table: string, columns: string[], list: Record<string, unknown>[]): void {
  if (!list.length) return;
  const stmt = db().prepare(
    `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
  );
  for (const item of list) stmt.run(...columns.map((c) => (item[c] ?? '') as string | number));
}

const VERSION_COLUMNS = ['id', 'path', 'sha', 'object_key', 'bytes', 'width', 'height', 'action', 'admin', 'ip', 'created_at'];
const SESSION_COLUMNS = ['token_hash', 'created_at', 'expires_at', 'ip', 'ua'];
const AUDIT_COLUMNS = ['id', 'ts', 'action', 'path', 'detail', 'ip', 'ua'];

function dump(): MirrorState {
  return {
    schema: 1,
    savedAt: Date.now(),
    override_versions: rows('SELECT * FROM override_versions ORDER BY id'),
    override_current: rows('SELECT * FROM override_current'),
    admin_sessions: rows('SELECT * FROM admin_sessions WHERE expires_at > ?', Date.now()),
    audit: rows('SELECT * FROM audit ORDER BY id DESC LIMIT 1000')
  };
}

function emptyLocal(): boolean {
  const versions = rows<{ n: number }>('SELECT COUNT(*) AS n FROM override_versions')[0];
  const sessions = rows<{ n: number }>('SELECT COUNT(*) AS n FROM admin_sessions')[0];
  return (versions?.n ?? 0) === 0 && (sessions?.n ?? 0) === 0;
}

function applyMirror(state: MirrorState): void {
  insertMany('override_versions', VERSION_COLUMNS, state.override_versions ?? []);
  insertMany('override_current', ['path', 'version_id', 'updated_at'], state.override_current ?? []);
  insertMany('admin_sessions', SESSION_COLUMNS, state.admin_sessions ?? []);
  insertMany('audit', AUDIT_COLUMNS, state.audit ?? []);
}

/** 本地库为空（新容器 / 卷丢了）时从镜像回灌；本地有数据就信本地。 */
export async function hydrate(): Promise<'local' | 'file' | 'object' | 'empty'> {
  openDb();
  if (!emptyLocal()) return 'local';
  const sources: [string, () => Promise<string | null>][] = [
    ['file', async () => (existsSync(LOCAL_MIRROR) ? readFileSync(LOCAL_MIRROR, 'utf8') : null)],
    ['object', () => getObjectText(STATE_KEY)]
  ];
  for (const [name, read] of sources) {
    try {
      const text = await read();
      if (!text) continue;
      const state = JSON.parse(text) as MirrorState;
      if (!state || state.schema !== 1) continue;
      applyMirror(state);
      return name as 'file' | 'object';
    } catch {
      // 坏镜像当没有
    }
  }
  return 'empty';
}

let timer: NodeJS.Timeout | null = null;
let flushing: Promise<void> | null = null;

/** 改动后调用：本地立即落盘，桶里的镜像攒 400ms 合并写一次。 */
export function scheduleMirror(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void flushMirror();
  }, 400);
  timer.unref?.();
}

export async function flushMirror(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const state = dump();
    const text = JSON.stringify(state, null, 2);
    try {
      writeFileSync(LOCAL_MIRROR, text, 'utf8');
    } catch {
      // 只读卷等情况下忽略本地写
    }
    try {
      await putObjectBytes(STATE_KEY, Buffer.from(text, 'utf8'), 'application/json');
    } catch (err) {
      console.error('admin state mirror failed:', (err as Error)?.message ?? err);
    }
  })();
  try {
    await flushing;
  } finally {
    flushing = null;
  }
}
