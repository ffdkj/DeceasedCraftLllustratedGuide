# SPEC: gun-tiers（枪械梯度 + 子弹梯度）

## Objective

给 178 把枪各算两个档位，并显示在**改枪台头部**与**枪械详情页头部**：

- **枪械梯度**：这把枪要靠什么元件造出来 → 它属于哪一档（T1–T4）。
- **子弹梯度**：它吃的这个口径，模具**最早在哪个档的区域箱子里**能搜到。

用户故事：作为玩家，我在改枪台看一把枪时，一眼就能判断「这东西值不值得现在攒材料」（枪械梯度）和「我的子弹什么时候能自给」（子弹梯度），点一下子弹梯度就能看到该口径模具在哪些建筑里、掉率多少，不用再去猜。

不在范围：不改枪械分类/筛选、不动 `gunsmith.js` 与 `guides.js` 的数据、不加弹药物品页、不做图例/规则说明文字（已决定不加）。

## 判档规则（唯一事实来源）

### 枪械梯度（gun tier）

1. 取配方 `WZ_RECIPES.recipes.guns[gunId]` 里出现的**组装元件**，按元件分档：
   | 元件 | 档位 |
   |---|---|
   | `deceasedcraft:pistol_assembly_parts` 手枪组装元件 | T1 |
   | `deceasedcraft:smg_assembly_parts` 冲锋枪组装元件 | T2 |
   | `deceasedcraft:shotgun_assembly_parts` 霰弹枪组装元件 | T2 |
   | `deceasedcraft:rifle_assembly_parts` 步枪组装元件 | T3 |
   | `deceasedcraft:sniper_assembly_parts` 狙击枪组装元件 | T4 |
   | `deceasedcraft:hmg_assembly_parts` 机枪组装元件 | T4 |
   | `deceasedcraft:special_assembly_parts` 特殊武器组装元件 | T4 |
2. **复数元件取最高档**（实测 22 把，如 `tacz:spas_12` = 霰弹枪 + 步枪 → T3）。
3. **同档并列**按元件难度序裁决（见下），如 `tacz:minigun` = 机枪 + 特殊 → 特殊 → T4 且图标/点击目标为特殊元件。
4. **没有配方**时按枪械类型回落，并标 `inferred: true`：
   手枪 T1 / 冲锋枪·霰弹枪 T2 / 步枪 T3 / 机枪·狙击枪·特殊·重型武器 T4。
   （`bf1:ef46` 有配方但配方里没有组装元件，同样走回落。）
5. **元件难度序**（由难到易，同档并列时取靠前者）：
   `special > sniper > hmg > rifle > shotgun > smg > pistol`。
   这是**人工排定**的领域判断，证据（战利品来源数 / 最高掉率）附在 `parts[*].evidence` 里供复核：

   | 序 | 元件 | 档 | 战利品来源 | 最高掉率 | 判断依据 |
   |---|---|---|---|---|---|
   | 1 | special 特殊 | T4 | 0 处 | — | 全站搜不到，只能下界合金合成 |
   | 2 | sniper 狙击枪 | T4 | 5 处 | 64.6% | T4 里来源最少 |
   | 3 | hmg 机枪 | T4 | 6 处 | 21.6% | 来源比狙击枪多一处 |
   | 4 | rifle 步枪 | T3 | 21 处 | 100% | 档位次之 |
   | 5 | shotgun 霰弹枪 | T2 | 15 处 | 18.2% | T2 里单箱掉率低 |
   | 6 | smg 冲锋枪 | T2 | 13 处 | 82.3% | 单箱掉率高 |
   | 7 | pistol 手枪 | T1 | 15 处 | 64.6% | 最低档 |

   `gen-tiers` 只做**一致性校验**：难度值必须与档位单调（T1 元件的难度值必须大于 T2…），不一致记 warning 并失败；同档内的先后顺序以本表为准，不由脚本推导。

### 子弹梯度（bullet tier）

1. 枪的 `ammo` 字段即 `tacz:ammo` 的 NBT `AmmoId`（如 `tacz:556x45`）→ 口径 → 模具
   `deceasedcraft:mold_bullet_casing_*`。15 个口径人工映射，其中两个不规则：
   `tacz:357mag` → `357magnum`、`tacz:50ae` → `ae50`。
2. 模具在 `WZ_DATA` 战利品表（区域 → 建筑 → 部位 → 楼层 → 容器 → 物品）里出现过的**最低区域档**就是子弹梯度。区域档取 `region.tier`；`wild` / `street` 的 `T1-T3` 取低界 T1（"最低能搜到"）。
3. 没有模具的 9 种弹药（40mm 榴弹、RPG 火箭、`rebel:105ac/20ap/37aphe`、`suffuse:.22wmr/boomstickshot`、`bf1:fuel`、`bf1:medkit`）→ `tier: null`，界面用灰色虚线标「无模具」+ 口径名，图标退用 `tacz:ammo`，不可点。
4. 没有 `ammo` 字段的枪（`suffuse:knife`）→ 灰色虚线标「无弹药」，不显示图标与名称，不可点。

