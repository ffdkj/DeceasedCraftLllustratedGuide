# Todo: 枪械梯度 + 子弹梯度

- [x] T1 梯度生成器（scripts/gen-tiers.ts）
  - Acceptance: `npm run gen:tiers` 产出 `public/data/tiers.js`，178 把枪 / 15 口径全有档位，两次运行字节一致
  - Verify: `tsx scripts/gen-tiers.ts` 打印分布，与 spec 基线表一致
  - Files: `scripts/gen-tiers.ts`、`public/data/tiers.js`、`package.json`

- [x] T2 数据断言（scripts/verify-tiers.ts）
  - Acceptance: 分布基线 + 抽样枪 + 模具最低区域档 + 三态弹药 + 图标可解析全部断言通过
  - Verify: `npm run verify:tiers` 非零退出即失败
  - Files: `scripts/verify-tiers.ts`、`package.json`

- [x] T3 组件（src/client/tiers.ts）
  - Acceptance: `window.WZ_TIERS_UI.strip(gunId)` 输出两行同构 HTML，枪械行/子弹行/推断/无模具/无弹药五态齐全
  - Verify: 临时 jsdom 断言 HTML 含正确 `data-go`、徽章文字、`· 推断` 后缀
  - Files: `src/client/tiers.ts`、`src/client/main.ts`、`src/client/types/data.d.ts`

- [x] T4 挂载到改枪台头部
  - Acceptance: `#view > div.gs-head` 末尾出现 `.tier-strip`，窄屏不挤掉「换枪」
  - Verify: `#/gear/gunsmith/tacz:m4a1`、`tacz:minigun`、`gz:m16a2`、`suffuse:knife`、`tacz:m320` 五个样本目视
  - Files: `src/client/gunsmith.ts`、`public/css/app.css`

- [x] T5 挂载到枪械详情页头部
  - Acceptance: `.detail-hero` 的 `.meta` 之后出现同一条 `.tier-strip`，与改枪台完全同构
  - Verify: `#/gear/gun/tacz:m4a1` 目视 + 点击两行跳转
  - Files: `src/client/app.ts`、`public/css/app.css`

- [x] T6 站内跳转与样式
  - Acceptance: 枪械行 → 元件物品页、子弹行 → 模具物品页，hash 路由无整页刷新，返回可回原枪
  - Verify: 点击四个方向（含推断不可点、无模具不可点）
  - Files: `src/client/tiers.ts`、`public/css/app.css`

- [x] T7 数据接入与预缓存
  - Acceptance: `index.html` 加载 `tiers.js`，SW 清单含 `./data/tiers.js`，构建后离线可用
  - Verify: `npm run verify`（build + tsc + check:assets）
  - Files: `index.html`、`scripts/build-sw.ts`、`src/client/types/data.d.ts`

- [x] T8 文档与提交
  - Acceptance: spec / plan / todo / CONTEXT 术语齐全，一次提交入库
  - Verify: `git status` 仅预期文件；`npm run verify` + `npm run verify:tiers` 全绿
  - Files: `specs/SPEC-gun-tiers.md`、`tasks/plan.md`、`tasks/todo.md`、`CONTEXT.md`

## 第二轮（梯度改 tag + 移除枪械库 + 补描述）

- [x] T9 梯度改成 tag 挂进 `.gs-badges` 与详情页 `.meta`
  - Acceptance: 页面无 `.tier-strip`；两个 tag 与射击模式同排；透明底有色字
  - Verify: DOM 断言 36 条（含 5 个样本枪 + 详情页 + 装备图鉴）
  - Files: `src/client/tiers.ts`、`src/client/gunsmith.ts`、`src/client/app.ts`、`public/css/app.css`
- [x] T10 装备图鉴移除「枪械库」卡片
  - Acceptance: hub 卡片 6 → 5，改枪台仍在，`#/gear/guns` 页面保留
  - Verify: DOM 断言「不再有枪械库卡片」+ 卡片数 5
  - Files: `src/client/app.ts`
- [x] T11 177 把枪的文案搬进改枪台
  - Acceptance: `.gs-desc` 在 `.gs-head` 下方，背景 + 作用两行；33 把无背景描述显示占位；多行描述保留换行
  - Verify: m4a1（有描述）/ gz:aug_9mm（无描述）/ bf1:ef46（多行）三个样本
  - Files: `src/client/gunsmith.ts`、`public/css/app.css`
