# 死资源清理记录

- **日期**：2026-10-21
- **站点目录**：`wzsj-20261021/`
- **操作**：把未被任何代码引用的图片移出站点目录（非永久删除），同步更新预缓存清单与 SW 版本号
- **结果**：移除 **646** 个文件，共 **3.53 MB**；`images/manifest.json` 由 1364 条减为 727 条

## 判定方法

1. 递归扫描站点内所有 `.js` / `.css` / `.html` / `.webmanifest` / `.json` / `.md` / `.bat`，提取 `./images/...png|jpg|jpeg|webp` 字符串引用（排除 `images/manifest.json` 自身，它是清单不是引用）。
2. 与 `images/` 目录下的实际文件求差集，差集即"未被引用"。
3. 反向校验：**所有引用都能在磁盘找到对应文件（缺失 0 个）**；代码中未发现动态拼接的图片路径。

> 说明：`images/manifest.json` 是 Service Worker 的预缓存列表，不作为资源被引用的依据。

## 移除明细

| 分类 | 文件数 | 体积 | 说明 |
|---|---:|---:|---|
| vehicles | 545 | 2.76 MB | 每个车型只保留一个代表配色（如 `*_black`），其余颜色变体未被引用 |
| monsters | 87 | 623 KB | 未被怪物条目引用的图标；含若干内容重复的头部贴图 |
| guides | 5 | 97 KB | `banner_hotel.jpg`、`banner_residential.jpg`、`banner_retail.jpg`、`banner_wasteland.jpg`、`header_armorsets.jpg` |
| buildings | 1 | 43 KB | `T3沉渊纪念碑公园.png` |
| materials | 5 | 1.9 KB | `mts_circuit` / `mts_copperwire` / `mts_metaltube` / `mts_plating` / `mts_spring` |
| defense | 3 | 0.9 KB | `images/defense/defense/` 子目录，与上级 3 个文件内容完全相同 |
| **合计** | **646** | **3.53 MB** | |

monsters 明细按目录：

| 子目录 | 数量 |
|---|---:|
| monsters/spore | 27 |
| monsters/mcmod/undead_revamp2 | 23 |
| monsters/mcmod/spore | 19 |
| monsters/mcmod/zombie_extreme | 9 |
| monsters/heads | 7 |
| monsters/deceased | 2 |

完整文件列表见 [`removed-files.csv`](removed-files.csv)（UTF-8 with BOM，字段：path / category / bytes）。

## 同步修改

| 文件 | 修改 |
|---|---|
| `wzsj-20261021/images/manifest.json` | 移除已备份的 637 条记录（1364 → 727） |
| `wzsj-20261021/sw.js` | `CACHE` 版本 `wz-guide-v5.11.19-20261021-desktop-thumb` → `wz-guide-v5.11.19-20261021-cleanup`，触发客户端重建缓存 |

未改动任何业务 JS、数据文件或 HTML。

预缓存总体积：**13.29 MB → 9.84 MB**（首装少下载约 3.45 MB）。

## 验证结果

| 检查项 | 结果 |
|---|---|
| 代码引用图片数 vs 磁盘文件数 | 847 == 847，缺失 0，残留死文件 0 |
| `images/manifest.json` | 727 条，全部存在、全部有引用 |
| `sw.js` 预缓存 ASSETS | 34 项，全部存在；版本号已更新 |
| 本地静态服务逐个请求 | 847 个图片 URL 全部 200，失败 0 |
| JS 语法检查（`node --check`） | `sw.js`、`js/app.js` 通过 |
| `images/` 目录体积 | 10.81 MB / 847 个文件 |

## 回滚方法

被移除文件按原相对路径保存在本目录的 `files/` 下。需要恢复时，把 `files/` 的内容整体复制回 `wzsj-20261021/` 即可（例如在 Git Bash 中）：

```bash
cp -r _cleanup-20261021/files/. wzsj-20261021/
```

同时把 `sw.js` 中的 `CACHE` 版本改回或再加一个后缀，并重新生成 `images/manifest.json`。

## 测试部署

清理后的版本已通过 Cloudflare MCP 部署到 <https://wzsjtest.gor.dpdns.org>（Worker `wzsj-atlas-test`，
代理生产资源 + 内联覆盖 `sw.js` / `images/manifest.json`）。详见
[`deploy-wzsjtest-20261021.md`](deploy-wzsjtest-20261021.md)。

## 后续计划（未执行）

1. 把 `attachments`（193 张 96×96）与 `guns`（177 张 64×64）打成图集，减少约 370 次请求。
2. 载具图集只打包实际引用的 92 张（96px 格，约 0.45 MB）。
3. `materials` / `weapons` / `defense` 合并为一张小图集。
4. 大图类别（buildings / guides / 怪物立绘）继续用独立文件，优先转 WebP 压缩。
