# 远端分叉冲突清单（待逐条解决）

> **状态（2026-10-24 晚）**：D1–D4/D7 已定，D5/D6 随 D1 作废；C1/C2/C3 已定（枪械库要删，三前提按序做）。
> **D1 = 以 guide 为准**：`public/guide/*` 是被服务的站点，`src/client` 编译产物不再上线；根站改动只作存档
> （`wip/root-first`），有价值的按 §2 的 G 表搬进 guide。图鉴回退（105 只、无动物页）**接受**。
> **D3 = 搬**：G2 / G3 / G10 + 管理端换图 UI；G1 改枪台梯度图标、G4 怪物数值面板、G5 列表/网格切换、
> G6 数值手册页、G7 `/downloads/`、G9 指纹、G11 死样式、G12 半点制图标暂不搬（G12 待核对是否同一实现）。
> **C1–C3 已定**：配方/作用/来源搬进改枪台、3 处入链改指 `#/gear/gunsmith/<id>`、`#/gear/guns` 302 到改枪台。

上一份 `docs/merge-conflicts.md` 处理的是「历史合并遗留」。这份处理**新出现的分叉**：
`gfor14415` 在 10-24 12:30–14:33 往 `origin/main` 推了 52 个提交（我本地 8 个提交还没推上去，`git push` 被拒）。
两份提交都从 `78ffe2e` 分出来，改动区域高度重叠。

**先说三处最危险的地方**：

1. `package.json` 的 `build` 链加了 `build:guide-root`，而 `scripts/copy-guide-root.ts` 把 `public/guide/*` 整份 `cpSync` 到 `dist/client/*` —— **构建产物被 guide 静态副本覆盖**，根站（`src/` 编译出的 app）不再是线上内容。
2. `src/server/index.ts` 的 `resolveStaticRoot()` 改成优先 `public/guide`，并删掉了 `/guide/*` → 404 那条路由 —— 与 `docs/merge-plan.md` 里「单应用、/guide 下线」的既定决策相反。
3. 52 条提交信息全是 `????`（编码坏了），历史可读性已经损失；后续再 rebase 只会把这些乱码带下去。

---

## 1. 两条线的实际差别

| 维度 | 他们的线（origin/main） | 我的线（本地 8 提交） |
|---|---|---|
| 线上跑什么 | `dist/client` 被 `public/guide` 覆盖 → guide 快照 | `src/client` 编译出的单应用 |
| 图片指纹 / `?v=` 版本串 | 没有（guide 用自己的 `sw.js` 与固定文件名） | 有，且管理端换图依赖它 |
| 管理员换图 / 登录 | 没有服务端实现（他们有内容覆盖 `texts`/`images`，走 custom 数据） | 完整（SQLite + RustFS + 覆盖层） |
| 数据分层 | 新增 `public/data/custom/*` + `docs/data-architecture.md`（按 id 合并覆盖） | 官方数据只由 `npm run gen:*` 产出，不引 custom 层 |
| 社区 | 新增 comments / mutes（禁言）/ texts / images | 保持 posts / photos / upload |
| 数据表 | 根目录放 `枪械数据表.csv/html`、`载具补全清单.csv/html`（guide 自带） | `/downloads/` 生成器产出三张表 |
| 构建 | `build:guide-root` 参与 `build` | 指纹 → server → sw → 预压缩 |

**没有冲突的**：他们没删我的 admin 文件（`src/server/{admin-auth,overrides,db,objects}.ts`、`src/client/{admin,image-versions}.ts` 都还在），也没改 `public/data/guides.js` 与怪物数据。

---

## 2. 如果以 guide 为准（你的倾向）：要移植 12 项

移植 = 把根站能力搬进 `public/guide/js/*` 与 `public/guide/css/app.css`，之后**每次改动都要双写**（除非彻底删掉根站）。

| # | 能力 | 现状证据 | 移植成本 |
|---|---|---|---|
| G1 | 改枪台的枪械梯度图标 | guide 的 `js/gunsmith.js` 里 `tier/梯度` **0 处**；根站有 `src/client/tiers.ts` + `data/tiers.js` + `images/ammo/*` 15 张 | 中：搬 tiers.ts + 数据 + 图标 + CSS |
| G2 | 弹药本体图标（不是冲压模具） | guide `ammo-ico` **0 处** | 小 |
| G3 | 数值条绿/红（配件加减） | guide 无 | 小 |
| G4 | 每只怪的「具体数值」面板 | guide `monster-nums` **0 处** | 中 |
| G5 | 列表/网格切换 | guide 只有 `monster-grid` 样式，无 `monster-view` 按钮 | 小 |
| G6 | 怪物数值手册页（本轮新做） | guide 有旧版 132 行表（`GUIDE.monsterStats`），我重建的版本读生成数据 | 中 |
| G7 | `/downloads/` 三张表 | guide `downloads` **0 处**（它把 CSV 放在站点根） | 小 |
| G8 | 管理员登录 + 在线换图 | guide 无服务端；他们有 texts/images 覆盖但无上传转码 | **大**（SQLite/对象存储/覆盖层整套） |
| G9 | 内容指纹 + 版本串 | guide 无构建链 | **大**（等于重做一次构建管线） |
| G10 | 滚动加载 + NPC 折叠（本轮新做） | guide 无 | 小 |
| G11 | 死样式清理（本轮新做） | guide 的 CSS 就是死样式来源 | 小 |
| G12 | 半点制图标 | guide `stat-heart-half` **5 处**（需核对是否同一实现） | 待核对 |

