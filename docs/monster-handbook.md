# 亡者世界 5.11.19 · 怪物手册

> **单篇版**：属性 → 结算 → 刷怪 → 尸潮 → 深渊/末日，一页说清「这只怪为什么是这个数值」。
> 合并自原 5 篇笔记；其中两篇叙述性文档（scaling-logic / difficulty-analysis）已并入本文并从 `docs/` 移除（git 历史可查），
> 另外三篇是脚本生成的数据表（difficulty-table / spawn-tiers / horde-buildings），仍保留并继续由 `npm run gen:*` 维护。
> 三张纯数据表仍由脚本生成，命令见 §9。
>
> 适用：DeceasedCraft **5.11.19** / Minecraft **1.20.1** Forge。

---

## 0. 速查

| 问题 | 答案 |
|---|---|
| 基础属性有几项 | **5 项**：`max_health` / `attack_damage` / `armor` / `movement_speed` / `follow_range` |
| 最终数值怎么算 | 基础值 × 各层倍率**连乘**（不是取最高档、不是加算） |
| 难度会改血量吗 | **不会**。原版难度只改「怪打你」的伤害 |
| 为什么尸潮僵尸比城里弱 | 尸潮只吃 `onjoin` 批，**不吃**区域 `finalize` 批 |
| 一只僵尸最硬多少 | 80 血 / 6 甲 / 4.5 攻（城区 T4 困难），打裸装玩家 6.75 |
| 尸潮多久一次 | 每 **15 天**，黄昏起，约 **100 只**，同屏上限 150 |
| 数据能复算吗 | 能，`npm run gen:* / verify:*`，三张表共 **14,931** 项断言 |

---

## 1. 数据链

```
kubejs/startup_scripts/entity/attribute.js        基础属性（130 实体 × 594 条写入）
config/incontrol/spawn.json                       区域/难度/事件/深渊倍率（finalize + onjoin 两批）
config/incontrol/spawner.json                     50 条区域刷怪规则（只决定「刷什么」，不改数值）
config/hordes/data/hordes/horde_data/{tables,scripts}   天数尸潮 38 张表
DCTweaks jar: data/deceasedcraft/lostsouls/buildings/<区域>/<建筑>.json   建筑尸潮 23 份定义 / 33 建筑
        │
        ├─▶ public/data/monsters-difficulty.js     每实体 {base, wild, city.T1–T4, horde, abyss}
        ├─▶ public/data/monster-spawn-tiers.js     每实体刷怪梯度
        └─▶ public/data/horde-buildings.js         逐建筑尸潮清单
        │
        └─▶ docs/{monster-difficulty-table,monster-spawn-tiers,horde-buildings}.md（生成物，勿手改）
```

---

## 2. 基础属性（层 0，全难度同一套）

只有 5 项属性被 KubeJS 改写：`max_health`、`attack_damage`、`armor`、`movement_speed`，以及 74/130 个实体的 `follow_range`。

### 2.1 分布（133 个实体口径）

| 指标 | 最小 | p25 | 中位 | p75 | p90 | 最大 |
|---|---:|---:|---:|---:|---:|---:|
| 生命 | 15 | 60 | **120** | 250 | 600 | **6000** |
| 攻击 | 0 | 6 | **15** | 20 | 30 | **52** |
| 护甲 | 0 | 8 | **24** | 38 | 54 | **100** |
| 移速 | 0.05 | — | — | — | — | 3.8（狂疫者） |

> 移速 `0.23` ≈ 玩家步行速度；`follow_range` 覆盖 12–160。
> **9 个实体攻击力为 0**（纯辅助/召唤/自爆定位，如 `spore:vigil`、`spore:braurei`、`necroanimalict:zlama`）。

### 2.2 顶层梯队

| 维度 | 实 体 |
|---|---|
| 血最高 | `spore:howitzer` 6000 · `spore:kraken` 5000 · `spore:hindenburg` / `spore:hohlfresser` / `deaceased:great_visage` 各 4000 |
| 甲最高 | `spore:hohlfresser` / `spore:sieger` / `spore:ogre` **100** · `spore:howitzer` / `spore:gazenbreacher` 85 |
| 攻最高 | `spore:gazenbreacher` / `spore:sieger` **52** · `spore:howitzer` / `spore:hindenburg` 42 |

### 2.3 基线怪（全部换算的锚点）

| 实体 | 血 | 攻 | 甲 | 移速 | 跟随 |
|---|---:|---:|---:|---:|---:|
| `minecraft:zombie` 僵尸 | 20 | 2 | 2 | 0.23 | 26 |
| `minecraft:husk` 尸壳 | 20 | 3 | 2 | 0.23 | 35 |
| `minecraft:drowned` 溺尸 | 20 | 3 | 2 | 0.23 | 35 |
| `zombie_extreme:infected_police` 被感染的警察 | 35 | 3 | 3 | 0.22 | 26 |
| `minecraft:spider` 蜘蛛 | 36 | 4 | 4 | 0.30 | 0.02 |
| `minecraft:cave_spider` 洞穴蜘蛛 | 28 | 3 | 2 | 0.30 | 16 |

> 完整 133 实体表见 **附录 A**；机读版是 `public/data/monsters-difficulty.js` 的 `entities[*].base`。

---

## 3. 结算公式

### 3.1 主链

```
面板血 = 血_基础 × ∏(A_hp, B_hp, C_hp, D_hp, E_hp)
面板甲 = 甲_基础 × ∏(A_armor, B_armor, C_armor, D_armor, E_armor)
面板攻 = 攻_基础 × ∏(A_dmg … E_dmg) × F_随机(0.5–1.0)

打向玩家 = 面板攻 × G(难度)
         ├ 简单: min(D, 0.5D + 1)
         ├ 普通: D
         └ 困难: 1.5 × D
```

**为什么是连乘**：InControl 血量类动作的字节码是
`v = attribute.getBaseValue() * factor; setBaseValue(v); setHealth(v)`
—— 乘的是**基础上限**，同一次刷怪多匹配一条规则就继续叠乘。而 `finalize`（A 批）与 `onjoin`（B/C/D/E 批）是**两次独立遍历**，所以城里困难下的怪会**两批都吃**。

### 3.2 各层倍率

