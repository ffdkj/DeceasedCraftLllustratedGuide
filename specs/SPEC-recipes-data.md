# SPEC: recipes-data（枪械/配件配方数据 + 图标补齐）

## Objective

把整合包里枪械与配件的真实配方，生成成站点可直接加载的静态数据，并保证每个材料都有图标。产出的可得性集合供 `unreleased-category` 使用。

用户故事：作为玩家，我在改枪台/枪械详情里能直接看到「这把枪、这套配件需要哪些材料、各几个」，且每个材料都有图；不再需要翻进游戏里的枪械工坊对照。

## Data contract（唯一对外接口）

`public/data/recipes.js`（全局 `<script>`，形态与 `loot.js` / `gunsmith.js` 一致）：

```js
window.WZ_RECIPES = {
  generated: "2026-10-22",
  source: { pack: "DeceasedCraft 5.11.19", guns: 164, attachments: 186 },
  // 材料字典：key 为 "物品id" 或 "tag:<tag>"，一次定义，配方里只存 key + 数量
  materials: {
    "immersiveengineering:component_steel": { label: "钢组件", icon: "immersiveengineering:component_steel" },
    "tag:forge:plates/aluminum": { label: "铝板", icon: "immersiveengineering:aluminum_plate", tag: true, approx: true }
  },
  recipes: {
    guns:        { "tacz:m4a1": [["immersiveengineering:component_steel",12], ["tag:forge:plates/aluminum",6]] },
    attachments: { "tacz:ammo_mod_fmj": [[...]] }
  },
  // 可得性：三个来源任一为真即可获得
  obtainable: { "tacz:m4a1": { chest: true, npc: false, store: false } },
  unreleased: ["bf1:handgun", "bf1:kolibri", "bf1:lunge_mine", "bf1:syringe",
               "gz:arx200_nero", "rebel:bq01", "rebel:c23", "rebel:t70th",
               "suffuse:knife", "suffuse:lifecard", "suffuse:trapper50cal"],
  meta: { missingIcons: [], warnings: [] }
};
```

约定：
- `recipes` 缺失某 id ⇒ 该件没有配方（正常状态，不是错误）。
- `materials[key].icon` 必须是 `textures.js` 能解析到的 id；解析不到则记录进 `meta.missingIcons`，渲染退化为首字方块。
- `tag:` 前缀的 key 渲染时标注「任选」；`approx: true` 表示图标是近似借用的（如原版贴图取不到时）。

## 生成行为（scripts/gen-recipes.ts）

输入：`--pack <整合包目录>`（默认 `./DeceasedCraft5.11.19`），只读；输出：`public/data/recipes.js`。

1. **枪械配方**：扫 `<pack>/overrides/tacz/<pack>/data/<ns>/recipes/gun/*.json`；`result.id` 作 key；`result.type === "custom"` 时从 `result.item.nbt.GunId` 取（`bf1:ef46`）。丢弃 result 指向站内不存在的枪（当前仅 `tacz:m16a2`、`tacz:m700_carbon` 两个枪包命名空间 bug），并写入 `meta.warnings`。
2. **配件配方**：扫 `recipes/attachments/*.json` 与 rebel 的单数目录 `recipes/attachment/*.json`；同样规则。
3. **材料解析**：`materials[].item.item` 或 `materials[].item.tag`；去掉 tag 值里误写的 `#` 前缀。tag 通过 `<pack>` 内 `data/*/tags/items/**` 解析出具体物品集合，取**排序后的第一个**物品作为代表图标，label 用策划字典。
4. **中文名与图标**：脚本内维护一份**人工字典**（当前只需覆盖 15 个物品 + 33 个 tag，见下），缺失项回落到好读的英文 id 并记 `meta.warnings`。不联网、不读 lang（保证可复现）。
5. **可得性集合**：
   - `chest`：扫 `overrides/mods/DCTweaks_*.jar` 内全部 `*/loot_tables/*.json`，正则取 `GunId:"<ns:id>"`（命名空间必须允许数字，否则漏 `bf1`）；再并入 `tacz_default_gun` 的 `tacz_loot_injectors/*.json`。
   - `npc`：扫 `overrides/config/dochi_rpg_maker/npc_shops/*` 的 `GunId`。
   - `store`：扫 `overrides/kubejs/server_scripts/functions/spawns/spawn_gun_commands.js` 里的枪 id 数组。
6. **未实装**：`unreleased = 站内全部枪 id − 有配方的枪 − (chest ∪ npc ∪ store)`；按 id 排序写死顺序输出。预期恰好 11 条（见契约），数量不符时脚本以非零码退出并打印差异。
7. 输出为单行紧凑 JSON + 头部注释，样式与现有数据文件一致；同一输入两次运行字节级一致。

## 图标补齐（scripts/gen-atlas-extra.ts）

只处理「枪械/配件配方材料里出现、图集里没有」的物品，当前 3 个：