### 验收基线（本次实测，写进 `verify-tiers`）

| 维度 | T1 | T2 | T3 | T4 | 其它 |
|---|---|---|---|---|---|
| 枪械梯度（178 把） | 30 | 32 | 56 | 60 | 其中 15 把为推断 |
| 子弹梯度（178 把） | 45 | 21 | 45 | 44 | 无模具 22 · 无弹药 1 |
| 模具（15 个） | 9mm · 45acp | 12g · ae50 · 357magnum | 556x45 · 762x39 · 58x42 | 30_06 · 308 · 338 · 500mag · 50bmg · 762x54 · 57x28 | — |

## Data contract（唯一对外接口）

`public/data/tiers.js`（全局 `<script>`，与 `loot.js` / `recipes.js` 同形态）：

```js
window.WZ_TIERS = {
  generated: "2026-10-24",
  source: { pack: "DeceasedCraft 5.11.19", guns: 178, molds: 15 },
  // 组装元件字典：难度 1 = 最难
  parts: {
    "deceasedcraft:pistol_assembly_parts": {
      label: "手枪组装元件", tier: "T1", icon: "deceasedcraft:pistol_assembly_parts",
      difficulty: 7, evidence: { lootSources: 15, bestDrop: 64.64 }
    }
    /* … 7 个 */
  },
  // 枪械梯度：part 为定档/点击目标；inferred 为 true 时 part 必为 null
  guns: {
    "tacz:m4a1": { tier: "T3", part: "deceasedcraft:rifle_assembly_parts", parts: ["deceasedcraft:rifle_assembly_parts"], inferred: false },
    "tacz:minigun": { tier: "T4", part: "deceasedcraft:special_assembly_parts", parts: ["deceasedcraft:hmg_assembly_parts", "deceasedcraft:special_assembly_parts"], inferred: false },
    "gz:m16a2": { tier: "T3", part: null, parts: [], inferred: true, basis: "type" }
  },
  // 子弹梯度：按 ammoId 建索引（多把枪共用同一口径）
  bullets: {
    "tacz:556x45": {
      tier: "T3", caliber: "5.56×45mm",
      mold: "deceasedcraft:mold_bullet_casing_556x45",
      moldName: "金属冲压模具：5.56×45mm 步枪弹弹壳",
      regions: ["摩天酒店区"], evidence: { lootSources: 3, bestDrop: 12.5 }
    },
    "tacz:40mm": { tier: null, caliber: "40mm 榴弹", mold: null, reason: "no-mold" }
  },
  meta: { missingIcons: [], warnings: [] }
};
```

约定：
- 每个 `guns` 条目必有 `tier`；`inferred: true` 时 `part === null`。
- `bullets` 的 `tier` 可为 `null`，此时必有 `reason`（`no-mold`）。
- `mold` / `part` 的 id 必须能被 `textures.js` 解析出图标，否则进 `meta.missingIcons` 并退化为首字方块。
- 输出确定性：同输入两次运行字节一致。

## 界面契约

组件 `src/client/tiers.ts` → `window.WZ_TIERS_UI`：

```js
window.WZ_TIERS_UI = {
  available(): boolean,
  rows(gunId): Array<{ kind: "gun"|"bullet", tier: "T1".."T4"|null,
                       label: "枪械梯度"|"子弹梯度", name: string, ico: string,
                       href: string|null, inferred: boolean, note: string|null }>,
  badges(gunId): string   // 两个 tag 的无包裹 HTML 串，直接塞进 .gs-badges / .meta
}
```

HTML 结构（与「全自动 / 开膛待击」同排，透明底有色字）：

```html
<div class="gs-badges">
  <span class="gs-badge fire">全自动</span>
  <span class="gs-badge bolt">闭膛待击</span>
  <button class="gs-badge tier-tag tier-T3 clickable" title="枪械梯度：步枪组装元件"
          data-go="#/item/deceasedcraft%3Arifle_assembly_parts">
    <span class="tier-ico">…16px 元件图标…</span>
    <span class="tier-text">枪械梯度</span><b class="tier-hl">T3</b>
  </button>
  <button class="gs-badge tier-tag tier-T3 clickable" title="子弹梯度：5.56×45mm"
          data-go="#/item/deceasedcraft%3Amold_bullet_casing_556x45">
    <span class="tier-ico">…16px 模具图标…</span>
    <span class="tier-text">子弹梯度</span><b class="tier-hl">T3</b>
  </button>
</div>
```

