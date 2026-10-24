# 每只怪物的刷怪梯度（生成物，勿手改）

- 生成：`tsx scripts/gen-monster-spawn-tiers.ts`，2026-10-24；机读数据 `public/data/monster-spawn-tiers.js`
- 区域列 = `config/incontrol/spawner.json` 里带区域标签的规则（城市内），数字是「每秒触发概率」之和
- 尸潮列 = 15 天一波的天数尸潮表号（表号 = 该档起始世界天数）
- 建筑列 = 尸潮建筑（LostSouls）名单；`自然` = 模组自带 `forge:add_spawns`，任何群系都能刷

共 153 个实体条目：区域刷怪 T1 6 / T2 11 / T3 18 / T4 34；天数尸潮 31 只；建筑尸潮 32 只；**未实装 60 只**（四个来源都没有）。

相关文档：`docs/monster-handbook.md`（属性 / 结算 / 刷怪 / 尸潮单篇）、`docs/horde-buildings.md`（逐建筑尸潮）、`docs/monster-difficulty-table.md`（场景抽样与尸潮天数档）。

## 1. 梯度总览

| 梯度 | 区域 | 敌人 | 动物/中立 |
|---|---|---:|---:|
| T1 | 郊区住宅区 | 6 | 0 |
| T2 | 摩天办公区 / 摩天住宅区 | 11 | 0 |
| T3 | 摩天酒店区 / 零售商业区 | 18 | 0 |
| T4 | 荒地 | 15 | 19 |

## 2. 逐怪物梯度表

