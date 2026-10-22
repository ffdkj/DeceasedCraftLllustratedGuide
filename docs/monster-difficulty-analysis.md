# 怪物难度数据核查报告

**整合包**：DeceasedCraft 5.11.19（TaCZ / Hordes 1.6.3f / Apocalypse Now / Zombie Extreme / Undead Revamp 2 / Spore 等）
**核查对象**：站内 167 个怪物条目 + 整合包 `attribute.js` 的 130 个实体 + 尸潮 38 张生成表
**结论口径**：数值一律以整合包文件为准；站内数据与之不一致之处逐条列出。

> 速查版（五层倍率 + 叠加矩阵 + 七个坑）：见 `docs/monster-scaling-logic.md`。

## 0. 一句话结论

1. **原版难度只改伤害**，不改血量、护甲、移速、跟随距离：普通 `D` → 简单 `min(D, 0.5D+1)` → 困难 `1.5D`（对玩家生效；怪物打怪物恒为普通伤害）。
2. **尸潮是唯一按「难度 + 天数」换阵容的机制**：普通/简单共用 17 张 normal 表（18 条选表脚本，第 0–13 天与 14–28 天共用首表），困难 21 张（多出第 480/525/600/800 天四档）；每 15 天一波、每波 20 只、每场 5 波、同屏上限 150 只。
3. **末日模式不改数值**，是 `/apocalypseMode enable` 开关：僵尸 10% 变挖掘型、10% 持械（按生物群系分铁/钢/下界合金）、10% 穿成套护甲、5% 拿末影珍珠。
4. **站内数据与包内一致**：130 个有属性覆盖的实体中，站内收录 115 个，**数值 0 处偏差**；另有 52 个怪物在包内没有属性覆盖（数值来源无法从整合包核实），8 个尸潮怪物 `entityId` 写错（少了下划线）。

## 1. 数据来源（都可复查）

