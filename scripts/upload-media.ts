/**
 * 把「全尺寸 / 大图」同步到 RustFS（幂等），并维护 public/media-manifest.json。
 *
 * 对象键：`public/<相对 public 的路径>`，对外 URL：`/media/<同一路径>`（由 src/server/media.ts 代理）。
 *
 * 来源：
 * 1. public/images/{guides,buildings,vehicles}/**.webp（去掉 -thumb）与 public/audio/**.m4a —— 历史来源；
 * 2. public/guide/images/**  —— PR 带进来的整站静态副本，全是全尺寸原图，
 *    统一映射到对象键 public/images/<rel>（与根站缩略图同路径，只是不带 -thumb 后缀）。
 *    合并完成后 public/guide 会被删除，本来源自然消失。
 *
 * 规则：
 * - 先 HEAD 比对 ContentLength，体积相同即跳过（幂等，可反复跑）；
 * - 上传后逐个 HEAD 复核，失败即非零退出；
 * - 末尾把清单重写成「排序去重的 /media/... 列表」，供 check:assets 与 SW 预取使用。
 *
 * 用法：
 *   tsx scripts/upload-media.ts            # 真上传
 *   tsx scripts/upload-media.ts --dry      # 只打印计划
 *   tsx scripts/upload-media.ts --verify   # 只做 HEAD 复核（不写对象、不改清单）
 */
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
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
  console.error('Missing RUSTFS_ENDPOINT / RUSTFS_ACCESS_KEY / RUSTFS_SECRET_KEY（本地放 .env）');
  process.exit(1);
}

const DRY = process.argv.includes('--dry');
const VERIFY_ONLY = process.argv.includes('--verify');
const MANIFEST_ONLY = process.argv.includes('--manifest-only');

