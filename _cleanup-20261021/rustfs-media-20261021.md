# RustFS 媒体层记录

- **日期**：2026-10-21
- **Bucket**：`wzsj-media`
- **服务**：Zeabur 项目 `untitled-2` / 服务 `RustFS`
- **S3 Endpoint**：`https://rusts.zeabur.app`（portName `web`）
- **控制台**：`https://nayun.zeabur.app`
- **Region**：`us-east-1`（S3 兼容，path-style）
- **访问方式**：私有 Bucket；浏览器不直连，统一走 Hono `/media/*` 流式代理

## 凭证

凭证只放在环境变量中（本地 `.env` 已 gitignore，线上放 Zeabur 环境变量）：

```
RUSTFS_ENDPOINT=https://rusts.zeabur.app
RUSTFS_BUCKET=wzsj-media
RUSTFS_ACCESS_KEY=...
RUSTFS_SECRET_KEY=...
RUSTFS_API_KEY=...   # 可选，管理 API 用，S3 客户端不需要
```

`.env.example` 只有占位符，不包含真实密钥。

## 对象布局

| Key 前缀 | 内容 | 数量 |
|---|---|---:|
| `public/images/guides/` | story / npcs / 建筑 hero 等全尺寸 WebP | 123 |
| `public/images/buildings/` | 建筑小地图全尺寸 WebP | 82 |
| `public/images/vehicles/` | 载具全尺寸 WebP | 92 |
| `public/audio/` | 7 首原声 m4a | 7 |
| **合计** | | **304 个 / 15.21MB** |

本地保留（不经过 RustFS）：

- 列表缩略图：`public/images/{guides,buildings,vehicles}/*-thumb.webp`
- 小图标：guns / attachments / materials / weapons / defense
- 怪物图：`public/images/monsters/**`
- 图集：`public/textures/atlas.webp`
- 数据与代码：`public/data/*.js`、`public/sw.js`、Vite 产物

## 访问链路

```
浏览器 / SW
  └── GET /media/*            （同源）
        └── Hono mediaHandler
              ├── GetObject(Range/If-None-Match)
              └── RustFS 私有对象
```

- `GET` 支持 Range，返回 `206`、`Content-Range`、`Accept-Ranges: bytes`。
- `HEAD` 返回 `Content-Length`。
- 响应头：`Cache-Control: public, max-age=31536000, immutable`。
- 中文对象名由 Hono 解码后传给 S3；URL 使用百分号编码。

## 脚本

| 脚本 | 用途 |
|---|---|
| `scripts/setup-rustfs.ts` | 检查/创建 Bucket，列出对象 |
| `scripts/upload-media.ts` | 上传全尺寸图片与音频，按大小跳过已存在对象 |
| `scripts/rewrite-media-paths.ts` | 数据/种子/音乐/SW 路径改为 `/media/*`，生成本地 manifest 与媒体 manifest，删除本地全量副本 |

运行方式：

```bash
npx tsx scripts/setup-rustfs.ts
npx tsx scripts/upload-media.ts
npx tsx scripts/rewrite-media-paths.ts
```

## 备注

- 当前从本机直连 RustFS 的下载速度约 **40KB/s**（直接 HTTP 与 SDK 均测过，瓶颈在链路/RustFS 服务，不在 Hono）。Cloudflare 缓存 `/media/*` 后会显著改善；音频 65kbps 可以边下边播。
- 若要回退到本地媒体：从 Git 历史恢复 `public/images/{guides,buildings,vehicles}` 的完整 WebP 与 `public/audio/*.m4a`，再反向改写 `/media/*` 为 `./images/*` / `./audio/*`（当前没有自动反向脚本，建议用 `git checkout <commit> -- <path>`）。
