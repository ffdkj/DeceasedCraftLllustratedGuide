# PR 页面并入根站 · 决策记录与交付计划

> 状态：决策已定（2026-10-23），执行中。每一步单独提交并跑门禁。
> 背景：PR #1/#2 带进两样东西——`public/guide/` 整站静态副本（入口 `/guide/`）与社区后端（`src/server/community.ts`）。

## 排查结论（“图片 UI 没更新成功”的真实原因）

1. **两套图片树**：根站 `public/images` 1041 张（最大 22 KB，优化图 + 207 张 `-thumb`）；
   `public/guide/images` 1555 张（32 MB，全尺寸原图，无缩略图）。逐文件比对：515 相同、**296 同路径仅编码不同**、
   743 只在 guide（vehicles 545 / monsters 87 / buildings 83 / 其余 28）、229 只在根站（含 `ammo/*`）。
   → 打开 `/guide/` 看到的是另一套图，新图不会出现。
2. **无指纹 URL + immutable 缓存**：`/images/*`、`/textures/*`、`/icons/*` 发 `Cache-Control: immutable, max-age=31536000`，
   但 URL 没有内容哈希。线上实测 `/textures/atlas.webp` 仍是 43 小时前的旧版（CF 边缘 749182 B vs 仓库 740656 B，
   `cf-cache-status: HIT`, `age=156508`）。新路径能出，**同路径改内容永远不更新**。SW 的 `wz-images-v1` 亦为 cache-first 且版本写死。
3. **上传落容器本地盘**：`/api/upload` 写 `.data/uploads/*.webp` 返回 `/api/uploads/*`，`community.json` 也在本地盘；
   Zeabur 每次重新部署即清空（线上 `/api/photos` 已是 `{"photos":[]}`）。
4. 根站社区页仍在读 `p.dataUrl`，PR 已改为 `p.image` → 有照片也渲染不出来。

## 已确认的决策

| # | 决策 |
|---|---|
| 形态 | **单应用**：guide 并入根站，删除 `public/guide/`，**`/guide/*` 一律 404**（不做兼容重定向） |
| 视觉 | **以 guide 为基座**：`public/guide/css/app.css` 为底，逐块 diff 合并，保留根站新增块（梯度点阵、数值条、像素字、弹药图标、动物页） |
| 图片 | **单一图片树**：缩略图/小图留仓库；全尺寸/大图进 RustFS，引用走 `/media/*`；296 张同路径冲突**以 guide 版为准**（实测同像素、仅编码不同） |
| 数据 | **以根站生成器产出为准**，`public/guide/data/*.js` 仅作参考；`building_content.js` 迁成 `public/data/building-content.js`（一次性导入脚本） |
| 缓存 | **构建期内容指纹**（文件名哈希）覆盖 `/images /textures /icons /fonts /data`；SW 图片缓存版本随内容变化 |
| 上传 | 上传图与社区元数据**都进 RustFS**（`public/uploads/*`、`public/community/community.json`）；超限裁剪时同步删 S3 对象 |
| 社区 | 浏览公开；上传/发帖需登录 + 词库审核（现状不变）；**不做** `/auth/login` |
| 离线 | SW 只预取本地小图 + data + 壳；`/media` 大图首次访问时缓存 |
| 导出 | 新建 `/downloads/`，由生成器产出；第一批只迁 **枪械 / 弹药 / 载具** 三张表 |
| 清理 | 删 `public/guide/`、`wzsj-20261021/`、`wrangler.jsonc`；保留 `_cleanup-20261021/` 文档 |
| 门禁 | 扩展 verify：路由渲染抽烟 + 图片/指纹引用完整性 + 页面对比截图 |

## 四步交付

1. **资产去重 + 指纹**（进行中）
   - `scripts/sync-media.ts`：把 guide 独有的 743 张全尺寸图上传 RustFS（key `public/images/<rel>`），HEAD 校验，
     更新 `public/media-manifest.json`；幂等（体积相同即跳过）。
   - 296 张冲突图用 guide 版覆盖仓库本地图（同像素、不换名）。
   - 校验通过后删除仓库里的全尺寸原图；随后进入指纹（引用改写 + SW 版本）。
2. **CSS 合并**：guide `app.css` 为基座 + 根站新增块，逐页验收（含浅色/深色）。
3. **guide 逻辑回灌**：monster-grid（切换按钮、默认列表）、照片墙上传/聊天附图、0.1.0-beta 日志、
   `building-content.js`、审核词库、`/downloads/`。
4. **对象存储收尾**：上传与 `community.json` 进 RustFS、S3 对象清理、删 `public/guide/` 与旧快照与 `wrangler.jsonc`、
   `/guide/*` 404。

## 凭据与风险

- RustFS：`RUSTFS_ENDPOINT` / `RUSTFS_BUCKET=wzsj-media` / `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY`，写在本地 `.env`（gitignored，不入库）。
- 上传脚本先 HEAD 校验再删仓库文件；任何一张失败即停止删除，避免“图没了对象也没有”。