- [x] T12 文档与门禁
  - Acceptance: spec / todo / CONTEXT 同步，`npm run verify` + `verify:tiers` 全绿
  - Files: `specs/SPEC-gun-tiers.md`、`tasks/todo.md`、`CONTEXT.md`

## 第三轮（配件真实兼容性 + 枪托数值修正）

- [x] T13 兼容性生成器（scripts/gen-compat.ts）
  - Acceptance: 从 tacz_tags 推导每把枪可装配件，递归展开 #tag；jar 与目录两种来源
  - Verify: `npm run gen:compat` 输出 178 把枪 / 10,385 组合 / 22 把无白名单
  - Files: `scripts/gen-compat.ts`、`public/data/compat.js`、`package.json`
- [x] T14 数据断言（scripts/verify-compat.ts）
  - Acceptance: 专属配件归属、无白名单名单、补丁数值、负后坐力必须被补丁覆盖
  - Verify: `npm run verify:compat`（53 项断言）
  - Files: `scripts/verify-compat.ts`、`package.json`
- [x] T15 客户端接入（兼容性 + 补丁 + 无配件提示）
  - Acceptance: 选择器只列白名单、专属枪托不再出现、-135% 变 -35%、腰射散布 -0.5、无白名单枪显示提示
  - Verify: DOM 断言 22 项（m4a1 / lss / minigun / taurus943 / ak47）
  - Files: `src/client/gunsmith.ts`、`index.html`、`scripts/build-sw.ts`、`src/client/types/data.d.ts`
- [x] T16 用真实 tacz 模组 jar 重跑并复核
  - Acceptance: `meta.source.jarTagFiles > 0`，warning 里的「未读到 jar」消失，分布复核
  - Result: 下到 `tacz-1.20.1-1.1.8-hotfix.jar`（pid 1028108 / fid 8141310，57.5 MB）放进
    `DeceasedCraft5.11.19/overrides/mods/` 后自动探测命中，`jarTagFiles 0 → 103`、`jars 1`；
    组合数仍是 10,385 / 无白名单 22 把（说明额外 tag 没有改变结论），warnings 只剩 3 个未知配件 + 22 把无白名单
  - Files: `public/data/compat.js`

## 第四轮（怪物数据来源追查）

- [x] T17 定位「区域越深怪越肉」的实现者
  - Acceptance: 找到具体模组/配置/数值，能解释「T1 20 血、T2 30 血」这类记忆
  - Result: `config/incontrol/spawn.json`（InControl 1.20-9.5.0）用 `biometags` + `incity` + `difficulty`
    匹配，`healthmultiply/damagemultiply/armormultiply` 直接改属性；普通难度 20/25/30/40（T1–T4），
    简单再 ×0.5，困难再叠一批（25/37.5/52.5/80）；证据写进报告 §8.5
  - Files: `docs/monster-difficulty-analysis.md`

- [x] T18 模组侧审计（下载 + 反编译，确认没有第二个实现者）
  - Acceptance: 找出会改实体属性的模组，逐个排除；给出下载链路
  - Result: `api.cfwidget.com` 解析 fileID → 文件名 → ForgeCDN 直链（CurseForge 本体被 Cloudflare 拦，CDN 不拦）；
    下 21 个 jar 扫 class 常量池，只有 InControl 同时具备「倍率键 + biometags」，其余模组只给自己新增实体写血量（报告 §8.6）
  - Files: `docs/monster-difficulty-analysis.md`、`.cache/dl-mods.py`、`.cache/attr-audit.cjs`（未入库）

- [x] T19 区域刷怪名单（怪物种类也按区换）
  - Acceptance: 给出每个区的专属/通用刷怪清单与速率，并说明是模组还是整合包配置决定的
  - Result: `config/incontrol/spawner.json` 50 条规则，`biometags` + `incity` 分 6 个子区；
    T1 6 种 / T2 8 种 ×2 / T3 11 种 ×2 / T4 15 种，强度 0.35–0.65/秒；模组侧 66 条 `forge:add_spawns` 全是 `forge:any`（不分区域）
  - Files: `docs/monster-difficulty-analysis.md`（§8.7）