| 怪物 | T1 | T2 | T3 | T4 | 全图规则（非区域） | 天数尸潮（普通） | 天数尸潮（困难） | 尸潮建筑 | 自然 | 状态 |
|---|---|---|---|---|---|---|---|---|---|---|
| 暴徒（zombie_extreme:goon） | — | — | — | — | 0.15 | 165,180,210 | — | C-X联合军事中心 | 是 | 正常刷新 |
| 爆炸感染者（zombie_extreme:explosive_infected） | — | — | — | — | 0.15 | — | — | 居民地堡 | 是 | 正常刷新 |
| 爆炸者（zombie_extreme:boomer） | — | — | 0.1 | — | — | — | 75 | 便利店、露台购物中心、枪店、医院 | 是 | 正常刷新 |
| 被感染的防化员（zombie_extreme:infected_hazmat） | — | — | — | 0.1 | — | — | — | 工人宿舍、居民地堡、军用电台营地、石油钻机作业区、C-X联合军事中心 | 是 | 正常刷新 |
| 被感染的警察（zombie_extreme:infected_police） | 0.1 | 0.1 | — | — | — | 15,30 | 15 | 派出所、社区中心、残破的医院、环球影艺塔、警察局、警察宿舍、绿洲公寓、木混结构塔楼、汽车车间、首座、庭院式办公区、小型独立公寓、一贯制学校、针叶客栈、中型独立公寓 | 是 | 正常刷新 |
| 被感染的重装兵（zombie_extreme:infected_juggernaut） | — | — | — | — | 0.15 | — | 255,300,345,405,480,525,600,800 | 军事基地 | 是 | 正常刷新 |
| 剥皮怪（deaceased:flayedmanhead） | — | — | — | — | 0.05 | — | — | C-X联合军事中心 | — | 正常刷新 |
| 沉重斗尸（undead_revamp2:theheavy） | — | — | — | — | 0.05 | 345,405 | 405,480,525,600,800 | C-07实验室 | 是 | 正常刷新 |
| 喘鸣体（undead_revamp2:thesmoker） | 0.1 | 0.1 | — | — | — | 30,45,60 | 15,30,45,60,75,90,525,600,800 | 社区中心 | 是 | 正常刷新 |
| 粉碎者（zombie_extreme:demolisher） | — | — | — | — | 0.05 | 180 | 345,480,525,600 | 居民地堡、军事基地 | 是 | 正常刷新 |
| 伏从魔（undead_revamp2:thelurker） | — | — | — | — | 0.05 | — | — | 赌场、露台购物中心 | — | 正常刷新 |
| 腐豕（undead_revamp2:clogger） | — | — | — | — | 0.05 | 255,300,345,405 | 405,480,525,600,800 | 核电站 | — | 正常刷新 |
| 复生者（zombie_extreme:revived） | — | — | — | — | 0.15 | 165 | — | — | 是 | 正常刷新 |
| 感染军人（zombie_extreme:infected_military） | — | — | 0.1 | 0.1 | — | 150,165,180,210,255,300,345,405 | 165,180,210 | 便利店、赌场、寰鼎环阁酒店、露台购物中心、美术馆、枪店、医院、渊沉俱乐部、工人宿舍、居民地堡、军用电台营地、石油钻机作业区、C-X联合军事中心 | 是 | 正常刷新 |
| 僵尸（minecraft:zombie） | — | — | — | — | 0.2 | 15,30,45,60,75,90,105,120,135 | 15,30 | 派出所、社区中心、综合诊所、残破的医院、环球影艺塔、警察局、警察宿舍、绿洲公寓、木混结构塔楼、汽车车间、首座、庭院式办公区、小型独立公寓、一贯制学校、针叶客栈、中型独立公寓、便利店、赌场、寰鼎环阁酒店、露台购物中心、美术馆、枪店、医院、渊沉俱乐部、废弃机库、工人宿舍、核电站、居民地堡、军事基地、军用电台营地、石油钻机作业区、C-07实验室、C-X联合军事中心 | — | 正常刷新 |
| 僵尸海豚（necroanimalict:zolphin） | — | — | — | — | 0.1 | — | — | — | 是 | 正常刷新 |
| 僵尸鸡（necroanimalict:zhick） | — | 0.1 | 0.1 | — | — | — | — | — | 是 | 正常刷新 |
| 僵尸狼（necroanimalict:zolf） | — | — | — | 0.05 | — | — | — | — | 是 | 正常刷新 |
| 僵尸马（necroanimalict:zorse） | — | — | 0.1 | — | — | — | — | — | 是 | 正常刷新 |
| 僵尸猫（necroanimalict:zat） | — | 0.1 | 0.1 | — | — | — | — | — | 是 | 正常刷新 |
| 僵尸绵羊（necroanimalict:zheep） | 0.1 | — | — | — | — | — | — | — | 是 | 正常刷新 |
| 僵尸牛（necroanimalict:zow） | — | 0.1 | 0.1 | — | — | — | — | — | 是 | 正常刷新 |
| 僵尸山羊（necroanimalict:zoat） | — | 0.1 | 0.1 | — | — | — | — | — | 是 | 正常刷新 |
| 僵尸熊（necroanimalict:zear） | — | — | — | 0.05 | — | — | — | — | 是 | 正常刷新 |
| 僵尸羊驼（necroanimalict:zlama） | — | — | 0.1 | — | — | — | — | — | 是 | 正常刷新 |
| 僵尸猪（necroanimalict:zig） | 0.1 | — | — | — | — | — | — | — | 是 | 正常刷新 |
| 巨脸怪（巨面）（deaceased:theface） | — | — | — | 0.03 | — | — | 210,255,300,345,405,480,525,600,800 | — | — | 正常刷新 |
| 巨吸蚀怪（undead_revamp2:bigsucker） | — | — | — | 0.03 | — | 135,150,165,180,210,255,300,345,405 | 150,165,180,210,255,300,345,405,480,525,600,800 | — | 是 | 正常刷新 |
| 掘地怪（deaceased:thedigger） | — | — | — | 0.1 | — | — | 180,210,255,300,345,405,480,525,600,800 | 废弃机库、工人宿舍、军用电台营地、石油钻机作业区 | — | 正常刷新 |
| 菌染人类（spore:inf_human） | — | — | — | — | 0.15 | — | — | — | — | 正常刷新 |
| 菌染尸壳（spore:inf_husk） | — | — | — | — | 0.15 | — | — | — | — | 正常刷新 |
| 菌染研究员（spore:inf_hazmat） | — | — | — | — | 0.15 | — | — | — | — | 正常刷新 |
| 菌染幼体（spore:bairn） | — | — | — | — | 0.15 | — | — | — | — | 正常刷新 |
| 开膛尸（zombie_extreme:divided） | — | — | — | — | 0.15 | — | — | C-07实验室 | 是 | 正常刷新 |
| 狂疫者（undead_revamp2:therabidus） | — | — | — | 0.1 | — | — | — | — | 是 | 正常刷新 |
| 零号病人（zombie_extreme:zero_patient） | — | — | — | — | 0.05 | 210,300,345,405 | 345,480,525,600 | 废弃机库 | 是 | 正常刷新 |
| 流光花（undead_revamp2:thegliter） | — | — | — | — | 0.1 | 105,120,135,150 | 120,135,150,165,180,210,255,300,345,405,480,525,600,800 | 绿洲公寓、一贯制学校、便利店、露台购物中心、枪店、医院 | 是 | 正常刷新 |
| 脓爆尸（undead_revamp2:bomber） | — | 0.1 | 0.1 | — | — | 45 | 30,45,60 | 残破的医院、环球影艺塔、警察局、警察宿舍、绿洲公寓、木混结构塔楼、汽车车间、首座、庭院式办公区、小型独立公寓、一贯制学校、针叶客栈、中型独立公寓 | 是 | 正常刷新 |
| 爬行尸（zombie_extreme:crawler） | 0.1 | — | — | — | — | — | — | — | 是 | 正常刷新 |
| 疱伏尸（undead_revamp2:thebidy） | — | — | — | — | 0.15 | — | — | — | 是 | 正常刷新 |
| 喷吐者（undead_revamp2:thespitter） | — | — | 0.1 | — | — | — | — | 便利店、露台购物中心、枪店、医院 | 是 | 正常刷新 |
| 膨肿怪（zombie_extreme:inflated） | — | — | — | 0.1 | — | 120,135,150,165,180,210,255,300,345,405 | — | 废弃机库、工人宿舍、居民地堡、军事基地、军用电台营地、石油钻机作业区 | 是 | 正常刷新 |
| 守卫者（deaceased:guardian） | — | — | — | 0.1 | — | — | — | — | — | 正常刷新 |
| 鼠王（zombie_extreme:rat_king） | — | — | — | — | 0.05 | 300,345,405 | 480,525,600 | 废弃机库、C-X联合军事中心 | 是 | 正常刷新 |
| 胎儿（zombie_extreme:fetus） | — | — | — | — | 0.15 | — | — | 居民地堡 | 是 | 正常刷新 |
| 无面者（zombie_extreme:faceless） | — | — | — | — | 0.15 | — | — | 核电站 | 是 | 正常刷新 |
| 吸蚀怪（undead_revamp2:sucker） | — | — | — | — | — | 60,75,90,105,120 | 135 | — | 是 | 正常刷新 |
| 血痕僵尸熊（necroanimalict:scarred_zear） | — | — | — | 0.05 | — | — | — | — | 是 | 正常刷新 |
| 循猎魔（undead_revamp2:thehunter） | — | 0.05 | 0.05 | — | — | 45,60,75 | 15,30,45,60,75,90,105,120,135,150,165,180 | 残破的医院、警察宿舍、绿洲公寓、小型独立公寓、一贯制学校、针叶客栈、中型独立公寓、便利店、枪店、医院 | 是 | 正常刷新 |
| 循声者（zombie_extreme:clicker） | — | — | 0.1 | — | — | — | 75 | 赌场、寰鼎环阁酒店、美术馆、渊沉俱乐部 | 是 | 正常刷新 |
| 烟秽（undead_revamp2:theordure） | — | 0.1 | 0.1 | — | — | — | — | — | 是 | 正常刷新 |
| 养蜂人（undead_revamp2:theswarmer） | — | — | 0.1 | — | — | — | 90,105,120 | — | 是 | 正常刷新 |
| 养蛊人（undead_revamp2:theskeeper） | — | — | 0.1 | — | — | — | 90,105,120,135,150,165 | — | 是 | 正常刷新 |
| 药剂师（spore:chemist） | — | — | — | — | 0.15 | — | — | — | — | 正常刷新 |
| 夜猎者（zombie_extreme:night_hunter） | — | — | — | — | 0.15 | — | 255,300,345,405,525,600,800 | 核电站 | 是 | 正常刷新 |
| 幽灵体（undead_revamp2:thespectre） | — | — | — | — | 0.15 | — | 300,345,405,480,525,600,800 | C-07实验室 | 是 | 正常刷新 |
| 月光花（undead_revamp2:the_moonflower） | — | — | 0.1 | — | — | 75,90 | 45,60,75,90,105,120,135 | 赌场、寰鼎环阁酒店、美术馆、渊沉俱乐部 | 是 | 正常刷新 |
| 孕胎者（undead_revamp2:thepregnant） | — | — | — | — | 0.1 | 90,105,120,135,150 | 105,120,135,150,165,180 | 庭院式办公区、赌场、寰鼎环阁酒店、美术馆、渊沉俱乐部 | 是 | 正常刷新 |
| 狰狞巨脸（巨面）（deaceased:great_visage） | — | — | — | 0.01 | — | — | 800 | — | — | 正常刷新 |
| 蜘蛛（minecraft:spider） | — | — | — | — | 0.1 | — | — | — | — | 正常刷新 |
| 撞击者（zombie_extreme:ram） | — | — | — | — | 0.15 | — | — | C-07实验室 | 是 | 正常刷新 |
| 撞针体（undead_revamp2:therod） | — | 0.1 | 0.1 | — | — | — | 45,60 | 环球影艺塔、警察局、木混结构塔楼、汽车车间、首座、庭院式办公区、寰鼎环阁酒店、美术馆、渊沉俱乐部 | 是 | 正常刷新 |
| Bone Man（necroanimalict:boneman） | — | — | — | 0.05 | — | — | — | — | 是 | 正常刷新 |
| minecraft:cave_spider（minecraft:cave_spider） | — | — | — | — | 0.1 | — | — | — | — | 正常刷新 |
| naturalist:alligator（naturalist:alligator） | — | — | — | — | 0.01 | — | — | — | — | 正常刷新 |
| naturalist:bear（naturalist:bear） | — | — | — | — | 0.01 | — | — | — | — | 正常刷新 |
| naturalist:boar（naturalist:boar） | — | — | — | 0.01 | — | — | — | — | — | 正常刷新 |
| naturalist:elephant（naturalist:elephant） | — | — | — | 0.01 | — | — | — | — | — | 正常刷新 |
| naturalist:lion（naturalist:lion） | — | — | — | 0.01 | — | — | — | — | — | 正常刷新 |
| naturalist:rhino（naturalist:rhino） | — | — | — | 0.01 | — | — | — | — | — | 正常刷新 |
| minecraft:cat（minecraft:cat） | — | — | — | 0.01 | — | — | — | — | — | NPC |
| minecraft:wolf（minecraft:wolf） | — | — | — | 0.01 | — | — | — | — | — | NPC |
| naturalist:bluejay（naturalist:bluejay） | — | — | — | 0.01 | — | — | — | — | — | NPC |
| naturalist:butterfly（naturalist:butterfly） | — | — | — | 0.01 | — | — | — | — | — | NPC |
| naturalist:canary（naturalist:canary） | — | — | — | 0.01 | — | — | — | — | — | NPC |
| naturalist:cardinal（naturalist:cardinal） | — | — | — | 0.01 | — | — | — | — | — | NPC |
| naturalist:finch（naturalist:finch） | — | — | — | 0.01 | — | — | — | — | — | NPC |
| naturalist:giraffe（naturalist:giraffe） | — | — | — | 0.01 | — | — | — | — | — | NPC |
| naturalist:moose（naturalist:moose） | — | — | — | 0.01 | — | — | — | — | — | NPC |
| naturalist:robin（naturalist:robin） | — | — | — | 0.01 | — | — | — | — | — | NPC |
| naturalist:snail（naturalist:snail） | — | — | — | 0.01 | — | — | — | — | — | NPC |
| naturalist:sparrow（naturalist:sparrow） | — | — | — | 0.01 | — | — | — | — | — | NPC |
| naturalist:vulture（naturalist:vulture） | — | — | — | 0.01 | — | — | — | — | — | NPC |
| naturalist:zebra（naturalist:zebra） | — | — | — | 0.01 | — | — | — | — | — | NPC |
| NPC·Bandit（customnpcs:customnpc#Bandit） | — | 0.05 | — | — | — | — | — | — | — | NPC |
| NPC·Plunderer（customnpcs:customnpc#Plunderer） | — | — | — | 0.05 | — | — | — | — | — | NPC |
| NPC·Raider（customnpcs:customnpc#Raider） | — | — | 0.05 | — | — | — | — | — | — | NPC |
| NPC·Rogue（customnpcs:customnpc#Rogue） | 0.05 | — | — | — | — | — | — | — | — | NPC |
| NPC·Soldier（customnpcs:customnpc#Soldier） | — | — | — | 0.05 | — | — | — | — | — | NPC |
| quark:shiba（quark:shiba） | — | — | — | 0.01 | — | — | — | — | — | NPC |
| 保育体（spore:verva） | — | — | — | — | — | — | — | — | — | 未实装 |
| 沉渊魔（spore:kraken） | — | — | — | — | — | — | — | — | — | 未实装 |
| 雏型蜂巢思维（spore:proto） | — | — | — | — | — | — | — | — | — | 未实装 |
| 窜扰者（spore:scamper） | — | — | — | — | — | — | — | — | — | 未实装 |
| 恶涎者（spore:mephitic） | — | — | — | — | — | — | — | — | — | 未实装 |
| 浮游虫（deaceased:bugger） | — | — | — | — | — | — | — | — | — | 未实装 |
| 钢戮魔（spore:stahl） | — | — | — | — | — | — | — | — | — | 未实装 |
| 畸尾婴（spore:saugling） | — | — | — | — | — | — | — | — | — | 未实装 |
| 激跃者（spore:leaper） | — | — | — | — | — | — | — | — | — | 未实装 |
| 僭主体（spore:usurper） | — | — | — | — | — | — | — | — | — | 未实装 |
| 荆刺者（spore:thorn） | — | — | — | — | — | — | — | — | — | 未实装 |
| 巨石怪（deaceased:boulder） | — | — | — | — | — | — | — | — | — | 未实装 |
| 卷轮怪（deaceased:reeler） | — | — | — | — | — | — | — | — | — | 未实装 |
| 菌骑士（spore:knight） | — | — | — | — | — | — | — | — | — | 未实装 |
| 菌染憎恶（spore:biobloob） | — | — | — | — | — | — | — | — | — | 未实装 |
| 菌械空堡（spore:hindenburg） | — | — | — | — | — | — | — | — | — | 未实装 |
| 菌械重炮（spore:howitzer） | — | — | — | — | — | — | — | — | — | 未实装 |
| 菌主（spore:gastgaber） | — | — | — | — | — | — | — | — | — | 未实装 |
| 林中鹿菌（spore:wendigo） | — | — | — | — | — | — | — | — | — | 未实装 |
| 蛮兽（spore:brute） | — | — | — | — | — | — | — | — | — | 未实装 |
| 纳克拉维（spore:nuclea） | — | — | — | — | — | — | — | — | — | 未实装 |
| 酿毒体（spore:braurei） | — | — | — | — | — | — | — | — | — | 未实装 |
| 凝袭魔（spore:gazenbreacher） | — | — | — | — | — | — | — | — | — | 未实装 |
| 咆哮者（spore:howler） | — | — | — | — | — | — | — | — | — | 未实装 |
| 喷吐者（spore:spitter） | — | — | — | — | — | — | — | — | — | 未实装 |
| 潜猎兽（spore:jagd） | — | — | — | — | — | — | — | — | — | 未实装 |
| 强袭魔（spore:sieger） | — | — | — | — | — | — | — | — | — | 未实装 |
| 侵袭者（spore:griefer） | — | — | — | — | — | — | — | — | — | 未实装 |
| 塞壬（spore:naiad） | — | — | — | — | — | — | — | — | — | 未实装 |
| 杀戮者（spore:slasher） | — | — | — | — | — | — | — | — | — | 未实装 |
| 哨戒体（spore:vigil） | — | — | — | — | — | — | — | — | — | 未实装 |
| 深潜者（spore:bloater） | — | — | — | — | — | — | — | — | — | 未实装 |
| 审判者（spore:inquisitor） | — | — | — | — | — | — | — | — | — | 未实装 |
| 食腐鹫（spore:scavenger） | — | — | — | — | — | — | — | — | — | 未实装 |
| 食人魔（spore:ogre） | — | — | — | — | — | — | — | — | — | 未实装 |
| 嗜欲者（undead_revamp2:lechery） | — | — | — | — | — | — | — | — | — | 未实装 |
| 噬袭魔（spore:hohlfresser） | — | — | — | — | — | — | — | — | — | 未实装 |
| 守护者（spore:protector） | — | — | — | — | — | — | — | — | — | 未实装 |
| 撕裂者（spore:lacerator） | — | — | — | — | — | — | — | — | — | 未实装 |
| 舔舐者（spore:braiomil） | — | — | — | — | — | — | — | — | — | 未实装 |
| 铁斧投手（spore:hvindicator） | — | — | — | — | — | — | — | — | — | 未实装 |
| 妄念体（spore:delusioner） | — | — | — | — | — | — | — | — | — | 未实装 |
| 巫猎饕（spore:volatile） | — | — | — | — | — | — | — | — | — | 未实装 |
| 邪菌术士（spore:hevoker） | — | — | — | — | — | — | — | — | — | 未实装 |
| 邪灵（spore:busser） | — | — | — | — | — | — | — | — | — | 未实装 |
| 酗酒者（spore:inebriater） | — | — | — | — | — | — | — | — | — | 未实装 |
| 疫病者（spore:plagued） | — | — | — | — | — | — | — | — | — | 未实装 |
| 拥孢体（spore:umarmed） | — | — | — | — | — | — | — | — | — | 未实装 |
| 幽灵（spore:specter） | — | — | — | — | — | — | — | — | — | 未实装 |
| 灾厄重构体（spore:reconstructor） | — | — | — | — | — | — | — | — | — | 未实装 |
| 长舌魔（spore:brot） | — | — | — | — | — | — | — | — | — | 未实装 |
| 追迹者（spore:stalker） | — | — | — | — | — | — | — | — | — | 未实装 |
| deaceased:flayedmansections（deaceased:flayedmansections） | — | — | — | — | — | — | — | — | — | 未实装 |
| deaceased:flayedmantail（deaceased:flayedmantail） | — | — | — | — | — | — | — | — | — | 未实装 |
| deaceased:tougueentity（deaceased:tougueentity） | — | — | — | — | — | — | — | — | — | 未实装 |
| deaceased:visage_pod（deaceased:visage_pod） | — | — | — | — | — | — | — | — | — | 未实装 |
| hordes:drowned_player（hordes:drowned_player） | — | — | — | — | — | — | — | — | — | 未实装 |
| hordes:husk_player（hordes:husk_player） | — | — | — | — | — | — | — | — | — | 未实装 |
| hordes:zombie_player（hordes:zombie_player） | — | — | — | — | — | — | — | — | — | 未实装 |
| spore:howit_arm（spore:howit_arm） | — | — | — | — | — | — | — | — | — | 未实装 |
| undead_revamp2:night_hunter（undead_revamp2:night_hunter） | — | — | — | — | — | — | 480 | — | — | 无属性覆盖 |
| 溺尸（minecraft:drowned） | — | — | — | — | — | — | — | — | — | — |
| 尸壳（minecraft:husk） | — | — | — | — | — | — | — | — | — | — |

