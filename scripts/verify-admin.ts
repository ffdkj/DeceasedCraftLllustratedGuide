/**
 * 管理员登录 + 在线换图的契约断言。
 *
 * 背景：站点图片有两套源 —— 构建期带 8 位内容哈希的本地图（1 年 immutable）、
 * 以及对象存储里的 /media 图。只替换桶里的对象对本地那批引用完全无效，
 * 所以换图走「服务端覆盖层 + URL 版本串」；这里锁住这条链路的两端，
 * 顺带锁住「唯一管理员、环境变量凭据、SQLite + RustFS 镜像」这些安全与持久化前提。
 *
 * 用法：tsx scripts/verify-admin.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const has = (rel: string) => existsSync(join(ROOT, rel));

const errors: string[] = [];
let notes = 0;
function check(cond: boolean, message: string): void {
  if (cond) notes += 1;
  else errors.push('✗ ' + message);
}

/* ---------------- 服务端：存储层 ---------------- */
{
  check(has('src/server/db.ts'), '有 SQLite 存储层 src/server/db.ts');
  const db = read('src/server/db.ts');
  check(db.includes("from 'node:sqlite'"), '用内置 node:sqlite（不引入需要编译的原生依赖）');
  for (const table of ['override_versions', 'override_current', 'admin_sessions', 'login_fails', 'audit']) {
    check(db.includes('CREATE TABLE IF NOT EXISTS ' + table), `有表 ${table}`);
  }
  check(db.includes("process.env.DATA_DIR"), '数据目录读 DATA_DIR');
  check(db.includes("existsSync('/data')"), 'DATA_DIR 未配置时优先用挂载点 /data');
  check(db.includes("'public/admin/state.json'"), '状态镜像写到桶里 public/admin/state.json');
  check(db.includes('hydrate'), '启动时从镜像回灌（容器盘被清空也能恢复）');
  check(db.includes('scheduleMirror') || db.includes('flushMirror'), '每次改动后写穿镜像');
}