- [x] T20 怪物难度数据表（生成物，未接站）
  - Acceptance: 一套由整合包真源复算、可复现生成的「难度 × 区域 × 尸潮」数值表，含血量/护甲/攻击，且站点未改
  - Result: `npm run gen:monsters` 产出 `public/data/monsters-difficulty.js`（`WZ_MONSTER_DIFF`，235 KB，133 实体 × 5 场景 × 3 难度 + 尸潮野外/城区两套 + 17/21 张尸潮档）
    与 `docs/monster-difficulty-table.md`；`npm run verify:monsters` 13,471 项断言通过；`index.html` / SW 清单未动
  - Files: `scripts/gen-monster-difficulty.ts`、`scripts/verify-monster-difficulty.ts`、`public/data/monsters-difficulty.js`、`docs/monster-difficulty-table.md`、`package.json`

- [x] T21 尸潮建筑清单 + 「未实装」标记
  - Acceptance: 逐个尸潮建筑给出僵尸清单（出怪/权重/规模/血量），并标出只在尸潮出现与完全没实装的怪
  - Result: `DCTweaks` jar 的 `lostsouls/buildings/*` 共 23 份定义 / 33 建筑 → `public/data/horde-buildings.js` +
    `docs/horde-buildings.md`；130 实体分类：正常 70 / 仅尸潮 0 / 未实装 60（48 只 spore、deaceased 部件、hordes 玩家变体）；
    发现 `undead_revamp2:night_hunter` 是坏 id；`npm run verify:hordebuildings` 959 项断言
  - Files: `scripts/gen-horde-buildings.ts`、`scripts/verify-horde-buildings.ts`、`public/data/horde-buildings.js`、`docs/horde-buildings.md`、`package.json`

- [x] T22 怪物强化逻辑总表
  - Acceptance: 一页说清「为什么这个怪是这个数值」，含叠加矩阵与常见误区
  - Result: `docs/monster-scaling-logic.md`（五层倍率 A–E + LostSouls F + 原版 G、10 种情形的数值矩阵、七个坑），
    与分析报告、两个数据文件互相引用
  - Files: `docs/monster-scaling-logic.md`、`docs/monster-difficulty-analysis.md`

- [x] T23 每只怪的刷怪梯度文档
  - Acceptance: 逐怪列出会刷新的梯度（区域 T1–T4、天数尸潮档、建筑尸潮、自然刷），并标未实装
  - Result: `npm run gen:spawntiers` 产出 `public/data/monster-spawn-tiers.js` + `docs/monster-spawn-tiers.md`
    （153 条目：T1 6 / T2 11 / T3 18 / T4 34 含 19 动物；天数尸潮 31；建筑尸潮 32；未实装 60）
  - Files: `scripts/gen-monster-spawn-tiers.ts`、`scripts/verify-monster-spawn-tiers.ts`、`public/data/monster-spawn-tiers.js`、`docs/monster-spawn-tiers.md`、`package.json`

- [x] T24 生物图鉴按梯度重构
  - Acceptance: 按梯度区分、增加未实装分类且不参与其他筛选、能看某怪在哪几档刷、能快捷确认困难 T1 尸潮等具体数值
  - Result: 手写 167 ∪ 生成 153 → 200 条目录（会刷 93 / 确认未实装 60 / 来源未确认 47）；
    梯度点阵 + 威胁二级筛选 + 列表行「数值」快览 sheet + 详情页场景×难度矩阵（生命 / 护甲 / 攻击 / 对玩家 四列，HUD 像素图标）；
    `npm run verify:monsterguide` 354 项断言锁口径
  - Files: `src/client/monsters.ts`、`src/client/app.ts`、`public/css/app.css`、`index.html`、`scripts/build-sw.ts`、`scripts/verify-monster-guide.ts`、`docs/monster-guide-ui.md`、`package.json`

- [x] T25 动物独立分类 + 像素字体
  - Acceptance: 把中立动物移出怪物清单单独一页；接入部署版里的像素字体与素材
  - Result: 生物图鉴变「怪物 72 / 动物 21 / NPC」三张卡；动物页只给刷新规则（6 种带属性原值）、不分组、无详情页；
    接入 Fusion Pixel 10px（OFL-1.1 + 许可证随包），只用于界面骨架，正文保持系统字
  - Files: `src/client/monsters.ts`、`src/client/app.ts`、`public/css/app.css`、`public/fonts/`、`scripts/build-sw.ts`、`scripts/verify-monster-guide.ts`、`CONTEXT.md`、`docs/monster-guide-ui.md`

