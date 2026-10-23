/**
 * 去掉仓库里「已经在对象存储」的全尺寸图副本（幂等）。
 *
 * 前提：`public/images/{guides,buildings,vehicles}` 的全尺寸图（不带 -thumb 后缀）
 * 已经被 scripts/upload-media.ts 传进 RustFS，数据里的引用也已经是 `/media/images/...`。
 * 本脚本对每张要删的图先做一次 S3 HEAD 校验，任一张不在桶里就整体中止，不会出现「图删了、对象也没有」。
 *
 * 顺手重写 public/images/manifest.json（Service Worker 的本地图片预取清单，只列仓库里还在的图）。
 *
 * 用法：
 *   tsx scripts/dedupe-local-art.ts --check   # 只核对，不删
 *   tsx scripts/dedupe-local-art.ts           # 核对通过后删除
 */
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadEnvFile } from 'node:process';

try {
  loadEnvFile();
} catch {
  // 生产环境变量由平台注入
}

const endpoint = process.env.RUSTFS_ENDPOINT;
const bucket = process.env.RUSTFS_BUCKET ?? 'wzsj-media';
const accessKeyId = process.env.RUSTFS_ACCESS_KEY;
const secretAccessKey = process.env.RUSTFS_SECRET_KEY;

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error('Missing RUSTFS_ENDPOINT / RUSTFS_ACCESS_KEY / RUSTFS_SECRET_KEY（本地放 .env）');
  process.exit(1);
}

const CHECK_ONLY = process.argv.includes('--check');
const s3 = new S3Client({ endpoint, region: 'us-east-1', forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } });
const PUBLIC = path.resolve('public');
const FOLDERS = ['guides', 'buildings', 'vehicles'];

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  const stat = await fs.stat(dir).catch(() => null);
  if (!stat) return out;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

async function remoteSize(url: string): Promise<number> {
  try {
    const res = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: 'public/' + url.replace(/^\/media\//, '') }));
    return Number(res.ContentLength ?? -1);
  } catch {
    return -1;
  }
}

async function main(): Promise<void> {
  const targets: { file: string; url: string; size: number }[] = [];
  for (const folder of FOLDERS) {
    for (const file of await walk(path.join(PUBLIC, 'images', folder))) {
      if (!file.endsWith('.webp') || file.endsWith('-thumb.webp')) continue;
      const rel = path.relative(PUBLIC, file).split(path.sep).join('/');
      targets.push({ file, url: '/media/' + rel, size: (await fs.stat(file)).size });
    }
  }
  console.log(`待去重的本地全尺寸图 ${targets.length} 张`);

  const missing: string[] = [];
  let bytes = 0;
  for (const target of targets) {
    const size = await remoteSize(target.url);
    if (size !== target.size) missing.push(`${target.url}（远端 ${size}B，本地 ${target.size}B）`);
    else bytes += target.size;
  }
  if (missing.length) {
    for (const line of missing.slice(0, 20)) console.error('  ✗ 不在对象存储或不一致：' + line);
    if (missing.length > 20) console.error(`  …其余 ${missing.length - 20} 条`);
    console.error(`中止：${missing.length} 张未通过校验，未删除任何文件`);
    process.exit(1);
  }
  console.log(`校验通过：${targets.length} 张都在对象存储且体积一致（${(bytes / 1048576).toFixed(2)}MB）`);

  if (CHECK_ONLY) {
    console.log('--check：不删除');
    return;
  }

  for (const target of targets) await fs.rm(target.file);
  console.log(`已删除本地副本 ${targets.length} 张`);

  const local: string[] = [];
  for (const file of await walk(path.join(PUBLIC, 'images'))) {
    if (file.endsWith('.webp')) local.push('./' + path.relative(PUBLIC, file).split(path.sep).join('/'));
  }
  local.sort();
  await fs.writeFile(path.join(PUBLIC, 'images', 'manifest.json'), JSON.stringify(local, null, 0) + '\n', 'utf8');
  console.log(`本地图片清单更新：${local.length} 条`);
}

main().catch((err) => {
  console.error('dedupe failed:', err?.name ?? '', err?.message ?? err);
  process.exit(1);
});
