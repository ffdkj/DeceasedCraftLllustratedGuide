# 合并冲突清单（待逐条解决）

> **状态（2026-10-24 晚）**：本清单已结案。A 组全部落地；B 组 B1/B3/B4/B5/B6/B7/B8/B9 落地、B2 挂起（数据未就绪）。
> 这些改动的提交在本地存档分支 `wip/root-first`（基于 `78ffe2e`，比新 `origin/main` 多 9 个提交）——
> 当时站点方向是「根站单应用」，后来改成「guide 为准」，所以那些 UI 改动没有直接 rebase，而是按
> `docs/merge-conflicts-remote.md` 的 G 表逐项搬进 `public/guide/`。文档与手册类（A 组）已在新基线上重放。

这份是**待决清单**，不是记录：`docs/merge-plan.md` 记的是上一轮已并完的部分（CSS 基座、图片单树、指纹、`/guide` 下线、社区上传、changelog、`/downloads/` 三表）。
本清单只列还没解决、或解决得不彻底的项。

范围（已确认）：
1. 怪物手册重构的收尾 —— 你未提交的 4 个文件，加上 HEAD 里已经引用它的地方。
2. 指南版页面（gfor14415 的两个 PR）与当前页面的 UI 差异 —— 逐项决定要不要回灌。

用法：每条一个编号，勾掉即结案；带【已定】的是你已经选过方向的，只剩落地。

---

## A 组 · 怪物手册重构收尾

### [x] A1 真断链：handbook 不在库里，但 5 处已引用它

- 现状：`docs/monster-handbook.md` 还是未跟踪文件（`git cat-file -e HEAD:docs/monster-handbook.md` 报不存在），但下面这些已经在 HEAD 里指向它：
  - `docs/monster-guide-ui.md:5`
  - `scripts/gen-monster-spawn-tiers.ts:9`、`:265`
  - `scripts/gen-monster-difficulty.ts:12`
  - `scripts/verify-monster-difficulty.ts:5`
- 后果：任何人干净 checkout 都是死链；`npm run gen:spawntiers` 会生成指向不存在文件的文档。
- 解法：① 直接把 handbook 入库（`git add docs/monster-handbook.md`）；② 先入库一份骨架、正文随后补。
- 建议：①
- 你的决定：不回灌，保持 hub；`.showcase-*` 死样式留到 B9 一起删。
- 结案：`docs/monster-handbook.md` 已入库（本提交），`git cat-file -e HEAD:docs/monster-handbook.md` 通过；文件内的 `docs/*.md` 引用只指向 `horde-buildings` / `monster-difficulty-table` / `monster-spawn-tiers`，三份都在库里。

### [x] A2 生成物与生成器不同步（手改白改）

- 现状：`docs/monster-spawn-tiers.md:10`（HEAD 版）还指向要删的两篇；而 `scripts/gen-monster-spawn-tiers.ts:265` 已经输出你手改后的那一行。也就是说你的手改内容 = 生成器输出。
- 后果：下次任何人跑 `gen:spawntiers` 都会产生一份与当前 HEAD 不同的 diff；文档头明写「生成物，勿手改」。
- 解法：① 丢弃手改，改为跑生成器确认输出一致（推荐做法，保持"生成物只由脚本改"）；② 保留手改，并把生成器那行改成同一内容（现在是同一内容，等于重复维护）。
- 建议：①，跑一次 `npm run gen:spawntiers` 用 git diff 验证改动恰好是那一行。
- 结案：已重跑，差异只有生成日期 2026-10-22 → 2026-10-24；`verify:spawntiers` 460 项通过，数据文件只变 `generated`。

### [x] A3 实体数 130 / 132 / 133 三个数各写一处

- 现状：
  - `public/data/monsters-difficulty.js`：**133** 个实体 = `attribute.js` 130 + 原版 2 + 未知来源 1
  - `docs/monster-difficulty-table.md`（生成物，2026-10-22）写 **132 个实体**
  - `docs/monster-handbook.md:368` 把「130 / 132 / 133 有出入」记成坑之一，附录 A 标题写 **132 实体**
