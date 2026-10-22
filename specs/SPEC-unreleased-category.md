# SPEC: unreleased-category（未实装分类）

## Objective

把「本版本既没有配方、也无法从战利品箱/交易/枪店陈列拿到」的枪械条目单独归入「未实装」分类，让玩家知道这些枪当前版本拿不到，而不是以为攻略漏了配方。

用户故事：作为玩家，我翻枪械库时能一键看到「这个版本哪些枪是摆设」，且它们不会混在步枪/手枪里误导我。

## Objective 之外的边界

- 只处理枪械条目（`guns`），不处理配件/弹药。
- 只读 `window.WZ_RECIPES.unreleased`（由 `recipes-data` 规格产出），不在前端重新判定。
- 不删除任何枪的详情页与改枪台能力——只是分类与标注。

## 判定（由生成脚本完成）

`unreleased = 站内全部枪 − 有 gun 配方 − (chest ∪ npc ∪ store)`，预期 11 条：

```
bf1:handgun, bf1:kolibri, bf1:lunge_mine, bf1:syringe,
gz:arx200_nero, rebel:bq01, rebel:c23, rebel:t70th,
suffuse:knife, suffuse:lifecard, suffuse:trapper50cal
```

其中 syringe / lunge_mine / knife 不是枪，但按决策一并归入，且**不加「道具」标记**。

## 界面改动

1. **枪械库列表** `#/gear/guns`（`renderGuideList("guns")`）
   - 分类 chips 末尾新增「未实装」；该分类下列出 `unreleased` 中**存在于枪械库数据**的条目。
     已知差异：`suffuse:knife` 只存在于 `gunsmith.js`（178 把），不在 `guides.js` 的枪械列表（177 把），
     因此枪械库显示 10 条、改枪台显示 11 条；不改两边的数据口径。
   - 未实装条目**从原类型分类移除**（步枪/手枪/… 里不再出现）。分类值来源：id ∈ unreleased → `"未实装"`，否则沿用 `type`。
   - 列表行右侧徽章显示「未实装」（与详情页一致）。
2. **改枪台 hub** `#/gear/gunsmith`
   - 类型筛选 chips 末尾新增「未实装」；选中后只列出这些枪。
   - 数据不足时（某枪不在 `guides.guns` 但在 `gunsmith.guns`）也要出现在该分类。
3. **枪械详情页** `#/gear/gun/<枪>`
   - 顶部 meta 区新增徽章 `未实装`（仅 unreleased 条目）。
4. **改枪台详情** `#/gear/gunsmith/<枪>`
   - 标题（`.gs-head`）旁新增徽章 `未实装`；**不影响**配件选择与数值计算。
5. 兜底：`window.WZ_RECIPES` 不存在（数据未生成）时全部徽章/分类不出现，页面按现状工作，不报错。

## Data contract（消费）

只读 `window.WZ_RECIPES.unreleased: string[]`。新增一个客户端查询函数 `isUnreleased(id)`，供四处复用；不缓存副本。

## Commands

```
npm run dev      # 人工核对四个位置
npm run verify   # 构建 + 类型 + 资源引用
```

## Project Structure

```
src/client/app.ts        枪械库列表 / 详情页徽章 / 分类分组
src/client/gunsmith.ts   改枪台 hub chips + workspace 标题徽章
public/css/app.css       .badge.unreleased 等少量样式
```

## Code Style

沿用 `app.ts` / `gunsmith.ts` 现有函数式写法与 `esc()` 转义；分类排序集中在一处（末尾追加），不散落魔法字符串：

```ts
const UNRELEASED_LABEL = "未实装";
function gunGroupOf(gun: any, id: string): string {
  return isUnreleased(id) ? UNRELEASED_LABEL : String(gun.type || "枪械");
}
```

## Testing Strategy

- **数据断言**（`scripts/verify-recipes.ts` 已覆盖名单）。
- **界面断言**（人工 + 截图）：枪械库分类 chips 含「未实装」且计数 11；原分类里不再出现这 11 把；详情页与改枪台徽章出现；改枪台仍可正常装配并计算数值。
- 回归：非 unreleased 的枪不受影响（抽 3 把对照改动前后）。

## Boundaries

- **Always**：分类标签常量统一；四处徽章复用同一查询函数；`npm run verify` 通过。
- **Ask first**：把「未实装」概念推广到配件/弹药；在枪械数据表（`#/gear/guntable`）加筛选。
- **Never**：在前端重算可得性；删除这些枪的数据或详情页；把判定写进 `guides.js`。

## Success Criteria

1. 枪械库「未实装」分类为 10 条（`suffuse:knife` 不在枪械库数据）；步枪/手枪/狙击等原分类中都不含这些 id。
2. 改枪台 hub 的「未实装」筛选结果为 10 条（hub 列表同样取自 `guides.js` 的 177 把；`suffuse:knife` 仍记在 `recipes.unreleased` 里，可通过直达链接打开）。
3. 详情页与改枪台详情对这 11 把显示徽章；对其余 167 把不显示。
4. 改枪台对这 11 把仍可正常选配件、数值与造价块照常工作。
5. 删掉 `public/data/recipes.js` 时页面不报错，只是分类与徽章消失。

## Open Questions

无。