| 层 | 触发条件 | 作用对象 | 血 | 甲 | 攻 |
|---|---|---|---|---|---|
| **0** | 永远 | 全部 130 | ×1 | ×1 | ×1 |
| **A** 区域批 `finalize` | 主世界 + `incity` + 区域标签 | **只** `zombie`/`husk`/`drowned` | T2 ×1.25 / T3 ×1.5 / T4 ×2.0 | T3 ×1.25 / T4 ×1.5 | T2 ×1.25 / T3 ×1.5 / T4 ×1.5 |
| **A′** 蜘蛛批 `finalize` | 同上（`maxheight`） | `spider`/`cave_spider` | y≤0 ×1.25、y≤−30 ×1.5 | — | 同血 |
| **B** 困难区域批 `onjoin` | `hard` + `incity` + 标签 | 全部 `hostile` | ×1.25 / 1.5 / 1.75 / 2.0（T1→T4） | ×1.25 / 1.5 / 1.75 / 2.0 | ×1.25 / 1.25 / 1.5 / 1.5 |
| **C** 简单批 `onjoin` | `easy` | 全部 `hostile` | ×0.5 | ×0.5 | ×0.5 |
| **D** 深渊批 `onjoin` | `deceasedcraft:abyss` + `incity` + `hard` | 全部 `hostile` | ×2.0 | ×1.5 | ×1.5 |
| **E** 事件批 `onjoin` | `hard` + `event`/`mob_summoned` + 主世界 + 非 InControl | 全部 `hostile` | ×2.0 | ×1.5 | ×1.5 |
| **F** LostSouls | 建筑尸潮 | 该建筑刷的怪 | ×1 | ×1 | **×0.5–1.0 随机** |
| **G** 原版难度 | 结算「怪 → 玩家」 | — | — | — | 见 3.1 |

区域标签（`DCTweaks` 的 biome tag → 站点阶级）：

| 阶级 | 区域 | 生物群系标签 |
|---|---|---|
| T1 | 郊区住宅区 | `deceasedcraft:suburb_residential` |
| T2 | 摩天办公区 / 摩天住宅区 | `highrise_office` / `highrise_residential` |
| T3 | 摩天酒店区 / 零售商业区 | `highrise_hotel` / `retail_district` |
| T4 | 荒地 | `wasteland` |

### 3.3 两个可自行验算的算例

**僵尸 · 城区 T4 · 困难（A + B 两批）**
```
血 = 20 × 2.0(A) × 2.0(B) = 80
甲 =  2 × 1.5(A) × 2.0(B) = 6
攻 =  2 × 1.5(A) × 1.5(B) = 4.5        →  打向玩家 = 4.5 × 1.5 = 6.75
```

**僵尸 · 城区 T3 · 困难尸潮（B + E，A 不生效）**
```
血 = 20 × 1.75(B) × 2.0(E) = 70        ← 不是 1.5×1.75×2 = 105
甲 =  2 × 1.75(B) × 1.5(E) = 5.25
攻 =  2 × 1.5(B)  × 1.5(E) = 4.5       →  6.75
```

> T4 城区普通僵尸和 T4 城区尸潮僵尸**都是 80 血**，但路径不同：城里是 `A×B`，尸潮是 `B×E`。T3 就分开了（城里 52.5、尸潮 70）。

### 3.4 三个口径别混

| 口径 | 含义 | 举例 |
|---|---|---|
| **面板** | 实体属性值（血/甲/攻） | 80 / 6 / 4.5 |
| **打向玩家** | 面板攻 × 原版难度系数，**不含玩家护甲** | 6.75 |
| **实际承伤** | 再过玩家的护甲/韧性/附魔 | 满配约 1.35 |

实际承伤用的是原版 1.9+ 护甲公式（文档不覆盖，此处补全）：

```
承伤 = D × (1 − min(20, max(护甲/5, 护甲 − 4D/(韧性+8))) / 25)
```

减伤上限 **80%**；高单发伤害时第二项生效，所以**韧性专治大伤害**。
例：80 甲 + 8 韧承 6.75 → `max(16, 80−1.69) = 78.3` → 触顶 → 实收 **1.35**。

---

## 4. 场景矩阵（四只常见怪）

格式：`血 / 攻 / 甲 → 打向玩家`

| 场景 | 僵尸 | 尸壳 · 溺尸 | 蜘蛛 |
|---|---|---|---|
| 野外 · 简单 | 10/1/1 → 1 | 10/1.5/1 → 1.5 | 18/2/2 → 2 |
| 野外 · 普通 | 20/2/2 → 2 | 20/3/2 → 3 | 36/4/4 → 4 |
| 野外 · 困难 | 20/2/2 → 3 | 20/3/2 → 4.5 | 36/4/4 → 6 |
| T1 城 · 普通 | 20/2/2 → 2 | 20/3/2 → 3 | 36/4/4 → 4 |
| T2 城 · 普通 | 25/2.5/2 → 2.5 | 25/3.75/2 → 3.75 | 36/4/4 → 4 |
| T3 城 · 普通 | 30/3/2.5 → 3 | 30/4.5/2.5 → 4.5 | 36/4/4 → 4 |
| T4 城 · 普通 | 40/3/3 → 3 | 40/4.5/3 → 4.5 | 36/4/4 → 4 |
| T1 城 · 困难 | 25/2.5/2.5 → 3.75 | 25/3.75/2.5 → 5.63 | 45/5/5 → 7.5 |
| T4 城 · 困难 | **80/4.5/6 → 6.75** | **80/6.75/6 → 10.13** | 72/6/8 → 9 |
| 尸潮 · 野外 · 困难 | 40/3/3 → 4.5 | 40/4.5/3 → 6.75 | 72/6/6 → 9 |
| 尸潮 · 城区 T4 · 困难 | 80/4.5/6 → 6.75 | 80/6.75/6 → 10.13 | **144/9/12 → 13.5** |
| 洞穴 y≤0 / y≤−30 | — | — | 45/5/4 → 5 · 54/6/4 → 6 |

---

## 5. 刷怪梯度

**两个来源别混**：

| 层 | 谁在刷 | 分区域？ |
|---|---|---|
| ① 区域刷怪器 | `incontrol/spawner.json` 50 条规则，按 `biometags` + `incity` + 高度/光照/室内外匹配 | **是**，每区专属名单 |
| ② 模组自带自然刷 | 各 jar 的 `forge:add_spawns`（66 条，全是 `forge:any`） | **否**，任何群系 |