- **挂载点 1**：改枪台 `#view > div.gs-head > div.gs-head-body > div.gs-badges`，追加在射击模式徽章之后。
- **挂载点 2**：枪械详情 `#view > .detail-hero > .meta`，追加在类型徽章之后。
- **点击**：`data-go` 走既有的全局路由委托（`app.ts` 里 `closest("[data-go]")`），不新增事件监听。
  - 枪械 tag → 该组装元件物品页；`inferred` 无元件 → 渲染成 `<span>`，不可点。
  - 子弹 tag → 该口径模具物品页。
  - 无模具 / 无弹药 → 渲染成 `<span>`，灰色虚线框，文字直接写「无模具」/「无弹药」。
- **配色**：透明底 + 有色字（边框同色 25–40% 透明度）：T1 绿 `#4ade80`、T2 蓝 `#60a5fa`、T3 紫 `#c084fc`、T4 金红（文字 `#f0803f`，档位数字用金→红渐变裁字）；亮色主题换深一档保证对比度。
- **图标**：枪械 tag = 定档元件的 16px 物品图标；子弹 tag = 该口径模具的 16px 物品图标（无模具时退用 `tacz:ammo`）。
- **文案**：`枪械梯度` + 彩色档位；子弹 tag 为 `子弹梯度` + 彩色档位。`title` 属性给元件名 / 口径名。推断档位后缀「· 推断」（灰）。
- 响应式：窄屏缩字号与内边距，标签随 `.gs-badges` 自然换行。

## 枪械描述块（改枪台）

「枪械库」卡片移除后，177 把枪的文案在改枪台呈现，紧贴 `.gs-head` 下方（`#view > .gs-desc`，位于 `.gs-actions` 之前）：

```html
<div class="gs-desc">
  <div class="gs-desc-row"><span class="gs-desc-tag">背景</span><span class="gs-desc-text">“广受好评”的栓动机枪</span></div>
  <div class="gs-desc-row"><span class="gs-desc-tag">作用</span><span class="gs-desc-text">持续火力压制，弹容大…</span></div>
</div>
```

- 数据源是已加载的 `WZ_GUIDES.guns`（无新增数据文件、无生成脚本）：`description`（144 把有）+ `effect`（177 把都有）。
- 没有背景描述的 33 把枪显示灰色斜体占位「暂无背景描述」；没有 `effect` 的条目（如 `suffuse:knife`）整块不渲染。
- 描述里的换行用 `white-space: pre-line` 保留（如 `bf1:ef46` 的第二行「可在无线电台复装」）。

## 装备图鉴改动

`renderGearHub` 移除「枪械库」（`#/gear/guns`）这张 hub 卡片，保留「改枪台」：卡片从 6 张减到 5 张。`#/gear/guns` 路由与页面本身保留（枪械详情页的返回仍指向它），只是不再从装备图鉴进入。

## Commands

```bash
npm run gen:tiers            # public/data/tiers.js（读已生成的 recipes.js + loot.js）
npm run verify:tiers         # 数据断言（入库）
npm run verify               # build + tsc + check:assets（全量门禁）
```

## Project Structure

```
scripts/gen-tiers.ts        新增：梯度生成（读两份已生成数据，输出 tiers.js）
scripts/verify-tiers.ts     新增：梯度断言（分布基线 + 抽样 + 一致性）
src/client/tiers.ts         新增：WZ_TIERS_UI（两页共用组件）
src/client/app.ts           改：详情页 .meta 插入 tag、装备图鉴移除枪械库卡片
src/client/gunsmith.ts      改：.gs-badges 插入 tag、新增 .gs-desc 描述块
src/client/main.ts          改：import './tiers'
public/data/tiers.js        新增（生成物，入库）
public/css/app.css          改：.gs-badge.tier-tag / .tier-hl / .gs-desc 等
index.html · scripts/build-sw.ts · src/client/types/data.d.ts   改：接入新数据
```

## Code Style

沿用渲染模块的既有写法（`// @ts-nocheck` + IIFE + `window.WZ_*_UI`）：

```ts
// @ts-nocheck
(function () {
  "use strict";
  function esc(v) { /* … */ }
  function rows(gunId) {
    const T = window.WZ_TIERS;
    if (!T || !T.guns[gunId]) return [];
    const g = T.guns[gunId];
    const part = g.part ? T.parts[g.part] : null;
    /* … */
  }
  window.WZ_TIERS_UI = { available, rows, strip };
})();
```

## Testing Strategy