## 3. 梯度视角：每个 T 级分别刷谁

### T1（郊区住宅区）

| 怪物 | 概率/秒 | 条件 |
|---|---:|---|
| 僵尸绵羊（necroanimalict:zheep） | 0.1 | 城市内 · y≥50 · apocalypseMode 专属 |
| 僵尸猪（necroanimalict:zig） | 0.1 | 城市内 · y≥50 · apocalypseMode 专属 |
| 喘鸣体（undead_revamp2:thesmoker） | 0.1 | 城市内 · y≥50 |
| 爬行尸（zombie_extreme:crawler） | 0.1 | 城市内 · y≥60 |
| 被感染的警察（zombie_extreme:infected_police） | 0.1 | 城市内 · y≥50 |
| NPC·Rogue（customnpcs:customnpc#Rogue） | 0.05 | 城市内 · y≥60 |

### T2（摩天办公区 / 摩天住宅区）

| 怪物 | 概率/秒 | 条件 |
|---|---:|---|
| 僵尸猫（necroanimalict:zat） | 0.1 | 城市内 · y≥50 · apocalypseMode 专属 |
| 僵尸鸡（necroanimalict:zhick） | 0.1 | 城市内 · y≥50 · apocalypseMode 专属 |
| 僵尸山羊（necroanimalict:zoat） | 0.1 | 城市内 · y≥50 · apocalypseMode 专属 |
| 僵尸牛（necroanimalict:zow） | 0.1 | 城市内 · y≥50 · apocalypseMode 专属 |
| 脓爆尸（undead_revamp2:bomber） | 0.1 | 城市内 · y≥50 |
| 烟秽（undead_revamp2:theordure） | 0.1 | 城市内 · 室内 · y≥50 |
| 撞针体（undead_revamp2:therod） | 0.1 | 城市内 · 街道 · y≥50 |
| 喘鸣体（undead_revamp2:thesmoker） | 0.1 | 城市内 · y≥50 |
| 被感染的警察（zombie_extreme:infected_police） | 0.1 | 城市内 · y≥50 |
| 循猎魔（undead_revamp2:thehunter） | 0.05 | 城市内 · 街道 · y≥50 |
| NPC·Bandit（customnpcs:customnpc#Bandit） | 0.05 | 城市内 · y≥65 |

