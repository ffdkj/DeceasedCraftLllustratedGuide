import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import type { Context } from 'hono';
import { Readable } from 'node:stream';
import { loadEnvFile } from 'node:process';

try {
  loadEnvFile();
} catch {
  // production env vars are provided by the platform
}

const endpoint = process.env.RUSTFS_ENDPOINT;
const bucket = process.env.RUSTFS_BUCKET ?? 'wzsj-media';
const accessKeyId = process.env.RUSTFS_ACCESS_KEY;
const secretAccessKey = process.env.RUSTFS_SECRET_KEY;

// 单次 S3 往返上限：超过即 abort 并返回 504，不让请求挂到 Cloudflare 的 100s origin 超时。
const S3_TIMEOUT_MS = 5000;

// 小图内存缓存：图片都在几十 KB 量级（实测最大 22 KB），缓存命中后完全不打 S3。
const IMAGE_PATH = /\.(?:webp|png|jpe?g|gif|avif|svg)$/i;
const MAX_ITEM_BYTES = 512 * 1024;
const MAX_TOTAL_BYTES = 24 * 1024 * 1024;

const s3 =
  endpoint && accessKeyId && secretAccessKey
    ? new S3Client({
        endpoint,
        region: 'us-east-1',
        forcePathStyle: true,
        credentials: { accessKeyId, secretAccessKey }
      })
    : null;

function objectKey(pathname: string): string | null {
  let rest = pathname.replace(/^\/media(?=\/|$)/, '').replace(/^\/+/, '');
  try {
    rest = decodeURIComponent(rest);
  } catch {
    return null;
  }
  if (!rest || rest.includes('..') || rest.includes('\\')) return null;
  return `public/${rest}`;
}

function isAbort(err: any): boolean {
  return (
    err?.name === 'AbortError' ||
    err?.name === 'TimeoutError' ||
    err?.code === 'ERR_CANCELED' ||
    err?.cause?.name === 'AbortError'
  );
}

// 给每次 S3 调用一个硬上限，并把 AbortSignal 传进 SDK（SDK 会中断底层 socket）。
async function withDeadline<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), S3_TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- 小图 LRU ---------------- */

type Buffered = {
  data: ArrayBuffer;
  contentType: string;
  etag: string;
  lastModified: string;
  byteLength: number;
};

const lru = new Map<string, Buffered>(); // Map 的插入序即 LRU 序（最近使用在末尾）
let lruBytes = 0;

function lruDelete(key: string) {
  const item = lru.get(key);
  if (!item) return;
  lru.delete(key);
  lruBytes -= item.byteLength;
}

function lruGet(key: string): Buffered | null {
  const item = lru.get(key);
  if (!item) return null;
  lru.delete(key);
  lru.set(key, item);
  return item;
}

function lruSet(key: string, item: Buffered) {
  lruDelete(key);
  lru.set(key, item);
  lruBytes += item.byteLength;
  while (lruBytes > MAX_TOTAL_BYTES) {
    const oldest = lru.keys().next();
    if (oldest.done) break;
    lruDelete(oldest.value);
  }
}

/* ---------------- 并发合并（singleflight） ---------------- */

// 同一 key 的并发请求共享一次 S3 读取：冷缓存下 100 个请求 = 1 次回源。
const inflight = new Map<string, Promise<Buffered | null>>();

/* ---------------- 超大对象旁路 ---------------- */

// 单对象超过 MAX_ITEM_BYTES 时不缓存；记一个短期负缓存，避免每次请求都多打一次探测 GET。
const LARGE_TTL_MS = 10 * 60 * 1000;
const LARGE_MAX_KEYS = 512;
const largeKeys = new Map<string, number>();

function isKnownLarge(key: string): boolean {
  const expires = largeKeys.get(key);
  if (!expires) return false;
  if (expires < Date.now()) {
    largeKeys.delete(key);
    return false;
  }
  return true;
}

function markLarge(key: string) {
  if (largeKeys.size >= LARGE_MAX_KEYS) {
    const oldest = largeKeys.keys().next();
    if (!oldest.done) largeKeys.delete(oldest.value);
  }
  largeKeys.set(key, Date.now() + LARGE_TTL_MS);
}

async function readAll(body: unknown): Promise<ArrayBuffer> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
    total += chunk.byteLength;
    if (total > MAX_ITEM_BYTES) throw Object.assign(new Error('object too large'), { name: 'TooLarge' });
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out.buffer as ArrayBuffer;
}