- `scripts/verify-tiers.ts`：结构化断言（数量、分布基线、抽样枪、模具档位、推断集合、图标可解析、难度序与战利品一致），失败即非零退出。
- `npm run verify`：类型 + 资源引用 + 构建门禁。
- 手工验收：改枪台 `#/gear/gunsmith/tacz:m4a1`、`#/gear/gunsmith/tacz:minigun`（同档并列）、`#/gear/gunsmith/gz:m16a2`（推断）、`#/gear/gunsmith/suffuse:knife`（无弹药）、`#/gear/gunsmith/tacz:m320`（无模具）；详情页 `#/gear/gun/tacz:m4a1`；点击两行确认跳到 `#/item/…` 且返回可回原页。

## Boundaries

- **Always**：改数据先改 `gen-tiers.ts` 再重生成；提交前 `npm run verify` + `npm run verify:tiers` 全绿；档位判定只允许来自本条规则。
- **Ask first**：新增第二种判档依据（如用 NPC 售价定档）、把梯度铺到第三个页面、改 `gunsmith.js` / `guides.js` 数据。
- **Never**：手改 `public/data/tiers.js`；在前端硬编码 gun→tier 表；把区域档位字符串 `T1-T3` 原样当档位显示。

## Success Criteria

1. 178 把枪全部有枪械梯度，分布 30 / 32 / 56 / 60，其中 15 把标「· 推断」。
2. 15 个口径全部有子弹梯度，档位与战利品最低区域档逐一相符；9 种特殊弹药显示「特殊弹药 · 无模具」，`suffuse:knife` 显示「无弹药」。
3. 改枪台头部与枪械详情头部各出现一条两行梯度条，颜色/图标/名称符合上述契约。
4. 点枪械行到元件物品页、点子弹行到模具物品页，均为站内 hash 跳转，无整页刷新，返回后回到原枪。
5. `npm run verify` 与 `npm run verify:tiers` 通过；新增数据纳入 service worker 预缓存清单。

## 实施记录（2026-10-22）

- **数据**：178 把枪全部定档（T1 30 / T2 32 / T3 56 / T4 60，推断 15 把）；15 个口径定档（T1 9mm·45acp；T2 12g·50AE·357magnum；T3 556x45·762x39·58x42；T4 其余 7 个）。按枪计子弹梯度 45 / 21 / 45 / 44，无模具 22 把、无弹药 1 把。
- **同档并列**：`tacz:minigun`（机枪 + 特殊）取难度序第 1 的**特殊**元件，与「狙击枪 > 机枪」的最终裁决一致（`tacz:p90` 类机枪+冲锋枪仍取机枪）。
- **生成器**：`npm run gen:tiers` 零 warning、零缺图标；`npm run verify:tiers` **1420** 条断言通过。
- **界面**：改枪台 `.gs-head` 的第 4 个子节点即 `.tier-strip`；枪械详情页插在 `.detail-hero > .meta` 之后，两处同构。DOM 断言 **30** 条、点击跳转 **8** 条通过；`npm run verify`（build + tsc + check:assets 902 处引用）全绿。
- **两处与初稿的偏差**：① 模具物品页的区块标题是「最佳来源」而不是「可搜刮建筑」（后者只用于枪械/护甲详情）；②「无弹药」行不渲染图标与名称节点，只留 `子弹梯度` + 灰色「无弹药」标，避免出现「?」占位和多余破折号。
- **未做**：未给梯度行加规则说明或 tooltip（按 q10 决定），未把梯度铺到枪械库列表与换枪选择器（按 q8 决定）。

## 实施记录（第二轮，2026-10-22）

按用户复查意见改了四处：

1. **梯度从「两行条」改成 tag**：挂到 `.gs-badges`（与「全自动 / 开膛待击」同排）与详情页 `.meta`；`.tier-strip` 相关 HTML 与 CSS 全部删除，`WZ_TIERS_UI.strip()` → `badges()`。
2. **样式改透明底有色字**：`.gs-badge.tier-tag`，边框用同色 25–40% 透明度，T4 档位数字用金→红渐变裁字；亮色主题换深一档。
3. **装备图鉴移除「枪械库」卡片**：`renderGearHub` 的 hub 卡片 6 → 5，只保留改枪台；`#/gear/guns` 路由与页面保留。
4. **177 把枪的文案搬进改枪台**：`.gs-desc` 紧贴 `.gs-head` 下方（`.gs-actions` 之前），背景 + 作用两行；144 把有背景描述，33 把显示「暂无背景描述」占位，`effect` 缺失的条目（`suffuse:knife`）整块不渲染。

验收：DOM 断言 **36** 条、点击跳转 **8** 条全通过（含推断 tag 点了不跳、无模具/无弹药 tag 不可点、换行描述保留）。

## Open Questions

无（设计树已全部收敛，决策见 git 提交说明）。