---

## 3. 如果以根站为准（我的建议）：要吸收他们 5 项

| # | 他们的能力 | 是否值得吸收 |
|---|---|---|
| R1 | `public/data/custom/*` 数据覆盖层 | **值得**：我们的生成器只产出官方数据，覆盖层正好放「站长改的内容」 |
| R2 | `docs/data-architecture.md` | **值得**：作为覆盖层的约定文档 |
| R3 | `community.ts` 的 comments / mutes | 值得（评论 + 禁言），但要和我的 upload/photos 逻辑对齐 |
| R4 | `texts` / `images` 覆盖映射 | **与我的管理员换图重复** —— 二选一（见 C3） |
| R5 | guide 的 `public/guide/` 目录 | **建议不成立**：D1 最终选了 guide 为准，它就是站点本身（32MB 的复制开销接受） |

---

## 4. 「删枪械库」的重合度分析（你问的那条）

**改枪台已经覆盖了「找枪」**：`src/client/gunsmith.ts:546` 的 hub 有搜索框、类型 chip、177 张枪卡片网格，点进去是工作台（数值条 / 配件 / 推荐）。

**但枪械库不是只有列表**，它承载三样改枪台没有的东西：

| 枪械库独有的 | 位置 |
|---|---|
| 合成材料（recipe） | 详情页 `guideDetailExtra('guns')` |
| 作用 / 描述 / 来源 | 同上 |
| 3 处入链 | `#/gear/guntable` 表格行点击、弹药详情「适用枪械」芯片（`app.ts:988`）、战利品物品页的枪械芯片 |

所以删枪械库有三个前提：

- [x] C1 把「合成材料 / 作用 / 来源」搬进改枪台工作台
  —— 落在 `gunInfoSections()`：复用 `app.js` 的 `recipeSection` / `effectSection` / `lootSourcesSection`
     与 `commentsHTML` + `mountPageComments`（玩家评论原本挂在枪械详情页，不搬就变孤儿），
     `WZ_APP_UI` 多导出这四个口子。没有第二份实现。
- [x] C2 入链改指 `#/gear/gunsmith/<id>`
  —— 只在 `guideDetailHref()` 里改一处（`type === "guns"` 直接返回改枪台地址），
     于是数据表行、弹药「适用枪械」芯片、showcase「完整资料」按钮同时被覆盖，不会漏。
- [x] C3 `#/gear/guns` 重定向到改枪台
  —— `legacyHash()`：`#/gear/guns → #/gear/gunsmith`、`#/gear/gun/<id> → #/gear/gunsmith/<id>`，
     在 `route()` 最前面 `location.replace`，已分享的老链接不会死。

顺带：`#/gear` hub 上「枪械库」卡片已删，只留改枪台；`#/gear/guntable` 数据表保留
（177 行的对照表，改枪台的卡片网格替代不了），入口从改枪台 hub 进，行仍指向工作台。
枪械详情页（`#/gear/gun/<id>`）与 `guideDetailExtra('guns')` 分支一并删除。

实测（Node DOM 桩）：旧地址两条都重定向到位、工作台含作用/合成材料/可搜刮建筑/评论、
数据表每行指向工作台、齿轮页无枪械库入口。`verify:guide` 64 项（含 9 条防回潮断言）。

---

## 5. 逐条待决

- [ ] D1 **站点以谁为准**：guide 覆盖根站 / 根站单应用 / 双轨 —— 这一条不定，下面全动不了
- [ ] D2 若选根站：`build:guide-root`、`resolveStaticRoot` 优先 guide、删掉的 `/guide` 404 三处一起回滚
- [ ] D3 若选 guide：G1–G12 的移植顺序与是否双写
- [ ] D4 提交信息乱码怎么处理（保留 / 交互式 rebase 改写 / 不管）
- [ ] D5 R3 社区评论与禁言并进来后，`verify:community` 的 41 项断言要扩到覆盖新端点
- [ ] D6 R4 `texts`/`images` 覆盖 vs 我的管理员换图：二选一还是并存
- [ ] D7 我的 8 个提交怎么落地：rebase 到 origin/main（逐个解冲突）还是先 stash、按 D1 的结论重新组织

**当时的建议**：D1 选「根站单应用 + 吸收 R1/R2/R3」，再回滚他们的三处部署改动（D2）。
理由是 G8/G9 在 guide 侧等于重做一遍构建管线与整个管理后端。

**实际走向（D1 反向）**：站点以 guide 为准，根站 `src/client` 作为存档不再上线。
这条建议里「要重做的成本」被逐项拒绝了：
- G8 管理端不是重做 —— 服务端（SQLite 覆盖表 + RustFS + `/api/admin/*`）本来就在他们的树里，
  缺的只是前端，`public/guide/js/admin.js` 一个文件搬完；
- G9 指纹不再需要 —— guide 的图片没有指纹，覆盖层用「逻辑路径 + `?v=`」换 URL 就够；
- 32MB 复制开销保留，换来的是不用维护两套前端。
枪械库的删除（C1–C3）已按另一条线独立做完，见上。