const s3 = new S3Client({
  endpoint,
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

const PUBLIC = path.resolve('public');
const MANIFEST = path.join(PUBLIC, 'media-manifest.json');

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
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.m4a') return 'audio/mp4';
  return 'application/octet-stream';
}

type Item = { file: string; key: string; url: string; size: number };

async function collect(): Promise<Item[]> {
  const items: Item[] = [];
  const add = async (file: string, key: string): Promise<void> => {
    const stat = await fs.stat(file);
    items.push({ file, key, url: '/media/' + key.replace(/^public\//, ''), size: stat.size });
  };

  // 1) 历史来源：guides/buildings/vehicles 的全尺寸图（跳过 -thumb）+ 音频
  for (const folder of ['guides', 'buildings', 'vehicles']) {
    const dir = path.join(PUBLIC, 'images', folder);
    if (!(await fs.stat(dir).catch(() => null))) continue;
    for (const file of await walk(dir)) {
      if (file.endsWith('-thumb.webp')) continue;
      if (!/\.(webp|png|jpe?g)$/i.test(file)) continue;
      const rel = path.relative(PUBLIC, file).split(path.sep).join('/');
      await add(file, `public/${rel}`);
    }
  }
  const audioDir = path.join(PUBLIC, 'audio');
  if (await fs.stat(audioDir).catch(() => null)) {
    for (const file of await walk(audioDir)) {
      if (!file.endsWith('.m4a')) continue;
      const rel = path.relative(PUBLIC, file).split(path.sep).join('/');
      await add(file, `public/${rel}`);
    }
  }

  // 2) PR 静态副本的全尺寸原图 → 对象键落到 public/images/<rel>
  //    只补「仓库里没有同路径文件」的那些：有本地文件的（图标、缩略图）继续随包走，
  //    没本地文件的（vehicles/monsters 等全尺寸原图）才进对象存储。
  const guideImages = path.join(PUBLIC, 'guide/images');
  if (await fs.stat(guideImages).catch(() => null)) {
    for (const file of await walk(guideImages)) {
      if (!/\.(webp|png|jpe?g)$/i.test(file)) continue;
      const rel = path.relative(guideImages, file).split(path.sep).join('/');
      const local = path.join(PUBLIC, 'images', rel);
      if (await fs.stat(local).catch(() => null)) continue; // 仓库里已经有了，不重复上传
      await add(file, `public/images/${rel}`);
    }
  }

  // 3) 音频：仓库里已经没有 public/audio，PR 副本里还有一份 → 对象键落到 public/audio/<rel>
  const guideAudio = path.join(PUBLIC, 'guide/audio');
  if (await fs.stat(guideAudio).catch(() => null)) {
    for (const file of await walk(guideAudio)) {
      if (!file.endsWith('.m4a')) continue;
      const rel = path.relative(guideAudio, file).split(path.sep).join('/');
      await add(file, `public/audio/${rel}`);
    }
  }

  // 同一个键可能来自两条来源（如 guides/banner_hotel.webp），只保留先来的
  const byKey = new Map<string, Item>();
  for (const item of items) if (!byKey.has(item.key)) byKey.set(item.key, item);
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}

async function head(key: string): Promise<{ ok: boolean; size: number }> {
  try {
    const res = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { ok: true, size: Number(res.ContentLength ?? -1) };
  } catch {
    return { ok: false, size: -1 };
  }
}

/* 清单 = 本次候选 ∪ 已有清单：源被删掉的对象（例如音频已只剩对象存储）不会因为本轮没扫到就丢。 */
async function writeManifest(items: Item[]): Promise<void> {
  const kept: string[] = await fs
    .readFile(MANIFEST, 'utf8')
    .then((text) => JSON.parse(text) as string[])
    .catch(() => []);
  const urls = [...new Set([...kept, ...items.map((i) => i.url)])].sort();
  await fs.writeFile(MANIFEST, JSON.stringify(urls, null, 0) + '\n', 'utf8');
  console.log(`清单更新：${path.relative(process.cwd(), MANIFEST)} 共 ${urls.length} 条（新增 ${urls.length - kept.length}）`);
}

async function main(): Promise<void> {
  const items = await collect();
  console.log(`候选对象 ${items.length} 个（bucket=${bucket}）`);
  if (MANIFEST_ONLY) {
    await writeManifest(items);
    return;
  }
  if (DRY) {
    const byDir = new Map<string, { n: number; bytes: number }>();
    for (const item of items) {
      const dir = item.key.split('/').slice(0, 3).join('/');
      const cur = byDir.get(dir) ?? { n: 0, bytes: 0 };
      cur.n += 1;
      cur.bytes += item.size;
      byDir.set(dir, cur);
    }
    for (const [dir, v] of [...byDir.entries()].sort((a, b) => b[1].n - a[1].n)) {
      console.log(`  ${dir.padEnd(32)} ${String(v.n).padStart(4)} 个 ${(v.bytes / 1024).toFixed(0).padStart(6)}KB`);
    }
    console.log(`  …共 ${items.length} 个，${(items.reduce((s, i) => s + i.size, 0) / 1048576).toFixed(2)}MB`);
    return;
  }

  let uploaded = 0;
  let skipped = 0;
  let bytes = 0;
  const failed: string[] = [];

  async function worker(): Promise<void> {
    for (;;) {
      const item = items.shift();
      if (!item) return;
      if (VERIFY_ONLY) {
        const h = await head(item.key);
        if (!h.ok || h.size !== item.size) failed.push(`${item.key}（远端 ${h.size}B，本地 ${item.size}B）`);
        continue;
      }
      const h = await head(item.key);
      if (h.ok && h.size === item.size) {
        skipped += 1;
        continue;
      }
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: item.key,
            Body: await fs.readFile(item.file),
            ContentType: contentType(item.file),
            CacheControl: 'public, max-age=31536000, immutable',
          }),
        );
      } catch (err: any) {
        failed.push(`${item.key}：上传失败 ${err?.name ?? ''} ${err?.message ?? ''}`);
        continue;
      }
      const check = await head(item.key);
      if (!check.ok || check.size !== item.size) {
        failed.push(`${item.key}：上传后校验不一致（远端 ${check.size}B，本地 ${item.size}B）`);
        continue;
      }
      uploaded += 1;
      bytes += item.size;
      if ((uploaded + skipped) % 50 === 0) console.log(`  …${uploaded + skipped} 个已处理`);
    }
  }

  await Promise.all(Array.from({ length: 6 }, () => worker()));

  console.log(
    VERIFY_ONLY
      ? `复核完成：${items.length} 个，失败 ${failed.length}`
      : `完成：上传 ${uploaded}、跳过 ${skipped}、失败 ${failed.length}（${(bytes / 1048576).toFixed(2)}MB）`,
  );
  if (failed.length) {
    for (const line of failed.slice(0, 20)) console.error('  ✗ ' + line);
    if (failed.length > 20) console.error(`  …其余 ${failed.length - 20} 条`);
    process.exit(1);
  }

  if (!VERIFY_ONLY) await writeManifest(await collect());
}

main().catch((err) => {
  console.error('upload failed:', err?.name ?? '', err?.message ?? err);
  process.exit(1);
});