速率口径：`persecond` = 每秒触发该规则的概率（触发后 `attempts` 次找点，成功刷 `amount` 只，未写则 1 只）；`maxlocal` = 附近同类上限。

### 5.1 总览

| 阶级 | 区域 | 敌人种类 | 刷怪强度 | 该区独有 |
|---|---|---:|---:|---|
| T1 | 郊区住宅区 | 6 | 0.35/秒 | `crawler`、`zig`、`zheep` |
| T2 | 摩天办公 / 摩天住宅 | 11 | 0.55 / 0.50 每秒 | — |
| T3 | 酒店 / 零售 | 18 | 0.65 / 0.60 每秒 | `the_moonflower`、`theswarmer`、`clicker`、`zlama`、`theskeeper`、`thespitter`、`boomer`、`zorse` |
| T4 | 荒地 | 15（+19 动物/中立） | 0.53/秒 | `infected_hazmat`、`inflated`、`therabidus`、`thedigger`、`guardian`、`bigsucker`、`theface`、`great_visage`、`zolf`、`zear`、`scarred_zear`、`boneman` |

### 5.2 每级名单（压缩）

- **T1**：`crawler` · `zig` · `zheep` · `infected_police` · `thesmoker` · NPC `Rogue`
- **T2**：`infected_police` · `thesmoker` · `bomber` · `theordure` · `therod` · `thehunter` · 办公线 `zat`/`zoat` · 住宅线 `zhick`/`zow` · NPC `Bandit`
- **T3**：`bomber` · `the_moonflower` · `theordure` · `therod` · `theskeeper` · `thespitter` · `theswarmer` · `boomer` · `clicker` · `infected_military` · `thehunter` · `zat`/`zhick`/`zlama`/`zoat`/`zorse`/`zow` · NPC `Raider`
- **T4**：`guardian` · `thedigger` · `therabidus` · `infected_hazmat` · `infected_military` · `inflated` · `boneman` · `scarred_zear` · `zear` · `zolf` · `theface` · `bigsucker` · `great_visage` · NPC `Plunderer` / `Soldier` · 19 种 naturalist/quark 动物与 NPC

> 逐怪逐档的完整矩阵（含每秒概率、天数尸潮档、建筑归属）见 `docs/monster-spawn-tiers.md`。

### 5.3 装填状态

| 分类 | 数量 | 说明 |
|---|---:|---|
| 正常刷新 | **70** | 其中 69 只在城市刷怪器里；`undead_revamp2:sucker` 只靠模组自然刷 |
| 仅尸潮 | **0** | 不存在「只在尸潮出现」的怪 |
| 未实装 | **60** | 48 只 `spore:*`（真菌模组，社区视为未上线的 T5）+ `deaceased` 部件/变体 + `hordes:*` 玩家变体 |

---

## 6. 尸潮

### 6.1 天数值尸潮参数

| 参数 | 值 |
|---|---|
| 周期 | 每 **15 天**，首次第 15 天（`spawnFirstDay=false`），黄昏 `12000` tick 开始 |
| 规模 | 每次 **20 只**，持续 10000 tick / 每 2000 tick 一次 → **≈5 × 20 = 100 只** |
| 上限 | 同屏 150；`hordeSpawnMultiplier = 1.0`（**波次不随场次变大**） |
| 变强方式 | **换表**，不堆倍率：表号 = 该档起始世界天数 |
| 其它 | 尸潮期间不能睡觉；多人同区 `hordeMultiplayerScaling = 1.25` |

### 6.2 选表（首个匹配生效）

| 玩家天数 | 表 | 普通档主力 | 困难档主力 |
|---|---|---|---|
| 0–28 | 15 | 僵尸 + 警察 | 僵尸 + 警察 + 喘鸣体 + 循猎魔 |
| 29–43 | 30 | + 喘鸣体 | 同上换序 |
| 44–58 | 45 | + 脓爆尸 / 循猎魔 | 循猎魔 + 月光花 + 撞针体 |
| 59–103 | 60 / 75 / 90 | 僵尸家族 + 吸蚀怪 + 月光花/孕胎者 | 循猎魔 + 月光花 15 权 |
| 104–148 | 105 / 120 / 135 | + 流光花 / 膨肿怪 | + 养蛊人 / 养蜂人 / 流光花 |
| 149–208 | 150 / 165 / 180 | 感染军人接管主力 | + 巨吸蚀怪 / 掘地怪 |
| 209–343 | 210 / 255 / 300 | 感染军人 + 腐豕 / 零号病人 / 鼠王 | 流光花 15 权 + 夜猎者 / 重装兵 |
| 344–∞ | 345 / 405 / 480 / 525 / 600 / 800 | 感染军人 + 沉重斗尸 | 流光花 + 巨脸怪，末期（表 800）叠到 11 种 |

> 完整 17 档（普通/简单）+ 21 档（困难）的逐怪权重与期望只数见 `docs/monster-difficulty-table.md` §3。

### 6.3 期望只数怎么算

单波 20 只：① 按 `min_spawns` 保底 → ② 剩余名额按 `weight` 分配 → ③ 单种不超 `max_spawns`（0 = 不限），超出名额**回流再分**。
例：普通第 15 天 = 僵尸 30 权 + 警察 5 权 → 警察 3 只、僵尸 17 只。

### 6.4 建筑尸潮（LostSouls）

建筑里固定盘踞一波怪，清完才能搜刮。数据源 `DCTweaks`：`lostsouls/buildings/<区域>/<建筑>.json`，**23 份定义 / 33 个建筑**。

| 字段 | 含义 |
|---|---|
| `mobamounts{min,max}` | 整波规模（10–15 到 80–100 不等） |
| `mobs[{name,weight}]` | 出怪池与权重 |
| `spawnmaxinbuilding` | 同屏上限（多数 20，居民地堡 25） |
| `hauntedchance` | 闹鬼概率，本包全为 `1.0` |
| `healthbonus` | 写了 0.75–1.25，但 **4.1.7 无调用点，不生效** |

**数值口径**：血/甲与天数尸潮同口径（建筑不再加血加甲）；攻击额外 × `[0.5, 1.0]` 随机（`lostsouls-server.toml` 的 `min/maxDamageBonus`）。
刷怪类型是 `MOB_SUMMONED`，所以困难下事件批 ×2 同样命中。

