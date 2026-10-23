/**
 * 构建期内容指纹：给静态资源文件名插一段内容哈希，并把所有引用改写成新名字。
 *
 * 为什么需要：`/images/*`、`/textures/*`、`/icons/*`、`/fonts/*` 都由服务端以
 * `Cache-Control: public, max-age=31536000, immutable` 发出，但这些 URL 原本没有内容指纹——
 * 于是同路径改内容后，Cloudflare 边缘与浏览器会一直用旧图（实测 atlas 旧版在 CF 上挂了 43 小时）。
 * 指纹化后 URL 随内容变，immutable 才是安全的前提。
 *
 * 处理范围：dist/client/{images,textures,icons,fonts,data} 下的文件；
 * 改写：index.html、css/*.css、assets/*.js（Vite 打包产物里也有字面路径）、data/*.js、manifest.webmanifest。
 *
 * 运行时拼出来的路径（例如 tiers.ts 的 "/images/ammo/" + 口径 + ".webp"）无法靠字符串替换覆盖，
 * 因此额外产出 `data/asset-map.js`（window.WZ_ASSET_MAP：旧路径 → 带指纹路径），
 * 由客户端查表；开发模式下该文件是空表，回落到未指纹的原始路径。
 *
 * 用法：tsx scripts/fingerprint.ts（必须跑在 vite build:client 之后、build-sw 之前）
 */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist/client');
const ROOTS = ['images', 'textures', 'icons', 'fonts', 'data'];
const TEXT_EXT = /\.(?:html|css|js|json|webmanifest)$/i;

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

function hashOf(buf: Buffer): string {
  return createHash('sha1').update(buf).digest('hex').slice(0, 8);
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main(): Promise<void> {
  const map = new Map<string, string>(); // 裸路径（无前导 ./ 或 /）→ 带指纹裸路径

  // 1) 重命名资源文件
  const files: string[] = [];
  for (const root of ROOTS) files.push(...(await walk(path.join(DIST, root))));
  for (const file of files) {
    if (file.endsWith('asset-map.js') || file.endsWith('manifest.json')) continue;
    // 审核词库是服务端按固定文件名读的（dist/client/data/blocked-words.txt），不能改名
    if (/^blocked-words\./.test(path.basename(file))) continue;
    const rel = path.relative(DIST, file).split(path.sep).join('/');
    const buf = await fs.readFile(file);
    const ext = path.extname(file);
    const next = rel.slice(0, rel.length - ext.length) + '.' + hashOf(buf) + ext;
    await fs.rename(file, path.join(DIST, next));
    map.set(rel, next);
  }

  // 2) 改写引用（一趟正则替换，长路径优先，避免短前缀抢先命中）
  const entries = [...map.entries()].sort((a, b) => b[0].length - a[0].length);
  const pattern = new RegExp('(?<![\\w-])(' + entries.map(([old]) => escapeRe(old)).join('|') + ')', 'g');
  const rewrite = (text: string): string => text.replace(pattern, (m) => map.get(m) ?? m);

  const targets = [
    path.join(DIST, 'index.html'),
    path.join(DIST, 'manifest.webmanifest'),
    ...(await walk(path.join(DIST, 'css'))),
    ...(await walk(path.join(DIST, 'assets'))),
    ...(await walk(path.join(DIST, 'data'))),
  ];
  for (const file of targets) {
    const stat = await fs.stat(file).catch(() => null);
    if (!stat || !TEXT_EXT.test(file)) continue;
    const text = await fs.readFile(file, 'utf8');
    const next = rewrite(text);
    if (next !== text) await fs.writeFile(file, next, 'utf8');
  }

  // 3) 资源映射表（运行时拼路径的兜底），自己也要指纹化
  const mapFile = path.join(DIST, 'data/asset-map.js');
  const table = Object.fromEntries([...map.entries()].map(([old, next]) => ['/' + old, '/' + next]));
  await fs.writeFile(mapFile, 'window.WZ_ASSET_MAP = ' + JSON.stringify(table) + ';\n', 'utf8');
  {
    const buf = await fs.readFile(mapFile);
    const next = 'data/asset-map.' + hashOf(buf) + '.js';
    await fs.rename(mapFile, path.join(DIST, next));
    map.set('data/asset-map.js', next);
    const index = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');
    await fs.writeFile(path.join(DIST, 'index.html'), index.split('/data/asset-map.js').join('/' + next), 'utf8');
  }

  // 4) 本地图片预取清单（Service Worker 用）指向带指纹的文件名
  const local: string[] = [];
  for (const file of await walk(path.join(DIST, 'images'))) {
    if (!file.endsWith('.webp')) continue;
    local.push('./' + path.relative(DIST, file).split(path.sep).join('/'));
  }
  local.sort();
  await fs.writeFile(path.join(DIST, 'images/manifest.json'), JSON.stringify(local, null, 0) + '\n', 'utf8');

  // 5) 供 build-sw 使用：shell 清单里的旧路径换成带指纹的
  await fs.writeFile(path.join(DIST, 'asset-map.json'), JSON.stringify(Object.fromEntries(map), null, 0) + '\n', 'utf8');
  console.log(`fingerprinted ${map.size} files; local images ${local.length}`);
}

main().catch((err) => {
  console.error('fingerprint failed:', err?.message ?? err);
  process.exit(1);
});
