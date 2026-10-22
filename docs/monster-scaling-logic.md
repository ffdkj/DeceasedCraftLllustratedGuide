# 怪物强化逻辑总表

> 一页说清「这个怪现在为什么是这个数值」。所有数字都能在 `docs/monster-difficulty-analysis.md`（推导）与
> `public/data/monsters-difficulty.js`（机读）里对上，生成器 `scripts/gen-monster-difficulty.ts`。

## 1. 流水线

```
基础属性(attribute.js)
   └─▶ 层 A 区域批(finalize)      ← 主世界 + incity + 区域标签，只打 zombie/husk/drowned
   └─▶ 层 B 困难区域批(onjoin)    ← hard + incity + 区域标签，打全部 hostile
   └─▶ 层 C 简单批(onjoin)        ← easy，打全部 hostile（×0.5）
   └─▶ 层 D 深渊批(onjoin)        ← abyss + incity + hard
   └─▶ 层 E 事件批(onjoin)        ← hard + spawntype event/mob_summoned + 主世界 + 非 InControl
   └─▶ 层 F LostSouls 建筑        ← 建筑尸潮：只随机乘攻击 0.5–1.0
   └─▶ 层 G 原版难度系数          ← 只在「打向玩家」时乘伤害
   └─▶ 面板/实伤
```

## 2. 各层一览

| 层 | 触发条件 | 作用对象 | 血 | 甲 | 攻 | 出处 |
|---|---|---|---|---|---|---|
| 0 | 永远 | 全部 | ×1 | ×1 | ×1 | `kubejs/startup_scripts/entity/attribute.js`（130 实体） |
| **A** 区域批 | 主世界 + `incity` + 区域标签 + `when: finalize` | **只有** `zombie/husk/drowned` | T2 ×1.25 / T3 ×1.5 / T4 ×2.0 | T3 ×1.25 / T4 ×1.5 | T2 ×1.25 / T3 ×1.5 / T4 ×1.5 | `config/incontrol/spawn.json` |
| A′ 蜘蛛 | 同上（`maxheight`） | `spider` / `cave_spider` | y≤0 ×1.25、y≤-30 ×1.5 | — | 同左 | 同上 |
| **B** 困难区域批 | `difficulty: hard` + `incity` + 区域标签 + `when: onjoin` | 全部 hostile | T1–T4 ×1.25/1.5/1.75/2.0 | ×1.25/1.5/1.75/2.0 | ×1.25/1.25/1.5/1.5 | 同上 |
| **C** 简单批 | `difficulty: easy` | 全部 hostile | ×0.5 | ×0.5 | ×0.5 | 同上 |
| **D** 深渊批 | `deceasedcraft:abyss` + `incity` + hard | 全部 hostile | ×2.0 | ×1.5 | ×1.5 | 同上 |
| **E** 事件批 | hard + `spawntype: event/mob_summoned` + 主世界 + `incontrol: false` | 全部 hostile | ×2.0 | ×1.5 | ×1.5 | 同上 |
| **F** LostSouls | 建筑尸潮（`MOB_SUMMONED`） | 该建筑刷的怪 | ×1.0 | ×1.0 | **×0.5–1.0 随机** | `defaultconfigs/lostsouls-server.toml` |
| **G** 原版难度 | 结算「怪 → 玩家」伤害 | — | — | — | 简单 `min(D,0.5D+1)` / 普通 `D` / 困难 `1.5D` | 原版 |

三处「不生效」的写法容易被误读：

- 建筑 JSON 里的 `healthbonus`（0.75–1.25）**没有调用点**（`MobSettings.getHealthBonus()` 全文无引用），是死配置。
- `sporeconfig.toml` 的 `Global Health/Armor Modifier` 都是 1.0。
- 区域/深渊倍率都要求 `incity: true`；城外、废墟边缘不吃。

## 3. 叠加矩阵（血 / 甲 / 攻）

