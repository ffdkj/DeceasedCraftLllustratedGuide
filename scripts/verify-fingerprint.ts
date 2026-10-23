/**
 * 指纹门禁：构建产物里的静态资源必须都带内容指纹，且没有任何引用指向旧名字。
 *
 * 背景（见 docs/merge-plan.md）：`/images /textures /icons /fonts /data` 都以 immutable 缓存发出，
 * URL 不带指纹时同路径改内容永远不生效。scripts/fingerprint.ts 负责改名与改写引用，
 * 这里把「改完了」变成可重复验证的断言。
 *
 * 用法：npm run verify:fingerprint（需先 npm run build）
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist/client');
const errors: string[] = [];
let notes = 0;
function check(cond: boolean, message: string): void {
  if (cond) notes += 1;
  else errors.push('✗ ' + message);
}

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

const HASHED = /\.[0-9a-f]{8}\.(?:webp|png|jpe?g|svg|woff2?|otf|ttf|txt|js|json)$/;
const SIDECAR = /\.(?:br|gz)$/;

async function main(): Promise<void> {
  const mapFile = path.join(DIST, 'asset-map.json');
  check(existsSync(mapFile), 'dist/client/asset-map.json 存在（构建期指纹映射表）');
  const map: Record<string, string> = existsSync(mapFile)
    ? JSON.parse(await fs.readFile(mapFile, 'utf8'))
    : {};
  check(Object.keys(map).length > 700, `映射表覆盖 700+ 个文件（实际 ${Object.keys(map).length}）`);

  /* 1. 每个映射目标都在盘上 */
  const missing = Object.values(map).filter((rel) => !existsSync(path.join(DIST, rel)));
  check(missing.length === 0, `映射目标都存在（缺失 ${missing.length}：${missing.slice(0, 3).join(', ')}）`);

  /* 2. 资源文件名都带指纹 */
  for (const dir of ['images', 'textures', 'icons', 'fonts']) {
    const files = (await walk(path.join(DIST, dir))).filter((f) => !f.endsWith('manifest.json') && !SIDECAR.test(f));
    const bad = files.filter((f) => !HASHED.test(path.basename(f)));
    check(bad.length === 0, `${dir}/ 下所有文件都带 8 位指纹（例外 ${bad.length}）`);
  }

  /* 3. html / css / bundle 里没有旧名字 */
  const index = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');
  check(index.includes('/data/asset-map.') || index.includes('/data/asset-map.js'), 'index.html 加载 asset-map');
  const dataRefs = [...index.matchAll(/\/data\/([^"']+)\.js/g)].map((m) => m[0]);
  check(dataRefs.length > 5, `index.html 有 ${dataRefs.length} 个 data 脚本`);
  check(
    dataRefs.every((ref) => HASHED.test(ref)),
    `index.html 的 data 脚本全部带指纹（未带：${dataRefs.filter((r) => !HASHED.test(r)).join(', ')}）`,
  );

  const texts: { file: string; text: string }[] = [];
  for (const dir of ['css', 'assets', 'data']) {
    for (const file of await walk(path.join(DIST, dir))) {
      if (!/\.(?:css|js)$/.test(file) || /asset-map\./.test(file)) continue;
      texts.push({ file, text: await fs.readFile(file, 'utf8') });
    }
  }
  const staleRefs: string[] = [];
  for (const { file, text } of texts) {
    // 只看真正的引用位置（前一个字符是引号/括号/等号），避免把 /media/images/... 里的片段当引用；
    // 结尾要求命中引号或括号，避免 .otf.woff2 被截成 .otf。
    for (const m of text.matchAll(/(?:^|["'(=;\s])((?:\.\/|\/)(?:images|textures|fonts|icons)\/[A-Za-z0-9_@%./\-\u4e00-\u9fa5]+?\.(?:webp|png|jpe?g|svg|woff2|otf|txt))(?=["')])/g)) {
      if (!HASHED.test(m[1])) staleRefs.push(path.relative(DIST, file) + ' → ' + m[1]);
    }
  }
  check(staleRefs.length === 0, `css/assets/data 里没有未指纹的图片/字体引用（发现 ${staleRefs.length}：${staleRefs.slice(0, 3).join(' / ')}）`);

  /* 4. 本地图片预取清单与盘一致 */
  const manifest: string[] = JSON.parse(await fs.readFile(path.join(DIST, 'images/manifest.json'), 'utf8'));
  const broken = manifest.filter((url) => !existsSync(path.join(DIST, url.replace(/^\.\//, ''))));
  check(broken.length === 0, `images/manifest.json 的 ${manifest.length} 条都存在（缺 ${broken.length}）`);
  check(manifest.every((url) => HASHED.test(url)), 'images/manifest.json 里的名字都带指纹');

  /* 5. Service Worker：图片缓存版本随内容变，预缓存清单可解析 */
  const sw = await fs.readFile(path.join(DIST, 'sw.js'), 'utf8');
  const cacheName = /wz-images-([0-9a-f]+)"/.exec(sw)?.[1] ?? '';
  check(cacheName.length === 10, `SW 图片缓存版本是内容哈希（实际 "${cacheName}"）`);
  check(!sw.includes('/media/audio/"/'), 'SW 未把音频清单混进图片预取');
  const precache = JSON.parse(/const PRECACHE = (\[[\s\S]*?\]);/.exec(sw)?.[1] ?? '[]') as string[];
  check(precache.length > 5, `SW 预缓存 ${precache.length} 条`);
  const precacheBroken = precache.filter((rel) => rel !== './' && !existsSync(path.join(DIST, rel.replace(/^\.\//, ''))));
  check(precacheBroken.length === 0, `SW 预缓存条目都存在（缺 ${precacheBroken.length}：${precacheBroken.slice(0, 3).join(', ')}）`);

  /* 6. 指纹稳定性：同一份产物再算一次哈希应不变（避免每次构建都改名字） */
  const sample = Object.keys(map)[0];
  if (sample) {
    const file = path.join(DIST, map[sample]);
    const digest = createHash('sha1').update(await fs.readFile(file)).digest('hex').slice(0, 8);
    check(map[sample].includes(digest), `文件名里的指纹 = 内容哈希（抽样 ${sample}）`);
  }

  if (errors.length) {
    console.error(errors.join('\n'));
    console.error(`\n${errors.length} 项失败 / ${notes} 项通过`);
    process.exit(1);
  }
  console.log(`ok 全部通过：${notes} 项断言`);
  console.log(`指纹文件 ${Object.keys(map).length} 个 · 本地图片 ${manifest.length} 张 · SW 缓存版本 ${cacheName}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
