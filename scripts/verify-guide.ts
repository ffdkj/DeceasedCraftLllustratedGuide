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

/* ---------------- 已搬进来的小件（随搬运逐步补全） ---------------- */
{
  const app = has('public/guide/js/app.js') ? read('public/guide/js/app.js') : '';
  const gunsmith = has('public/guide/js/gunsmith.js') ? read('public/guide/js/gunsmith.js') : '';
  const css = has('public/guide/css/app.css') ? read('public/guide/css/app.css') : '';
  check(app.includes('tier-dot'), 'guide 已有梯度点阵');
  check(gunsmith.length > 0 && css.includes('gs-stat-bar'), 'guide 已有数值条');
  // 待搬项：搬完把 false 改 true
  const PENDING = {
    弹药本体图标: app.includes('ammo-ico') || gunsmith.includes('ammo-ico'),
    数值条两段: /gs-stat-bar[^{]*\{[^}]*-\-/.test(css) && gunsmith.includes('data-delta-seg'),
    懒加载: app.includes('lazy-sentinel'),
    枪械库已删: !app.includes('枪械库')
  };
  for (const [name, ok] of Object.entries(PENDING)) pending.push([name, ok]);
}

if (errors.length) {
  console.error('guide 基线断言失败：');
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log(`verify:guide ${notes} 项断言通过`);
const left = pending.filter(([, ok]) => !ok).map(([name]) => name);
if (left.length) console.log(`  待搬 ${left.length} 项：${left.join(' / ')}`);
