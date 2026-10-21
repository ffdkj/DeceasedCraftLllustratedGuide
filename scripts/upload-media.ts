import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { promises as fs } from 'node:fs';
import path from 'node:path';
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

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error('Missing RUSTFS_ENDPOINT / RUSTFS_ACCESS_KEY / RUSTFS_SECRET_KEY');
  process.exit(1);
}

const s3 = new S3Client({
  endpoint,
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey }
});

const PUBLIC = path.resolve('public');

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

function contentType(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.webp') return 'image/webp';
  if (ext === '.m4a') return 'audio/mp4';
  return 'application/octet-stream';
}

async function main() {
  const files: string[] = [];
  for (const folder of ['guides', 'buildings', 'vehicles']) {
    const dir = path.join(PUBLIC, 'images', folder);
    for (const file of await walk(dir)) {
      if (file.endsWith('.webp') && !file.endsWith('-thumb.webp')) files.push(file);
    }
  }
  for (const file of await walk(path.join(PUBLIC, 'audio'))) {
    if (file.endsWith('.m4a')) files.push(file);
  }

  console.log(`uploading ${files.length} media files...`);
  let uploaded = 0;
  let skipped = 0;
  let bytes = 0;

  const queue = [...files];
  async function worker() {
    for (;;) {
      const file = queue.shift();
      if (!file) return;
      const rel = path.relative(PUBLIC, file).split(path.sep).join('/');
      const key = `public/${rel}`;
      const [body, stat] = await Promise.all([fs.readFile(file), fs.stat(file)]);

      try {
        const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        if (head.ContentLength === stat.size) {
          skipped++;
          continue;
        }
      } catch {
        // not uploaded yet
      }

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType(file),
          CacheControl: 'public, max-age=31536000, immutable'
        })
      );
      uploaded++;
      bytes += stat.size;
      if ((uploaded + skipped) % 50 === 0) {
        console.log(`  ${uploaded + skipped}/${files.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: 6 }, () => worker()));
  console.log(`done. uploaded: ${uploaded}, skipped: ${skipped}, bytes: ${(bytes / 1048576).toFixed(2)}MB`);
}

main().catch((err) => {
  console.error('upload failed:', err?.name ?? '', err?.message ?? err);
  process.exit(1);
});