| 阶级 | 建筑（规模） | 出怪池 |
|---|---|---|
| T1 | 派出所（10–15）· 社区中心（20–30）· 综合诊所（10–15） | 僵尸主 + 警察 / 喘鸣体 |
| T2 | 残破的医院（30–40）· 环球影艺塔（40–50）· 警察局（15–20）· 警察宿舍（30–40）· 绿洲公寓（40–50）· 木混结构塔楼（25–30）· 汽车车间（25–30）· 首座（30–40）· 庭院式办公区（40–50）· 小型独立公寓（18–20）· 一贯制学校（40–50）· 针叶客栈（30–40）· 中型独立公寓（18–20） | 僵尸 10 权 + 警察 / 脓爆尸 / 撞针体（部分 + 循猎魔 / 流光花 / 孕胎者） |
| T3 | 便利店（40–50）· 赌场（60–70）· 寰鼎环阁酒店（50–60）· 露台购物中心（60–70）· 美术馆（50–60）· 枪店（40–50）· 医院（40–50）· 渊沉俱乐部（50–60） | 僵尸 + 感染军人 + 月光花/喷吐者 + 循声者/循猎魔/爆炸者 + 孕胎者/伏从魔 |
| T4 | 废弃机库（50–60）· 工人宿舍（30–40）· 核电站（80–90）· 居民地堡（**0–0**）· 军事基地（60–70）· 军用电台营地（30–40）· 石油钻机作业区（30–40）· C-07实验室（80–100）· C-X联合军事中心（60–70） | 僵尸 + 膨肿怪 + 掘地怪 / 零号病人 / 鼠王 / 防化员 / 重装兵 / 夜猎者 / 无面者 / 腐豕 / 开膛尸 / 撞击者 / 幽灵体 / 沉重斗尸 |

> `居民地堡` 的 `mobamounts` 是 `0–0`（配置缺陷，期望刷出 0 只）。
> 逐建筑逐怪的困难血量/甲/攻击区间见 `docs/horde-buildings.md`。

### 6.5 两条实测修正（已并入生成器）

| 结论 | 证据 |
|---|---|
| **尸潮只吃 `onjoin` 批** | T3 尸潮僵尸 70 血 = 20×1.75×2；若两批都跑应是 105。T4 尸潮沉重斗尸 2800/120 = 700×4 / 40×3 |
| **建筑 `healthbonus` 是死配置** | 反编译 `lostsouls`：`boostEntity` 只读 toml 全局 `min/maxHealthBonus`（本包 1.0）与 `min/maxDamageBonus`（0.5–1.0）；`MobSettings.getHealthBonus()` 全文无引用 |

还有一处易混：T3 实测「月光花 700 血 / 36 甲」其实是 **`thegliter` 流光花**（200×3.5 = 700、14×2.625 = 36.75），不是 `the_moonflower`（50 血）。

---

## 7. 深渊与末日

### 7.1 深渊维度 `deceasedcraft:abyss`

只有一条专属倍率：**血 ×2 / 甲 ×1.5 / 攻 ×1.5**（`dimension: abyss` + `incity` + `hard`）。
区域标签全是主世界群系，深渊的 `undiscovered` 一个都匹配不上，所以 **A / B 都不生效**，只剩 D。

**深渊没有尸潮**（两条独立证据）：
- 天数尸潮：`HordeEventHandler` 里 `if (dimension != OVERWORLD) return;`
- 建筑尸潮：LostSouls 的 23 份定义只覆盖主世界六个子区，深渊回落默认 `hauntedChance = 0.0`

**能刷的怪**：6 只菌染怪（`inf_human`/`inf_hazmat`/`inf_husk`/`inf_player`/`bairn`/`chemist`，0.15/秒）+ 仍会自然刷的原版僵尸/尸壳/溺尸。`undead_revamp2`/`zombie_extreme`/`necroanimalict` 的非 InControl 刷怪在深渊被显式 deny。

**BOSS 数值示例**（基础 → 深渊困难 → 若叠尸潮的推算）：

| 实体 | 基础 | 深渊 · 困难 | 深渊 · 困难 · 尸潮（推算 ×4/×2.25/×2.25） |
|---|---|---|---|
| `spore:howitzer` 菌械重炮 | 6000 / 85 / 42 | 12000 / 127.5 / 63 | 24000 / 191.25 / 94.5 → 打 141.75 |
| `spore:kraken` 沉渊魔 | 5000 / 70 / 40 | 10000 / 105 / 60 | 20000 / 157.5 / 90 |
| `spore:hohlfresser` 噬袭魔 | 4000 / 100 / 40 | 8000 / 150 / 60 | 16000 / 225 / 90 |

> 深渊尸潮**尚未实现**：就算 `/hordes` 强开，事件批写了 `dimension: overworld` 也命中不了。

### 7.2 末日模式（`apocalypseMode`）

```mcfunction
/apocalypseMode enable|disable|status
```

只作用于 `minecraft:zombie`（`EntityEvents.spawned`）：

| 效果 | 概率 | 细节 |
|---|---:|---|
| 挖掘型 | 10% | `time_to_break_multiplier = 2.0` |
| 手持武器 | 10% | 按群系：办公/住宅 → `#forge:repair/iron`；酒店/商业 → `steel`；荒地 → `netherite_scrap` |
| 成套护甲 | 10% | 办公=建筑工/警察/骑警，住宅=消防/橄榄球/将军，酒店商业=UN/防化/防暴，荒地=S.W.A.T/拆弹/重装/生化 |
| 末影珍珠 | 5% | 仅高层/商业/荒地 |
| 掉落 | — | 武器/护甲 2.5%，末影珍珠 0% |

**末日是「名单层」不是「倍率层」**：它加怪、加装备，不改血/甲/攻。

---

## 8. 十一个坑

