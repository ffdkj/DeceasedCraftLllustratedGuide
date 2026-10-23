/**
 * 社区（聊天附图 + 照片墙）断言：客户端与后端必须接得上。
 *
 * 背景：PR 把照片墙改成存 `image` 地址，但根站社区页还在读 `p.dataUrl` → 有照片也渲染不出来；
 * 上传入口也只存在于 guide 的 community-media.js 里。这里锁住两端契约。
 *
 * 用法：tsx scripts/verify-community.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const app = readFileSync(join(ROOT, 'src/client/app.ts'), 'utf8');
const server = readFileSync(join(ROOT, 'src/server/community.ts'), 'utf8');
const css = readFileSync(join(ROOT, 'public/css/app.css'), 'utf8');

const errors: string[] = [];
let notes = 0;
function check(cond: boolean, message: string): void {
  if (cond) notes += 1;
  else errors.push('✗ ' + message);
}

/* ---------------- 客户端：照片与聊天附图 ---------------- */
check(app.includes('const src = p.image || p.dataUrl;'), '照片墙读 p.image，兼容旧的 p.dataUrl');
check(!/p\.dataUrl \? '<figure/.test(app), '没有残留「只认 dataUrl」的旧渲染');
check(app.includes('function uploadCommunityImage('), '有统一的上传函数');
check(app.includes('fetch("/api/upload"'), '上传走 POST /api/upload');
check(app.includes('id="chat-file"'), '聊天表单有附图选择');
check(app.includes('class="chat-img"'), '聊天附图会渲染出来');
check(app.includes('id="community-photo-form"'), '照片墙有上传表单');
check(app.includes('method: "POST", body: fd'), '上传是 multipart（FormData）');

/* ---------------- 后端：端点与校验 ---------------- */
for (const route of ["community.post('/upload'", "community.get('/uploads/:name'", "community.get('/photos'", "community.post('/photos'"]) {
  check(server.includes(route), `后端有端点 ${route}`);
}
check(server.includes('if (!user) return c.json({ error: \'请先登录\' }, 401);'), '上传/发帖要求登录');
check(server.includes("['image/jpeg', 'image/png', 'image/webp']"), '只接受 JPG / PNG / WebP');
check(server.includes('MAX_IMAGE_BYTES'), '有单张体积上限');
check(server.includes("image.startsWith(UPLOAD_PREFIX)") && server.includes("!image.startsWith(UPLOAD_PREFIX)"), '照片地址必须是本站上传产物');
check(server.includes('checkText(caption)'), '图片说明走词库审核');

/* ---------------- 样式 ---------------- */
for (const cls of ['.community-form .chat-upload', '.community-photo-form', '.chat-img']) {
  check(css.includes(cls), `样式存在 ${cls}`);
}

/* ---------------- ③c：站点日志 / 审核词库 / 建筑文案 ---------------- */
{
  const changelog = readFileSync(join(ROOT, "public/data/changelog.js"), "utf8");
  check(changelog.includes("window.WZ_SITE_CHANGELOG"), "站点更新日志已并进 data/changelog.js");
  check(/WZ_SITE_CHANGELOG = \{[^}]*"version":"0\.1\.0-beta"/s.test(changelog), "站点日志版本是 0.1.0-beta");
  check(changelog.includes('"items":['), "站点日志带条目");

  const moderation = readFileSync(join(ROOT, "src/server/moderation.ts"), "utf8");
  check(moderation.includes("public/data/blocked-words.txt"), "审核词库改从 public/data 读");
  check(!moderation.includes("public/guide/data/blocked-words.txt"), "不再依赖 public/guide 的词库路径");

  const words = readFileSync(join(ROOT, "public/data/blocked-words.txt"), "utf8").split(/\r?\n/).filter(Boolean);
  check(words.length >= 800, `审核词库条目充足（${words.length} 条）`);

  const building = readFileSync(join(ROOT, "public/data/building-content.js"), "utf8");
  check(building.includes("window.WZ_BUILDING_CONTENT"), "建筑文案已迁成 public/data/building-content.js");

  check(app.includes('data-action="site-changelog"'), "设置页有网站更新日志入口");
  check(app.includes("function openSiteChangelog("), "日志弹窗已接上");
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} 项失败 / ${notes} 项通过`);
  process.exit(1);
}
console.log(`ok 全部通过：${notes} 项断言`);
