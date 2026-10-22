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
  - Result: `npm run gen:monsters` 产出 `public/data/monsters-difficulty.js`（`WZ_MONSTER_DIFF`，173 KB，133 实体 × 5 场景 × 3 难度 + 17/21 张尸潮档）
    与 `docs/monster-difficulty-table.md`；`npm run verify:monsters` 13,471 项断言通过；`index.html` / SW 清单未动
  - Files: `scripts/gen-monster-difficulty.ts`、`scripts/verify-monster-difficulty.ts`、`public/data/monsters-difficulty.js`、`docs/monster-difficulty-table.md`、`package.json`
