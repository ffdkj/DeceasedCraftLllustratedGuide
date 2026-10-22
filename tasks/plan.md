# Plan: 配方数据 + 未实装分类 + 枪械造价

依据：`specs/MAP-gunsmith-cost.md` 与三份模块规格。

## 组件与依赖

1. `scripts/pack-readers.ts`（新增，无依赖）
   - JSONC 解析、递归遍历、枪/配件配方读取（含 `result.item.nbt.GunId`、rebel 单数目录）、
     jar 内 loot_tables 的 GunId 扫描、npc_shops / spawn 命令池的 GunId 提取、tags 解析（本地优先）。
2. `scripts/gen-recipes.ts`（新增，依赖 1）→ `public/data/recipes.js`
3. `scripts/gen-atlas-extra.ts`（新增，依赖 1）→ `public/textures/atlas.webp` + `public/data/textures.js`
4. 数据接入：`index.html`、`scripts/build-sw.ts`、`src/client/types/data.d.ts`
5. `src/client/app.ts`：未实装分组/徽章、枪械掉落来源解析、详情页造价块
6. `src/client/gunsmith.ts`：hub 分类、标题徽章、工作台造价块（本体 + 已装配件）
7. `public/css/app.css`：造价块与徽章样式
8. `scripts/verify-recipes.ts`：数据断言（入库）

## 顺序

1 → 2 → 3 → 4 → 8（数据层验收）→ 5/6/7（界面）→ 全量 verify + 页面验收

## 风险

- 材料中文名依赖人工字典：先自动从 `guides.js` 已有材料 + jar lang 抽取，缺失项人工补。
- 原版贴图需联网；失败自动退近似图（不影响构建）。
- 217MB 的 DCTweaks jar 只解析一次，结果用于可得性集合；缺失时按规格退化（无配方即未实装）并记 warning。
- 站内 gunsmith 178 把 vs guides 177 把：以 gunsmith 为准做判定集合，两个列表都消费同一 `unreleased`。