| 情形 | 吃到 | 僵尸（基础 20/2/2）T4 | 僵尸 T3 | 警察（35/3/3）T4 |
|---|---|---|---|---|
| 野外 · 普通 | 无 | 20/2/2 | 20/2/2 | 35/3/3 |
| 野外 · 困难 | 无（B 要标签） | 20/2/2（面板），打玩家 ×1.5 | 同左 | 同左 |
| 野外 · 简单 | C | 10/1/1 | 10/1/1 | 17.5/1.5/1.5 |
| 城里 · 普通 | A（仅僵尸） | 40/3/3 | 30/2.5/3 | 35/3/3 |
| 城里 · 困难 | A + B | **80/6/4.5** | 52.5/4.38/4.5 | 70/6/4.5 |
| 城里 · 简单 | A + C | 20/1.5/1.5 | 15/1.25/1.5 | 17.5/1.5/1.5 |
| 天数尸潮 · 困难（城区） | B + E | **80/6/4.5** | 70/5.25/4.5 | 140/9/6.75 |
| 建筑尸潮 · 困难（城区） | B + E + F | 80/6/**2.25–4.5** | 70/5.25/**2.25–4.5** | 140/9/**3.375–6.75** |
| 深渊 · 困难 | D | 40/3/3 | 40/3/3 | 70/4.5/4.5 |
| 深渊 · 困难 · 尸潮（**未实现，推算**） | D + E | 80/4.5/4.5 | 80/4.5/4.5 | 140/6.75/6.75 |

（加粗处是「体感明显变强」的档位。表格数值取自 `public/data/monsters-difficulty.js`。）

## 4. 七个坑

1. **尸潮不吃 A（区域 `finalize` 批）**：T3 尸潮僵尸 70 = 1.75×2，而不是 1.5×1.75×2 = 105。
   城里僵尸 80（2.0×2.0）与 T4 尸潮僵尸 80（2.0×2.0）**数值相同只是巧合**，路径不同。
2. **LostSouls 不加血也不加甲**，只随机削攻击到 0.5–1.0；建筑定义里的 `healthbonus` 是死的。
3. **深渊没有区域标签**（唯一群系 `deceasedcraft:undiscovered`），所以 A、B 都不生效，只剩 D。
4. **原版难度只改「打向玩家」的伤害**，怪物面板的 HP/甲/攻不变；简单难度的 ×0.5 是 InControl 加的（层 C）。
5. **事件批写了 `dimension: minecraft:overworld` 和 `incontrol: false`**：深渊拿不到，InControl 自己刷的怪也不吃。
6. **天数尸潮只换阵容不改数值**（`hordeSpawnMultiplier = 1.0`），变强靠换表 + 层 E。
7. **区域刷怪器只决定「刷什么、刷多少」**，不改数值；`apocalypseMode` 也是名单层（额外放一批怪），不是倍率层。

## 5. 数据与校验

| 产物 | 内容 |
|---|---|
| `public/data/monsters-difficulty.js` | `entities[*].{base, wild, city.T1–T4, horde, abyss}`，每格 `{hp,dmg,armor,toPlayer}` |
| `public/data/horde-buildings.js` | 33 个尸潮建筑的逐建筑清单 + 130 实体刷怪来源分类 |
| `npm run gen:monsters` / `verify:monsters` | 生成 / 13,502 项断言 |
| `npm run gen:hordebuildings` / `verify:hordebuildings` | 生成 / 969 项断言 |
| `docs/monster-difficulty-analysis.md` | 推导、尸潮天数档、§8.5–§8.11 的实测校核 |
| `docs/monster-spawn-tiers.md` | 每只怪的刷怪梯度（T1–T4 / 天数尸潮档 / 建筑 / 自然刷 / 未实装） |
| `npm run gen:spawntiers` / `verify:spawntiers` | 生成 / 460 项断言 |