- [ ] T26 回灌部署版独有的四项功能（待做）
  - Acceptance: 怪物网格视图 / 对比表 / 返回顶部 / 战利品梯度卡从部署产物 `js/app.js` 复原成源码并接回
  - Context: 这四项只在部署构建里存在（`#monster-list.monster-grid`、`.compare-row`、`.back-top`、`#loot-tiers .tier-grid`），
    仓库源码 0 处；回灌时优先网格视图（正好配合生物图鉴）。素材见 `.cache/zip/`（部署包解压，gitignore）
  - Files: 待定（`src/client/app.ts`、`public/css/app.css`）

- [x] T27 列表行图标 / 数值按钮暗色可读性 / 音乐按钮贴边
  - Acceptance: 生物行最左显示图标；深色主题下「数值」按钮字看得清；音乐图标不再固定在内容栏里，贴屏幕最右边（高度不变）
  - Result: 行首加 40px 图标（有立绘用立绘，否则按类别回退：骷髅 / 人群 / 爪印，未实装灰）；
    修浅色主题白底覆盖漏了 `[data-theme="light"]` 前缀导致暗色白底白字；`.music-fab` 改 `right: 0`
  - Files: `src/client/app.ts`、`public/css/app.css`、`scripts/verify-monster-guide.ts`、`docs/monster-guide-ui.md`

- [x] T28 子弹梯度图标改用子弹本体
  - Acceptance: 枪械卡片 / 改枪台头部的「T4子弹」缩写不再用冲压模具的图标，改显示该模具产出子弹的本体图标；点击仍跳模具页
  - Result: `public/images/ammo/<口径名>.webp` 15 张（TACZ 弹药槽贴图 `textures/ammo/slot/*.png`，无损 webp，单张约 0.3 KB），
    由 `npm run gen:ammo-icons` 生成并进 `images/manifest.json` 预取；子弹行走 `img`、`href` 仍是 `#/item/<模具>`；
    图集保持原样（补格子会整图重编码，把已有 2000+ 枚图标一起再压一遍）
  - Files: `scripts/gen-ammo-icons.ts`、`src/client/tiers.ts`、`public/css/app.css`、`public/images/ammo/`、
    `public/images/manifest.json`、`scripts/verify-tiers.ts`、`package.json`、`CONTEXT.md`

- [x] T29 战利品首页快速查找加「蓝图」「模具」
  - Acceptance: 快速查找里加两枚 chip（蓝图、模具），并排在最前两个
  - Result: `hot` 数组改为 蓝图、模具、铁锭、钢锭、金苹果、弹药、绷带、罐头、汽油、钻石；
    点击直接把词灌进搜索框（命中 蓝图 37 条 / 模具 26 条物品）
  - Files: `src/client/app.ts`

- [x] T30 改枪台数值条显示配件加减
  - Acceptance: 「枪械数值」表每行底部那条要能看出配件带来的变化——改善绿、变差红
  - Result: 条拆成两段：底座段（当前值，主题主色）+ 变化段（`|当前−基础|`，绿 / 红）；
    颜色与「变化」列的数字同源（都走 `statClass` 的 `cls`），所以后坐力 / 散布 / 瞄准时间 / 重量
    被压下去时是绿条；条高 3px → 4px 才看得清；图例改成「绿条=配件改善 / 红条=配件变差」
  - Files: `src/client/gunsmith.ts`、`public/css/app.css`、`scripts/verify-gunsmith.ts`、`package.json`、`CONTEXT.md`

