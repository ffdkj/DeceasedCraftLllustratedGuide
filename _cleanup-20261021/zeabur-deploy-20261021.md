# Zeabur 部署说明

## 形态

单 Node 服务：Hono 托管 `dist/client` 静态资源，并通过 `/media/*` 代理 RustFS 私有对象。

- 构建：`npm ci --include=dev && npm run build`
- 启动：`node dist/server/index.js`
- 端口：`PORT`（默认 8787）
- Docker：仓库根目录的 `Dockerfile` 可直接用于 Zeabur 的 Docker 服务

## 环境变量

在 Zeabur 服务里配置（不要提交 `.env`）：

```
RUSTFS_ENDPOINT=https://rusts.zeabur.app
RUSTFS_BUCKET=wzsj-media
RUSTFS_ACCESS_KEY=...
RUSTFS_SECRET_KEY=...
RUSTFS_API_KEY=...        # 可选，管理 API 用
```

本地开发可复制 `.env.example` 为 `.env` 填入真实值。

## 首次部署

1. 在 Zeabur 创建服务，选择本仓库的 Dockerfile 构建。
2. 配置上面的环境变量。
3. 绑定域名（例如 `wzsj.gor.dpdns.org`），确认自动 TLS。
4. 打开 `/api/health` 应返回 `{"ok":true,"service":"wzsj-atlas"}`。

## RustFS 媒体

媒体已经上传到 `wzsj-media`（304 个对象 / 15.21MB）。如需重新上传：

```bash
npx tsx scripts/setup-rustfs.ts
npx tsx scripts/upload-media.ts
```

注意：`scripts/optimize-assets.ts` 和 `scripts/rewrite-media-paths.ts` 是历史一次性脚本；
当前 `public/images` 已经是优化后的本地资源，不需要在 CI 中重复运行。

## Cloudflare（只做 CDN）

- DNS 代理开启，SSL 模式 **Full (strict)**。
- Cache Rule：
  - 可缓存：`/assets/*`、`/images/*`、`/textures/*`、`/data/*`、`/icons/*`、`/media/*`
  - Bypass：`/sw.js`、`/index.html`、`/manifest.webmanifest`、`/images/manifest.json`
- 开启 Brotli、HTTP/3、Tiered Cache、Early Hints。
- 静态资源 URL 带内容哈希/版本；部署后无需 purge 静态资源，只需清理 HTML/SW。
- `/media/*` 由 Hono 回源 RustFS；首次回源后由 Cloudflare 边缘缓存。RustFS 直连当前约 40KB/s，
  建议确认 Cloudflare 缓存命中率；音频支持 Range（206）。

## 验证

```bash
npm run verify                 # 构建 + 类型检查 + 资源引用检查
curl -I https://<域名>/        # 200, Cache-Control: no-cache
curl -I https://<域名>/assets/index-*.js
curl -H "Accept-Encoding: br" -I https://<域名>/data/guides.js  # content-encoding: br
curl -H "Range: bytes=0-1023" -I https://<域名>/media/audio/hope.m4a  # 206
```

## 旧部署清理

Cloudflare Workers 相关文件（`wrangler.jsonc`、`_headers`、测试 Worker `wzsj-atlas-test`）
在 Zeabur 验证通过后即可删除；`wzsj-20261021/` 仅保留为文档/数据表快照。
