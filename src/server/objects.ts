/* 对象存储（RustFS / S3 兼容）的最小封装：管理端镜像与换图对象都走这里。
   没配凭证（本地开发）就全部落到 DATA_DIR，调用方不需要分支。 */
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { loadEnvFile } from 'node:process';

try {
  loadEnvFile();
} catch {
  // 生产环境由平台注入环境变量
}

const endpoint = process.env.RUSTFS_ENDPOINT;
const bucket = process.env.RUSTFS_BUCKET ?? 'wzsj-media';
const accessKeyId = process.env.RUSTFS_ACCESS_KEY;
const secretAccessKey = process.env.RUSTFS_SECRET_KEY;

export const OBJECT_BUCKET = bucket;
export const hasObjectStore = Boolean(endpoint && accessKeyId && secretAccessKey);

const client = hasObjectStore
  ? new S3Client({
      endpoint,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: { accessKeyId: accessKeyId as string, secretAccessKey: secretAccessKey as string }
    })
  : null;

/** 对象键统一以 public/ 开头，和 /media 代理的映射保持一致。 */
export function mediaKey(relPath: string): string {
  return 'public/' + relPath.replace(/^\/+/, '');
}

export async function putObjectBytes(key: string, body: Buffer, contentType: string): Promise<boolean> {
  if (!client) return false;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable'
    })
  );
  return true;
}

export async function getObjectBytes(key: string): Promise<Buffer | null> {
  if (!client) return null;
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) return null;
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

export async function getObjectText(key: string): Promise<string | null> {
  const buf = await getObjectBytes(key);
  return buf ? buf.toString('utf8') : null;
}

export async function deleteObject(key: string): Promise<void> {
  if (!client) return;
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    // 删除失败不影响主流程（孤儿对象比丢数据好）
  }
}