- [x] T31 管理员登录 + 在线换图
  - Acceptance: 复用现有登录入口，站长用唯一环境变量账号登录；登录后可在页面上把任意站内图片换成新图
    （上传→转 WebP→写进对象存储→立刻全站生效），可回退上一版/恢复原图；数据目录可在 Zeabur 挂卷，用 SQLite 存
  - Result: 单账号登录（`ADMIN_EMAIL` / `ADMIN_PASSWORD`，scrypt 之外用定长 sha256 比较，同 IP 5 次错锁 10 分钟、
    会话 30 天存 SQLite）；换图走**服务端覆盖层**——请求路径先剥掉 `/media` 前缀与 8 位内容哈希回到逻辑路径，
    命中覆盖表就从 `public/overrides/<sha16>.webp` 取新图，原图与桶里原对象不动；URL 带 `?v=<10位哈希>`，
    服务端把版本表内联进首页 HTML（`index.html` 留 `/data/image-versions.js` 标记、请求时替换；不单独发 js 是因为 CF 对 `.js` 缓存 4 小时），客户端把版本串写进 `WZ_*`/`seed`，
    所以 Cloudflare 边缘缓存过的旧地址也会换成新 URL（CSS 直接引用的 8 处拿不到版本串，已记录在文档里）；
    每图保留 3 版；SQLite 只存覆盖/会话/审计，整份状态镜像到桶 `public/admin/state.json`，容器盘被清空能回灌；
    实测：preview→commit→带/不带 `?v=` 的缓存头→304→revert→恢复原图→4 次替换后只留 3 版→
    删库重启后覆盖与登录态从镜像恢复；上传限 10MB、长边 ≤2048、质量 90、保留 alpha
  - Files: `src/server/db.ts`、`src/server/objects.ts`、`src/server/admin-auth.ts`、`src/server/overrides.ts`、
    `src/server/index.ts`、`src/server/community.ts`、`src/client/image-versions.ts`、`src/client/admin.ts`、
    `src/client/main.ts`、`src/client/app.ts`、`src/client/tiers.ts`、`index.html`、`public/css/app.css`、
    `scripts/verify-admin.ts`、`scripts/build-sw.ts`、`scripts/check-assets.ts`、`scripts/verify-fingerprint.ts`、
    `docs/admin-image-editor.md`、`.env.example`、`package.json`

- [x] T32 重建「怪物数值手册」页（指南版整页在合并时丢失）
  - Acceptance: 怪物页能进到数值手册，一页看到 133 条实体的基础属性、速查、倍率层与区域标签；
    数据只来自生成物，不新造产物；口径（页面 200 vs 实体 133）写在页面上
  - Result: 路由沿用指南版 `#/creatures/monsters/stats`，入口按钮在怪物页底部（实体数取自生成物）；
    数据直读 `monsters-difficulty.js`（133 条）+ 梯度数据的 `status` 作刷怪列；速查/倍率层/区域标签按
    `docs/monster-handbook.md` §0/§3.2 写进 `src/client/monster-stats.ts`，断言的层数与手册表格行数同步；
    11 列可搜可排序，默认按生命降序；复用 `.stat-grid` / `.handbook-rule` / `.data-table`，只新增 `.ms-sort`
    与 `.ms-entities` 宽表规则；`verify:monsterstats` 52 项进 `npm run verify`；DOM 桩实测 19 项全绿
  - Files: `src/client/monster-stats.ts`、`src/client/app.ts`、`src/client/main.ts`、
    `src/client/types/data.d.ts`、`public/css/app.css`、`scripts/verify-monster-stats.ts`、`package.json`、
    `docs/monster-guide-ui.md`、`docs/merge-conflicts.md`、`CONTEXT.md`

- [x] T33 长列表滚动加载 + NPC 交易折叠（B3/B5）
  - Acceptance: 怪物 / 枪械 / 载具这类长列表不再一次塞进 DOM，滚到才继续渲染；NPC 交易超过 8 条默认折叠
  - Result: 新增 `src/client/lazy.ts`（每块 40 条 + 哨兵 + `rootMargin: 600px`，渲染完移除哨兵并 `disconnect`，
    不支持 `IntersectionObserver` 时退回全量；行直接插进容器不加包裹层，`.list` 的 gap 与两列网格不变）；
    怪物列表（含未实装两档）与图鉴通用列表共用；NPC 交易默认 8 条 + 「展开全部 N 项」，复用 `.quote-toggle`
    与 `npc-trade-toggle` 动作；`verify:monsterguide` 395 → 411 项，DOM 桩实测 lazy 12 项
  - Files: `src/client/lazy.ts`、`src/client/app.ts`、`scripts/verify-monster-guide.ts`、
    `docs/monster-guide-ui.md`、`docs/merge-conflicts.md`