- 后果：同一份数据三个数，页面与文档互相引用时会打架。
- 解法：① 只在手册里讲清「133 条实体 / 132 条有基础属性 / 130 条来自 attribute.js」的分层，生成物统一打这个口径；② 统一改成 133，132 视为历史数字删掉。
- 建议：①（数字不是错，是三层口径）
- 结案（按你的选择走 ②）：生成器改为 `entities: Object.keys(entities).length`，重跑后 `source.entities` 与文档头都是 **133**；
  手册里 132 全部消失，附录 A 改成 133 行（`undead_revamp2:night_hunter` 用 `—` 占位并注明坑 11）。
  `verify:monsters` 13502 / `verify:spawntiers` 460 / `verify:hordebuildings` 969 / `verify:monsterguide` 395 全绿；
  数据文件只变 `entities` 计数与日期。

### [x] A4【已定·改向】被删文档的原始证据不入库

- 现状：`monster-difficulty-analysis.md`（873 行）里有大量证据：8.5.4 反编译片段、8.6 jar 下载与 `attr-audit` 统计、8.7 各阶级完整名单、8.8 生成物清单、8.9 尸潮建筑结论。handbook 里 `attr-audit` 0 次、`属性审计` 0 次、`8.7` 0 次。
- 已定方向（改过一次）：**不把原始证据搬进仓库**——手册只留结论与公式；jar 下载链、反编译片段、`attr-audit` 统计继续放在 `.cache/`（gitignore，换机器就没了）。
- 代价（接受）：日后有人质疑某个数字时，只能靠 `npm run gen:*` + 原始包复算，不能直接翻到当时那段反编译输出。
- 剩余动作：手册 §9「数据产物与校验」里补一句「证据不留库，复算路径 = 下载对应 jar + `scripts/` 生成器」，避免读者以为证据藏在仓库某处。
- 结案：已补在 §9「已知数据问题」之前。

### [x] A5【已定】handbook 开头注明来源

- 现状：`tasks/todo.md:89/95/101/118/120` 五处历史 Files 仍指向将删的两篇。已定「history 不动」。
- 待落地：在 `docs/monster-handbook.md` 开头加一行：合并自 `monster-difficulty-analysis.md` / `monster-scaling-logic.md`，证据见 A4 的档案文件。
- 建议：落地这一行即可，todo 不动。
- 结案：**你原文已经有这段**（`docs/monster-handbook.md:3-6`：「合并自原 5 篇笔记；其中两篇叙述性文档（scaling-logic / difficulty-analysis）已并入本文并从 `docs/` 移除」），无需再加。

### [x] A6 "七个坑" → "十一个坑" 是否覆盖原七条

- 现状：`monster-scaling-logic.md`（78 行）§4 是「七个坑」，handbook §8 是「十一个坑」。没核对原 7 条是否都在。
- 后果：可能删掉了当时踩过的坑，读者会再踩一次。
- 解法：① 逐条对照，把缺失的并进 §8；② 认定原 7 条已被十一条覆盖，不做处理。
- 建议：①（半小时的活，能防回归）
- 结案：逐条对过，原七条都在（原1→新2、原2→新4、原3→新5、原4→新1、原6→新10、原7→新7+新8）；
  唯一漏的是原 5 的后半句「事件批还写了 `incontrol: false`，InControl 自刷怪也不吃」，已补进新 6。

### [ ] A7 页面与文档的实体口径没有一处对齐说明（→ 并入 B1）

- 现状：站点目录 **200** 条（会刷 93 = 怪物 72 + 动物 21；未实装 60；来源未确认 47，见 `docs/monster-guide-ui.md:12`），handbook 讲 **133**（难度实体）/ **153**（梯度实体）/ **132**（基础数值）。
- 后果：页面上看到 200、文档里读 133，没人解释差在哪。
- 解法：① 在页面（怪物页 hero 或来源未确认的说明块）加一句「页面 200 条 = 会刷 93 + 未实装 60 + 来源未确认 47；数值表只覆盖 133 条实体」；② 只在手册里写清，页面不动。
- 建议：①（差异正好落在读者最困惑的位置）
- 你的选择：并到 B1 里做，不单独改文案。

