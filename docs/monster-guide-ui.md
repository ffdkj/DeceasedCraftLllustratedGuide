# 生物图鉴（站内）口径

页面把 `guides.js` 的 167 条手写条目与 `monster-spawn-tiers.js` / `monsters-difficulty.js` / `horde-buildings.js`
三份生成数据合并成一份 200 条目录，规则写在 `src/client/monsters.ts` 的 `buildCatalog()`，
`npm run verify:monsterguide` 锁住结果。生成数据的推导见 `docs/monster-handbook.md`，
逐怪梯度表见 `docs/monster-spawn-tiers.md`，逐建筑尸潮见 `docs/horde-buildings.md`。

## 1. 三档状态

| 状态 | 条数 | 判定 | 在页面上的位置 |
|---|---:|---|---|
| `spawns` 会刷 | 93 | 四来源至少命中一个，或原版僵尸变体，或 NPC 克隆体 | 梯度列表（T1–T4 / 全图 30 / 深渊 5） |
| `unimplemented` 确认不会生成 | 60 | 区域刷怪器 / 模组自然刷 / 天数尸潮 / 尸潮建筑 全空 | 未实装 tab 第一档 |
| `unconfirmed` 来源未确认 | 47 | 包内注册名存在，但四个来源都扫不到 | 未实装 tab 第二档 |

后两档合计 107 条，按需求「不参与其他筛选」：不进 T1–T4 分组、不进数值查询、检索只在 tab 内生效。

## 2. 合并时踩到的三件事

1. **手写 167 条里有 50 条不在生成数据里** —— 大部分在模组 jar 的 `lang/zh_cn.json` 里能找到注册名（`zombie_extreme:chainsaw`、`spore:leviathan`、`deaceased:stunner`…），
   所以不能当「不会生成」，进 `unconfirmed`，详情页明确写「不给数值矩阵」。
2. **3 处 id 拼写差异**：手写 `hordes:zombieplayer` / `huskplayer` / `drownedplayer`，包内注册名带下划线（`hordes:zombie_player`）。
   不归并会出现 3 对重复条目，`ID_FIXES` 负责修正。
3. **尸壳 / 溺尸不是未实装**：它们是原版僵尸变体，刷怪由原版逻辑接管，`VARIANT_OF` 让它们跟着僵尸进「全图」组并标注证据。

## 3. 数值矩阵的段与行

详情页矩阵按场景分段，每段三行（简单 / 普通 / 困难），四列指标：

| 段 | 数据来源 | 显示条件 |
|---|---|---|
| 野外 · 无区域加成 | `monsters-difficulty.js` `wild` | 始终 |
| 城区 T1–T4 | 同上 `city[T*]` | 只显示该怪实际会刷的梯度；全图怪四档全显示；深渊专属怪整段不显示（深渊规则只看维度，不吃城区倍率） |
| 天数尸潮 | 同上 `horde.{normal,hard}` | 只在表的怪 |
| 建筑尸潮 T1–T4 | 同上 `horde.city[T*]` | 只显示它出现的建筑所属梯度 |
| 深渊 / 深渊尸潮（推算） | 同上 `abyss` | 只对 `spore:*` 或深渊刷怪清单里的怪；深渊尸潮那行标注「包里尚未配置」 |

列：生命（红心）· 护甲（胸甲）· 攻击（铁剑）· 对玩家（半心）。图标用 `public/images/ui/stat-*.png`（9×9 / 16×16 原图，CSS 放大 + `image-rendering: pixelated`），
满版表示有值，空版表示该项为 0 或无数值。

「数值」按钮弹出的快览只给**困难**这一列：野外 / 城区 T1–T4 / 天数尸潮 / 建筑尸潮 T1–T4 / 深渊，覆盖「困难 T1 尸潮」这类确认。
注意两种尸潮不同源：**天数尸潮不吃区域加成**（僵尸困难 40），**建筑尸潮按建筑所在区域叠一层**（T1 派出所僵尸困难 50）。

## 4. 列表怎么读

`T1 T2 T3 T4` 四个点是固定槽位，实心＝该梯度会刷，色阶只用一种红色从 0.45 到 0.92 的浓淡表示危险递进；
不挑区域的标「全图」，只在深渊维度刷的标「深渊」，未实装的两档不画点阵、右侧写「无梯度」。右侧数字是 `attribute.js` 原值（基础生命 / 护甲 / 攻击），场景化的数字走「数值」按钮。

URL 参数可直接分享筛好的视图：`#/creatures/monsters?t=T1&th=灾厄`、`#/creatures/monsters/unimplemented?th=真菌`；
梯度 chip 的取值是 `T1`–`T4` / `全图` / `深渊`。

## 5. 断言与回归

`npm run verify:monsterguide`（354 项）锁住：合并总数与三档互斥、三条 id 拼写修正、梯度计数 6/11/18/34、全图 30 / 深渊 5、
未实装不带任何刷怪来源、威胁等级取值合法、僵尸与菌械重炮的矩阵锚点（含深渊与深渊尸潮推算）、派出所僵尸 50/5.63、
`index.html` 与 SW 的接线、HUD 图标文件存在、详情页对未实装不给矩阵。