- [x] T34 清掉合并遗留的死样式（B9）
  - Acceptance: 只在指南版存在、当前页面不产生 DOM 的规则从 `app.css` 删掉，且不影响在用的样式
  - Result: 按选择器删了 76 个规则块（含 `@media` 嵌套与共享选择器列表），CSS 3549 → 3449 行；
    清除 `page-bar` / `page-btn` / `showcase-*` 全族 / `monster-level` / `poster-view` / `poster-modal*`；
    保留 `quote-toggle`（NPC 折叠）、`poster-thumb*` / `poster-side` / `poster-layout`（建筑页）；
    两条被压长行的字体选择器列表重新折行；`verify:monsterguide` 411 → 415 项（4 条防回潮断言）
  - Files: `public/css/app.css`、`scripts/verify-monster-guide.ts`、`docs/monster-guide-ui.md`、`docs/merge-conflicts.md`

- [x] T35 把 T31/T32 的文档成果重放到新基线（guide 为准之后）
  - Acceptance: 新基线（`origin/main` = guide 覆盖根站）上仍有完整怪物手册，两篇已合并的叙述文档不复活，
    三张数据表的表头口径与实际数据一致
  - Result: `monster-handbook.md` 入库；`monster-difficulty-analysis.md` / `monster-scaling-logic.md` 删除（历史可查）；
    `gen-monster-difficulty.ts` 的实体口径从 `base.size` 改为 `Object.keys(entities).length`
    （`night_hunter` 不在 base 里，所以旧值恒为 132 而实际 133）；重跑两个生成器，表头变 `2026-10-24` / 133 实体，
    数据文件只有 `generated` 与 `meta.entities` 两处差异；`verify:monsters`（133 实体 / 1584 单元格）、
    `verify:spawntiers`（153 实体）通过。两份 merge 清单补了结案状态头，`wip/root-first` 作存档分支保留
  - Files: `docs/monster-handbook.md`、`docs/monster-difficulty-table.md`、`docs/monster-spawn-tiers.md`、
    `docs/merge-conflicts.md`、`docs/merge-conflicts-remote.md`、`scripts/gen-monster-difficulty.ts`、
    `public/data/monsters-difficulty.js`、`public/data/monster-spawn-tiers.js`、`CONTEXT.md`