---

## B 组 · 指南版页面 vs 当前页面的 UI 差异

差异是用两侧 `data-action` 集合对出来的：指南版 51 个，当前 39 个；指南版独有 19 个，当前独有 7 个（`admin-login`、`clear-offline`、`monster-nums`、`monster-view`、`offline-audio`、`offline-images`、`site-changelog`）。

### [x] B1【最大缺口】「怪物数值手册」整页在合并时丢了

- 现状：指南版有路由 `#/creatures/monsters/stats`（`public/guide/js/app.js:1534` 调用 `renderMonsterStats()`，页面实现 `:2382`），入口按钮在怪物页底部（`:2368`，文案「查看怪物数值手册 · 132 实体」）。页面结构：四格统计（实体数 / 最高生命 / 最高护甲 / 最高攻击）+ 「核心规则」速查 + 「倍率层」表 + 132 行可排序实体表（搜索 + 全部/… 筛选）。
- 数据：`GUIDE.monsterStats`（132 行，字段 `id/name/hp/attack/easy/hard/armor/moveSpeed/followRange/spawnStatus/source`）与 `GUIDE.monsterHandbook`（`version/entities/attributes/quick/...`）。这两个字段在**当前 `public/data/guides.js` 里是 0 处**，`src/client` 里也没有 `monsterStats` / `monsterHandbook` / `monsters/stats` 任何引用。
- 后果：数据还在（`monsters-difficulty.js` 133 实体），但页面入口、渲染、数据装配全没了；而你新写的手册正是这个页面的内容源（指南版 hero 原话：「解析自《亡者世界 5.11.19 · 怪物手册》」）。
- 解法：① 用当前生成数据 + 你的 `docs/monster-handbook.md` 重建这个页面（新路由 + 渲染 + 校验）；② 不做页面，手册只留 docs；③ 只做"速查 + 倍率层"，实体表继续走每只怪的「具体数值」面板。
- 建议：① ——它同时解决 A7（页面里就能写清口径），也是唯一能让手册内容真正"与页面合并"的选项。
- 结案：按 ① 重建，路由沿用 `#/creatures/monsters/stats`，数据直读 `monsters-difficulty.js`；
  页面 = 四格统计 + 速查 5 条 + 倍率层 9 行 + 区域标签 4 行 + 133 行 11 列表（可搜可排序）；
  A7 口径说明写在该页 hero；不新增视觉组件（复用 `.stat-grid` / `.handbook-rule` / `.data-table`）。
  新闸门 `verify:monsterstats` 52 项，含「倍率层行数与手册 §3.2 一致」的同步断言。
  DOM 桩实测 19 项：133 行、11 列、默认按生命降序、搜索 spore 命中 54 行、点表头升序。

### [ ] B2 怪物页筛选模型不同（暂缓：数据未就绪）

- 现状：指南版 = 类别 chip、精确类别 chip、等级 chip、区域 chip、区块 chip + 分页（`:2430/2481/2501/2514/2521`）；当前 = 会刷/未实装 tab + 梯度 chip + 威胁 chip + 搜索框（`src/client/app.ts:2069-2078`）。
- 差异：当前没有「区域 / 区块」两个维度；指南版没有搜索。
- 解法：① 给当前补「区域/区块」两个 chip（复用现有 chip 样式，数据里 `region`/`zone` 字段已有）；② 认定梯度+威胁+搜索已覆盖，不回灌。
- 建议：①（对 200 条目录，按区域找怪是常见诉求）
- **你的决定：暂时不做**（理由：数据还没弄好）。核查到的事实：指南版那 5 个维度里 `monster-zone` 与 `monster-level`
  都是「档位」，真正缺的是档位（`zone`：普通 4 / 特殊 71 / 小头目 12 / 头领 6 / 灾厄 20 / 真菌 54）与类型
  （`category`：特殊感染体 80 / Boss 35 / 变异体 25 / 感染动物 15 / 尸潮 8 / 普通感染体 4），两个字段在
  `guides.js` 里都齐；`regions` 只有 4 个粗值（全区域 / 荒地 / 深渊 T5 / 尸潮），语义还混杂。等数据定了再开。