1. **困难不改血/甲**，只改「打你」的伤害；面板差异全部来自 InControl 的 A/B/C 批。
2. **尸潮不吃 A 批**（区域 `finalize`）→ T3 尸潮僵尸 70，而不是 105。
3. **T4 城里僵尸 = T4 尸潮僵尸 = 80 血**，纯属两条路径都 ×4 的巧合，别当成同一机制。
4. **LostSouls 的 `healthbonus` 是死配置**；建筑尸潮真正改的是**攻击**（×0.5–1.0）。
5. **深渊没有区域标签** → A/B 都不生效，只有 D 的 ×2/×1.5/×1.5。
6. **深渊没有尸潮**，事件批的 `dimension: overworld` 挡住了；同一批规则还写了 `incontrol: false`，所以 InControl 自己刷的怪也不吃这一批。
7. **末日模式不是难度倍率**，是额外放怪 + 加装备的名单层。
8. **区域刷怪器只决定「刷什么、刷多少」**，不改数值。
9. **`sporeconfig.toml` 的 Global Health/Armor Modifier 都是 1.0**，不会再加一层。
10. **`hordeSpawnMultiplier = 1.0`**：尸潮规模不随场次增长，变强只靠换表 + 事件批 ×2。
11. **`undead_revamp2:night_hunter` 是坏数据**：`attribute.js` 没覆盖、模组 jar 里也没这个实体类；真正的夜猎者是 `zombie_extreme:night_hunter`（140/14/20）。

---

## 9. 数据产物与校验

| 产物 | 内容 | 命令 / 断言 |
|---|---|---|
| `public/data/monsters-difficulty.js` | `entities[*].{base, wild, city.T1–T4, horde, abyss}` + `rules` / `districts` / `horde` / `abyssSpawns` | `npm run gen:monsters` / `verify:monsters`（**13,502**） |
| `docs/monster-difficulty-table.md` | 抽样场景表 + 深渊 + 尸潮天数档 | 同上（生成物） |
| `public/data/monster-spawn-tiers.js` | 每实体刷怪梯度（153 条） | `gen:spawntiers` / `verify:spawntiers`（**460**） |
| `docs/monster-spawn-tiers.md` | 逐怪梯度矩阵 + 每 T 级名单 | 同上（生成物） |
| `public/data/horde-buildings.js` | 33 建筑逐建筑清单 + 130 实体来源分类 | `gen:hordebuildings` / `verify:hordebuildings`（**969**） |
| `docs/horde-buildings.md` | 逐建筑困难血量表 | 同上（生成物） |

**证据来源**：jar 下载链、反编译片段与 `attr-audit` 统计**不进仓库**（留在 `.cache/`，gitignore）。复核某个数字的路径：重下对应模组 jar → 跑 `npm run gen:*`；每个数字取自哪个文件的哪一段，写在 `scripts/gen-monster-difficulty.ts` 与 `scripts/gen-monster-spawn-tiers.ts` 顶部的注释里。

**已知数据问题**（均未修）：

| 问题 | 影响 |
|---|---|
| `undead_revamp2:night_hunter` 的 `base` 全为 `null` | 直接读 `entities[id].base.hp` 的 UI 会抛错 |
| 站内 8 条尸潮怪物 `entityId` 拼错（少下划线），5 个找不到实体 | 那 8 条数值全是「待补充」 |
| 52 个怪物数值无整合包出处（模组默认值，未标来源） | 与包内数据不可比 |
| `居民地堡` 的 `mobamounts = 0–0` | 该建筑尸潮期望 0 只 |
| husk / drowned 不在 `attribute.js`（`baseSource: vanilla`） | 这 2 条用原版基础值补进附录 A，计入 133 |

---

## 附录 A · 133 实体基础数值

> 来源 `attribute.js`（husk/drowned 为原版基础值）。`简单 / 困难` 两列是按原版公式换算的**对玩家**伤害，未计玩家护甲。 最后一行 `undead_revamp2:night_hunter` 没有基础属性（见坑 11），用 `—` 占位。