// 返回 null 表示“该对象不适合缓存”（体积超限），调用方改走直连流式。
async function loadBuffered(key: string): Promise<Buffered | null> {
  const client = s3;
  if (!client) return null;
  return withDeadline(async (signal) => {
    const obj = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { abortSignal: signal }
    );
    if (!obj.Body) return null;
    const drop = () => {
      // 不消费的响应体必须显式销毁，否则连接会被占住
      try {
        (obj.Body as { destroy?: () => void }).destroy?.();
      } catch {
        // ignore
      }
    };
    if ((obj.ContentLength ?? 0) > MAX_ITEM_BYTES) {
      drop();
      markLarge(key);
      return null;
    }
    let data: ArrayBuffer;
    try {
      data = await readAll(obj.Body);
    } catch (err: any) {
      if (err?.name === 'TooLarge') {
        drop();
        markLarge(key);
        return null;
      }
      throw err;
    }
    return {
      data,
      contentType: obj.ContentType ?? 'application/octet-stream',
      etag: obj.ETag ?? '',
      lastModified: obj.LastModified?.toUTCString() ?? '',
      byteLength: data.byteLength
    };
  });
}

function loadShared(key: string): Promise<Buffered | null> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const task = loadBuffered(key).then((item) => {
    if (item) lruSet(key, item);
    return item;
  });
  inflight.set(key, task);
  const cleanup = () => {
    inflight.delete(key);
  };
  task.then(cleanup, cleanup);
  return task;
}

function respondBuffered(c: Context, item: Buffered, state: 'HIT' | 'MISS') {
  const headers: Record<string, string> = {
    'Content-Type': item.contentType,
    'Content-Length': String(item.byteLength),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Cache': state
  };
  if (item.etag) headers.ETag = item.etag;
  if (item.lastModified) headers['Last-Modified'] = item.lastModified;
  return c.body(item.data, 200, headers);
}

export async function mediaHandler(c: Context) {
  if (!s3) {
    return c.json({ error: 'media storage is not configured' }, 503);
  }

  const key = objectKey(c.req.path);
  if (!key) return c.json({ error: 'invalid media path' }, 400);

  const range = c.req.header('range');
  const ifNoneMatch = c.req.header('if-none-match');
  const ifModifiedSinceRaw = c.req.header('if-modified-since');
  const ifModifiedSince = ifModifiedSinceRaw ? new Date(ifModifiedSinceRaw) : undefined;

  try {
    if (c.req.method === 'HEAD') {
      const head = await withDeadline((signal) =>
        s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: signal })
      );
      const headers: Record<string, string> = {
        'Content-Type': head.ContentType ?? 'application/octet-stream',
        'Content-Length': String(head.ContentLength ?? 0),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: head.ETag ?? '',
        'Last-Modified': head.LastModified?.toUTCString() ?? ''
      };
      return c.body(null, 200, headers);
    }

    // 只有“无条件 GET + 图片”才走内存缓存；带 Range / 条件头的请求保持原样直连，
    // 以免把某一个客户端的分片/304 语义共享给其他客户端。
    const shareable = !range && !ifNoneMatch && !ifModifiedSince && IMAGE_PATH.test(key);
    if (shareable && !isKnownLarge(key)) {
      const hit = lruGet(key);
      if (hit) return respondBuffered(c, hit, 'HIT');
      const loaded = await loadShared(key);
      if (loaded) return respondBuffered(c, loaded, 'MISS');
      // null = 单对象超过 MAX_ITEM_BYTES，落到下面的直连流式
    }

    const obj = await withDeadline((signal) =>
      s3.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
          Range: range,
          IfNoneMatch: ifNoneMatch,
          IfModifiedSince: ifModifiedSince
        }),
        { abortSignal: signal }
      )
    );

    const status = obj.ContentRange ? 206 : 200;
    const headers: Record<string, string> = {
      'Content-Type': obj.ContentType ?? 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: obj.ETag ?? ''
    };
    if (obj.ContentLength != null) headers['Content-Length'] = String(obj.ContentLength);
    if (obj.ContentRange) headers['Content-Range'] = obj.ContentRange;
    if (obj.LastModified) headers['Last-Modified'] = obj.LastModified.toUTCString();

    if (!obj.Body) return c.body(null, status, headers);
    const stream = Readable.toWeb(obj.Body as Readable) as ReadableStream;
    return c.body(stream, status, headers);
  } catch (err: any) {
    if (isAbort(err)) {
      console.warn('media proxy timeout:', c.req.path, S3_TIMEOUT_MS + 'ms');
      return c.json({ error: 'media timeout' }, 504);
    }
    if (err?.name === 'NoSuchKey' || err?.name === 'NotFound') {
      return c.json({ error: 'not found' }, 404);
    }
    if (err?.$metadata?.httpStatusCode === 304) {
      return c.body(null, 304, { ETag: c.req.header('if-none-match') ?? '' });
    }
    console.error('media proxy error:', err?.name ?? '', err?.message ?? err);
    return c.json({ error: 'media fetch failed' }, 502);
  }
}
