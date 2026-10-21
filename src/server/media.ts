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
      const head = await s3.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key })
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

    const obj = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        Range: range,
        IfNoneMatch: ifNoneMatch,
        IfModifiedSince: ifModifiedSince
      })
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