- [x] T36 删枪械库（C1–C3）+ 门禁指向 guide
  - Acceptance: 枪械库列表页与枪械详情页下线，但它们承载的内容（合成材料 / 作用 / 来源 / 评论）
    与三处入链都有去处；老地址不变死链；数据表仍可达
  - Result: `guideDetailHref` 对 guns 直接返回 `#/gear/gunsmith/<id>`（一处改，数据表行 +
    弹药「适用枪械」芯片 + showcase「完整资料」全覆盖）；`legacyHash()` 把 `#/gear/guns`
    与 `#/gear/gun/<id>` 重定向到改枪台；工作台新增 `gunInfoSections()`（作用 / 合成材料 /
    可搜刮建筑 / 玩家评论，全部复用 `app.js` 的分区，`WZ_APP_UI` 多导出四个口子）；
    `#/gear` hub 去掉枪械库卡片，`#/gear/guntable` 入口移到改枪台；
    顺带修了 `verify:gunsmith`（读根站 CSS → 读 guide，数值条 3px → 4px）与
    `verify:community`（还在断言「guide 副本已删 + /guide/* 404」的旧方向）
  - Files: `public/guide/js/app.js`、`public/guide/js/gunsmith.js`、`public/guide/css/app.css`、
    `scripts/verify-guide.ts`、`scripts/verify-gunsmith.ts`、`scripts/verify-community.ts`、
    `docs/merge-conflicts-remote.md`

- [x] T37 把其余门禁掰回 guide 方向（不再守根站时代的结论）
  - Acceptance: 现存 `verify:*` 要么对着线上产物断言，要么明确说「未移植」并说明原因；
    没有常年报红却没人跑的门禁
  - Result: `verify:tiers` 读 guide 样式，11 条 G1（梯度缩写）断言标为未移植（guide 出现
    `.gs-tier-mini` 即自动变硬）；`verify:monsterguide` 图标断言改成认 `.webp` / 相对路径，
    6 条 G4/G5 + 音乐按钮贴右边的断言标为未移植；`verify:fingerprint` 显式跳过并打印原因
    （build 链已不含 build:fingerprint，谁加回来自动恢复）
  - 现状：recipes 486 · tiers 1463(+11 未移植) · monsters 13502 · spawntiers 460 ·
    hordebuildings 969 · monsterguide 389(+6 未移植) · downloads 17 · compat · gunsmith 35 ·
    community 42 · admin 95 · guide 64 —— 全绿
  - Files: `scripts/verify-tiers.ts`、`scripts/verify-monster-guide.ts`、`scripts/verify-fingerprint.ts`

## 第五轮（改枪台梯度归档 + 数值条 + 槽位 + 主题 / 电脑端）

- [x] T38 梯度缩写（G1）搬进 guide
  - Acceptance: 枪械卡片副标题与工作台头部徽章行都出现「图标 + T2枪械 / T1子弹」；头部可点跳到元件 / 模具页；
    无模具 / 无弹药不显示那一枚；`verify:tiers` 的 11 条「未移植」转硬断言后仍全绿
  - Result: `public/guide/js/tiers.js`（WZ_TIERS_UI.mini，图标复用 `WZ_APP_UI.itemIcon` / `ammoTexture`）+
    `public/guide/data/tiers.js`（生成物副本，178 把枪 / 24 口径全覆盖）+ 入口与 SW 接线 + 四档配色（含浅色覆盖）。
    头部 `mini(gunId, true)` 是 `<button data-go>`，卡片里是 `<span>`（卡片整体已是按钮）
  - Files: `public/guide/js/tiers.js`、`public/guide/data/tiers.js`、`public/guide/js/gunsmith.js`、
    `public/guide/js/app.js`、`public/guide/index.html`、`public/guide/sw.js`、`public/guide/css/app.css`、
    `scripts/verify-tiers.ts`、`scripts/verify-guide.ts`

- [x] T39 数值条去掉渐变 + 配件槽位改一行一个
  - Acceptance: `.gs-stat-bar > i` 是实色主题主色；槽位在 620px 以上也是一行一个，修正值不再被截成「a · b · c」
  - Result: 底座段 `background: var(--amber)`（4px 高的渐变读起来像脏色）；槽位固定单列，
    修正值改成 chip（最多 6 条）完整列出；`verify:gunsmith` 的「底座段用渐变」断言改成实色 + 反向断言
  - Files: `public/guide/css/app.css`、`public/guide/js/gunsmith.js`、`scripts/verify-gunsmith.ts`

- [x] T40 深浅主题对齐
  - Acceptance: 顶栏 / 底栏不再在两套主题里都是黑；同一主题只有一个主色；图片底页在浅色主题下能被文字压住
  - Result: 引入 `--nav-*`（bg / line / text / muted / hover）与 `--page-veil`（整版背景蒙版，深浅各一套），
    顶栏底栏换掉 6 处写死的 `#0b0b0b`；浅色主题残留的蓝（`--amber-2` / brand-mark / fab / music-* / mat-count）
    统一成绿；`--dim` 深色 8c8c8c、浅色 6b6b6b（原来 777/888 都到不了 4.5:1）；
    芯片从透明底改成 `var(--panel)`（图片背景上等于没字）；`.detail-hero` 的 hero 文案跟主题走（浅色下 #d0d0d0 隐形）；
    对比度审计从 30+ 处降到只剩装饰水印
  - Files: `public/guide/css/app.css`、`CONTEXT.md`

- [x] T41 电脑端布局
  - Acceptance: ≥1024px 时内容吃满 1240 壳、列数变多、字号有一套固定比例；手机上不再横向滚动
  - Result: 删掉三层 zoom（`body .78 / .82 / .view 1.5`，它们正是 390px 下横向滚动的根因），
    新增 ≥1024 布局段：壳 1240 + 28 留白，正文 16 / 行标题 17 / 板块标题 22 / hero 17，
    枪械与怪物网格 3 列、hub 自适应、`stat-grid` 4 列；怪物图鉴的大字版只在窄屏保留；
    音乐/返回顶部/操作胶囊三枚悬浮件在右侧排成一条（原来叠在搜索条与卡片上）；
    `.gs-gun-card` 补 `min-width: 0`（grid item 的 min-content 会撑破列宽）
  - Files: `public/guide/css/app.css`