/* ---------------- 服务端：唯一管理员 ---------------- */
{
  const auth = read('src/server/admin-auth.ts');
  check(auth.includes('process.env.ADMIN_EMAIL'), '管理员账号来自环境变量 ADMIN_EMAIL');
  check(auth.includes('process.env.ADMIN_PASSWORD'), '管理员密码来自环境变量 ADMIN_PASSWORD');
  check(auth.includes('timingSafeEqual'), '密码比较是定长时间比较');
  check(auth.includes('30 * 24 * 3600 * 1000'), '会话 30 天');
  check(auth.includes('FAIL_LIMIT = 5'), '同一 IP 连错 5 次即锁');
  check(auth.includes('FAIL_WINDOW_MS = 10 * 60 * 1000'), '锁定窗口 10 分钟');
  check(auth.includes("const COOKIE = 'wz_admin'"), '管理员会话是独立 cookie（与社区账号互不影响）');
  check(auth.includes('httpOnly: true'), '会话 cookie 是 httpOnly');
  check(auth.includes("sameSite: 'Lax'"), '会话 cookie 是 SameSite=Lax');
  check(!/admin[^'"`]*register/.test(auth), '没有管理员注册端点（唯一账号不可自助创建）');

  const community = read('src/server/community.ts');
  check(community.includes('adminName(c)'), '/api/me 会带回管理员身份');
}

/* ---------------- 服务端：覆盖层 ---------------- */
{
  const over = read('src/server/overrides.ts');
  check(over.includes("const ALLOWED_PREFIX = '/images/'"), '只有 /images/** 里的图可替换（图集 / SVG 图标 / 字体排除在外）');
  check(over.includes('const FINGERPRINT = /\\.[0-9a-f]{8}(\\.[a-z0-9]+)$/i'), '按 8 位指纹哈希把请求路径剥回逻辑路径');
  check(over.includes('const KEEP_VERSIONS = 3'), '每张图保留最近 3 个版本');
  check(over.includes('const LONG_EDGE = 2048'), '转换时长边上限 2048');
  check(over.includes('quality: 90'), '转 WebP 质量 90');
  check(over.includes('alphaQuality: 100'), '保留 alpha 通道质量');
  check(over.includes('const MAX_INPUT_BYTES = 10 * 1024 * 1024'), '上传上限 10MB');
  check(over.includes("'public, max-age=31536000, immutable'"), '带 ?v= 的请求才长缓存');
  check(over.includes("'no-cache'"), '不带版本串的地址走 no-cache + ETag 复核');
  check(over.includes('if-none-match'), '支持 304 条件请求');
  check(over.includes('X-Image-Override'), '响应带 X-Image-Override 标记，便于排错');
  check(over.includes('override object missing'), '覆盖对象丢失时回退原图而不是 404');
  check(over.includes("'/admin/image/preview'"), '有预览端点（先看再替换）');
  check(over.includes("'/admin/image/commit'"), '有提交端点');
  check(over.includes("'/admin/image/revert'"), '有回退上一版端点');
  check(over.includes("'/admin/image/original'"), '有恢复原图端点');
  check(over.includes("'/admin/image/history'"), '有历史版本端点');
  check(over.includes("'/image-overrides'"), '有版本表端点');
  check(over.includes('imageVersionsScript'), '能把版本表渲染成同步脚本');
  check(/aspectDelta/.test(over), '预览会算比例偏差给前端告警');

  const index = read('src/server/index.ts');
  check(index.includes("app.get('/data/image-versions.js'"), '有 /data/image-versions.js 动态脚本路由');
  check(index.includes('cacheControl') || index.includes("c.header('Cache-Control', 'no-cache')"), '动态版本表不缓存');
  check(index.indexOf("app.use('/images/*'") < index.indexOf('serveStatic('), '覆盖层注册在静态文件之前');
  check(index.indexOf("app.use('/media/*'") < index.indexOf("app.all('/media/:path{.+}'"), '媒体覆盖层在 mediaHandler 之前');
  check(index.includes('await overridesReady()'), '启动时预热覆盖表');
}

/* ---------------- 客户端 ---------------- */
{
  const html = read('index.html');
  const dynAt = html.indexOf('/data/image-versions.js');
  const moduleAt = html.indexOf('/src/client/main.ts');
  check(dynAt > 0, 'index.html 加载图片版本表');
  check(dynAt < moduleAt, '版本表在应用入口之前加载（首屏就能带上版本串）');
  check(html.indexOf('/data/guides.js') < dynAt, '版本表在数据脚本之后加载（能读到 WZ_*）');

  const main = read('src/client/main.ts');
  check(main.trim().startsWith("import './image-versions';") || main.indexOf("import './image-versions';") < main.indexOf("import './app';"), 'image-versions 先于 app 加载');
  check(main.indexOf("import './admin';") > main.indexOf("import './app';"), 'admin 在 app 之后加载（WZ_APP_UI 已就绪）');

  const versions = read('src/client/image-versions.ts');
  check(versions.includes('WZ_IMAGE_VERSIONS'), '读服务端下发的版本表');
  check(versions.includes('setImageVersion'), '换图后能就地更新数据与 DOM');
  check(versions.includes('WZ_ASSET_MAP: 1'), '不改写 asset-map（否则运行时拼的地址会失效）');

  const admin = read('src/client/admin.ts');
  check(admin.includes('#img-edit-layer'), '按钮在独立的浮层里（不改页面布局）');
  check(admin.includes('MutationObserver'), '路由切换 / 动态渲染后按钮会重新生成');
  check(admin.includes("'/api/admin/image/preview'"), '客户端走预览端点');
  check(admin.includes("'/api/admin/image/commit'"), '客户端走提交端点');
  check(admin.includes("'/api/admin/image/revert'"), '客户端能回退上一版');
  check(admin.includes("'/api/admin/image/original'"), '客户端能恢复原图');
  check(admin.includes("'/api/admin/login'"), '客户端有登录请求');
  check(admin.includes("accept=\"image/jpeg,image/png,image/webp,image/avif\""), '文件选择器接受 JPG/PNG/WebP/AVIF');

  const app = read('src/client/app.ts');
  check(app.includes('case "admin-login":'), '设置页「管理员登录」接上了动作分发');
  check(app.includes('/api/auth/logout'), '退出社区账号打的是正确端点');
  check(!app.includes('fetch("/api/logout"'), '不再打不存在的 /api/logout');
  check(!app.includes('/auth/login'), '不再有指向 /auth/login 的死链');
  check(!app.includes('我的世界正版登录'), '占位的「微软正版登录」入口已下线');
  check(app.includes('route: route'), 'WZ_APP_UI 暴露 route 供管理员界面刷新');

  const css = read('public/css/app.css');
  for (const cls of ['#img-edit-layer', '.img-edit-btn', '.admin-preview', '.admin-actions', '.admin-history']) {
    check(css.includes(cls), `样式存在 ${cls}`);
  }
}

/* ---------------- 构建门禁 ---------------- */
{
  const sw = read('scripts/build-sw.ts');
  check(sw.includes("url === '/data/image-versions.js'"), 'SW 不预缓存动态版本表（内容随换图变化）');
  check(sw.includes('cache.delete(bare)'), '带版本串的图会清掉同路径的无版本缓存');
  check(read('scripts/check-assets.ts').includes('/data/image-versions.js'), 'check:assets 放行动态脚本');
  check(read('scripts/verify-fingerprint.ts').includes('/data/image-versions.js'), 'verify:fingerprint 单独断言动态脚本');
}

/* ---------------- 配置与文档 ---------------- */
{
  const example = read('.env.example');
  for (const key of ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'DATA_DIR']) {
    check(example.includes(key), `.env.example 有 ${key}`);
  }
  check(has('docs/admin-image-editor.md'), '有文档 docs/admin-image-editor.md');
  const pkg = read('package.json');
  check(pkg.includes('"verify:admin"'), 'package.json 有 verify:admin');
  check(/"verify":\s*"[^"]*verify:admin/.test(pkg), 'verify:admin 进了 npm run verify 门禁');
  const todo = read('tasks/todo.md');
  check(todo.includes('T31'), 'tasks/todo.md 记录了本次任务');
}

