# CONTEXT — 亡者世界图鉴 · 术语表

本文件只放**领域词汇**（它叫 X 时不叫 Y），不放实现细节、不放计划。

## 图鉴数据

- **枪械（gun）**：TACZ 系枪包里的枪，id 形如 `tacz:m4a1`、`bf1:ef46`。分属枪包（pack）：`tacz` / `bf1` / `gz` / `rebel` / `suffuse`。
- **配件（attachment）**：可装到枪械槽位（瞄具/枪口/枪托/握把/激光/弹匣）上的物品，id 形如 `tacz:ammo_mod_fmj`。
- **配方（recipe）**：整合包 `recipes/**` 里一条"用什么材料做什么东西"的记录，来源是枪械工坊（`tacz:gun_smith_table_crafting`）。
- **材料（material）**：配方里的一项消耗，可能是**具体物品**（`item`）或**物品标签**（`tag`，如 `forge:plates/aluminum`，代表"任选其一"）。
- **造价（cost）**：把若干件的配方材料合并后的总材料清单。
- **配方覆盖（recipe coverage）**：某把枪/某个配件在整合包里是否有 `recipes` 记录。

## 可获得性

- **掉落可得（chest-obtainable）**：该枪/配件出现在建筑战利品表里。注意枪在战利品表里不是以枪 id 出现，而是 `tacz:modern_kinetic_gun` + NBT `GunId`。
- **交易可得（npc-obtainable）**：出现在 NPC 商店配置里（同样走 `GunId` NBT）。
- **陈列可得（store-display）**：枪店里由命令方块随机生成的展示枪，玩家可看到并使用——按项目决定，算作可获得。
- **未实装（unreleased）**：本版本既**没有配方**、也**无法通过上述任一途径拿到**的枪械条目。它不是"坏数据"，而是"当前版本拿不到"。
- **道具（prop）**：枪械列表里其实不是枪的条目（如医疗针筒、地雷、刀）。

## 展示

- **图集（atlas）**：`public/textures/atlas.webp`，32px 网格，按 `public/data/textures.js` 的 `items`/`blocks`/`nbt` 索引切成单个图标。
- **图集索引（texture index）**：物品 id → 网格序号；查不到时界面退化为"名字首字方块"。
- **近似图标（approximate icon）**：原物品没有可用贴图时，借用另一个物品的图标并在文案里说明。

## 页面

- **改枪台详情（gunsmith workspace）**：`#/gear/gunsmith/<枪>`，按装配状态实时算数值。
- **枪械详情（gun detail）**：`#/gear/gun/<枪>`，静态展示基础数值、作用与掉落来源。
- **枪械库列表（gun list）**：`#/gear/guns`，按类型分类浏览。