### [x] B3 列表分页（4 处）

- 现状：指南版给 gear / monster / region / vehicle 都做了翻页（`gear-page:750`、`monster-page:2577`、`region-page:2181`、`vehicle-page:815`，样式 `.page-bar/.page-btn` 还在 CSS 里）；当前一律整表渲染。
- 后果：怪物 200 条、载具 118 条、区域列表都在一屏内全渲染；移动端首屏变长。
- 解法：① 只给怪物与载具加"加载更多"（比翻页更适合长列表）；② 回灌指南版的分页；③ 不动。
- 建议：①（不做页码，做一次 40 条的加载更多，别引入新的分页状态机）
- 结案（按你的意见改成滚动加载）：新增 `src/client/lazy.ts`，先渲 40 条、滚到哨兵再追加 40 条；
  怪物列表（含未实装两档）与图鉴通用列表（枪械/载具/护甲…）共用；行直接插进容器，不加包裹层，
  `.list` 的 gap 与两列网格不受影响；不支持 `IntersectionObserver` 时退回全量渲染。
  DOM 桩实测 12 项：40→80→200、渲染完移除哨兵并断开 observer、不足一块一次渲完、降级、空列表。

### [x] B4 装备页「展示柜」形态不同（不回灌）

- 现状：指南版装备页是展示柜（`gear-select` 选条目、`gear-group` 分组 chip、`gear-page` 翻页、`.showcase-*` 样式）；当前是 hub 卡片 + 独立列表页（`src/client/app.ts:519` `renderGearHub`）。
- 后果：不是缺失，是两种导航模型，混在一起会互相打架。
- 解法：① 保持当前的 hub 模型，不回灌（`.showcase-*` 样式随 A 组死样式一起删）；② 回灌展示柜，替换 hub。
- 建议：①

### [x] B5 NPC 交易列表无折叠

- 现状：指南版 `npc-trade-toggle`（`:1176`，商品超限时「展开/收起」，样式 `.quote-toggle` 还在）；当前 NPC 详情把交易全部平铺（`src/client/app.ts:886-892` 的 `quote-ico-box`）。
- 后果：交易多的 NPC 页面很长。
- 解法：① 回灌折叠（默认显示前 8 个 + 展开）；② 不动。
- 建议：①（改动小，体验收益直接）
- 结案：默认显示 8 条，底部「展开全部 N 项 / 收起」，复用 `.quote-toggle`；动作 `npc-trade-toggle`
  切换 `ui.npcTradeOpen[id]` 后重渲染当前 NPC。

### [x] B6 海报放大 vs 小地图放大（不动）

- 现状：指南版点 hub 背景图 / 区域卡背景可全屏看（`view-poster:517/1777`、`close-poster:3525`、`.poster-modal/.poster-view`）；当前只有建筑小地图的 `thumb-modal`（`src/client/app.ts:1627-1683`）。
- 差异：当前区域卡背景图点了是进区域页，没有"看大图"。
- 解法：① 只给区域卡加「看海报」按钮（复用 thumb-modal 的实现，不新写弹层）；② 不回灌。
- 建议：①（复用现有弹层，成本低）
- 你的决定：不动。`poster-modal/poster-view` 相关规则随之留到 B9 处理。

### [ ] B7【已定】社区账号登录 / 注册 UI 不回灌

- 现状：指南版有 `community-login` / `community-register`（`openCommunityAuth`，`:2909/3295/3296`）。你在上一轮定的方向是「只做管理员登录」，所以当前只有 `admin-login`。
- 结论：**不回灌**。此项仅作记录，避免以后重复讨论。

### [x] B8 三张数据表的列不一样（不做）

- 现状：
  | 表 | 指南版 | 当前 `/downloads/` |
  |---|---|---|
  | 枪械 | 12 列（含 射程 / 重量 / 开火模式）177 行量级 | 10 列，177 行（缺 射程 / 重量 / 开火模式） |
  | 弹药 | 7 列 | 7 列，22 行（列名略不同） |
  | 载具 | `载具补全清单.csv` 4 列（载具ID / 名称 / 处理 / 并入基础车型），是审计清单 | `vehicles.csv` 6 列，118 行（分组 / 变体数 / 别名），没有审计清单 |
