# Capability Map: 枪械/配件配方、造价与未实装分类

一次需求里打包了三块可独立验证的能力，先给模块边界与构建顺序，再逐个写规格。

| 模块 id | 职责 | 依赖 |
|---|---|---|
| `recipes-data` | 从整合包生成配方数据文件（枪械 + 配件）、材料与图标解析、可得性集合 | — |
| `unreleased-category` | 依据 `recipes-data` 的可得性集合判定未实装，并新增筛选分类 | `recipes-data` |
| `cost-block` | 两个页面上的「枪械造价」区块（静态 / 按装配实时） | `recipes-data` |

构建顺序：`recipes-data` → `unreleased-category`、`cost-block`（后两者互不依赖，可并行）。

依赖方向单向；模块之间只通过 `public/data/recipes.js` 的数据契约通信（契约见 `SPEC-recipes-data.md`）。

规格文件：
- `specs/SPEC-recipes-data.md`
- `specs/SPEC-unreleased-category.md`
- `specs/SPEC-cost-block.md`

## 已定决策（来自评审）

1. 数据形态：静态 JSON 数据文件，不引入数据库；生成脚本与数据都入库，整合包目录不入库。
2. 造价块范围：改枪台 = 枪械本体 + 当前已装配配件；枪械详情 = 仅枪械本体。
3. 材料层级：只显示配方直接材料（一级），不递归展开。
4. tag 材料：展开成具体物品，但只取首个物品的图标并标注「任选」。
5. 未实装：自动判定；新增「未实装」分类，并从原分类移除；影响 枪械库列表、改枪台类型筛选、两个页面的徽章；改枪台里仍可正常装配。
6. 缺配方：显示「无配方：仅可从战利品箱获得」并给出可搜刮建筑入口。
7. 旧配方：`guides.js` 不动；tacz 那 53 条错误配方由新数据覆盖生效。
8. 图标：优先补齐真实贴图（可联网取原版资产），失败退近似图；`special_assembly_parts` 用整合包 jar 里的真实贴图。
9. 非枪械道具：一并归入未实装，不加额外标记。
