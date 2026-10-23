/* 在线换图：把版本串加进图片地址。
   Cloudflare 边缘此前按 immutable / 1 年缓存过旧地址，origin 改成 no-cache 也换不掉
   已经进边缘的副本 —— 所以换图后必须换 URL（?v=<10 位内容哈希>）。
   版本表由服务端在首屏之前以同步脚本 /data/image-versions.js 下发，
   这里负责把它应用到数据对象与已渲染的 DOM（换图后不用刷新页面）。 */
import { seed } from './seed';

type VersionMap = Record<string, string>;

const HASHED = /\.[0-9a-f]{8}(\.[a-z0-9]+)$/i;
/** 这些全局不是图鉴数据（函数集合 / 映射表），改写会破坏它们。 */
const SKIP: Record<string, 1> = {
  WZ_ASSET_MAP: 1,
  WZ_IMAGE_VERSIONS: 1,
  WZ_IMAGE_VERSION_COUNT: 1,
  WZ_APP_UI: 1,
  WZ_GUNSMITH_UI: 1,
  WZ_RECIPES_UI: 1,
  WZ_TIERS_UI: 1,
  WZ_ADMIN: 1,
  WZ_ADMIN_UI: 1,
  WZMusic: 1
};

export function versionMap(): VersionMap {
  const map = (window as Window & { WZ_IMAGE_VERSIONS?: VersionMap }).WZ_IMAGE_VERSIONS;
  return map && typeof map === 'object' ? map : {};
}

/** 任意图片地址 → 逻辑路径（去 query、去 8 位指纹哈希、/media/images → /images）。 */
export function logicalImagePath(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return null;
  let p = url.split('?')[0].split('#')[0];
  if (p.startsWith('./')) p = '/' + p.slice(2);
  if (p.startsWith('/media/images/')) p = p.slice('/media'.length);
  if (!p.startsWith('/images/')) return null;
  return p.replace(HASHED, '$1');
}

/** 逻辑路径 + 版本号 → 可以直接放进 src / url() 的地址。 */
export function withVersion(url: string, version: string): string {
  const base = url.split('?')[0].split('#')[0];
  return version ? base + '?v=' + version : base;
}

/** 命中覆盖表就返回带版本串的地址，否则原样返回。 */
export function versionedImage(url: string): string {
  const logical = logicalImagePath(url);
  if (!logical) return url;
  const version = versionMap()[logical];
  return version ? withVersion(url, version) : url;
}

function rewrite(node: unknown, logical: string, version: string, counter: { n: number }): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      const item = node[i];
      if (typeof item === 'string') {
        if (logicalImagePath(item) === logical) {
          node[i] = withVersion(item, version);
          counter.n += 1;
        }
      } else {
        rewrite(item, logical, version, counter);
      }
    }
    return;
  }
  const record = node as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const item = record[key];
    if (typeof item === 'string') {
      if (logicalImagePath(item) === logical) {
        record[key] = withVersion(item, version);
        counter.n += 1;
      }
    } else {
      rewrite(item, logical, version, counter);
    }
  }
}

function allDataRoots(): Record<string, unknown>[] {
  const roots: Record<string, unknown>[] = [seed as unknown as Record<string, unknown>];
  const win = window as unknown as Record<string, unknown>;
  for (const key of Object.keys(win)) {
    if (key.indexOf('WZ_') !== 0 || SKIP[key]) continue;
    const value = win[key];
    if (value && typeof value === 'object') roots.push(value as Record<string, unknown>);
  }
  return roots;
}

function urlOf(el: HTMLElement): string | null {
  if (el.tagName === 'IMG') return el.getAttribute('src');
  const style = el.getAttribute('style') || '';
  const hit = /url\((['"]?)([^'")]+)\1\)/.exec(style);
  return hit ? hit[2] : null;
}

function patchDom(logical: string, version: string): number {
  let changed = 0;
  document.querySelectorAll('img[src]').forEach(function (node) {
    const url = node.getAttribute('src');
    if (!url || logicalImagePath(url) !== logical) return;
    node.setAttribute('src', withVersion(url, version));
    changed += 1;
  });
  document.querySelectorAll('[style]').forEach(function (node) {
    const style = node.getAttribute('style');
    if (!style || style.indexOf('url(') < 0) return;
    const next = style.replace(/url\((['"]?)([^'")]+)\1\)/g, function (whole, quote, url) {
      if (logicalImagePath(url) !== logical) return whole;
      return 'url(' + quote + withVersion(url, version) + quote + ')';
    });
    if (next !== style) {
      node.setAttribute('style', next);
      changed += 1;
    }
  });
  return changed;
}

/** 覆盖表变更后调用：内存表、数据对象、已渲染 DOM 一起更新（换图立即生效，不用刷新）。 */
export function setImageVersion(logical: string, version: string): number {
  const map = versionMap();
  if (version) map[logical] = version;
  else delete map[logical];
  const counter = { n: 0 };
  for (const root of allDataRoots()) rewrite(root, logical, version, counter);
  return counter.n + patchDom(logical, version);
}

/** 首屏渲染前跑一次：把服务端下发的版本串写进所有图片地址。 */
export function installImageVersions(): number {
  const map = versionMap();
  const counter = { n: 0 };
  if (!Object.keys(map).length) return 0;
  const roots = allDataRoots();
  for (const logical of Object.keys(map)) {
    for (const root of roots) rewrite(root, logical, map[logical], counter);
  }
  (window as Window & { WZ_IMAGE_VERSION_COUNT?: number }).WZ_IMAGE_VERSION_COUNT = counter.n;
  return counter.n;
}

installImageVersions();