| 用途 | 文件 | 说明 |
|---|---|---|
| 怪物基础数值 | `DeceasedCraft5.11.19/overrides/kubejs/startup_scripts/entity/attribute.js` | 130 个 `event.modify()`，写死 `max_health / attack_damage / armor / movement_speed / follow_range` |
| 难度伤害公式 | [Minecraft Wiki · Difficulty](https://minecraft.wiki/w/Difficulty) | 「若普通难度造成 D，则困难 1.5D、简单 min(D, 0.5D+1)」 |
| 尸潮生成表 | `overrides/config/hordes/data/hordes/horde_data/tables/{normal,hard}/mobs_*.json` | normal 17 张 + hard 21 张 |
| 尸潮选表逻辑 | `…/horde_data/scripts/{normal,hard}/wave_*.json` | `hordes:player_day` + `hordes:game_difficulty` 条件 |
| 尸潮参数 | `overrides/config/hordes-common.toml` | 波次、间隔、上限、触发天数 |
| 末日模式 | `…/kubejs/server_scripts/functions/apocalypse_difficulty.js` | `apocalypseMode` 持久化开关 + 僵尸装备注入 |
| 站内怪物条目 | `public/data/guides.js`（`WZ_GUIDES.monsters`） | 167 条，含 `hp / attack / armor / damage / entityId` |

## 2. 难度机制总表

| 维度 | 和平 | 简单 | 普通 | 困难 | 末日（叠在任意难度上） |
|---|---|---|---|---|---|
| 敌对生成 | 无 | 有 | 有 | 有，更密集 | 同当前难度 |
| 怪物对玩家伤害 | — | `min(D, 0.5D+1)` | `D` | `1.5D` | 同当前难度 |
| 血量 / 护甲 / 移速 / 跟随 | 不变 | 不变 | 不变 | 不变 | 不变 |
| 区域难度（clamped） | 0 | 0 | 0–1 | ≥0.125–1 | 同当前难度 |
| 装备/附魔概率、僵尸增援、破门 | — | 低 | 中 | 高 | — |
| 尸潮 | 不触发 | **normal 表** | **normal 表** | **hard 表** | 同当前难度 |
| 僵尸挖掘/持械/穿甲 | — | — | — | — | 10% / 10% / 10%（另 5% 末影珍珠） |

要点：**血量与护甲不随难度变化**，所以「困难难度下这只怪有多少血」和普通完全一样，变化的只有它打你一下掉多少。

## 3. 130 个实体的基础数值

来源 `attribute.js`，全难度同一套。`伤害(简单/困难)` 是按原版公式换算的**对玩家**伤害（保留一位小数）。

| 实体 id | 名称 | 生命 | 伤害(普通) | 伤害(简单) | 伤害(困难) | 护甲 | 移速 | 跟随 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `spore:howitzer` | 菌械重炮 | 6000 | 42 | 22 | 63 | 85 | 0.2 | — |
| `spore:kraken` | 沉渊魔 | 5000 | 40 | 21 | 60 | 70 | 0.2 | — |
| `spore:hindenburg` | 菌械空堡 | 4000 | 42 | 22 | 63 | 60 | 0.2 | — |
| `spore:hohlfresser` | 噬袭魔 | 4000 | 40 | 21 | 60 | 100 | 0.23 | — |
| `deaceased:great_visage` | 狰狞巨脸（巨面） | 4000 | 35 | 18.5 | 52.5 | 60 | 0.25 | 160 |
| `spore:gazenbreacher` | 凝袭魔 | 3400 | 52 | 27 | 78 | 85 | 0.2 | — |
| `spore:sieger` | 强袭魔 | 3000 | 52 | 27 | 78 | 100 | 0.2 | — |
| `spore:stahl` | 钢戮魔 | 3000 | 30 | 16 | 45 | 40 | 0.3 | — |
| `spore:proto` | 雏型蜂巢思维 | 1000 | 30 | 16 | 45 | 60 | 0.7 | — |
| `undead_revamp2:clogger` | 腐豕 | 900 | 25 | 13.5 | 37.5 | 40 | 0.3 | 96 |
| `zombie_extreme:rat_king` | 鼠王 | 800 | 35 | 18.5 | 52.5 | 30 | 0.2 | 96 |
| `undead_revamp2:theheavy` | 沉重斗尸 | 700 | 30 | 16 | 45 | 40 | 0.32 | 96 |
| `zombie_extreme:zero_patient` | 零号病人 | 700 | 25 | 13.5 | 37.5 | 40 | 0.3 | 96 |
| `spore:howit_arm` | — | 625 | 30 | 16 | 45 | 50 | 0.7 | — |
| `spore:ogre` | 食人魔 | 600 | 32 | 17 | 48 | 100 | 0.2 | — |
| `zombie_extreme:demolisher` | 粉碎者 | 600 | 20 | 11 | 30 | 50 | 0.2 | 96 |
| `spore:inquisitor` | 审判者 | 500 | 32 | 17 | 48 | 70 | 0.3 | — |
| `spore:hvindicator` | 铁斧投手 | 500 | 28 | 15 | 42 | 70 | 0.2 | — |
| `spore:hevoker` | 邪菌术士 | 500 | 22 | 12 | 33 | 80 | 0.2 | — |
| `deaceased:flayedmanhead` | 剥皮怪 | 500 | 18 | 10 | 27 | 50 | 0.1 | 96 |
| `undead_revamp2:thelurker` | 伏从魔 | 420 | 14 | 8 | 21 | 12 | 0.35 | 24 |
| `spore:brot` | 长舌魔 | 400 | 22 | 12 | 33 | 80 | 0.3 | — |
| `deaceased:theface` | 巨脸怪（巨面） | 360 | 16 | 9 | 24 | 16 | 0.22 | 64 |
| `spore:braurei` | 酿毒体 | 360 | 0 | 0 | 0 | 34 | 0.7 | — |
| `undead_revamp2:thepregnant` | 孕胎者 | 340 | 12 | 7 | 18 | 10 | 0.2 | 64 |
| `spore:umarmed` | 拥孢体 | 320 | 25 | 13.5 | 37.5 | 36 | 0.7 | — |
| `spore:wendigo` | 林中鹿菌 | 300 | 38 | 20 | 57 | 80 | 0.3 | — |
| `naturalist:elephant` | — | 300 | 24 | 13 | 36 | 6 | 0.2 | 16 |
| `zombie_extreme:ram` | 撞击者 | 300 | 16 | 9 | 24 | 24 | 0.22 | 64 |
| `spore:usurper` | 僭主体 | 300 | 0 | 0 | 0 | 34 | 0.7 | — |
| `necroanimalict:scarred_zear` | 血痕僵尸熊 | 280 | 20 | 11 | 30 | 40 | 0.32 | 64 |
| `undead_revamp2:bigsucker` | 巨吸蚀怪 | 280 | 14 | 8 | 21 | 30 | 0.05 | 128 |
| `deaceased:flayedmansections` | — | 250 | 18 | 10 | 27 | 20 | 0.1 | 96 |
| `deaceased:flayedmantail` | — | 250 | 18 | 10 | 27 | 20 | 0.1 | 96 |
| `spore:specter` | 幽灵 | 220 | 27 | 14.5 | 40.5 | 44 | 0.35 | — |
| `spore:brute` | 蛮兽 | 220 | 25 | 13.5 | 37.5 | 54 | 0.2 | — |
| `spore:gastgaber` | 菌主 | 220 | 21 | 11.5 | 31.5 | 34 | 0.2 | — |
| `necroanimalict:zear` | 僵尸熊 | 220 | 16 | 9 | 24 | 30 | 0.22 | 64 |
| `spore:volatile` | 巫猎饕 | 200 | 23 | 12.5 | 34.5 | 40 | 0.2 | — |
| `naturalist:rhino` | — | 200 | 18 | 10 | 27 | 20 | 0.2 | 16 |
| `naturalist:bear` | — | 200 | 16 | 9 | 24 | 10 | 0.25 | 32 |
| `undead_revamp2:thegliter` | 流光花 | 200 | 12 | 7 | 18 | 14 | 0.3 | 128 |
| `undead_revamp2:lechery` | 嗜欲者 | 200 | 12 | 7 | 18 | 8 | 0.42 | 48 |
| `spore:vigil` | 哨戒体 | 200 | 0 | 0 | 0 | 34 | 0.7 | — |
| `spore:stalker` | 追迹者 | 180 | 23 | 12.5 | 34.5 | 40 | 0.2 | — |
| `spore:leaper` | 激跃者 | 180 | 20 | 11 | 30 | 38 | 0.2 | — |
| `zombie_extreme:infected_juggernaut` | 被感染的重装兵 | 180 | 18 | 10 | 27 | 24 | 0.25 | 64 |
| `zombie_extreme:fetus` | 胎儿 | 180 | 16 | 9 | 24 | 24 | 0.28 | 64 |
| `necroanimalict:boneman` | Bone Man | 180 | 14 | 8 | 21 | 20 | 0.3 | 64 |
| `deaceased:guardian` | 守卫者 | 180 | 12 | 7 | 18 | 20 | 0.3 | 32 |
| `spore:howler` | 咆哮者 | 160 | 21 | 11.5 | 31.5 | 38 | 0.2 | — |
| `spore:nuclea` | 纳克拉维 | 160 | 20 | 11 | 30 | 38 | 0.2 | — |
| `naturalist:lion` | — | 160 | 18 | 10 | 27 | 6 | 0.2 | 32 |
| `spore:delusioner` | 妄念体 | 160 | 0 | 0 | 0 | 24 | 0.7 | — |
| `spore:griefer` | 侵袭者 | 155 | 22 | 12 | 33 | 40 | 0.2 | — |
| `zombie_extreme:divided` | 开膛尸 | 150 | 14 | 8 | 21 | 18 | 0.23 | 64 |
| `spore:protector` | 守护者 | 140 | 20 | 11 | 30 | 50 | 0.2 | — |
| `spore:jagd` | 潜猎兽 | 140 | 20 | 11 | 30 | 34 | 0.35 | — |
| `zombie_extreme:goon` | 暴徒 | 140 | 16 | 9 | 24 | 20 | 0.2 | 64 |
| `zombie_extreme:faceless` | 无面者 | 140 | 16 | 9 | 24 | 20 | 0.2 | 64 |
| `zombie_extreme:revived` | 复生者 | 140 | 14 | 8 | 21 | 20 | 0.3 | 64 |
| `zombie_extreme:night_hunter` | 夜猎者 | 140 | 14 | 8 | 21 | 20 | 0.3 | 64 |
| `spore:lacerator` | 撕裂者 | 120 | 20 | 11 | 30 | 36 | 0.3 | — |
| `spore:biobloob` | 菌染憎恶 | 120 | 20 | 11 | 30 | 36 | 0.2 | — |
| `spore:thorn` | 荆刺者 | 120 | 19 | 10.5 | 28.5 | 44 | 0.2 | — |
| `spore:scavenger` | 食腐鹫 | 120 | 19 | 10.5 | 28.5 | 34 | 0.2 | — |
| `spore:busser` | 邪灵 | 120 | 18 | 10 | 27 | 34 | 0.2 | — |
| `spore:bloater` | 深潜者 | 120 | 18 | 10 | 27 | 44 | 0.2 | — |
| `spore:naiad` | 塞壬 | 120 | 18 | 10 | 27 | 30 | 0.15 | — |
| `undead_revamp2:thespectre` | 幽灵体 | 120 | 13 | 7.5 | 19.5 | 8 | 0.25 | 64 |
| `spore:reconstructor` | 灾厄重构体 | 120 | 0 | 0 | 0 | 30 | 0.7 | — |
| `spore:plagued` | 疫病者 | 110 | 18 | 10 | 27 | 38 | 0.3 | — |
| `spore:knight` | 菌骑士 | 110 | 18 | 10 | 27 | 38 | 0.2 | — |
| `spore:braiomil` | 舔舐者 | 110 | 17 | 9.5 | 25.5 | 36 | 0.2 | — |
| `spore:chemist` | 药剂师 | 110 | 15 | 8.5 | 22.5 | 26 | 0.2 | — |
| `spore:spitter` | 喷吐者 | 110 | 15 | 8.5 | 22.5 | 34 | 0.2 | — |
| `spore:mephitic` | 恶涎者 | 110 | 13 | 7.5 | 19.5 | 28 | 0.2 | — |
| `spore:slasher` | 杀戮者 | 100 | 23 | 12.5 | 34.5 | 34 | 0.22 | — |
| `spore:scamper` | 窜扰者 | 100 | 22 | 12 | 33 | 32 | 0.2 | — |
| `deaceased:thedigger` | 掘地怪 | 100 | 14 | 8 | 21 | 14 | 0.15 | 64 |
| `zombie_extreme:infected_hazmat` | 被感染的防化员 | 100 | 12 | 7 | 18 | 16 | 0.22 | 48 |
| `naturalist:alligator` | — | 100 | 8 | 5 | 12 | 6 | 0.2 | 16 |
| `spore:verva` | 保育体 | 100 | 0 | 0 | 0 | 24 | 0.7 | — |
| `spore:inf_human` | 菌染人类 | 90 | 16 | 9 | 24 | 30 | 0.2 | — |
| `spore:inf_husk` | 菌染尸壳 | 90 | 16 | 9 | 24 | 32 | 0.2 | — |
| `spore:inf_hazmat` | 菌染研究员 | 90 | 16 | 9 | 24 | 34 | 0.2 | — |
| `zombie_extreme:explosive_infected` | 爆炸感染者 | 90 | 14 | 8 | 21 | 14 | 0.24 | 64 |
| `spore:inebriater` | 酗酒者 | 80 | 18 | 10 | 27 | 34 | 0.2 | — |
| `zombie_extreme:infected_military` | 感染军人 | 80 | 10 | 6 | 15 | 12 | 0.25 | 48 |
| `zombie_extreme:inflated` | 膨肿怪 | 80 | 9 | 5.5 | 13.5 | 14 | 0.18 | 48 |
| `deaceased:bugger` | 浮游虫 | 80 | 8 | 5 | 12 | 10 | 0.05 | 32 |
| `necroanimalict:zlama` | 僵尸羊驼 | 80 | 0 | 0 | 0 | 12 | 0.3 | 64 |
| `undead_revamp2:therabidus` | 狂疫者 | 70 | 12 | 7 | 18 | 12 | 3.8 | 32 |
| `spore:bairn` | 菌染幼体 | 70 | 12 | 7 | 18 | 20 | 0.22 | — |
| `zombie_extreme:boomer` | 爆炸者 | 70 | 9 | 5.5 | 13.5 | 12 | 0.2 | 48 |
| `deaceased:reeler` | 卷轮怪 | 70 | 6 | 4 | 9 | 14 | 0.3 | 64 |
| `deaceased:visage_pod` | — | 70 | 0 | 0 | 0 | 20 | 0.3 | — |
| `spore:saugling` | 畸尾婴 | 60 | 15 | 8.5 | 22.5 | 24 | 0.3 | — |
| `zombie_extreme:clicker` | 循声者 | 60 | 10 | 6 | 15 | 8 | 0.24 | 48 |
| `necroanimalict:zorse` | 僵尸马 | 60 | 8 | 5 | 12 | 16 | 0.36 | 64 |
| `undead_revamp2:theskeeper` | 养蛊人 | 50 | 10 | 6 | 15 | 6 | 0.25 | 32 |
| `undead_revamp2:theswarmer` | 养蜂人 | 50 | 10 | 6 | 15 | 6 | 0.25 | 32 |
| `undead_revamp2:thespitter` | 喷吐者 | 50 | 9 | 5.5 | 13.5 | 6 | 0.3 | 32 |
| `undead_revamp2:the_moonflower` | 月光花 | 50 | 8 | 5 | 12 | 6 | 0.3 | 128 |
| `necroanimalict:zolphin` | 僵尸海豚 | 50 | 6 | 4 | 9 | 8 | 1.8 | 64 |
| `undead_revamp2:sucker` | 吸蚀怪 | 40 | 9 | 5.5 | 13.5 | 6 | 0.4 | 96 |
| `necroanimalict:zow` | 僵尸牛 | 40 | 6 | 4 | 9 | 12 | 0.15 | 64 |
| `undead_revamp2:therod` | 撞针体 | 40 | 5 | 3.5 | 7.5 | 4 | 0.2 | 32 |
| `undead_revamp2:thehunter` | 循猎魔 | 40 | 5 | 3.5 | 7.5 | 4 | 0.26 | 96 |
| `deaceased:tougueentity` | — | 40 | 5 | 3.5 | 7.5 | 6 | 0.35 | 32 |
| `necroanimalict:zolf` | 僵尸狼 | 40 | 4 | 3 | 6 | 10 | 0.28 | 64 |
| `naturalist:boar` | — | 40 | 4 | 3 | 6 | 2 | 0.2 | 16 |
| `undead_revamp2:bomber` | 脓爆尸 | 40 | 3 | 2.5 | 4.5 | 4 | 0.2 | 26 |
| `undead_revamp2:theordure` | 烟秽 | 40 | 0 | 0 | 0 | 4 | 0.3 | 12 |
| `minecraft:spider` | 蜘蛛 | 36 | 4 | 3 | 6 | 4 | 0.3 | 0.02 |
| `necroanimalict:zoat` | 僵尸山羊 | 35 | 5 | 3.5 | 7.5 | 8 | 0.2 | 64 |
| `necroanimalict:zig` | 僵尸猪 | 35 | 4 | 3 | 6 | 2 | 0.25 | 64 |
| `zombie_extreme:infected_police` | 被感染的警察 | 35 | 3 | 2.5 | 4.5 | 3 | 0.22 | 26 |
| `necroanimalict:zhick` | 僵尸鸡 | 30 | 5 | 3.5 | 7.5 | 4 | 0.28 | 64 |
| `necroanimalict:zat` | 僵尸猫 | 30 | 3 | 2.5 | 4.5 | 2 | 0.25 | 64 |
| `minecraft:cave_spider` | — | 28 | 3 | 2.5 | 4.5 | 2 | 0.3 | 16 |
| `undead_revamp2:thesmoker` | 喘鸣体 | 25 | 3 | 2.5 | 4.5 | 3 | 0.22 | 26 |
| `deaceased:boulder` | 巨石怪 | 20 | 18 | 10 | 27 | 12 | 0.22 | — |
| `zombie_extreme:crawler` | 爬行尸 | 20 | 3 | 2.5 | 4.5 | 3 | 0.18 | 20 |
| `minecraft:zombie` | 僵尸 | 20 | 2 | 2 | 3 | 2 | 0.23 | 26 |
| `hordes:zombie_player` | — | 20 | 2 | 2 | 3 | 0 | 0.08 | 32 |
| `hordes:drowned_player` | — | 20 | 2 | 2 | 3 | 0 | 0.08 | 32 |
| `hordes:husk_player` | — | 20 | 2 | 2 | 3 | 0 | 0.08 | 32 |
| `undead_revamp2:thebidy` | 疱伏尸 | 20 | 1 | 1 | 1.5 | 0 | 0.15 | 32 |
| `necroanimalict:zheep` | 僵尸绵羊 | 15 | 4 | 3 | 6 | 25 | 0.35 | 64 |

> 说明：`跟随` 为空表示该实体没有覆盖 `follow_range`，用模组默认值。移速是 `movement_speed` 属性原值（0.23 ≈ 玩家步行）。

## 4. 站内 167 个怪物与包内 130 个实体的对齐

| 情况 | 数量 | 说明 |
|---|---:|---|
| 站内有收录 + 包内有属性覆盖 | 115 | 站内 `hp/attack/armor` 与 `attribute.js` **完全一致，0 处偏差** |
| 站内有收录 + 包内**无**属性覆盖 | 52 | 数值来自模组默认值/百科，**无法用整合包核实**（下表） |
| 包内有属性 + 站内未收录 | 15 | `deaceased:flayedman*`、`deaceased:tougueentity`、`deaceased:visage_pod`、`naturalist:*`（动物）、`minecraft:cave_spider`、`hordes:*_player`、`spore:howit_arm` |

### 4.1 没有包内属性覆盖的 52 个怪物

| 实体 id | 名称 | 站内生命 | 站内伤害 | 站内护甲 |
|---|---|---:|---:|---:|
| `zombie_extreme:chainsaw` | 链锯 | 待补充 | 待补充 | 待补充 |
| `zombie_extreme:runner` | 奔跑者 | 待补充 | 待补充 | 待补充 |
| `zombie_extreme:assasin_black_ops` | 黑色行动刺客 | 待补充 | 待补充 | 待补充 |
| `zombie_extreme:military` | 军人 | 待补充 | 待补充 | 待补充 |
| `zombie_extreme:devestated` | 离群怪 | 待补充 | 待补充 | 待补充 |
| `zombie_extreme:parasite` | 寄生虫 | 待补充 | 待补充 | 待补充 |
| `zombie_extreme:infected` | 感染者 | 待补充 | 待补充 | 待补充 |
| `undead_revamp2:invisiblebidy` | 藏匿的疱伏尸 | 待补充 | 待补充 | 待补充 |
| `undead_revamp2:slaveman` | 皇族英灵 | 待补充 | 待补充 | 待补充 |
| `undead_revamp2:thebeartamer` | 极地猛熊 | 待补充 | 待补充 | 待补充 |
| `undead_revamp2:thehorrors` | 怖鬼体 | 待补充 | 待补充 | 待补充 |
| `undead_revamp2:thehorrorsdecoys` | 怖鬼体幻影 | 待补充 | 待补充 | 待补充 |
| `undead_revamp2:thewolf` | 极地恶狼 | 待补充 | 待补充 | 待补充 |
| `undead_revamp2:theimmortal` | 不朽行骸 | 待补充 | 待补充 | 待补充 |
| `undead_revamp2:neocrorines` | 死灵 | 待补充 | 待补充 | 待补充 |
| `undead_revamp2:thedungeon` | 地穴隐士 | 待补充 | 待补充 | 待补充 |
| `undead_revamp2:theposessive` | 占有者 | 待补充 | 待补充 | 待补充 |
| `undead_revamp2:thesomnolence` | 瞌睡蝇 | 待补充 | 待补充 | 待补充 |
| `spore:inf_wanderer` | 菌染流浪商人 | 待补充 | 待补充 | 待补充 |
| `spore:inf_villager` | 菌染村民 | 待补充 | 待补充 | 待补充 |
| `spore:inf_pillager` | 菌染掠夺者 | 待补充 | 待补充 | 待补充 |
| `spore:inf_evoker` | 菌染唤魔者 | 待补充 | 待补充 | 待补充 |
| `spore:inf_drowned` | 菌染溺尸 | 待补充 | 待补充 | 待补充 |
| `spore:inf_player` | 菌染冒险家 | 待补充 | 待补充 | 待补充 |
| `spore:mound` | 菌囊 | 待补充 | 待补充 | 待补充 |
| `spore:licker` | 凝袭魔之舌 | 待补充 | 待补充 | 待补充 |
| `spore:vanguard` | 先兆者 | 待补充 | 待补充 | 待补充 |
| `spore:hivetumor` | 蜂巢肿瘤 | 待补充 | 待补充 | 待补充 |
| `spore:leviathan` | 利维坦 | 待补充 | 待补充 | 待补充 |
| `spore:grober` | 金刚兽 | 待补充 | 待补充 | 待补充 |
| `spore:conductor` | 导电者 | 待补充 | 待补充 | 待补充 |
| `spore:gargoyle` | 石像鬼 | 待补充 | 待补充 | 待补充 |
| `spore:reaper` | 收割者 | 待补充 | 待补充 | 待补充 |
| `spore:inf_diseased_villager` | 菌染僵尸村民 | 待补充 | 待补充 | 待补充 |
| `spore:arena_tendril` | 竞技场触须 | 待补充 | 待补充 | 待补充 |
| `spore:gorgon` | 戈耳工 | 待补充 | 待补充 | 待补充 |
| `deaceased:stunner` | 震光怪 | 待补充 | 待补充 | 待补充 |
| `hordes:zombieplayer` | 僵尸玩家 | 待补充 | 待补充 | 待补充 |
| `hordes:drownedplayer` | 堕落的玩家 | 待补充 | 待补充 | 待补充 |
| `hordes:huskplayer` | 无价值的玩家 | 待补充 | 待补充 | 待补充 |
| `hordes:zombifiedpiglinbrute` | 已感染的猪灵 | 待补充 | 待补充 | 待补充 |
| `hordes:zombiewanderingtrader` | 已感染的商人 | 待补充 | 待补充 | 待补充 |
| `hordes:zombiepillager` | 已感染的掠夺者 | 待补充 | 待补充 | 待补充 |
| `hordes:zombieevoker` | 已感染的唤魔者 | 待补充 | 待补充 | 待补充 |
| `hordes:zombieillusioner` | 已感染的幻术师 | 待补充 | 待补充 | 待补充 |
| `spore:inf_contruct` | 菌染构造体 | 待补充 | 待补充 | 待补充 |
| `spore:inf_vindicator` | 菌染卫道士 | 待补充 | 待补充 | 待补充 |
| `spore:inf_witch` | 菌染女巫 | 待补充 | 待补充 | 待补充 |
| `minecraft:husk` | 尸壳 | 20 | 3 | 2 |
| `minecraft:drowned` | 溺尸 | 20 | 3 | 2 |
| `minecraft:zombie_villager` | 僵尸村民 | 20 | 3 | 2 |
| `minecraft:zombie_horse` | 僵尸马 | 15 | 0 | 0 |

> 这 52 个的站内数值目前**没有整合包出处**：它们靠模组自带默认属性。如果要让站点数值有据可查，需要读模组 jar 的实体默认属性（或标注「模组默认，未核实」）。

### 4.2 站内尸潮条目的 entityId 错误

站内 8 个「尸潮」分类怪物的 id 全部少了下划线，包内真实 id 是：

| 站内 entityId | 包内真实 id | 站内数值 |
|---|---|---|
| `hordes:zombieplayer` | `hordes:zombie_player` | 待补充 |
| `hordes:drownedplayer` | `hordes:drowned_player` | 待补充 |
| `hordes:huskplayer` | `hordes:husk_player` | 待补充 |
| `hordes:zombifiedpiglinbrute` | 未找到对应实体 | 待补充 |
| `hordes:zombiewanderingtrader` | 未找到对应实体 | 待补充 |
| `hordes:zombiepillager` | 未找到对应实体 | 待补充 |
| `hordes:zombieevoker` | 未找到对应实体 | 待补充 |
| `hordes:zombieillusioner` | 未找到对应实体 | 待补充 |

前 3 个的数值可以在 `attribute.js` 里查到（见第 3 节表），后 5 个在整合包数据里没有任何属性覆盖，属于「模组会生成但包内没调数值」。

## 5. 尸潮（Hordes）

### 5.1 机制参数（`hordes-common.toml`）

| 参数 | 值 | 含义 |
|---|---|---|
| `hordeSpawnDays` | 15 | 每 15 天一波，首次在第 15 天（`spawnFirstDay=false`） |
| `hordeSpawnVariation` | 0 | 不随机延迟 |
| `spawnAmount` | 20 | 每次生成 20 只 |
| `hordeSpawnDuration` / `hordeSpawnInterval` | 10000 / 2000 ticks | 一场尸潮持续 10000 tick、每 2000 tick 生成一次 → **约 5 次 × 20 = 100 只** |
| `hordeSpawnMax` | 150 | 同屏上限 |
| `hordeSpawnMultiplier` | 1.0 | 波次规模**不随场次增长**（阵容靠换表变强） |
| `hordeStartTime` | 12000 | 黄昏开始 |
| `canSleepDuringHorde` | false | 尸潮期间不能睡觉 |
| `hordeMultiplayerScaling` | 1.25 | 多人同区域时的规模缩减系数 |
| `hordesCommandOnly` | false | 允许自然触发 |

### 5.2 选表逻辑（`scripts/` 的 `player_day` 条件，首个匹配生效）

脚本数量比表多 1：`wave_0`（`player_day >= 0`）和 `wave_1`（`player_day >= 14`）都指向首表，所以表 15 覆盖第 0–28 天。

| 天数 | 普通 / 简单 | 困难 |
|---|---|---|
| 0–28 | 表 15 | 表 15 |
| 29–43 | 表 30 | 表 30 |
| 44–58 | 表 45 | 表 45 |
| 59–73 | 表 60 | 表 60 |
| 74–88 | 表 75 | 表 75 |
| 89–103 | 表 90 | 表 90 |
| 104–118 | 表 105 | 表 105 |
| 119–133 | 表 120 | 表 120 |
| 134–148 | 表 135 | 表 135 |
| 149–163 | 表 150 | 表 150 |
| 164–178 | 表 165 | 表 165 |
| 179–208 | 表 180 | 表 180 |
| 209–253 | 表 210 | 表 210 |
| 254–298 | 表 255 | 表 255 |
| 299–343 | 表 300 | 表 300 |
| 344–403 | 表 345 | 表 345 |
| ≥404 | 表 405 | 表 405 |
| 479–523 | — | 表 480 |
| 524–598 | — | 表 525 |
| 599–798 | — | 表 600 |
| ≥799 | — | 表 800 |

**「简单」难度直接沿用 normal 表**：`scripts/normal/*.json` 的条件是 `game_difficulty ∈ {easy, normal}`，整合包里没有 `scripts/easy` 或 `tables/easy` 目录，所以简单难度用的是普通表（有出处，不是推测）。

### 5.3 普通 / 简单 尸潮名单

括号内是 `min_spawns–max_spawns`（配置里限制每种怪的单次数量），`≈N只` 是按每波 20 只、先满足 min 再按权重分配算出的**单次期望只数**；一场尸潮 5 次生成，乘 5 即整场期望。

| 天数 | 表 | 名单（权重 / 单波期望只数 / ×5 波） |
|---|---|---|
| 0–28 | 15 | 僵尸 30 ≈17只；被感染的警察 5（1–3） ≈3只 |
| 29–43 | 30 | 僵尸 30 ≈14只；被感染的警察 5（1–3） ≈3只；喘鸣体 5（1–3） ≈3只 |
| 44–58 | 45 | 僵尸 25 ≈11只；脓爆尸 5（1–3） ≈3只；喘鸣体 5（1–3） ≈3只；循猎魔 5（1–3） ≈3只 |
| 59–73 | 60 | 僵尸 25 ≈11只；吸蚀怪 5（1–3） ≈3只；喘鸣体 5（1–3） ≈3只；循猎魔 5（1–3） ≈3只 |
| 74–88 | 75 | 僵尸 25 ≈12只；吸蚀怪 5（1–3） ≈3只；月光花 5（1–3） ≈3只；循猎魔 3（1–2） ≈2只 |
| 89–103 | 90 | 僵尸 25 ≈12只；吸蚀怪 5（1–3） ≈3只；月光花 5（1–3） ≈3只；孕胎者 3（1–2） ≈2只 |
| 104–118 | 105 | 僵尸 25 ≈12只；吸蚀怪 5（1–3） ≈3只；流光花 5（1–3） ≈3只；孕胎者 3（1–2） ≈2只 |
| 119–133 | 120 | 僵尸 25 ≈9.4只；吸蚀怪 5（1–3） ≈2.9只；膨肿怪 5（1–3） ≈2.9只；流光花 5（1–3） ≈2.9只；孕胎者 3（1–2） ≈2只 |
| 134–148 | 135 | 僵尸 25 ≈10.2只；膨肿怪 5（1–3） ≈3只；流光花 5（1–3） ≈3只；孕胎者 3（1–2） ≈2只；巨吸蚀怪 2（1–2） ≈1.8只 |
| 149–163 | 150 | 感染军人 25 ≈9.9只；膨肿怪 5（1–3） ≈3只；流光花 5（1–3） ≈3只；巨吸蚀怪 3（1–3） ≈2.2只；孕胎者 3（1–2） ≈2只 |
| 164–178 | 165 | 感染军人 25 ≈9.4只；膨肿怪 5（1–3） ≈2.9只；暴徒 5（1–3） ≈2.9只；巨吸蚀怪 5（1–3） ≈2.9只；复生者 3（1–2） ≈2只 |
| 179–208 | 180 | 感染军人 25 ≈9.4只；巨吸蚀怪 5（1–3） ≈2.9只；膨肿怪 5（1–3） ≈2.9只；暴徒 5（1–3） ≈2.9只；粉碎者 3（1–2） ≈2只 |
| 209–253 | 210 | 感染军人 25 ≈10只；巨吸蚀怪 5（1–3） ≈3只；膨肿怪 5（1–3） ≈3只；暴徒 5（1–3） ≈3只；零号病人 2（1–1） ≈1只 |
| 254–298 | 255 | 感染军人 25 ≈13只；巨吸蚀怪 5（1–3） ≈3只；膨肿怪 5（1–3） ≈3只；腐豕 2（1–1） ≈1只 |
| 299–343 | 300 | 感染军人 25 ≈11只；巨吸蚀怪 5（1–3） ≈3只；膨肿怪 5（1–3） ≈3只；腐豕 1（1–1） ≈1只；零号病人 1（1–1） ≈1只；鼠王 1（1–1） ≈1只 |
| 344–403 | 345 | 感染军人 25 ≈9.7只；巨吸蚀怪 5（1–3） ≈2.9只；膨肿怪 5（1–3） ≈2.9只；沉重斗尸 1（1–2） ≈1.4只；腐豕 1（1–1） ≈1只；零号病人 1（1–1） ≈1只；鼠王 1（1–1） ≈1只 |
| ≥404 | 405 | 感染军人 25 ≈7.4只；巨吸蚀怪 5（1–3） ≈2.5只；膨肿怪 5（1–3） ≈2.5只；腐豕 3（1–2） ≈1.9只；零号病人 3（1–2） ≈1.9只；鼠王 3（1–2） ≈1.9只；沉重斗尸 3（1–2） ≈1.9只 |

### 5.4 困难 尸潮名单

| 天数 | 表 | 名单（权重 / 单波期望只数 / ×5 波） |
|---|---|---|
| 0–28 | 15 | 僵尸 25 ≈6.9只；被感染的警察 5（3–5） ≈4.4只；喘鸣体 5（3–5） ≈4.4只；循猎魔 5（3–5） ≈4.4只 |
| 29–43 | 30 | 僵尸 25 ≈6.9只；喘鸣体 5（3–5） ≈4.4只；循猎魔 5（3–5） ≈4.4只；脓爆尸 5（3–5） ≈4.4只 |
| 44–58 | 45 | 循猎魔 5（2–∞） ≈4只；月光花 5（2–4） ≈4只；喘鸣体 5（2–4） ≈4只；撞针体 5（2–4） ≈4只；脓爆尸 5（2–4） ≈4只 |
| 59–73 | 60 | 循猎魔 15（2–∞） ≈5.3只；月光花 15（2–∞） ≈5.3只；喘鸣体 5（2–∞） ≈3.1只；撞针体 5（2–∞） ≈3.1只；脓爆尸 5（2–∞） ≈3.1只 |
| 74–88 | 75 | 循猎魔 15（2–∞） ≈5.3只；月光花 15（2–∞） ≈5.3只；喘鸣体 5（2–∞） ≈3.1只；爆炸者 5（2–∞） ≈3.1只；循声者 5（2–∞） ≈3.1只 |
| 89–103 | 90 | 循猎魔 15（2–∞） ≈5.3只；月光花 15（2–∞） ≈5.3只；喘鸣体 5（2–∞） ≈3.1只；养蛊人 5（2–∞） ≈3.1只；养蜂人 5（2–∞） ≈3.1只 |
| 104–118 | 105 | 循猎魔 15（2–∞） ≈5.7只；月光花 15（2–∞） ≈5.7只；养蛊人 5（2–∞） ≈3.2只；养蜂人 5（2–∞） ≈3.2只；孕胎者 5（1–∞） ≈2.2只 |
| 119–133 | 120 | 循猎魔 15（2–∞） ≈5只；月光花 15（2–∞） ≈5只；养蛊人 5（2–∞） ≈3只；养蜂人 5（2–∞） ≈3只；孕胎者 5（1–∞） ≈2只；流光花 5（1–∞） ≈2只 |
| 134–148 | 135 | 循猎魔 15（2–∞） ≈4.7只；月光花 15（2–∞） ≈4.7只；吸蚀怪 10（2–∞） ≈3.8只；养蛊人 5（2–∞） ≈2.9只；孕胎者 5（1–∞） ≈1.9只；流光花 5（1–∞） ≈1.9只 |
| 149–163 | 150 | 循猎魔 15（2–∞） ≈5.7只；流光花 10（2–∞） ≈4.4只；巨吸蚀怪 10（2–∞） ≈4.4只；养蛊人 5（2–∞） ≈3.2只；孕胎者 5（1–∞） ≈2.2只 |
| 164–178 | 165 | 循猎魔 15（2–∞） ≈4.7只；流光花 10（2–∞） ≈3.8只；巨吸蚀怪 10（2–∞） ≈3.8只；感染军人 5（2–∞） ≈2.9只；养蛊人 5（2–∞） ≈2.9只；孕胎者 5（1–∞） ≈1.9只 |
| 179–208 | 180 | 循猎魔 15（2–∞） ≈4.7只；流光花 10（2–∞） ≈3.8只；巨吸蚀怪 10（2–∞） ≈3.8只；感染军人 5（2–∞） ≈2.9只；掘地怪 5（2–∞） ≈2.9只；孕胎者 5（1–∞） ≈1.9只 |
| 209–253 | 210 | 流光花 15（2–∞） ≈6.3只；巨吸蚀怪 10（2–∞） ≈4.9只；感染军人 5（2–∞） ≈3.4只；掘地怪 5（2–∞） ≈3.4只；巨脸怪（巨面） 5（1–2） ≈2只 |
| 254–298 | 255 | 流光花 15（2–∞） ≈5只；巨吸蚀怪 10（2–∞） ≈4只；夜猎者 5（2–∞） ≈3只；被感染的重装兵 5（2–∞） ≈3只；掘地怪 5（2–∞） ≈3只；巨脸怪（巨面） 5（1–3） ≈2只 |
| 299–343 | 300 | 流光花 15（2–∞） ≈4.1只；巨吸蚀怪 10（2–∞） ≈3.4只；夜猎者 5（2–∞） ≈2.7只；被感染的重装兵 5（2–∞） ≈2.7只；幽灵体 5（2–∞） ≈2.7只；掘地怪 5（2–∞） ≈2.7只；巨脸怪（巨面） 5（1–3） ≈1.7只 |
| 344–403 | 345 | 流光花 15（2–∞） ≈3.5只；巨吸蚀怪 10（2–∞） ≈3只；夜猎者 5（2–∞） ≈2.5只；被感染的重装兵 5（2–∞） ≈2.5只；幽灵体 5（2–∞） ≈2.5只；掘地怪 5（2–∞） ≈2.5只；巨脸怪（巨面） 5（1–3） ≈1.5只；粉碎者 3（1–1） ≈1只；零号病人 3（1–1） ≈1只 |
| ≥404 | 405 | 流光花 15（2–∞） ≈3.5只；巨吸蚀怪 10（2–∞） ≈3只；夜猎者 5（2–∞） ≈2.5只；被感染的重装兵 5（2–∞） ≈2.5只；幽灵体 5（2–∞） ≈2.5只；掘地怪 5（2–∞） ≈2.5只；巨脸怪（巨面） 5（1–3） ≈1.5只；腐豕 3（1–1） ≈1只；沉重斗尸 3（1–1） ≈1只 |
| 479–523 | 480 | 流光花 15（2–∞） ≈2.6只；巨吸蚀怪 10（2–∞） ≈2.4只；night_hunter 5（2–∞） ≈2.2只；被感染的重装兵 5（2–∞） ≈2.2只；幽灵体 5（2–∞） ≈2.2只；掘地怪 5（2–∞） ≈2.2只；巨脸怪（巨面） 5（1–3） ≈1.2只；腐豕 3（1–1） ≈1只；沉重斗尸 3（1–1） ≈1只；粉碎者 3（1–1） ≈1只；零号病人 3（1–1） ≈1只；鼠王 3（1–1） ≈1只 |
| 524–598 | 525 | 流光花 15（2–∞） ≈2.3只；巨吸蚀怪 10（2–∞） ≈2.2只；夜猎者 5（2–∞） ≈2.1只；被感染的重装兵 5（2–∞） ≈2.1只；幽灵体 5（2–∞） ≈2.1只；掘地怪 5（2–∞） ≈2.1只；喘鸣体 5（1–∞） ≈1.1只；巨脸怪（巨面） 5（1–3） ≈1.1只；腐豕 3（1–1） ≈1只；沉重斗尸 3（1–1） ≈1只；粉碎者 3（1–1） ≈1只；零号病人 3（1–1） ≈1只；鼠王 3（1–1） ≈1只 |
| 599–798 | 600 | 流光花 15（2–∞） ≈2.2只；巨吸蚀怪 10（2–∞） ≈2.1只；夜猎者 5（2–∞） ≈2.1只；被感染的重装兵 5（2–∞） ≈2.1只；幽灵体 5（2–∞） ≈2.1只；掘地怪 5（2–∞） ≈2.1只；喘鸣体 5（1–∞） ≈1.1只；巨脸怪（巨面） 5（1–3） ≈1.1只；腐豕 3（1–2） ≈1只；沉重斗尸 3（1–2） ≈1只；粉碎者 3（1–2） ≈1只；零号病人 3（1–2） ≈1只；鼠王 3（1–2） ≈1只 |
| ≥799 | 800 | 流光花 15（2–∞） ≈2.9只；巨吸蚀怪 10（2–∞） ≈2.6只；夜猎者 5（2–∞） ≈2.3只；被感染的重装兵 5（2–∞） ≈2.3只；幽灵体 5（2–∞） ≈2.3只；掘地怪 5（2–∞） ≈2.3只；喘鸣体 5（1–∞） ≈1.3只；巨脸怪（巨面） 5（1–3） ≈1.3只；腐豕 5（1–2） ≈1.3只；沉重斗尸 5（1–2） ≈1.3只；狰狞巨脸（巨面） 5（0–1） ≈0.3只 |

### 5.5 尸潮涉及的 31 个实体

| 实体 | 名称 | 普通/简单（首次→末次） | 困难（首次→末次） | 最高占比 | 生命 | 伤害(普通) | 伤害(困难) | 护甲 |
|---|---|---|---|---:|---:|---:|---:|---:|
| `minecraft:zombie` | 僵尸 | 15→135 天 | 15→30 天 | 85.7% | 20 | 2 | 3 | 2 |
| `zombie_extreme:infected_police` | 被感染的警察 | 15→30 天 | 15→15 天 | 14.3% | 35 | 3 | 4.5 | 3 |
| `undead_revamp2:thesmoker` | 喘鸣体 | 30→60 天 | 15→800 天 | 20% | 25 | 3 | 4.5 | 3 |
| `undead_revamp2:bomber` | 脓爆尸 | 45→45 天 | 30→60 天 | 20% | 40 | 3 | 4.5 | 4 |
| `undead_revamp2:thehunter` | 循猎魔 | 45→75 天 | 15→180 天 | 33.3% | 40 | 5 | 7.5 | 4 |
| `undead_revamp2:sucker` | 吸蚀怪 | 60→120 天 | 135→135 天 | 18.2% | 40 | 9 | 13.5 | 6 |
| `undead_revamp2:the_moonflower` | 月光花 | 75→90 天 | 45→135 天 | 33.3% | 50 | 8 | 12 | 6 |
| `undead_revamp2:thepregnant` | 孕胎者 | 90→150 天 | 105→180 天 | 11.1% | 340 | 12 | 18 | 10 |
| `undead_revamp2:thegliter` | 流光花 | 105→150 天 | 120→800 天 | 37.5% | 200 | 12 | 18 | 14 |
| `zombie_extreme:inflated` | 膨肿怪 | 120→405 天 | — | 13.5% | 80 | 9 | 13.5 | 14 |
| `undead_revamp2:bigsucker` | 巨吸蚀怪 | 135→405 天 | 150→800 天 | 25% | 280 | 14 | 21 | 30 |
| `zombie_extreme:infected_military` | 感染军人 | 150→405 天 | 165→210 天 | 67.6% | 80 | 10 | 15 | 12 |
| `zombie_extreme:revived` | 复生者 | 165→165 天 | — | 7% | 140 | 14 | 21 | 20 |
| `zombie_extreme:goon` | 暴徒 | 165→210 天 | — | 11.9% | 140 | 16 | 24 | 20 |
| `zombie_extreme:demolisher` | 粉碎者 | 180→180 天 | 345→600 天 | 7% | 600 | 20 | 30 | 50 |
| `zombie_extreme:zero_patient` | 零号病人 | 210→405 天 | 345→600 天 | 6.4% | 700 | 25 | 37.5 | 40 |
| `undead_revamp2:clogger` | 腐豕 | 255→405 天 | 405→800 天 | 7.1% | 900 | 25 | 37.5 | 40 |
| `zombie_extreme:rat_king` | 鼠王 | 300→405 天 | 480→600 天 | 6.4% | 800 | 35 | 52.5 | 30 |
| `undead_revamp2:theheavy` | 沉重斗尸 | 345→405 天 | 405→800 天 | 7.1% | 700 | 30 | 45 | 40 |
| `undead_revamp2:therod` | 撞针体 | — | 45→60 天 | 20% | 40 | 5 | 7.5 | 4 |
| `zombie_extreme:boomer` | 爆炸者 | — | 75→75 天 | 11.1% | 70 | 9 | 13.5 | 12 |
| `zombie_extreme:clicker` | 循声者 | — | 75→75 天 | 11.1% | 60 | 10 | 15 | 8 |
| `undead_revamp2:theskeeper` | 养蛊人 | — | 90→165 天 | 11.1% | 50 | 10 | 15 | 6 |
| `undead_revamp2:theswarmer` | 养蜂人 | — | 90→120 天 | 11.1% | 50 | 10 | 15 | 6 |
| `deaceased:thedigger` | 掘地怪 | — | 180→800 天 | 12.5% | 100 | 14 | 21 | 14 |
| `deaceased:theface` | 巨脸怪（巨面） | — | 210→800 天 | 12.5% | 360 | 16 | 24 | 16 |
| `zombie_extreme:night_hunter` | 夜猎者 | — | 255→800 天 | 11.1% | 140 | 14 | 21 | 20 |
| `zombie_extreme:infected_juggernaut` | 被感染的重装兵 | — | 255→800 天 | 11.1% | 180 | 18 | 27 | 24 |
| `undead_revamp2:thespectre` | 幽灵体 | — | 300→800 天 | 10% | 120 | 13 | 19.5 | 8 |
| `undead_revamp2:night_hunter` | — | — | 480→480 天 | 7.7% | — | — | 0 | — |
| `deaceased:great_visage` | 狰狞巨脸（巨面） | — | 800→800 天 | 7.1% | 4000 | 35 | 52.5 | 60 |

> 注：`undead_revamp2:night_hunter`（夜猎者）出现在困难后期表中，但 `attribute.js` 没有它的属性，站内也未收录 —— 数值只能取模组默认。

### 5.6 期望只数怎么算的

单次生成 20 只：① 先按 `min_spawns` 保底；② 剩余名额按 `weight` 权重分配；③ 单种怪不超过 `max_spawns`（配置里写 0 表示不限），超出的名额回流再分配。所以像「普通第 15 天」= 僵尸 30 权重 + 被感染的警察 5 权重（1–3 只）→ 警察 3 只、僵尸 17 只。

## 5.7 与难度相关的其它脚本（不在数值表里，但会改变体验）

| 脚本 | 效果 |
|---|---|
| `kubejs/server_scripts/functions/loot_difficulty.js` | **箱子战利品数量随世界难度变化**：简单 ×1.25、困难 ×0.5（普通不变） |
| 同上（spawned 钩子） | 带 `forge:hordes` 标签的怪，**手部与护甲掉落率归零**（尸潮不掉装备） |
| `kubejs/server_scripts/functions/mining_mobs.js` | 19 种怪（Undead Revamp 2、Necroanimalict 系列）获得 `time_to_break_multiplier`（0.5–2.0）；若存在 `extremeMode` 标记则再减半 |
| `…/apocalypse_difficulty.js` | 见第 6 节末日模式 |

## 6. 末日模式（apocalypseMode）

不是原版难度，是整合包自己的开关：

```mcfunction
/apocalypseMode enable    # 开启
/apocalypseMode disable   # 关闭
/apocalypseMode status    # 查看
```

开启后（`EntityEvents.spawned`，只作用于 `minecraft:zombie`）：

| 效果 | 概率 | 细节 |
|---|---:|---|
| 挖掘型僵尸 | 10% | `time_to_break_multiplier = 2.0`（拆方块更快） |
| 手持武器 | 10% | 按生物群系：办公/住宅区 → `#forge:repair/iron`；酒店/商业区 → `#forge:repair/steel`；荒地 → `#forge:repair:netherite_scrap` |
| 穿成套护甲 | 10% | 办公区：建筑工/警察/皇家骑警；住宅区：消防/橄榄球/将军；酒店与商业区：UN/防化/防暴/城区迷彩；荒地：S.W.A.T/拆弹/重装/特种/生化 |
| 手持末影珍珠 | 5% | 仅高层/商业/荒地类生物群系 |
| 掉落率 | — | 武器/护甲 2.5%，末影珍珠 0% |

## 7. 发现的问题

1. **8 个尸潮怪物 `entityId` 写错**（少了下划线，见 4.2），其中 5 个在包内找不到对应实体；且这 8 条的数值全是「待补充」。
2. **52 个怪物的站内数值没有整合包出处**（4.1），属于模组默认值，站内没有标注来源。
3. **站内「末日」难度条目写着「命令待补全」**，实际命令是 `/apocalypseMode enable`（`worldDifficulty.levels[doomsday].command`）。
4. **尸潮完全没上站**：38 张表、31 个实体、天数档位与期望只数都没有展示。
5. 站内 `worldDifficulty` 里「困难约 +50%」的说法是对的（`1.5D`），但「简单」没有给出 `min(D, 0.5D+1)` 的精确口径。

## 8. 如果要上站（建议，未实施）

- 数据层：新增 `public/data/monsters-difficulty.js`，含 `entities[entityId].{hp, dmg, armor, speed, follow}`、`guns` 无关的 `horde: {normal|hard: [{day, range, mobs:[{entity, weight, min, max, expect}]}]}`、`apocalypse` 效果表。可由一段生成脚本从 `attribute.js` + horde 表 + `hordes-common.toml` 复算，保证与包同步。
- UI：怪物详情页加「难度换算」小表（血/护甲不变，伤害三档）；世界难度页补上「尸潮波次」与末日模式命令；尸潮分类的 8 条怪物修 id 并补数值。
- 原则：所有数字都注明来源（`attribute.js` / horde 表 / 换算公式），避免再出现「数值不知哪来的」。

## 8.5 「僵尸在 T1 区域 20 血、T2 区域 30 血」——机制确认：InControl 按区域标签乘算

**结论：机制存在，而且就是按区域梯度的。** 实现者是 **InControl!**（`in-control`，pid 257356，包里是 `incontrol-1.20-9.5.0.jar`），
配置文件 **`config/incontrol/spawn.json`**。它用「区域生物群系标签 + 是否在城市里（`incity`）」匹配刷怪规则，
再用 `healthmultiply` / `damagemultiply` / `armormultiply` 直接改实体属性。

> 上一版报告写「包内不存在该机制」是**检索口径错了**：当时在 438 个配置里搜 `T1`–`T4`、`max_health`，
> 而 InControl 的键是 `healthmultiply`、匹配维度是 `biometags`，两者都不在检索词里。

### 8.5.1 区域标签 → 站点阶级

标签定义在整合包自带模组 `DCTweaks` 的 `data/deceasedcraft/tags/worldgen/biome/*.json`，
阶级对应 `public/data/guides.js` 的 `region → tier`：

| 站点阶级 | 区域 | 生物群系标签 | 标签内包含（示例） |
|---|---|---|---|
| T1 | 郊区住宅区 | `deceasedcraft:suburb_residential` | `biomesoplenty:shrubland` / `grassland` / `overgrown_greens` |
| T2 | 摩天办公区 / 摩天住宅区 | `deceasedcraft:highrise_office` / `highrise_residential` | `minecraft:plains` / `taiga`、`biomesoplenty:prairie` / `maple_woods` |
| T3 | 摩天酒店区 / 零售商业区 | `deceasedcraft:highrise_hotel` / `retail_district` | `biomesoplenty:tropics` / `floodplain`、`minecraft:snowy_plains` |
| T4 | 荒地 | `deceasedcraft:wasteland` | `biomesoplenty:wasteland` |

### 8.5.2 血量/伤害/护甲倍率（`spawn.json` 原文数值）

刷怪规则分两批：`when: finalize`（刷出瞬间）与 `when: onjoin`（实体入世界）。两批**各自独立匹配、独立乘算**。

**A. 普通批（`finalize`，任何难度都生效；只作用于 `zombie` / `husk` / `drowned`，且 `incity: true`）**

| 区域 | HP | 伤害 | 护甲 |
|---|---|---|---|
| T1 郊区住宅区 | ×1（无规则） | ×1 | ×1 |
| T2 摩天办公/住宅 | ×1.25 | ×1.25 | ×1 |
| T3 酒店/零售 | ×1.5 | ×1.5 | ×1.25 |
| T4 荒地 | ×2.0 | ×1.5 | ×1.5 |

**B. 困难批（`onjoin`，`difficulty: hard`，作用于全部 `hostile: true` 怪物，`incity: true`）**

| 区域 | HP | 伤害 | 护甲 |
|---|---|---|---|
| T1 郊区住宅区 | ×1.25 | ×1.25 | ×1.25 |
| T2 摩天办公/住宅 | ×1.5 | ×1.25 | ×1.5 |
| T3 酒店/零售 | ×1.75 | ×1.5 | ×1.75 |
| T4 荒地 | ×2.0 | ×1.5 | ×2.0 |
| 深渊维度（`deceasedcraft:abyss`，城市内） | ×2.0 | ×1.5 | ×1.5 |
| 事件/召唤刷出（`spawntype: event / mob_summoned`，**含困难尸潮**） | ×2.0 | ×1.5 | ×1.5 |

**C. 简单批（`onjoin`，`difficulty: easy`，全部 `hostile: true`）**：HP ×0.5、护甲 ×0.5、伤害 ×0.5。

**D. 洞穴蜘蛛（`finalize`，`spider`/`cave_spider`）**：`maxheight: 0` → HP/伤害 ×1.25；`maxheight: -30` → ×1.5。

### 8.5.3 换算成实际血量（基础 `minecraft:zombie` = 20 血 / 2 伤害 / 2 护甲，来自 `kubejs/startup_scripts/entity/attribute.js`）

| 区域 | 简单 | 普通 | 困难（两批叠乘） |
|---|---:|---:|---:|
| T1 郊区住宅区 | 10 | **20** | 25 |
| T2 摩天办公/住宅 | 12.5 | **25** | 37.5 |
| T3 酒店/零售 | 15 | **30** | 52.5 |
| T4 荒地 | 20 | **40** | 80 |

即普通难度下 20 → 25 → 30 → 40 的血量梯度（按档次每级 +25% / +20% / +33%），
记忆里的「T1 20 血、T2 30 血」对应的是 **T1 20 血、T3 30 血**（T2 是 25）；简单难度把普通值再砍半。

### 8.5.4 代码证据（反编译 `incontrol-1.20-9.5.0.jar`）

| 位置 | 行为 |
|---|---|
| `mcjty/incontrol/ForgeEventHandlers.onEntitySpawnEvent` (FinalizeSpawn) | 取 `SpawnWhen.FINALIZE` 规则表逐条 `match()` → `action()`，`isDoContinue()` 为真才继续下一条 |
| `mcjty/incontrol/ForgeEventHandlers.onEntityJoinWorld` (EntityJoinLevelEvent) | 同上，取 `SpawnWhen.ONJOIN` 规则表；**与 finalize 是两次独立遍历**，所以两批倍率会叠乘 |
| `mcjty/incontrol/tools/rules/RuleBase`（血量类动作的乘算分支，字节码 `lambda$addActions$4`：全类唯一 `getBaseValue()*factor` 的一支） | `v = attributeInstance.getBaseValue() * factor; setBaseValue(v); entity.setHealth(v)` —— 乘的是**基础上限**并把当前血量拉满；因为乘的是 base，同一次刷怪里多匹配一条规则就会继续叠乘 |
| `RuleKeys.ACTION_HEALTHMULTIPLY` 等 | 键名即 `healthmultiply` / `healthadd` / `healthset`、`damagemultiply`、`armormultiply` |

### 8.5.5 两批规则都会跑到（别以为是「二选一」）

`spawn.json` 用两层 `deny` 把自然刷新关掉了：第 1 条按 `phase: after_day1`（`phases.json` 里 `mindaycount 0 / maxdaycount 1`，
即第 0–1 天）把**所有** hostile 的 `natural` / `spawner` / `mob_summoned` 全拒；第 2 条永久拒掉
`creeper/skeleton/spider/witch/pillager/...` 这一串原版怪，第 5 条再永久拒掉 `zombie/husk/drowned` 的自然刷新。
所以城市里的僵尸基本都由 InControl 自己的刷怪器刷出（`config/incontrol/spawner.json`，`persecond`/`attempts`/`biometags` 条件）。
而该刷怪器在 `SpawnerSystem` 里显式调用了 `ForgeEventFactory.onFinalizeSpawn`（常量池证据），
当时以为 `finalize` 批（A）与 `onjoin` 批（B/C）会**先后各跑一次**、倍率相乘。
**实测推翻了这一条**（见 §8.10）：尸潮刷出的怪只吃到 `onjoin` 批，`finalize` 批在尸潮上没生效；
城市里正常刷的怪才两批都吃。§8.5.3 的困难列只适用于「区域刷怪器刷出的怪」。

### 8.5.6 同一份配置里另外两个「按区域变强」的体现

- `config/incontrol/spawner.json`：NPC 盗匪档位按区换 —— T1 `Rogue`、T2 `Bandit`、T3 `Raider`、T4 `Plunderer` + `Soldier`
  （都是 `customnpcs:customnpc` 的克隆体，速率 0.05/秒、1–2 只、`maxlocal` 从 3 收紧到 1），
  说明「区域越深，敌人档次越高」是全局设计，不只是血量（完整名单见 §8.7）。
- 47 座建筑里给僵尸换装（军装/生化/防护服）也是同一套 `multibuilding` 规则做的。

## 8.6 模组侧审计：谁真的会改怪物数据（已下载 21 个 jar 验证）

结论：**415 个模组里只有 InControl 一个具备「按生物群系/区域改血量」的能力**；其余模组就算碰 `MAX_HEALTH`，也只给自己新增的实体写一次基础值。

### 8.6.1 下载链路（可复现）

`manifest.json` 只给 `projectID`+`fileID`，不给文件名；而 ForgeCDN 直链必须是
`https://mediafilez.forgecdn.net/files/{fileID/1000}/{fileID%1000}/{文件名}`。
可行链路是 **CurseForge 的第三方只读 API `api.cfwidget.com`**：

1. `GET https://api.cfwidget.com/{projectID}` → 返回 `files[]`（含 `id` / `name` / `filesize`）；
2. 用 `manifest` 里的 `fileID` 精确命中 `files[]` 的那一条，取 `name`（**不能用 `?version=1.20.1` 的
   `download` 字段，那是「最新一版」，经常是 Fabric 版或更新版本，下错侧**）；
3. 拼 ForgeCDN 直链下载，校验 `filesize`。

脚本落在 `.cache/dl-mods.py`（`python3 .cache/dl-mods.py <projectID...>`）；已下 21 个、约 61 MB。
CurseForge 官网/`api.curseforge.com` 会被 Cloudflare 拦（403 `Just a moment...`），但 **ForgeCDN 本体不拦**。

### 8.6.2 属性写入审计（`unzip` 解包 + class 常量池统计，`.cache/attr-audit.cjs`）

在 srg 名 `f_22276_`(MAX_HEALTH) / `m_21153_`(setHealth) / `m_22100_`(setBaseValue) / `m_22115_`(getBaseValue)，
以及 `healthmultiply|healthadd|healthset|damagemultiply|armormultiply`、`biometags` 上统计命中的**类**数：

| jar（1.20.1 对应版本） | MAX_HEALTH | setHealth | setBaseValue | 倍率键 | biometags | 判定 |
|---|---:|---:|---:|---:|---:|---|
| `incontrol-1.20-9.5.0` | 1 | 1 | 1 | 1 | 1 | **区域缩放实现者** |
| `THEUNDEADREVAMPED_2.1g` | 45 | 4 | 6 | 0 | 0 | 自己实体的血量（`AxestromEntity` 等） |
| `naturalist-5.0pre5+forge` | 24 | 3 | 4 | 0 | 3 | 自己动物的血量 + 自己动物的刷怪群系 |
| `Zombie Extreme 1.20.1 0.2.6.5` | 26 | 0 | 0 | 0 | 0 | 只声明自己实体的血量 |
| `DeceasedBeast0.5c` | 14 | 3 | 3 | 0 | 0 | 同上（`BoulderEntity` 等） |
| `CustomNPCs-Unofficial` | 5 | 12 | 6 | 0 | 0 | NPC 数值来自 NPC 存档数据，不在代码里做区域缩放 |
| `entityjs-forge-0.7.5` | 5 | 0 | 0 | 0 | 0 | 只是给 KubeJS 的 API；包内 107 个脚本没有用它改血量 |
| `ApothicAttributes` / `puffish_attributes` | 0–1 | 0 | 1–2 | 0 | 0 | 玩家/通用属性框架 |
| `AttributeFix` / `MaxHealthFix` | 0–1 | 0–2 | 0 | 0 | 0 | 只放宽属性上限/修正显示 |
| `enhancedai` / `SpawnerControl` / `eh2.0`(Enhanced Hordes) / `expandability` / `horror_element_mod` / `necroanimalict` / `Better Spiders` | 0–13 | 0 | 0–1 | 0 | 0 | 行为/刷怪逻辑，不按区域改数值 |

### 8.6.3 没下的部分

- `Fungal Infection: Spore` 113 MB（超体积阈值）——它只给自己的孢子实体定数值，不缩放原版僵尸。
- 其余约 390 个模组是优化（Embeddium/ModernFix/FerriteCore…）、装饰、载具、配方、UI、音效，与实体数值无关。
- 要全量收口的成本：约 3–4 GB、400+ 次下载；按 8.6.2 同样的口径扫一遍，预期结论不变（没有第二个 `biometags + 倍率键` 的实现者）。

## 8.7 区域刷怪名单：每个区刷的怪确实不一样

**结论：怪物种类确实按区域换，而且分层很清楚 —— 但这一层完全由整合包的 `config/incontrol/spawner.json`（50 条规则）决定，跟模组无关。**

本包的刷怪有两个来源，别混：

| 层 | 谁在刷 | 是否分区域 |
|---|---|---|
| ① 区域刷怪器 | `incontrol/spawner.json` 的 50 条规则，用 `biometags`（区域标签）+ `incity` + 高度/光照/室内外条件匹配 | **是**，区内专属名单见下 |
| ② 模组自带自然刷 | 各模组 jar 里的 `data/<mod>/forge/biome_modifier/*.json`（`forge:add_spawns`） | **否**，66 条全是 `biomes: {type: "forge:any"}` |

速率口径：`persecond` = 每秒触发该规则的概率（触发后 `attempts` 次找点，成功就刷 `amount` 只；
未写 `amount` 时取 InControl 默认值 `minSpawn=1 / maxSpawn=1`，已反编译 `SpawnerRule$Builder` 确认），
`maxlocal` = 附近同类怪上限。

### 8.7.1 强度与种类随区域递增

| 子区 | 敌人种类 | 刷怪强度 | 该子区独有 |
|---|---:|---:|---|
| T1 郊区 | 6 | 0.35/秒（≈21 波/分） | `crawler`、`zig`、`zheep` |
| T2 摩天办公 | 8 | 0.55/秒 | — |
| T2 摩天住宅 | 8 | 0.50/秒 | — |
| T3 酒店 | 11 | 0.65/秒 | `the_moonflower`、`theswarmer`、`clicker`、`zlama` |
| T3 零售 | 11 | 0.60/秒 | `theskeeper`、`thespitter`、`boomer`、`zorse` |
| T4 荒地 | 15（含两种 NPC 克隆） | 0.53/秒 | `infected_hazmat`、`inflated`、`therabidus`、`thedigger`、`guardian`、`bigsucker`、`theface`、`great_visage`、`zolf`、`zear`、`scarred_zear`、`boneman` |

规律：**T1 = 3 种小怪（`crawler`/`zig`/`zheep`）+ 二档的 `infected_police`/`thesmoker` + 低级 NPC `Rogue`；
T2 = 警察/吸烟者/轰炸者/腐尸/持杆者这一档，两个子区各配一套僵尸动物（办公 `zat`/`zoat`、住宅 `zhick`/`zow`）；
T3 = 拆成酒店线（`the_moonflower`/`theswarmer`/`clicker`/`zlama`）与零售线（`thespitter`/`theskeeper`/`boomer`/`zorse`）两套专属；
T4 = 15 种的大杂烩，生化服/防化服/大吸盘/Boss 级全在这**（`great_visage` 4000 血那种也只刷在荒地）。

### 8.7.2 各阶级完整名单（`spawner.json` 原文数值）

**T1**

| 怪物 | 概率/秒 | 尝试 | 数量 | maxlocal | 条件 | 覆盖 |
|---|---:|---:|---|---:|---|---|
| `necroanimalict:zig` + `necroanimalict:zheep` | 0.1 | 25 | 1（默认） | 4 | y≥50 · 城市内 | T1郊区 |
| `zombie_extreme:crawler` | 0.1 | 25 | 1（默认） | 8 | y≥60 · 城市内 | T1郊区 |
| `zombie_extreme:infected_police` + `undead_revamp2:thesmoker` | 0.1 | 25 | 1（默认） | 12 | y≥50 · 城市内 | T1郊区、T2办公、T2摩天住宅 |
| `customnpcs:customnpc`（Rogue） | 0.05 | 20 | 1–2 | 3 | y≥60 · 城市内 | T1郊区 |

**T2**

| 怪物 | 概率/秒 | 尝试 | 数量 | maxlocal | 条件 | 覆盖 |
|---|---:|---:|---|---:|---|---|
| `necroanimalict:zat` + `necroanimalict:zoat` | 0.1 | 25 | 1（默认） | 4 | y≥50 · 城市内 | T2办公 |
| `necroanimalict:zhick` + `necroanimalict:zow` | 0.1 | 25 | 1（默认） | 4 | y≥50 · 城市内 | T2摩天住宅 |
| `undead_revamp2:bomber` | 0.1 | 25 | 1（默认） | 10 | y≥50 · 城市内 | T2办公、T3酒店、T2摩天住宅、T3零售 |
| `undead_revamp2:theordure` | 0.1 | 25 | 1（默认） | 8 | 室内 · y≥50 · 城市内 | T2办公、T3酒店、T2摩天住宅、T3零售 |
| `undead_revamp2:therod` | 0.1 | 25 | 1（默认） | 8 | 街道 · y≥50 · 城市内 | T2办公、T3酒店 |
| `zombie_extreme:infected_police` + `undead_revamp2:thesmoker` | 0.1 | 25 | 1（默认） | 12 | y≥50 · 城市内 | T1郊区、T2办公、T2摩天住宅 |
| `customnpcs:customnpc`（Bandit） | 0.05 | 20 | 1–2 | 4 | y≥65 · 城市内 | T2办公、T2摩天住宅 |
| `undead_revamp2:thehunter` | 0.05 | 25 | 1（默认） | 6 | 街道 · y≥50 · 城市内 | T2摩天住宅、T3零售 |

**T3**

| 怪物 | 概率/秒 | 尝试 | 数量 | maxlocal | 条件 | 覆盖 |
|---|---:|---:|---|---:|---|---|
| `necroanimalict:zat` + `necroanimalict:zoat` + `necroanimalict:zlama` | 0.1 | 25 | 1（默认） | 4 | y≥50 · 城市内 | T3酒店 |
| `necroanimalict:zhick` + `necroanimalict:zow` + `necroanimalict:zorse` | 0.1 | 25 | 1（默认） | 4 | y≥50 · 城市内 | T3零售 |
| `undead_revamp2:bomber` | 0.1 | 25 | 1（默认） | 10 | y≥50 · 城市内 | T2办公、T3酒店、T2摩天住宅、T3零售 |
| `undead_revamp2:the_moonflower` + `undead_revamp2:theswarmer` + `zombie_extreme:clicker` | 0.1 | 25 | 1（默认） | 16 | y≥50 · 城市内 | T3酒店 |
| `undead_revamp2:theordure` | 0.1 | 25 | 1（默认） | 8 | 室内 · y≥50 · 城市内 | T2办公、T3酒店、T2摩天住宅、T3零售 |
| `undead_revamp2:therod` | 0.1 | 25 | 1（默认） | 8 | 街道 · y≥50 · 城市内 | T2办公、T3酒店 |
| `undead_revamp2:thespitter` + `undead_revamp2:theskeeper` + `zombie_extreme:boomer` | 0.1 | 25 | 1（默认） | 16 | y≥50 · 城市内 | T3零售 |
| `zombie_extreme:infected_military` | 0.1 | 25 | 1（默认） | 10 | y≥50 · 城市内 | T3酒店、T3零售 |
| `customnpcs:customnpc`（Raider） | 0.05 | 20 | 1–2 | 4 | y≥65 · 城市内 | T3酒店、T3零售 |
| `undead_revamp2:thehunter` | 0.05 | 25 | 1（默认） | 6 | 街道 · y≥50 · 城市内 | T2摩天住宅、T3零售 |

**T4**

| 怪物 | 概率/秒 | 尝试 | 数量 | maxlocal | 条件 | 覆盖 |
|---|---:|---:|---|---:|---|---|
| `deaceased:guardian` | 0.1 | 25 | 1（默认） | 4 | 室内 · y≥0 · 城市内 | T4荒地 |
| `zombie_extreme:infected_hazmat` + `zombie_extreme:infected_military` | 0.1 | 25 | 1（默认） | 10 | y≥50 · 城市内 | T4荒地 |
| `zombie_extreme:inflated` + `undead_revamp2:therabidus` + `deaceased:thedigger` | 0.1 | 25 | 1（默认） | 10 | y≥50 · 城市内 | T4荒地 |
| `customnpcs:customnpc`（Plunderer） | 0.05 | 20 | 1–2 | 1 | y≥50 · 城市内 | T4荒地 |
| `customnpcs:customnpc`（Soldier） | 0.05 | 20 | 1–2 | 2 | y≥50 · 城市内 | T4荒地 |
| `necroanimalict:zear` + `necroanimalict:scarred_zear` | 0.05 | 25 | 1（默认） | 2 | y≥50 · 城市内 | T4荒地 |
| `necroanimalict:zolf` + `necroanimalict:boneman` | 0.05 | 25 | 1（默认） | 4 | y≥50 · 城市内 | T4荒地 |
| `undead_revamp2:bigsucker` + `deaceased:theface` | 0.025 | 10 | 1（默认） | 1 | 街道 · y≥50 | T4荒地 |
| `naturalist:bluejay` + `naturalist:butterfly` + `naturalist:canary` + `naturalist:cardinal` + `naturalist:finch` + `naturalist:sparrow` + `naturalist:robin` + `naturalist:vulture` + `naturalist:snail` + `quark:shiba` + `minecraft:cat` + `minecraft:wolf` | 0.01 | 15 | 1–2 | 4 | — | T4荒地 |
| `naturalist:elephant` + `naturalist:giraffe` + `naturalist:lion` + `naturalist:rhino` + `naturalist:zebra` + `naturalist:boar` + `naturalist:moose` | 0.01 | 5 | 1–2 | 2 | y≥50 · y≤96 | T4荒地 |
| `deaceased:great_visage` | 0.005 | 10 | 1（默认） | 1 | y≥50 | T4荒地 |

**全区通用（没有 `biometags` 条件，任何区域都按同一概率刷）**

| 怪物 | 概率/秒 | 尝试 | 数量 | maxlocal | 条件 |
|---|---:|---:|---|---:|---|
| `minecraft:blaze` | 0.25 | 30 | 1–3 | 20 | 群系 volcanic_plains,volcano · y≥50 |
| `minecraft:zombie` | 0.2 | 30 | 1–4 | — | y≥50 |
| `zombie_extreme:goon` | 0.15 | 20 | 1（默认） | 6 | y≥-20 |
| `zombie_extreme:revived` | 0.15 | 20 | 1（默认） | 6 | y≥-20 |
| `zombie_extreme:infected_juggernaut` | 0.15 | 20 | 1（默认） | 6 | y≥-20 |
| `zombie_extreme:night_hunter` + `zombie_extreme:faceless` | 0.15 | 20 | 1（默认） | 6 | y≥-40 |
| `zombie_extreme:divided` + `zombie_extreme:ram` + `undead_revamp2:thespectre` | 0.15 | 20 | 1（默认） | 6 | y≥-40 |
| `zombie_extreme:fetus` + `zombie_extreme:explosive_infected` + `undead_revamp2:thebidy` | 0.15 | 20 | 1（默认） | 6 | y≥-20 |
| `spore:inf_human` + `spore:inf_hazmat` + `spore:inf_husk` + `spore:inf_player` + `spore:bairn` + `spore:chemist` | 0.15 | 20 | 1–2 | — | y≥-40 · y≤180 · 城市内 |
| `minecraft:spider` + `minecraft:cave_spider` | 0.1 | 10 | 1–3 | 12 | 洞穴 · y≥-60 · y≤30 |
| `undead_revamp2:thepregnant` | 0.1 | 25 | 1（默认） | 2 | y≥40 |
| `undead_revamp2:thegliter` | 0.1 | 25 | 1（默认） | 2 | y≥40 |
| `minecraft:hoglin` | 0.1 | 20 | 1–3 | — | 群系 volcanic_plains,volcano · y≥50 |
| `undead_revamp2:thelurker` | 0.05 | 25 | 1（默认） | 2 | y≥40 |
| `undead_revamp2:clogger` | 0.05 | 10 | 1（默认） | 2 | y≥-60 |
| `undead_revamp2:theheavy` | 0.05 | 10 | 1（默认） | 2 | y≥-60 |
| `zombie_extreme:demolisher` | 0.05 | 10 | 1（默认） | 2 | y≥-60 |
| `zombie_extreme:zero_patient` | 0.05 | 10 | 1（默认） | 2 | y≥-60 |
| `zombie_extreme:rat_king` + `deaceased:flayedmanhead` | 0.05 | 10 | 1（默认） | 2 | y≥-60 |

### 8.7.3 模组自带的自然刷：全部 `forge:any`，不分区域

从下载的 5 个刷怪相关 jar 里抽出 112 个 `biome_modifier` 文件，其中 **66 条真的带 `spawners`**（其余是植被/装饰）：

| 模组 | 带刷怪的条目 | 生物群系条件 | 权重示例（weight） |
|---|---:|---|---|
| Zombie Extreme | 26（共 42 个 modifier 文件） | 全部 `forge:any` | `runner`/`infected_police`/`crawler`/`devestated` 20、`infected_military` 15、`night_hunter` 13、`rat_king` 10 |
| THE UNDEAD REVAMPED | 26（共 56 个） | 全部 `forge:any` | `neocrorines` 90、`therabidus` 80、`thesomnolence` 35、`theskeeper` 8 |
| Necro Animalict | 13 | 全部 `forge:any` | `zig` 8、`zoat/zlama/zow/zhick/zheep/zolf` 5、`scarred_zear` 3 |
| Deceased Beast | 1 | `forge:any` | `bugger` **weight 0**（等于关掉自然刷，只在 T4 刷怪器里出现） |
| Spore | 1（`biome_modifier/inf_spawns.json`） | 自定义类型 `spore:inf_spawns`（不按区域标签） | — |

也就是说：玩家在野外看到的僵尸变种，是「区域刷怪器（强区差异）+ 模组自然刷（全图统一）」两层叠加的结果；
真正"进了 T4 才见到"的那批怪，都来自 ①。

### 8.7.4 顺带的区域差异：建筑里的僵尸换装

`spawn.json` 的 `multibuilding` 规则给僵尸按建筑换整套护甲（`armorhelmet/chest/legs/boots`）：

| 建筑 | 装备 |
|---|---|
| 军事基地 / 废弃机库 | 加拿大军装四件套 |
| C-07 实验室 | 防化服（biohazard）四件套 |
| 核电站 | 白色防护服（contamination suit）四件套 |

这类僵尸的护甲值随 T 级倍率再乘（§8.5.2 的 `armormultiply`），所以高区域 + 军事建筑的僵尸特别硬。

### 8.7.5 如果要上站

建议新增 `public/data/spawn-areas.js`（生成脚本从 `spawner.json` + 六个区域标签复算）：
按 T1–T4 给出「本区专属怪物 / 通用怪物 / 每秒概率 / maxlocal」，怪物详情页反查「哪些区会刷它」，
尸潮页与区域页共用同一套实体 id。这样"这个怪在哪刷"这类问题站内就能自答。

## 8.8 生成物：可直接上站的数据表

上面这些换算已经固化成脚本 + 数据，**尚未接入站点 UI**（`index.html` / SW 清单都没动）：

| 产物 | 内容 |
|---|---|
| `scripts/gen-monster-difficulty.ts` | 从 `attribute.js` + `incontrol/spawn.json` + 尸潮表 + `hordes-common.toml` 复算，`npm run gen:monsters` |
| `public/data/monsters-difficulty.js` | `window.WZ_MONSTER_DIFF`：133 个实体 × 野外/T1–T4 × 简单/普通/困难 × 尸潮，每格 `{hp,dmg,armor,toPlayer}`；含 17/21 张尸潮天数档与单波期望 |
| `docs/monster-difficulty-table.md` | 人读版：口径说明 + 12 个抽样怪的场景对照表 + 尸潮全天数档名单 |
| `scripts/verify-monster-difficulty.ts` | 13,471 项断言（`npm run verify:monsters`），含区域/难度锚点值与站点 NPC 章节的区域→阶级交叉校验 |

两个已知口径（文档里也写了）：`hostile` 按「非 naturalist 动物」判定；尸潮分 `horde.normal/hard`（野外，只算
`spawntype: event` 那条）与 `horde.city.T1–T4`（落在城区，区域倍率再叠一层）。所以困难荒地城区的尸潮僵尸
= 区域 2× · 困难 2× · 事件 2× = **8× 基础血（160）**，护甲 ×4.5、攻击 ×3.375；非僵尸类（警察等）不吃
`finalize` 那条僵尸专享规则，是 **4×**。

## 8.9 尸潮建筑（LostSouls）与「未实装」怪物

除 15 天一波的天数尸潮外，整合包还有**另一套尸潮**：LostSouls 的「尸潮建筑」——建筑里固定盘踞一波怪，
清完才能搜刮（`kubejs`/任务文本：「必须先消灭尸潮，方可搜刮该建筑内的任何箱子」）。

### 8.9.1 数据出处

`DCTweaks` jar 里的 `data/deceasedcraft/lostsouls/buildings/<区域>/<建筑>.json`，共 **23 份定义 / 33 个建筑**：

| 字段 | 含义 |
|---|---|
| `mobs[{name,weight}]` | 该建筑尸潮的出怪池与权重 |
| `mobamounts{min,max}` | 整波规模（T1 派出所 10–15，核电站 80–90） |
| `healthbonus{min,max}` | 定义里写了 0.75–1.25，但 **LostSouls 4.1.7 没有调用点**（`MobSettings.getHealthBonus()` 全文无引用），实际不生效 —— 见 §8.10 |
| `spawnmaxinbuilding` | 同屏上限（多数 20） |
| `hauntedchance` | 建筑「闹鬼」概率（全是 1.0） |
| `helmets/chestplates/leggings/boots` | 给这波怪穿什么（本包全空） |

LostSouls 刷怪用的是 `MobSpawnType.MOB_SUMMONED`（反编译 `mcjty/lostsouls/ForgeEventHandlers` 确认），
所以困难难度下 InControl 那条 `spawntype: [event, mob_summoned]` 的 ×2 也会命中：
建筑僵尸困难血量 = 基础 × 区域 ×2 × 事件 ×2（**没有**建筑加成那一层，见 §8.10）。
LostSouls 真正加的是**攻击**：`boostEntity` 把 ATTACK_DAMAGE 乘上 toml 全局
`minDamageBonus…maxDamageBonus`（本包 0.5–1.0），血量乘 `minHealthBonus…maxHealthBonus`（本包 1.0）。

### 8.9.2 结论：没有「只在尸潮出现」的怪

把四个来源（区域刷怪器 / 模组自带的 `forge:add_spawns` / 天数尸潮 / 尸潮建筑）铺开对 130 个实体分类：

| 分类 | 数量 | 说明 |
|---|---:|---|
| 正常刷新 | 70 | 其中 69 只在城市刷怪器里，`undead_revamp2:sucker` 只靠模组自然刷 |
| 仅尸潮 | **0** | 尸潮名单里的实体全都能在平时刷到；只有 `sucker`/`night_hunter` 不在城市刷怪器里 |
| 未实装 | **60** | 48 只 `spore:*`（真菌模组，社区视为未上线的 T5）+ `deaceased` 的部件/变体 + `hordes:*` 玩家变体 |

- 站内标成「尸潮」的 8 个 `hordes:*`（僵尸玩家/堕落玩家/无价值玩家/感染的猪灵/商人/掠夺者/唤魔者/幻术师）
  **整合包的天数尸潮表和建筑尸潮表一个都没引用**，实际刷不出来。
- 尸潮表里有一条坏数据：`undead_revamp2:night_hunter` 在 `attribute.js` 没有覆盖，模组 jar 里也没有这个实体类
  （`zombie_extreme:night_hunter` 才是真的），这条实际不会刷出任何东西。
- 「感觉像尸潮专属」的那批（`great_visage` 0.01/秒、`theface` 0.03/秒、`flayedmanhead` 0.05/秒…）只是城市刷怪概率极低，
  不是不在刷。

机读数据与逐建筑清单见 §8.8 的同目录产物：`public/data/horde-buildings.js`、`docs/horde-buildings.md`
（`npm run gen:hordebuildings` / `npm run verify:hordebuildings`，959 项断言）。

## 8.10 实测校核：尸潮不吃 `finalize` 批，建筑 healthbonus 不生效

拿游戏内实测值反推，得到两条修正（都已并入生成器）：

### 8.10.1 尸潮 mob 只吃 `onjoin` 批

| 实测（困难） | 基础 | 实测倍率 | 对应公式 |
|---|---:|---:|---|
| T3 尸潮僵尸 70 血 / 5 甲 | 20 / 2 | ×3.5 / ×2.6 | 1.75（困难区域）×2（事件） |
| T4 尸潮僵尸 80 血 | 20 | ×4.0 | 2.0 × 2 |
| T4 城内普通僵尸 80 血 | 20 | ×4.0 | 2.0（区域 finalize）×2（困难区域） |
| T4 尸潮 沉重斗尸 2800 / 120 甲 | 700 / 40 | ×4.0 / ×3.0 | 2.0 × 2 / 2.0 × 1.5 |
| T4 尸潮 鼠王 3200 / 90 甲 | 800 / 30 | ×4.0 / ×3.0 | 同上 |
| T4 尸潮 腐豕 3600 / 120 甲 | 900 / 40 | ×4.0 / ×3.0 | 同上 |
| T2 尸潮 孕胎者 1020 / 22 甲 | 340 / 10 | ×3.0 / ×2.25 | 1.5 × 2 / 1.5 × 1.5 |
| T3 尸潮 伏从魔 1470 / 30 甲 | 420 / 12 | ×3.5 / ×2.6 | 1.75 × 2 |
| T3 尸潮 感染军人 280 / 32 甲 | 80 / 12 | ×3.5 / ×2.6 | 1.75 × 2 |

如果按「两批都跑」，T3 尸潮僵尸应该是 20×1.5×1.75×2 = 105 血、甲 7.9；T4 应该是 160 血、甲 9。
实测都是 `onjoin` 批的单独结果。城市里正常刷的僵尸（非尸潮）才两批都吃（T4 80 血 = 2×2）。

### 8.10.2 建筑 `healthbonus` 是死配置，LostSouls 加的是攻击

反编译 `mcjty/lostsouls/ForgeEventHandlers.boostEntity`：它读的是 **toml 全局配置**
`minHealthBonus / maxHealthBonus / minDamageBonus / maxDamageBonus`，把 MAX_HEALTH 和
ATTACK_DAMAGE 各乘一个 `rand*(max-min)+min`；`MobSettings.getHealthBonus()`（建筑 JSON 里那个）
在 4.1.7 里**没有任何调用点**。本包 `defaultconfigs/lostsouls-server.toml` 设置：
血量 ×1.0（不变）、攻击 ×0.5–1.0（随机），护甲完全不动。

所以尸潮建筑里：
- 血量 = 基础 × 区域/难度倍率（和天数尸潮同口径，建筑不再加血）
- 护甲 = 基础 × 区域/难度倍率（建筑不加甲）
- 攻击 = 上面再 × [0.5, 1.0] 随机 → 生成器输出区间

### 8.10.3 还没对上的两个点

| 实测 | 表里算出来 | 结论 |
|---|---|---|
| T3 尸潮「月光花」700 血 / 36 甲 | 月光花 `the_moonflower` 175 / 15.75（基础 50 / 6） | **是流光花 `thegliter`（基础 200 / 14）**：200×3.5 = 700、14×2.625 = 36.75 → 显示 36，两个数都对上；赌场/酒店的标准尸潮里两只都在名单里，容易看混 |
| T3 非尸潮感染军人 120 血 / 22 甲 | T3 困难 140 / 21；T2 困难 120 / 18 | 血量 120 正好是 T2 的值（办公/住宅），多出来的 4 点甲像是身上的装备；若确认在 T3，血量应是 140 |

实测样本里其余 9 条（T3/T4 尸潮僵尸、沉重斗尸、零号病人、鼠王、腐豕、孕胎者、伏从魔、感染军人）都与「`onjoin` 批 × 事件」逐项吻合，
所以 §8.10.1 / §8.10.2 两条修正是站得住的。

一个容易误会的巧合：**困难 T4 的普通僵尸和建筑尸潮僵尸都是 80 血** —— 城里是 2.0（`finalize`）×2.0（困难），
建筑尸潮是 2.0（困难）×2.0（事件），两条不同的路径恰好都是 4 倍；T3 就分开了（城里 52.5、尸潮 70）。

## 8.11 深渊维度（`deceasedcraft:abyss`）：没有尸潮，只有一条 ×2/×1.5/×1.5

### 8.11.1 数值口径

深渊只有 `config/incontrol/spawn.json` 里这一条专属倍率（`dimension: deceasedcraft:abyss`、`hostile: true`、
`difficulty: hard`、`incity: true`）：**血量 ×2、护甲 ×1.5、攻击 ×1.5**。
原因是区域标签（`suburb/wasteland…`）都是主世界生物群系，深渊的 `deceasedcraft:undiscovered` 一个都匹配不上，
所以 `finalize` 批与困难区域批都不生效，只剩这一条。

### 8.11.2 深渊里没有尸潮（两个独立的证据）

| 尸潮类型 | 为什么没有 |
|---|---|
| 天数尸潮 | 反编译 `HordeEventHandler`：`if (player.level.dimension() != Level.OVERWORLD) return;` —— 非主世界直接返回 |
| 建筑尸潮（闹鬼） | LostSouls 的 23 份定义只覆盖主世界六个子区（`suburb_residential`…`wasteland`），深渊建筑没有定义，回落 `lostsouls-server.toml` 的默认 `hauntedChance = 0.0` |

所以「深渊尸潮 / 深渊非尸潮」是同一套数值 —— 就算用 `/hordes` 命令在深渊强开，事件那条倍率写了
`dimension: minecraft:overworld`，也不会命中。

### 8.11.3 深渊能刷的怪

- `spawner.json` 的深渊规则：**6 只菌染怪**（`spore:inf_human / inf_hazmat / inf_husk / inf_player / bairn / chemist`），
  0.15/秒、每次 1–2 只、`incity` + 亮度 ≤5。
- 原版僵尸/尸壳/溺尸：`spawn.json` 里那条自然刷新 deny 只写了 `minecraft:overworld`，深渊不拦，仍会自然刷。
- `undead_revamp2 / zombie_extreme / necroanimalict` 三个模组的**非 InControl** 刷怪在深渊被显式 deny
  （`mod: [...]` + `dimension: [overworld, abyss]` + `incontrol: false`），所以深渊看不到它们。
- Spore 自己的 biome modifier 在包里是空的（`sporeconfig.toml` 的 `"mob|weight|minimum|maximum" = []`）。

逐只数值见 `docs/monster-difficulty-table.md` 的「2.5 深渊维度」表，机读数据在
`public/data/monsters-difficulty.js` 的 `entities[*].abyss.{normal,hard}` 与 `abyssSpawns`。

### 8.11.4 深渊尸潮（尚未实现，按规律推算）

深渊的尸潮配置现在还没写。若照天数尸潮的加强规律（深渊规则 ×2 血 / ×1.5 甲 / ×1.5 攻，尸潮再叠事件
×2 / ×1.5 / ×1.5），结果是 **血量 ×4、护甲 ×2.25、攻击 ×2.25**；生成器已把它作为推算值写进
`entities[*].abyss.hordeHard`，完整 54 只菌染怪的表在 `docs/monster-difficulty-table.md` 的 §2.6。

基础血 ≥500 的 13 只「BOSS 级」：菌械重炮 6000、沉渊魔 5000、菌械空堡 4000、噬袭魔 4000、凝袭魔 3400、
强袭魔 3000、钢戮魔 3000、雏型蜂巢思维 1000、`howit_arm` 625、食人魔 600、邪菌术士 / 铁斧投手 / 审判者 500。
例：菌械重炮深渊困难 12000 血 / 127.5 甲 / 63 攻；若在尸潮里 → 24000 / 191.25 / 94.5（打向玩家 141.75）。

注意两点：①`sporeconfig.toml` 的 `Global Health Modifier` 与 `Global Armor Modifier` 都是 1.0，不会再加一层；
②真要做深渊尸潮，得把 `spawn.json` 里事件那条的 `dimension: minecraft:overworld` 放开，否则尸潮进深渊也吃不到那层倍率。

## 9. 方法与可复现性

本次分析用若干一次性脚本解析：`attribute.js` 的 `event.modify(...)` 块、`guides.js` 的怪物条目、`horde_data/tables/*.json` 与 `scripts/*.json`、`hordes-common.toml`；未改动任何仓库文件。校验点：130 个实体全部解析出 `max_health` 与 `attack_damage`；115 个站内怪物数值与包内逐项比对，偏差 0。
