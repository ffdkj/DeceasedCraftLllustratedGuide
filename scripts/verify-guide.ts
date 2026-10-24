/**
 * guide 外壳（`public/guide`）的基线断言。
 *
 * 方向已定为「站点以 guide 为准」：`build:guide-root` 把 public/guide 覆盖到 dist/client，
 * 根站的构建期指纹因此不再起作用（`build:fingerprint` 已从 build 链移除，
 * verify:fingerprint 也从 npm run verify 移除）。这里锁住新的基线，
 * 以及后续从根站搬过来的小件（弹药本体图标 / 数值条两段 / 懒加载 / 管理端换图）。
 *
 * 用法：tsx scripts/verify-guide.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const has = (rel: string) => existsSync(join(ROOT, rel));

const errors: string[] = [];
const pending: [string, boolean][] = [];
let notes = 0;
function check(cond: boolean, message: string): void {
  if (cond) notes += 1;
  else errors.push('✗ ' + message);
}

/* ---------------- 外壳存在且是站点入口 ---------------- */
{
  check(has('public/guide/index.html'), 'guide 外壳存在');
  const html = read('public/guide/index.html');
  check(html.includes('./js/app.js'), 'guide 入口加载 js/app.js');
  check(html.includes('./js/gunsmith.js'), 'guide 入口加载改枪台');
  check(html.includes('./data/guides.js'), 'guide 入口加载数据');
  check(has('public/guide/css/app.css'), 'guide 样式存在');
  pending.push(['管理端 UI 搬进 guide', has('public/guide/js/admin.js') || html.includes('./js/admin.js')]);
}

/* ---------------- 构建与服务的接线 ---------------- */
{
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
  check(pkg.scripts['build:guide-root'] === 'tsx scripts/copy-guide-root.ts', 'build:guide-root 指向复制脚本');
  check((pkg.scripts.build || '').includes('build:guide-root'), 'build 链包含 build:guide-root');
  check(!(pkg.scripts.build || '').includes('build:fingerprint'), 'build 链不再做内容指纹（guide 外壳无指纹）');
  check((pkg.scripts.verify || '').includes('verify:guide'), 'npm run verify 包含 verify:guide');
  check(has('scripts/copy-guide-root.ts'), '复制脚本存在');

  const server = read('src/server/index.ts');
  check(server.includes("process.cwd(), 'public/guide'"), '静态根优先 public/guide');
  check(!server.includes("app.all('/guide/*'"), '不再拦 /guide/* 404（旧入口保留）');
}

/* ---------------- guide 数据基线 ---------------- */
{
  const raw = read('public/guide/data/guides.js');
  const at = raw.indexOf('window.WZ_');
  const data = JSON.parse(raw.slice(raw.indexOf('=', at) + 1).trim().replace(/;\s*$/, ''));
  check((data.monsters || []).length > 0, 'guide 自带怪物数据');
  check((data.guns || []).length > 0, 'guide 自带枪械数据');
  check(typeof data.meta === 'object' && data.meta.version, 'guide 数据带版本号');
}

/* ---------------- 已搬进来的小件 ---------------- */
{
  const app = has('public/guide/js/app.js') ? read('public/guide/js/app.js') : '';
  const gunsmith = has('public/guide/js/gunsmith.js') ? read('public/guide/js/gunsmith.js') : '';
  const css = has('public/guide/css/app.css') ? read('public/guide/css/app.css') : '';
  const html = read('public/guide/index.html');
  check(app.includes('tier-dot'), 'guide 已有梯度点阵');
  check(gunsmith.length > 0 && css.includes('gs-stat-bar'), 'guide 已有数值条');

  /* 弹药本体图标：清单 + 图 + 用图的地方 + 入口加载顺序 */
  const ammo = has('public/guide/data/ammo-icons.js') ? read('public/guide/data/ammo-icons.js') : '';
  const ammoNames = /"names":\[([^\]]*)\]/.exec(ammo);
  const names = ammoNames ? ammoNames[1].split(',').map((s) => s.replace(/"/g, '').trim()).filter(Boolean) : [];
  check(names.length > 0, '弹药本体图标清单非空');
  check(names.length === 15, `弹药本体图标 15 张（实际 ${names.length}）`);
  check(names.every((n) => has(`public/guide/images/ammo/${n}.webp`)), '清单里的每张图都在 guide 里');
  check(app.includes('ammo-thumb'), '弹药库列表用了本体图标');
  check(app.includes('WZ_AMMO_ICONS'), '列表按清单查表，不硬编码文件名');
  check(html.includes('./data/ammo-icons.js'), 'guide 入口加载弹药图标清单');
  check(css.includes('.guide-thumb.ammo-thumb'), '本体图标有按比例缩放的样式');

  /* 数值条两段：底段 = 基准值，变化段绿/红，且必须绝对定位才不会挤到第二行 */
  check(gunsmith.includes('deltaBar'), '数值条画出了配件变化段');
  check(gunsmith.includes('"base" style="width:'), '数值条底段带 class="base"');
  check(/gs-stat-bar i \{[^}]*position: absolute/.test(css), '数值条分段绝对定位（否则第二段被裁掉）');
  check(css.includes('.gs-stat-bar i.good'), '改善段是绿的');
  check(css.includes('.gs-stat-bar i.bad'), '变差段是红的');
  check(!/gs-stat-bar"><i style="width:/.test(gunsmith), '旧的单段数值条已移除');

  /* 滚动加载：helper 在 guide 里、入口按顺序加载、两处长列表都接上 */
  const lazy = has('public/guide/js/lazy.js') ? read('public/guide/js/lazy.js') : '';
  check(lazy.includes('lazy-sentinel'), '滚动加载用哨兵');
  check(lazy.includes('IntersectionObserver'), '滚动加载用 IntersectionObserver');
  check(lazy.includes('rootMargin'), '滚动加载有预取边距（不会滚到底才卡）');
  check(html.indexOf('./js/lazy.js') > 0 && html.indexOf('./js/lazy.js') < html.indexOf('./js/gunsmith.js'), 'helper 在 app/gunsmith 之前加载');
  check(app.includes('lazyList(box, list'), '图鉴通用长列表接上了滚动加载');
  check(gunsmith.includes('L.list(grid, list, gunCard)'), '改枪台枪械网格接上了滚动加载');
  check(css.includes('.lazy-sentinel'), '哨兵样式存在（多列网格里不留半格空位）');

  pending.push(['枪械库已删', !app.includes('枪械库')]);
}

if (errors.length) {
  console.error('guide 基线断言失败：');
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log(`verify:guide ${notes} 项断言通过`);
const left = pending.filter(([, ok]) => !ok).map(([name]) => name);
if (left.length) console.log(`  待搬 ${left.length} 项：${left.join(' / ')}`);