/* ---------------- 运行时：路径归一与版本串 ---------------- */
{
  const w = globalThis as unknown as Record<string, unknown>;
  w.window = w;
  w.document = { querySelectorAll: () => [] };
  w.WZ_IMAGE_VERSIONS = { '/images/guns/demo.webp': 'abcdef0123' };
  const mod = (await import('../src/client/image-versions.js')) as {
    logicalImagePath: (u: string) => string | null;
    versionedImage: (u: string) => string;
  };
  check(mod.logicalImagePath('/images/guns/demo.9b7d5672.webp') === '/images/guns/demo.webp', '运行时：剥掉 8 位指纹');
  check(mod.logicalImagePath('/media/images/guns/demo.webp') === '/images/guns/demo.webp', '运行时：/media/images 归一');
  check(mod.logicalImagePath('/textures/atlas.webp') === null, '运行时：纹理图集不算可替换图');
  check(mod.versionedImage('/images/guns/demo.9b7d5672.webp') === '/images/guns/demo.9b7d5672.webp?v=abcdef0123', '运行时：带版本的地址加 ?v=');
  check(mod.versionedImage('/textures/atlas.webp') === '/textures/atlas.webp', '运行时：未覆盖的地址保持原样');
}

if (errors.length) {
  console.error('管理员换图断言失败：');
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log(`verify:admin ${notes} 项断言通过`);
