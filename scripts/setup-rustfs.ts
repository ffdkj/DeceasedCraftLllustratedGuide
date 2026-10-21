import {
  CreateBucketCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  S3Client
} from '@aws-sdk/client-s3';
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

async function main() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`bucket "${bucket}" already exists`);
  } catch (err: any) {
    const code = err?.$metadata?.httpStatusCode;
    if (code === 404 || err?.name === 'NotFound') {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
      console.log(`bucket "${bucket}" created`);
    } else {
      throw err;
    }
  }

  const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 5 }));
  console.log(`objects: ${list.KeyCount ?? 0} (sample)`);
  for (const item of list.Contents ?? []) {
    console.log(`  ${item.Key} (${item.Size} bytes)`);
  }
}

main().catch((err) => {
  console.error('RustFS setup failed:', err?.name ?? '', err?.message ?? err);
  process.exit(1);
});