- 后果：枪械表少三列；载具审计清单（`guides.js` 里其实有 `vehicleAudit` 数据）没有产物。
- 解法：① 枪械表补 射程/重量/开火模式 三列 + 新增 `vehicles-audit.csv`（数据现成）；② 只用当前口径，不补。
- 建议：①（数据都在 `public/data` 里，生成器加几列就行）
- 核查到的事实：当前 `guides.js` 的 177 支枪里 `range` / `weight` / `fireMode` **一个都没有值**，补齐要回整合包重新提取；
  载具补全清单其实已经上站（`#/world/vehicle-audit`，51 条）。你的决定：都不做。

### [x] B9 死样式（B1 之后重算）

- 现状：指南版 CSS 是合并基座，整份留在了 `public/css/app.css`，但 DOM 不再产生的类仍有规则：
  `.page-bar` 5 · `.page-btn` 5 · `.showcase-item` 10 · `.showcase-item-thumb` 2 · `.showcase-pager` 1 · `.monster-level` 12 · `.quote-toggle` 1 · `.poster-modal` 5 · `.poster-view` 3（`.showcase-item` 与 `.showcase-item-thumb` 有重叠计数）
  （`.handbook-rule` / `.data-table` / `.stat-box` / `.stat-grid` 已被 B1 的数值手册或改枪台复用，不算死）
- 后果：CSS 里 37 条规则不服务任何页面，改主题时要一起维护。
- 解法：① B3/B4/B5/B6 决定后一次性清理（保住要回灌的那几个）；② 现在就删。
- 建议：①（先定 B3–B6，再删，避免删了又要加回来）
- 结案（你的选择：一次删干净）：用脚本按选择器删规则（处理 `@media` 嵌套与共享选择器列表），
  **删 76 个规则块 · 97 行 · CSS 3549 → 3449 行**；`showcase-*` 全族（含 `showcase-side-head` 这类漏网的）
  与 `page-bar/page-btn/monster-level/poster-{view,modal*}` 一并清除；`.quote-toggle`（B5 在用）、
  `.poster-thumb*` / `.poster-side` / `.poster-layout`（建筑页在用）保留；两条被压成一行的字体选择器列表已重新折行。
  `verify:monsterguide` 加 4 条防回潮断言（这些选择器不允许再出现）。

---

## C 组 · 不用再动的（避免重复劳动）

- CSS 基座 = 指南版 `app.css` + 根站独有块 + 17 个覆盖选择器 → 已完成（`docs/merge-plan.md`）
- 图片单树（缩略图留仓库、全尺寸进 RustFS、296 张冲突以 guide 版为准）→ 已完成
- 构建期内容指纹 + SW 缓存版本 → 已完成
- `/guide/*` 一律 404、`public/guide/` 已删 → 已完成
- 社区上传 / 照片墙 / 聊天附图 / 审核词库 / 站点日志 / `/downloads/` 三表 → 已完成
- `index.html` 头部差异（`<base href="/guide/">`、图标路径）→ 属于路径迁移，不是功能差异

---

## 统计

| 组 | 条数 | 已结案 | 其中【已定】 |
|---|---|---|---|
| A 手册收尾 | 7 | 7（全部） | — |
| B UI 差异 | 9 | 8（B1、B3、B4、B5、B6、B7、B8、B9） | 1（B7） |
| 合计待决 | 1（B2，数据就绪后再开；A7 已随 B1 落地） | — | — |

建议顺序：A1 → A2 → A6 → A3 → A7 → B1 → B2 → B8 → B3 → B5 → B6 → B4 → B9（先修断链，再做最大缺口，最后清死样式）。

**本轮结果**：A 组 7 条全结案；B 组 8 条结案（B4/B6/B8 判定不做、B7 已定不回灌）、B2 暂缓（等数据）。
另有发现待后续：`body.page-monsters` 那 24 条放大规则同样没有 DOM 产生（客户端从不设置这个 body class），
不在本轮批准范围内，未删。
