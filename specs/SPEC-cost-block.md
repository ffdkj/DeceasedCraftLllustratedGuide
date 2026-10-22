# SPEC: cost-block（「枪械造价」区块）

## Objective

在枪械详情页与改枪台详情页各加一个「枪械造价」区块：把配方材料统一以图标 + 数量呈现。改枪台按当前装配实时计算（枪械本体 + 已装配配件），枪械详情页只展示本体。

用户故事：作为玩家，我在改枪台调好一套配件后，能立刻知道这套东西总共要多少材料，而不是逐个点开配件去抄配方。

## 位置（硬约束）

1. **改枪台详情** `#/gear/gunsmith/<枪>`：插在「方案记录库」之后、「推荐方案」之前。
   - 改后 DOM 断言：`#view > div:nth-child(3/4/5/6/7)` 依次为 枪械数值 / 配件槽位 / 方案记录库 / **枪械造价** / 推荐方案。
   - 即用户选择器 `#view > div:nth-child(6) > div.section-head > div.section-title` 在改动后指向「枪械造价」。
2. **枪械详情** `#/gear/gun/<枪>`：插在「可搜刮建筑」区块之前（紧跟「定位 / 作用」之后）。

## 结构

```
<section class="section cost-block">
  <div class="section-head">
    <div class="section-title">枪械造价</div>
    <div class="section-note">共 N 种材料 · M 件</div>   ← 可选
  </div>
  <div class="cost-total">                              ← 合计（去重相加）
    <div class="cost-total-head">合计材料</div>
    <div class="cost-mats">[图标+数量]…</div>
  </div>
  <div class="cost-groups">
    <div class="cost-group">
      <div class="cost-group-head"><b>枪械本体</b><span>M4A1</span></div>
      <div class="cost-mats">[图标+数量]…</div>
    </div>
    <div class="cost-group">…瞄具 · 幻象 手枪消音器…</div>
  </div>
</section>
```

材料单元：32px 图标（复用 `itemIcon()` / `texIcon()`），右下角数量角标；tag 材料在图标上标「任选」，`title` 写 `铝板（任选其一）`；`approx` 图标时 `title` 追加「近似图标」。

## 计算规则

- 输入：`window.WZ_RECIPES.recipes.guns[gunId]` 与 `recipes.attachments[attId]`，材料 key 通过 `materials` 字典取 label/icon。
- **合计**：按材料 key 去重后**数量相加**；tag key 视为一个条目（不做跨物品合并）。
- **分组**：`枪械本体` + 每个已装配槽位一组，标题格式 `槽位名 · 配件名`（如 `枪口 · 幻象 手枪消音器`），顺序按 `SLOT_ORDER`。
- 改枪台监听既有装配状态（`state.attachments`），切换配件后区块重渲染；枪械详情页为静态渲染。
- 配件未装配 → 不出现该分组；全部未装配 → 只有「枪械本体」一组。
- **只有一组时不画「合计材料」**（枪械详情页即此情况，合计与本体重复）；两组及以上才出现合计。

## 缺配方时的三种状态

| 情况 | 文案 | 附加 |
|---|---|---|
| 枪无配方、但可得 | `无配方：仅可从战利品箱获得` | 改枪台里给按钮跳 `#/gear/gun/<id>`；详情页里紧接「可搜刮建筑」列表 |
| 配件无配方、但可得 | `无配方：仅可从战利品箱获得` | 该分组仍显示配件名与提示，不画材料网格 |
| 未实装（无配方且拿不到） | `未实装：本版本无配方，也无法从战利品箱或交易获得` | 无跳转按钮 |

## 配套修复（本区块依赖）

枪械详情页现有的「可搜刮建筑」对枪是空的：`lootSourcesSection` 按枪 id 查 `loot.js`，而枪在战利品里是 `tacz:modern_kinetic_gun` + note（`枪械: 格洛克 17 手枪`）。需新增解析：物品为 `tacz:modern_kinetic_gun` 时用 note 去除「枪械: 」前缀后与枪名匹配，命中即视为该枪来源。修复后枪械详情页的「可搜刮建筑」对 117 种可掉落枪生效（实测 M4A1 → 美术馆 5.8%）。

## 数据接入

- `index.html` 增加 `<script src="/data/recipes.js">`；`scripts/build-sw.ts` 的 shell 列表加入 `./data/recipes.js`；`src/client/types/data.d.ts` 增加 `WZ_RECIPES: any`。
- 数据缺失（`window.WZ_RECIPES` 未定义）时区块整体不渲染，页面保持现状。

## Commands

```
npm run dev
npm run verify
```

## Project Structure

```
src/client/app.ts        枪械详情页区块 + gunLootSources 解析
src/client/gunsmith.ts   改枪台区块 + 合计计算 + 装配变化重渲染
public/css/app.css       .cost-block / .cost-total / .cost-group / .cost-mats / 角标
index.html, scripts/build-sw.ts, src/client/types/data.d.ts
```

## Code Style

沿用现有渲染函数返回 HTML 字符串 + 事件委托（`data-go` / `data-gs-action`）的模式，不引入框架：

```ts
function costSection(entries: CostEntry[]): string {
  const total = mergeMaterials(entries.map((e) => e.materials));
  return '<div class="section cost-block">' + … + '</div>';
}
```

## Testing Strategy

- **数据层**：`scripts/verify-recipes.ts` 保证 ID 与材料可解析。
- **界面层（人工 + 截图）**：
  1. 改枪台 M4A1：默认只有「枪械本体」一组；装 FMJ + 幻象消音器后出现对应分组，合计数量 = 各组相加（人工核对 1 次）。
  2. `#/gear/gun/tacz:taurus943`：显示「无配方：仅可从战利品箱获得」且「可搜刮建筑」非空。
  3. 未实装的 11 把：显示未实装文案。
  4. 移动端 375px 宽：材料网格换行不溢出。
- 若后续同意把 `jsdom` 加为 devDependency，则把上述 1–4 转成脚本断言（当前受「新增依赖需先确认」约束）。

## Boundaries

- **Always**：区块位置断言（两条 nth-child 规则）写进验收；材料图标复用现有 `itemIcon`；`npm run verify` 通过。
- **Ask first**：新增 devDependency（jsdom 等）；改 `loot.js` 结构；把弹药配方纳入区块。
- **Never**：改 `guides.js` 的枪配方数据；在前端重新解析整合包；把造价写进 localStorage/分享码。

## Success Criteria

1. 改枪台 DOM 顺序如「位置」一节所述，「枪械造价」位于第 6 个块，材料与数量与配方文件一致。
2. 装/卸配件后造价块即时更新，合计 = 各分组合计（去重相加）。
3. 枪械详情页：有配方枪显示本体材料；无配方可掉落枪显示「无配方」提示且「可搜刮建筑」有内容。
4. 353 个枪械/配件配方涉及的材料 100% 显示图标（无首字方块兜底），tag 材料带「任选」标记。
5. 375px 与桌面端布局均无溢出；`npm run verify` 通过。

## Open Questions

无。若实现时发现材料字典缺项，按 `recipes-data` 规格回落到近似/文字并记 `meta.warnings`。
