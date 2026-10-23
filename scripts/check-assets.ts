import { promises as fs } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist/client');

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function stripQuery(url: string): string {
  return url.split('?')[0].split('#')[0];
}

async function main() {
  const media = new Set<string>(
    JSON.parse(await fs.readFile(path.join(DIST, 'media-manifest.json'), 'utf8'))
  );

  // 构建期指纹化后，data/ 与 assets/ 里的文件名带哈希，不能再写死清单：
  // 直接扫目录，避免「改名后 check:assets 静悄悄漏检」。
  const dirs = ['css', 'data', 'assets'];
  const sources = ['index.html', 'manifest.webmanifest', 'sw.js'];
  for (const dir of dirs) {
    const abs = path.join(DIST, dir);
    if (!(await exists(abs))) continue;
    for (const name of await fs.readdir(abs)) {
      if (!/\.(?:js|css|json|webmanifest)$/.test(name)) continue;
      // asset-map 的键是旧路径（值才是带指纹的真名），不是引用，别当缺失报。
      if (/^asset-map\./.test(name)) continue;
      sources.push(dir + '/' + name);
    }
  }

  const refs = new Set<string>();
  for (const rel of sources) {
    const file = path.join(DIST, rel);
    if (!(await exists(file))) continue;
    const text = await fs.readFile(file, 'utf8');
    for (const m of text.matchAll(/(?:\.?\/)?(?:images\/[^"'\s)]+|textures\/atlas(?:\.[0-9a-f]{8})?\.webp|media\/[^"'\s)]+)/g)) {
      refs.add(stripQuery('/' + m[0].replace(/^\.?\//, '')));
    }
  }

  // The built index references hashed assets too.
  const html = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');
  for (const m of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) refs.add(stripQuery(m[1]));

  const missing: string[] = [];
  for (const ref of refs) {
    if (ref.endsWith('/')) continue; // directory prefixes in SW source
    if (ref.startsWith('/media/')) {
      if (!media.has(ref)) missing.push(ref + ' (not in media-manifest.json)');
      continue;
    }
    if (await exists(path.join(DIST, ref.replace(/^\//, '')))) continue;
    if (media.has(ref)) continue;
    missing.push(ref + ' (missing locally and in media-manifest.json)');
  }

  if (missing.length) {
    console.error('missing asset references:');
    for (const m of missing.slice(0, 50)) console.error('  ' + m);
    console.error(`total: ${missing.length}`);
    process.exit(1);
  }

  console.log(`checked ${refs.size} references, all present`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
