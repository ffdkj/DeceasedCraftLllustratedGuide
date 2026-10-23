# Guide source module

这是亡者世界图鉴的独立源码页面，挂在 /guide/，由 Vite 构建时复制到 dist/client/guide。

运行：
pnpm install
pnpm run build
pnpm start

打开 http://localhost:8787/guide/。

数据与图片：页面复用仓库已有的 /data、/images、/textures，不重复打包。字体、自定义图标、载具分类图在 public/guide/ 内。

社区：后端在 src/server/community.ts，已挂载到 /api：
- POST /api/auth/register 邮箱注册
- POST /api/auth/login 邮箱登录
- POST /api/auth/logout 退出
- GET /api/me 当前用户
- GET /api/posts 论坛消息
- POST /api/posts 发消息（需登录）

本地数据默认写入 .data/community.json，生产环境请改用 SQLite/Postgres，并设置 NODE_ENV=production 以启用 Secure Cookie。