| 实体 id | 名称 | 生命 | 攻击 | 简单 | 困难 | 护甲 | 移速 | 跟随 | 刷怪 | 来源 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| `spore:howitzer` | 菌械重炮 | 6000 | 42 | 22 | 63 | 85 | 0.2 | — | 未实装 | spore |
| `spore:kraken` | 沉渊魔 | 5000 | 40 | 21 | 60 | 70 | 0.2 | — | 未实装 | spore |
| `deaceased:great_visage` | 狰狞巨脸（巨面） | 4000 | 35 | 18.5 | 52.5 | 60 | 0.3 | 160 | 正常 | deaceased |
| `spore:hindenburg` | 菌械空堡 | 4000 | 42 | 22 | 63 | 60 | 0.2 | — | 未实装 | spore |
| `spore:hohlfresser` | 噬袭魔 | 4000 | 40 | 21 | 60 | 100 | 0.2 | — | 未实装 | spore |
| `spore:gazenbreacher` | 凝袭魔 | 3400 | 52 | 27 | 78 | 85 | 0.2 | — | 未实装 | spore |
| `spore:sieger` | 强袭魔 | 3000 | 52 | 27 | 78 | 100 | 0.2 | — | 未实装 | spore |
| `spore:stahl` | 钢戮魔 | 3000 | 30 | 16 | 45 | 40 | 0.3 | — | 未实装 | spore |
| `spore:proto` | 雏型蜂巢思维 | 1000 | 30 | 16 | 45 | 60 | 0.7 | — | 未实装 | spore |
| `undead_revamp2:clogger` | 腐豕 | 900 | 25 | 13.5 | 37.5 | 40 | 0.3 | 96 | 正常 | undead_revamp2 |
| `zombie_extreme:rat_king` | 鼠王 | 800 | 35 | 18.5 | 52.5 | 30 | 0.2 | 96 | 正常 | zombie_extreme |
| `undead_revamp2:theheavy` | 沉重斗尸 | 700 | 30 | 16 | 45 | 40 | 0.3 | 96 | 正常 | undead_revamp2 |
| `zombie_extreme:zero_patient` | 零号病人 | 700 | 25 | 13.5 | 37.5 | 40 | 0.3 | 96 | 正常 | zombie_extreme |
| `spore:howit_arm` | howit_arm | 625 | 30 | 16 | 45 | 50 | 0.7 | — | 未实装 | spore |
| `spore:ogre` | 食人魔 | 600 | 32 | 17 | 48 | 100 | 0.2 | — | 未实装 | spore |
| `zombie_extreme:demolisher` | 粉碎者 | 600 | 20 | 11 | 30 | 50 | 0.2 | 96 | 正常 | zombie_extreme |
| `deaceased:flayedmanhead` | 剥皮怪 | 500 | 18 | 10 | 27 | 50 | 0.1 | 96 | 正常 | deaceased |
| `spore:hevoker` | 邪菌术士 | 500 | 22 | 12 | 33 | 80 | 0.2 | — | 未实装 | spore |
| `spore:hvindicator` | 铁斧投手 | 500 | 28 | 15 | 42 | 70 | 0.2 | — | 未实装 | spore |
| `spore:inquisitor` | 审判者 | 500 | 32 | 17 | 48 | 70 | 0.3 | — | 未实装 | spore |
| `undead_revamp2:thelurker` | 伏从魔 | 420 | 14 | 8 | 21 | 12 | 0.4 | 24 | 正常 | undead_revamp2 |
| `spore:brot` | 长舌魔 | 400 | 22 | 12 | 33 | 80 | 0.3 | — | 未实装 | spore |
| `deaceased:theface` | 巨脸怪（巨面） | 360 | 16 | 9 | 24 | 16 | 0.2 | 64 | 正常 | deaceased |
| `spore:braurei` | 酿毒体 | 360 | 0 | 0 | 0 | 34 | 0.7 | — | 未实装 | spore |
| `undead_revamp2:thepregnant` | 孕胎者 | 340 | 12 | 7 | 18 | 10 | 0.2 | 64 | 正常 | undead_revamp2 |
| `spore:umarmed` | 拥孢体 | 320 | 25 | 13.5 | 37.5 | 36 | 0.7 | — | 未实装 | spore |
| `naturalist:elephant` | elephant | 300 | 24 | 13 | 36 | 6 | 0.2 | 16 | 正常 | naturalist |
| `spore:usurper` | 僭主体 | 300 | 0 | 0 | 0 | 34 | 0.7 | — | 未实装 | spore |
| `spore:wendigo` | 林中鹿菌 | 300 | 38 | 20 | 57 | 80 | 0.3 | — | 未实装 | spore |
| `zombie_extreme:ram` | 撞击者 | 300 | 16 | 9 | 24 | 24 | 0.2 | 64 | 正常 | zombie_extreme |
| `necroanimalict:scarred_zear` | 血痕僵尸熊 | 280 | 20 | 11 | 30 | 40 | 0.3 | 64 | 正常 | necroanimalict |
| `undead_revamp2:bigsucker` | 巨吸蚀怪 | 280 | 14 | 8 | 21 | 30 | 0.1 | 128 | 正常 | undead_revamp2 |
| `deaceased:flayedmansections` | flayedmansections | 250 | 18 | 10 | 27 | 20 | 0.1 | 96 | 未实装 | deaceased |
| `deaceased:flayedmantail` | flayedmantail | 250 | 18 | 10 | 27 | 20 | 0.1 | 96 | 未实装 | deaceased |
| `necroanimalict:zear` | 僵尸熊 | 220 | 16 | 9 | 24 | 30 | 0.2 | 64 | 正常 | necroanimalict |
| `spore:brute` | 蛮兽 | 220 | 25 | 13.5 | 37.5 | 54 | 0.2 | — | 未实装 | spore |
| `spore:gastgaber` | 菌主 | 220 | 21 | 11.5 | 31.5 | 34 | 0.2 | — | 未实装 | spore |
| `spore:specter` | 幽灵 | 220 | 27 | 14.5 | 40.5 | 44 | 0.4 | — | 未实装 | spore |
| `naturalist:bear` | bear | 200 | 16 | 9 | 24 | 10 | 0.3 | 32 | 正常 | naturalist |
| `naturalist:rhino` | rhino | 200 | 18 | 10 | 27 | 20 | 0.2 | 16 | 正常 | naturalist |
| `spore:vigil` | 哨戒体 | 200 | 0 | 0 | 0 | 34 | 0.7 | — | 未实装 | spore |
| `spore:volatile` | 巫猎饕 | 200 | 23 | 12.5 | 34.5 | 40 | 0.2 | — | 未实装 | spore |
| `undead_revamp2:lechery` | 嗜欲者 | 200 | 12 | 7 | 18 | 8 | 0.4 | 48 | 未实装 | undead_revamp2 |
| `undead_revamp2:thegliter` | 流光花 | 200 | 12 | 7 | 18 | 14 | 0.3 | 128 | 正常 | undead_revamp2 |
| `deaceased:guardian` | 守卫者 | 180 | 12 | 7 | 18 | 20 | 0.3 | 32 | 正常 | deaceased |
| `necroanimalict:boneman` | Bone Man | 180 | 14 | 8 | 21 | 20 | 0.3 | 64 | 正常 | necroanimalict |
| `spore:leaper` | 激跃者 | 180 | 20 | 11 | 30 | 38 | 0.2 | — | 未实装 | spore |
| `spore:stalker` | 追迹者 | 180 | 23 | 12.5 | 34.5 | 40 | 0.2 | — | 未实装 | spore |
| `zombie_extreme:fetus` | 胎儿 | 180 | 16 | 9 | 24 | 24 | 0.3 | 64 | 正常 | zombie_extreme |
| `zombie_extreme:infected_juggernaut` | 被感染的重装兵 | 180 | 18 | 10 | 27 | 24 | 0.3 | 64 | 正常 | zombie_extreme |
| `naturalist:lion` | lion | 160 | 18 | 10 | 27 | 6 | 0.2 | 32 | 正常 | naturalist |
| `spore:delusioner` | 妄念体 | 160 | 0 | 0 | 0 | 24 | 0.7 | — | 未实装 | spore |
| `spore:howler` | 咆哮者 | 160 | 21 | 11.5 | 31.5 | 38 | 0.2 | — | 未实装 | spore |
| `spore:nuclea` | 纳克拉维 | 160 | 20 | 11 | 30 | 38 | 0.2 | — | 未实装 | spore |
| `spore:griefer` | 侵袭者 | 155 | 22 | 12 | 33 | 40 | 0.2 | — | 未实装 | spore |
| `zombie_extreme:divided` | 开膛尸 | 150 | 14 | 8 | 21 | 18 | 0.2 | 64 | 正常 | zombie_extreme |
| `spore:jagd` | 潜猎兽 | 140 | 20 | 11 | 30 | 34 | 0.4 | — | 未实装 | spore |
| `spore:protector` | 守护者 | 140 | 20 | 11 | 30 | 50 | 0.2 | — | 未实装 | spore |
| `zombie_extreme:faceless` | 无面者 | 140 | 16 | 9 | 24 | 20 | 0.2 | 64 | 正常 | zombie_extreme |
| `zombie_extreme:goon` | 暴徒 | 140 | 16 | 9 | 24 | 20 | 0.2 | 64 | 正常 | zombie_extreme |
| `zombie_extreme:night_hunter` | 夜猎者 | 140 | 14 | 8 | 21 | 20 | 0.3 | 64 | 正常 | zombie_extreme |
| `zombie_extreme:revived` | 复生者 | 140 | 14 | 8 | 21 | 20 | 0.3 | 64 | 正常 | zombie_extreme |
| `spore:biobloob` | 菌染憎恶 | 120 | 20 | 11 | 30 | 36 | 0.2 | — | 未实装 | spore |
| `spore:bloater` | 深潜者 | 120 | 18 | 10 | 27 | 44 | 0.2 | — | 未实装 | spore |
| `spore:busser` | 邪灵 | 120 | 18 | 10 | 27 | 34 | 0.2 | — | 未实装 | spore |
| `spore:lacerator` | 撕裂者 | 120 | 20 | 11 | 30 | 36 | 0.3 | — | 未实装 | spore |
| `spore:naiad` | 塞壬 | 120 | 18 | 10 | 27 | 30 | 0.2 | — | 未实装 | spore |
| `spore:reconstructor` | 灾厄重构体 | 120 | 0 | 0 | 0 | 30 | 0.7 | — | 未实装 | spore |
| `spore:scavenger` | 食腐鹫 | 120 | 19 | 10.5 | 28.5 | 34 | 0.2 | — | 未实装 | spore |
| `spore:thorn` | 荆刺者 | 120 | 19 | 10.5 | 28.5 | 44 | 0.2 | — | 未实装 | spore |
| `undead_revamp2:thespectre` | 幽灵体 | 120 | 13 | 7.5 | 19.5 | 8 | 0.3 | 64 | 正常 | undead_revamp2 |
| `spore:braiomil` | 舔舐者 | 110 | 17 | 9.5 | 25.5 | 36 | 0.2 | — | 未实装 | spore |
| `spore:chemist` | 药剂师 | 110 | 15 | 8.5 | 22.5 | 26 | 0.2 | — | 正常 | spore |
| `spore:knight` | 菌骑士 | 110 | 18 | 10 | 27 | 38 | 0.2 | — | 未实装 | spore |
| `spore:mephitic` | 恶涎者 | 110 | 13 | 7.5 | 19.5 | 28 | 0.2 | — | 未实装 | spore |
| `spore:plagued` | 疫病者 | 110 | 18 | 10 | 27 | 38 | 0.3 | — | 未实装 | spore |
| `spore:spitter` | 喷吐者 | 110 | 15 | 8.5 | 22.5 | 34 | 0.2 | — | 未实装 | spore |
| `deaceased:thedigger` | 掘地怪 | 100 | 14 | 8 | 21 | 14 | 0.2 | 64 | 正常 | deaceased |
| `naturalist:alligator` | alligator | 100 | 8 | 5 | 12 | 6 | 0.2 | 16 | 正常 | naturalist |
| `spore:scamper` | 窜扰者 | 100 | 22 | 12 | 33 | 32 | 0.2 | — | 未实装 | spore |
| `spore:slasher` | 杀戮者 | 100 | 23 | 12.5 | 34.5 | 34 | 0.2 | — | 未实装 | spore |
| `spore:verva` | 保育体 | 100 | 0 | 0 | 0 | 24 | 0.7 | — | 未实装 | spore |
| `zombie_extreme:infected_hazmat` | 被感染的防化员 | 100 | 12 | 7 | 18 | 16 | 0.2 | 48 | 正常 | zombie_extreme |
| `spore:inf_hazmat` | 菌染研究员 | 90 | 16 | 9 | 24 | 34 | 0.2 | — | 正常 | spore |
| `spore:inf_human` | 菌染人类 | 90 | 16 | 9 | 24 | 30 | 0.2 | — | 正常 | spore |
| `spore:inf_husk` | 菌染尸壳 | 90 | 16 | 9 | 24 | 32 | 0.2 | — | 正常 | spore |
| `zombie_extreme:explosive_infected` | 爆炸感染者 | 90 | 14 | 8 | 21 | 14 | 0.2 | 64 | 正常 | zombie_extreme |
| `deaceased:bugger` | 浮游虫 | 80 | 8 | 5 | 12 | 10 | 0.1 | 32 | 未实装 | deaceased |
| `necroanimalict:zlama` | 僵尸羊驼 | 80 | 0 | 0 | 0 | 12 | 0.3 | 64 | 正常 | necroanimalict |
| `spore:inebriater` | 酗酒者 | 80 | 18 | 10 | 27 | 34 | 0.2 | — | 未实装 | spore |
| `zombie_extreme:infected_military` | 感染军人 | 80 | 10 | 6 | 15 | 12 | 0.3 | 48 | 正常 | zombie_extreme |
| `zombie_extreme:inflated` | 膨肿怪 | 80 | 9 | 5.5 | 13.5 | 14 | 0.2 | 48 | 正常 | zombie_extreme |
| `deaceased:reeler` | 卷轮怪 | 70 | 6 | 4 | 9 | 14 | 0.3 | 64 | 未实装 | deaceased |
| `deaceased:visage_pod` | visage_pod | 70 | 0 | 0 | 0 | 20 | 0.3 | — | 未实装 | deaceased |
| `spore:bairn` | 菌染幼体 | 70 | 12 | 7 | 18 | 20 | 0.2 | — | 正常 | spore |
| `undead_revamp2:therabidus` | 狂疫者 | 70 | 12 | 7 | 18 | 12 | 3.8 | 32 | 正常 | undead_revamp2 |
| `zombie_extreme:boomer` | 爆炸者 | 70 | 9 | 5.5 | 13.5 | 12 | 0.2 | 48 | 正常 | zombie_extreme |
| `necroanimalict:zorse` | 僵尸马 | 60 | 8 | 5 | 12 | 16 | 0.4 | 64 | 正常 | necroanimalict |
| `spore:saugling` | 畸尾婴 | 60 | 15 | 8.5 | 22.5 | 24 | 0.3 | — | 未实装 | spore |
| `zombie_extreme:clicker` | 循声者 | 60 | 10 | 6 | 15 | 8 | 0.2 | 48 | 正常 | zombie_extreme |
| `necroanimalict:zolphin` | 僵尸海豚 | 50 | 6 | 4 | 9 | 8 | 1.8 | 64 | 正常 | necroanimalict |
| `undead_revamp2:the_moonflower` | 月光花 | 50 | 8 | 5 | 12 | 6 | 0.3 | 128 | 正常 | undead_revamp2 |
| `undead_revamp2:theskeeper` | 养蛊人 | 50 | 10 | 6 | 15 | 6 | 0.3 | 32 | 正常 | undead_revamp2 |
| `undead_revamp2:thespitter` | 喷吐者 | 50 | 9 | 5.5 | 13.5 | 6 | 0.3 | 32 | 正常 | undead_revamp2 |
| `undead_revamp2:theswarmer` | 养蜂人 | 50 | 10 | 6 | 15 | 6 | 0.3 | 32 | 正常 | undead_revamp2 |
| `deaceased:tougueentity` | tougueentity | 40 | 5 | 3.5 | 7.5 | 6 | 0.4 | 32 | 未实装 | deaceased |
| `naturalist:boar` | boar | 40 | 4 | 3 | 6 | 2 | 0.2 | 16 | 正常 | naturalist |
| `necroanimalict:zolf` | 僵尸狼 | 40 | 4 | 3 | 6 | 10 | 0.3 | 64 | 正常 | necroanimalict |
| `necroanimalict:zow` | 僵尸牛 | 40 | 6 | 4 | 9 | 12 | 0.2 | 64 | 正常 | necroanimalict |
| `undead_revamp2:bomber` | 脓爆尸 | 40 | 3 | 2.5 | 4.5 | 4 | 0.2 | 26 | 正常 | undead_revamp2 |
| `undead_revamp2:sucker` | 吸蚀怪 | 40 | 9 | 5.5 | 13.5 | 6 | 0.4 | 96 | 正常 | undead_revamp2 |
| `undead_revamp2:thehunter` | 循猎魔 | 40 | 5 | 3.5 | 7.5 | 4 | 0.3 | 96 | 正常 | undead_revamp2 |
| `undead_revamp2:theordure` | 烟秽 | 40 | 0 | 0 | 0 | 4 | 0.3 | 12 | 正常 | undead_revamp2 |
| `undead_revamp2:therod` | 撞针体 | 40 | 5 | 3.5 | 7.5 | 4 | 0.2 | 32 | 正常 | undead_revamp2 |
| `minecraft:spider` | 蜘蛛 | 36 | 4 | 3 | 6 | 4 | 0.3 | 0 | 正常 | minecraft |
| `necroanimalict:zig` | 僵尸猪 | 35 | 4 | 3 | 6 | 2 | 0.3 | 64 | 正常 | necroanimalict |
| `necroanimalict:zoat` | 僵尸山羊 | 35 | 5 | 3.5 | 7.5 | 8 | 0.2 | 64 | 正常 | necroanimalict |
| `zombie_extreme:infected_police` | 被感染的警察 | 35 | 3 | 2.5 | 4.5 | 3 | 0.2 | 26 | 正常 | zombie_extreme |
| `necroanimalict:zat` | 僵尸猫 | 30 | 3 | 2.5 | 4.5 | 2 | 0.3 | 64 | 正常 | necroanimalict |
| `necroanimalict:zhick` | 僵尸鸡 | 30 | 5 | 3.5 | 7.5 | 4 | 0.3 | 64 | 正常 | necroanimalict |
| `minecraft:cave_spider` | cave_spider | 28 | 3 | 2.5 | 4.5 | 2 | 0.3 | 16 | 正常 | minecraft |
| `undead_revamp2:thesmoker` | 喘鸣体 | 25 | 3 | 2.5 | 4.5 | 3 | 0.2 | 26 | 正常 | undead_revamp2 |
| `deaceased:boulder` | 巨石怪 | 20 | 18 | 10 | 27 | 12 | 0.2 | — | 未实装 | deaceased |
| `hordes:drowned_player` | drowned_player | 20 | 2 | 2 | 3 | 0 | 0.1 | 32 | 未实装 | hordes |
| `hordes:husk_player` | husk_player | 20 | 2 | 2 | 3 | 0 | 0.1 | 32 | 未实装 | hordes |
| `hordes:zombie_player` | zombie_player | 20 | 2 | 2 | 3 | 0 | 0.1 | 32 | 未实装 | hordes |
| `minecraft:drowned` | 溺尸 | 20 | 3 | 2.5 | 4.5 | 2 | 0.2 | 35 | 原版 | minecraft |
| `minecraft:husk` | 尸壳 | 20 | 3 | 2.5 | 4.5 | 2 | 0.2 | 35 | 原版 | minecraft |
| `minecraft:zombie` | 僵尸 | 20 | 2 | 2 | 3 | 2 | 0.2 | 26 | 正常 | minecraft |
| `undead_revamp2:thebidy` | 疱伏尸 | 20 | 1 | 1 | 1.5 | 0 | 0.2 | 32 | 正常 | undead_revamp2 |
| `zombie_extreme:crawler` | 爬行尸 | 20 | 3 | 2.5 | 4.5 | 3 | 0.2 | 20 | 正常 | zombie_extreme |
| `necroanimalict:zheep` | 僵尸绵羊 | 15 | 4 | 3 | 6 | 25 | 0.4 | 64 | 正常 | necroanimalict |
| `undead_revamp2:night_hunter` | night_hunter | — | — | — | — | — | — | — | 未实装 | undead_revamp2 |

---

## 附录 B · 口径速查（公式卡片）

```
# 面板
HP   = base_hp   × Π(层倍率)
ARMOR= base_armor× Π(层倍率)
ATK  = base_atk  × Π(层倍率) × F(0.5–1.0，仅建筑尸潮)

# 打向玩家（不含玩家护甲）
D_easy   = min(ATK, 0.5×ATK + 1)
D_normal = ATK
D_hard   = 1.5 × ATK

# 实际承伤（原版护甲公式，文档口径之外）
taken = D × (1 − min(20, max(A/5, A − 4D/(T+8))) / 25)   # A=护甲, T=韧性，上限 80%
```