### T3（摩天酒店区 / 零售商业区）

| 怪物 | 概率/秒 | 条件 |
|---|---:|---|
| 僵尸猫（necroanimalict:zat） | 0.1 | 城市内 · y≥50 · apocalypseMode 专属 |
| 僵尸鸡（necroanimalict:zhick） | 0.1 | 城市内 · y≥50 · apocalypseMode 专属 |
| 僵尸羊驼（necroanimalict:zlama） | 0.1 | 城市内 · y≥50 · apocalypseMode 专属 |
| 僵尸山羊（necroanimalict:zoat） | 0.1 | 城市内 · y≥50 · apocalypseMode 专属 |
| 僵尸马（necroanimalict:zorse） | 0.1 | 城市内 · y≥50 · apocalypseMode 专属 |
| 僵尸牛（necroanimalict:zow） | 0.1 | 城市内 · y≥50 · apocalypseMode 专属 |
| 脓爆尸（undead_revamp2:bomber） | 0.1 | 城市内 · y≥50 |
| 月光花（undead_revamp2:the_moonflower） | 0.1 | 城市内 · y≥50 |
| 烟秽（undead_revamp2:theordure） | 0.1 | 城市内 · 室内 · y≥50 |
| 撞针体（undead_revamp2:therod） | 0.1 | 城市内 · 街道 · y≥50 |
| 养蛊人（undead_revamp2:theskeeper） | 0.1 | 城市内 · y≥50 |
| 喷吐者（undead_revamp2:thespitter） | 0.1 | 城市内 · y≥50 |
| 养蜂人（undead_revamp2:theswarmer） | 0.1 | 城市内 · y≥50 |
| 爆炸者（zombie_extreme:boomer） | 0.1 | 城市内 · y≥50 |
| 循声者（zombie_extreme:clicker） | 0.1 | 城市内 · y≥50 |
| 感染军人（zombie_extreme:infected_military） | 0.1 | 城市内 · y≥50 |
| 循猎魔（undead_revamp2:thehunter） | 0.05 | 城市内 · 街道 · y≥50 |
| NPC·Raider（customnpcs:customnpc#Raider） | 0.05 | 城市内 · y≥65 |