| 物品 | 来源 | 策略 |
|---|---|---|
| `deceasedcraft:special_assembly_parts` | 本地 `DCTweaks_*.jar` 的 `assets/deceasedcraft/textures/item/gun_parts_special.png` | 直接加入图集（真实贴图） |
| `minecraft:fire_charge` | 原版资产（整合包未携带） | 联网取 1.20.1 原版贴图，放大 32×32 后入图集 |
| `minecraft:pointed_dripstone` | 同上 | 同上；取不到则近似：`fire_charge`→`flint_and_steel`、`pointed_dripstone`→`flint`，并标 `approx` |

实现要点：
- 图集 64×36 格、32px；已用 0..2241，从 2242 起追加；`sharp` 负责放大（nearest）与合成，重新编码 webp。
- 幂等：已存在的条目跳过；索引一旦分配不再变动。
- 把新条目并入 `public/data/textures.js` 的 `items`（保持单行紧凑格式）。
- 联网失败不算构建失败：退近似图 + 写 `approx` 标记。

## Commands

```
npm run gen:recipes -- --pack ./DeceasedCraft5.11.19
npm run gen:atlas   -- --pack ./DeceasedCraft5.11.19
npm run verify      # build + tsc + check-assets
npm run dev         # 人工看页面
```

## Project Structure

```
scripts/gen-recipes.ts        生成配方数据（入库）
scripts/gen-atlas-extra.ts    图集补图（入库）
scripts/pack-readers.ts       读 jar / 读 tags / 读 loot_tables 的共享工具（入库）
public/data/recipes.js        生成产物（入库）
public/data/textures.js       补图后合并（入库）
public/textures/atlas.webp    补图后更新（入库）
```

## Code Style

沿用仓库现有脚本风格：`tsx` + Node 内置模块，无第三方解析库；函数显式返回类型；错误用带上下文的中文消息抛出。示例：

```ts
function readGunRecipeIds(packDir: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const file of globSync(`${packDir}/overrides/tacz/*/data/*/recipes/gun/*.json`)) {
    const data = parseJsonc(readFileSync(file, "utf8"));
    const id = resultGunId(data);            // 兼容 result.id 与 result.item.nbt.GunId
    if (id) out.set(id, file);
  }
  return out;
}
```

## Testing Strategy

- **数据层**：`scripts/verify-recipes.ts`（入库，`tsx` 直跑）断言：枪配方数 ≥ 164、配件配方数 ≥ 186、`unreleased` 恰为 11 条且与预期一致、所有材料 key 都能在 `materials` 字典解析、所有 `icon` 都能被 `textures.js` 解析、两次运行输出一致。
- **构建层**：`npm run verify`（含 `check-assets` 的 900 条引用校验，新增数据文件需登记进 SW shell）。
- **界面层**：人工用 `npm run dev` 检查两个页面的造价块（截图留档）；自动化 DOM 断言留到 `cost-block` 规格的验收步骤。
- 不新增测试框架依赖。

## Boundaries

- **Always**：改完跑 `npm run verify`；生成脚本与数据一起入库；脚本对 `--pack` 只读；输出确定性。
- **Ask first**：新增 npm 依赖；改动图集网格尺寸/编码格式；变更 `textures.js` 结构；把弹药配方纳入范围。
- **Never**：提交 `DeceasedCraft5.11.19/`；手改生成的一行 JSON；动 `guides.js` 现有 165 条枪配方；对 `loot.js` 做破坏性重排。

## Success Criteria

1. `npm run gen:recipes` 在 5.11.19 整合包上产出 `recipes.js`：枪配方 **164** 条、配件配方 **191** 条（含 rebel 单数目录 `recipes/attachment/` 的 5 条；规格草稿写的 186 是漏算该目录的旧数字）、材料 **33** 种，`unreleased` 恰为上述 11 个 id。
2. 两次运行输出 md5 一致；脚本在缺少 jar 或缺少原版贴图时仍能产出（退化 + 记 `meta.warnings`）。
3. `verify-recipes.ts` 全绿：材料 key 全部可解析、`icon` 100% 可解析（无首字方块兜底）。
4. `npm run verify` 通过，`check-assets` 无新增缺失。
5. 页面：M4A1 造价 = 钢组件 12、铝板 6（任选）、塑料板 6（任选）、橡胶 6、步枪组装元件 1。

## 实施记录（与草稿的偏差）

- 配件配方数 191（含 rebel 的 `attachment/` 单数目录 5 条）；被丢弃的配方 3 条：`tacz:m16a2`、`tacz:m700_carbon`（枪包命名空间 bug）、`gucci_attachments:grip_rk1`（站内无此配件）。
- 材料字典 33 项（16 个物品 + 17 个 tag）；仅 `forge:plates/plastic` 用近似图标（足量时用 `minecraft:paper`，因图集无任何塑料板贴图）。
- 图集追加 3 格（#2242 特殊武器组装元件 / #2243 火焰弹 / #2244 滴水石锥），atlas.webp 由 749 KB 变 723 KB（q90 重编码）。
- 可得性：掉落 118（117 个 GunId + 1 个 loot injector）、交易 18、陈列 16。

## Open Questions

无（决策已全部落定）。执行中若发现整合包与站内 id 对不上，写入 `meta.warnings` 并在交付说明里列出。
