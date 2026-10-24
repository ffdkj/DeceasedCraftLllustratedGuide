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
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
  check(has('public/guide/js/admin.js'), '管理端换图脚本在 guide 里');
  check(html.includes('./js/admin.js'), 'guide 入口加载管理端换图');
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

  /* 弹药本体图标（gfor14415 的实现：images/ammo/tacz/ + ammoTexture 查表。
     我原来那套 data/ammo-icons.js + 生成器同步版在合并时撤掉了，只留一套） */
  const ammoDir = 'public/guide/images/ammo/tacz';
  const texFiles = existsSync(ammoDir) ? readdirSync(ammoDir).filter((f) => f.endsWith('.webp')) : [];
  check(texFiles.length >= 17, `TACZ 弹药贴图 ${texFiles.length} 张`);
  check(app.includes('function ammoTexture('), '弹药贴图按 tacz id 解析');
  check(app.includes('./images/ammo/tacz/'), '贴图目录是 images/ammo/tacz/');
  check(app.includes('ammo-thumb'), '弹药库列表用了贴图');
  check(css.includes('.guide-thumb.ammo-thumb'), '贴图有按比例缩放的样式（cover 会裁掉弹头）');
  check(!html.includes('ammo-icons.js'), '旧的清单方案已撤（不留第二套实现）');
  check(!existsSync('public/guide/data/ammo-icons.js'), '旧清单文件已删除');

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

  /* 管理端换图：版本串注入标记 + 四个接口 + 回退能力 + 浮层样式 */
  const admin = has('public/guide/js/admin.js') ? read('public/guide/js/admin.js') : '';
  const server = read('src/server/index.ts');
  const marker = /const DYNAMIC_SCRIPT_TAG = '([^']+)'/.exec(server);
  check(!!marker, '服务端有版本串注入标记');
  check(!!marker && html.includes(marker[1]), 'guide 入口带版本串注入标记（和服务端常量一致，否则换图不生效）');
  check(html.indexOf('/data/image-versions.js') < html.indexOf('./js/admin.js'), '版本表先于换图脚本加载');
  check(admin.includes('/api/me'), '换图浮层按 /api/me 判断登录态');
  check(admin.includes('/api/admin/image/preview'), '有预览转换接口');
  check(admin.includes('/api/admin/image/commit'), '有确认替换接口');
  check(admin.includes('/api/admin/image/revert'), '有回退上一版');
  check(admin.includes('/api/admin/image/original'), '有恢复原图');
  check(admin.includes('/api/admin/image/history'), '有版本历史');
  check(admin.includes('?v='), '换图后换 URL（版本串），不是只改缓存头');
  check(admin.includes('WeakSet'), '改写数据时防环（WZ_DATA 有互相引用的索引）');
  check(app.includes('WZ_ADMIN_UI.refresh'), '登录/退出后同步换图浮层');
  check(css.includes('#img-edit-layer .img-edit-btn'), '换图按钮浮层样式存在');
  check(css.includes('.admin-preview') && css.includes('.admin-actions') && css.includes('.admin-history'), '换图弹层样式存在');
  {
    const layerZ = /#img-edit-layer \{[^}]*z-index:\s*(\d+)/.exec(css);
    const overlayZ = /\.overlay \{[^}]*z-index:\s*(\d+)/.exec(css);
    check(!!layerZ && !!overlayZ && Number(layerZ[1]) < Number(overlayZ[1]), '浮层 z-index 低于弹层遮罩（按钮不会浮在对话框上）');
  }

  /* 删枪械库（C1–C3）：列表页与详情页都没了，内容与入链搬进改枪台，老地址重定向 */
  check(!app.includes('title: "枪械库"'), '没有「枪械库」这个列表页');
  check(!app.includes('href: "#/gear/guns"'), '齿轮页没有枪械库入口卡片');
  check(app.includes('function legacyHash'), '旧地址有重定向表');
  check(app.includes('#/gear/gunsmith/') && app.includes('seg[1] === "gun" && seg[2]'), '旧枪械详情地址重定向到工作台');
  check(app.includes('if (type === "guns") return "#/gear/gunsmith/'), '枪械详情链接改指改枪台（入链不留死链）');
  check(gunsmith.includes('#/gear/guntable'), '数据表入口搬到改枪台（仍然可达）');
  check(gunsmith.includes('gunInfoSections'), '工作台接管了枪械资料区');
  check(gunsmith.includes('recipeSection') && gunsmith.includes('lootSourcesSection'), '合成材料与来源复用 app.js 的分区，没有第二份实现');
  check(app.includes('recipeSection: recipeSection'), 'app.js 把分区渲染导出给改枪台');
  check(app.includes('lazyList(box, list'), '图鉴通用长列表仍然接在滚动加载上');

  /* 评论登录门槛（gfor14415 加的功能；服务端已关普通用户登录） */
  {
    const community = has('src/server/community.ts') ? read('src/server/community.ts') : '';
    check(app.includes('<form id="comment-form" class="comment-form" hidden>'), '评论框默认隐藏（未登录不显示）');
    check(app.includes('signedIn = !!(arr[1] || {}).user'), '按 /api/me 带回的 user 判断登录态');
    check(app.includes('comment-login-note'), '未登录时插一行登录说明');
    check(app.includes('if (!signedIn) { toast("请先登录后再评论"); return; }'), '提交时二次拦截未登录');
    check(community.includes('userLogin: false'), '服务端标注普通用户登录已关闭');
  }
}

if (errors.length) {
  console.error('guide 基线断言失败：');
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log(`verify:guide ${notes} 项断言通过`);
const left = pending.filter(([, ok]) => !ok).map(([name]) => name);
if (left.length) console.log(`  待搬 ${left.length} 项：${left.join(' / ')}`);
