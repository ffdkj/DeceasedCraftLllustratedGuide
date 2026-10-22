# Plan: 枪械梯度 + 子弹梯度

依据 `specs/SPEC-gun-tiers.md`。

## 组件与依赖

1. **`scripts/gen-tiers.ts`（新增，依赖已有生成物）**
   - 读 `public/data/recipes.js`（`WZ_RECIPES`）与 `public/data/loot.js`（`WZ_DATA`），复用 `scripts/pack-readers.ts` 的 `readGlobal`。
   - 内置三张人工表：`PART_TIER`（7 元件 → 档）、`AMMO_MOLD`（15 口径 → 模具 + 中文口径名）、`TYPE_TIER`（回落用）。
   - 产物 `public/data/tiers.js`：`parts` / `guns` / `bullets` / `meta`。
   - 自检：`special` 无战利品来源、难度序与战利品可得性一致、元件与模具图标可解析，异常进 `meta.warnings`。
2. **`scripts/verify-tiers.ts`（新增，入库）**
   - 分布基线断言（30/32/56/60、45/21/45/44、无模具 22、无弹药 1）。
   - 抽样断言：`tacz:m4a1`→T3 rifle、`tacz:p90`→T4、`tacz:spas_12`→T3、`tacz:minigun`→T4 特殊（同档并列）、`gz:m16a2`→T3 推断、`tacz:taurus943`→T1 推断、`bf1:ef46`→T4 推断。
   - 模具档位逐条等于 `loot.js` 里最低区域档；9 种无模具弹药 `tier === null` 且 `reason === "no-mold"`。
   - 图标可解析；`inferred` 与 `part === null` 等价；难度序单调。
3. **`src/client/tiers.ts`（新增）** → `window.WZ_TIERS_UI`：`available` / `rows` / `strip`，图标走图集、退化首字方块。
4. **挂载**
   - `src/client/gunsmith.ts`：`gs-head` 末尾插 `tiersUI().strip(gunId)`，`gs-head` 允许换行。
   - `src/client/app.ts`：`renderGuideDetail` 里 `type === "guns"` 时在 `.detail-hero` 的 `.meta` 后插同一个 `strip`。
   - `src/client/main.ts`：`import './tiers';`（在 `recipes` 之后）。
5. **数据接入**：`index.html` 加 `<script src="/data/tiers.js">`；`scripts/build-sw.ts` 预缓存清单加 `./data/tiers.js`；`src/client/types/data.d.ts` 加 `WZ_TIERS` / `WZ_TIERS_UI`。
6. **`public/css/app.css`**：`.tier-strip` / `.tier-row` / `.tier-ico` / `.tier-label` / `.tier-badge` / `.tier-name` / `.tier-row.muted`，四档配色 + 亮色主题覆盖 + `@media (max-width: 520px)`。
7. **文档**：`CONTEXT.md` 梯度词条（已完成）、本 spec、`tasks/`。

## 顺序

1（数据生成）→ 2（数据验收，先跑绿）→ 3（组件）→ 4（挂载）→ 5（接入）→ 6（样式）→ 手工验收 → `npm run verify` 全量门禁

数据层先绿再碰 UI：档位是纯函数产物，样式问题不应阻塞数据正确性验证。

## 风险

- **口径映射靠人工**：15 条映射 + 中文口径名，`verify-tiers` 断言每个 `ammo` 都有归宿（模具 / 无模具 / 无弹药三态之一），漏映射会直接失败而不是静默显示「—」。
- **战利品数据变化**：整合包升级后模具落点可能变档，`verify-tiers` 的分布基线会先失败，提示重跑 `gen:tiers` 并复核 spec 基线表。
- **`wild` / `street` 的 `T1-T3`**：当前 15 个模具都不落在这两个区域；若将来只有它们能搜到，按 spec 取低界 T1，并在 `meta.warnings` 里记一条。
- **同档并列依赖难度序**：难度序人工排定（特殊 → 狙击枪 → 机枪 → 步枪 → 霰弹枪 → 冲锋枪 → 手枪），`gen-tiers` 只校验它与档位单调；当前仅 `tacz:minigun`（机枪 + 特殊）受影响，结果必须是「特殊」。
- **样式回归**：`gs-head` 是横向 flex，加通栏行需要 `flex-wrap: wrap`，窄屏（320px）不能挤掉「换枪」按钮。