### T4（荒地）

| 怪物 | 概率/秒 | 条件 |
|---|---:|---|
| 守卫者（deaceased:guardian） | 0.1 | 城市内 · 室内 · y≥0 |
| 掘地怪（deaceased:thedigger） | 0.1 | 城市内 · y≥50 |
| 狂疫者（undead_revamp2:therabidus） | 0.1 | 城市内 · y≥50 |
| 被感染的防化员（zombie_extreme:infected_hazmat） | 0.1 | 城市内 · y≥50 |
| 感染军人（zombie_extreme:infected_military） | 0.1 | 城市内 · y≥50 |
| 膨肿怪（zombie_extreme:inflated） | 0.1 | 城市内 · y≥50 |
| Bone Man（necroanimalict:boneman） | 0.05 | 城市内 · y≥50 · apocalypseMode 专属 |
| 血痕僵尸熊（necroanimalict:scarred_zear） | 0.05 | 城市内 · y≥50 · apocalypseMode 专属 |
| 僵尸熊（necroanimalict:zear） | 0.05 | 城市内 · y≥50 · apocalypseMode 专属 |
| 僵尸狼（necroanimalict:zolf） | 0.05 | 城市内 · y≥50 · apocalypseMode 专属 |
| NPC·Plunderer（customnpcs:customnpc#Plunderer） | 0.05 | 城市内 · y≥50 |
| NPC·Soldier（customnpcs:customnpc#Soldier） | 0.05 | 城市内 · y≥50 |
| 巨脸怪（巨面）（deaceased:theface） | 0.03 | 街道 · y≥50 |
| 巨吸蚀怪（undead_revamp2:bigsucker） | 0.03 | 街道 · y≥50 |
| 狰狞巨脸（巨面）（deaceased:great_visage） | 0.01 | y≥50 |
| naturalist:boar（naturalist:boar） | 0.01 | y≥50 · y≤96 |
| naturalist:elephant（naturalist:elephant） | 0.01 | y≥50 · y≤96 |
| naturalist:lion（naturalist:lion） | 0.01 | y≥50 · y≤96 |
| naturalist:rhino（naturalist:rhino） | 0.01 | y≥50 · y≤96 |
| naturalist:giraffe（naturalist:giraffe） | 0.01 | y≥50 · y≤96 |
| naturalist:zebra（naturalist:zebra） | 0.01 | y≥50 · y≤96 |
| naturalist:moose（naturalist:moose） | 0.01 | y≥50 · y≤96 |
| naturalist:bluejay（naturalist:bluejay） | 0.01 | — |
| naturalist:butterfly（naturalist:butterfly） | 0.01 | — |
| naturalist:canary（naturalist:canary） | 0.01 | — |
| naturalist:cardinal（naturalist:cardinal） | 0.01 | — |
| naturalist:finch（naturalist:finch） | 0.01 | — |
| naturalist:sparrow（naturalist:sparrow） | 0.01 | — |
| naturalist:robin（naturalist:robin） | 0.01 | — |
| naturalist:vulture（naturalist:vulture） | 0.01 | — |
| naturalist:snail（naturalist:snail） | 0.01 | — |
| quark:shiba（quark:shiba） | 0.01 | — |
| minecraft:cat（minecraft:cat） | 0.01 | — |
| minecraft:wolf（minecraft:wolf） | 0.01 | — |

