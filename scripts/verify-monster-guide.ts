/**
 * 生物图鉴目录断言：手写 167 条与生成数据 153 条按实体 id 合并后的口径。
 * 用法：tsx scripts/verify-monster-guide.ts
 *
 * 这里锁的是「页面拿到的目录」而不是中间数据：site 与文档引用的是同一个 buildCatalog()。
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readGlobal } from "./pack-readers.js";
import {
  buildCatalog,
  entryMatrix,
  quickRows,
  buildingStats,
  THREATS,
  TIERS,
  METRIC_ICON,
  normalizeId,
} from "../src/client/monsters";

const ROOT = process.cwd();
let checks = 0;
function check(ok: boolean, what: string): void {
  checks++;
  if (!ok) {
    console.error(`✗ ${what}`);
    process.exit(1);
  }
}
const near = (a: number | null | undefined, b: number, eps = 0.051) =>
  a != null && Math.abs(Number(a) - b) <= eps;

const guides = readGlobal(ROOT, "public/data/guides.js", "WZ_GUIDES");
const spawn = readGlobal(ROOT, "public/data/monster-spawn-tiers.js", "WZ_MONSTER_SPAWN");
const diff = readGlobal(ROOT, "public/data/monsters-difficulty.js", "WZ_MONSTER_DIFF");
const buildings = readGlobal(ROOT, "public/data/horde-buildings.js", "WZ_HORDE_BUILDINGS");
for (const [d, name] of [
  [guides, "guides.js"],
  [spawn, "monster-spawn-tiers.js"],
  [diff, "monsters-difficulty.js"],
  [buildings, "horde-buildings.js"],
] as const) {
  if (!d) {
    console.error(`✗ 读不到 public/data/${name}`);
    process.exit(1);
  }
}

const input = { guides, spawn, diff, buildings };
const cat = buildCatalog(input);
const byId = cat.byId;

/* ---------------- 1. 目录总量 ---------------- */
check(guides.monsters.length === 167, `手写条目 167（实际 ${guides.monsters.length}）`);
check(Object.keys(spawn.entities).length === 153, `生成实体 153（实际 ${Object.keys(spawn.entities).length}）`);
check(cat.counts.total === 200, `合并后目录 200 条（实际 ${cat.counts.total}）`);
check(cat.counts.curatedMerged === 120, `手写与生成合流 120 条（实际 ${cat.counts.curatedMerged}）`);
check(cat.counts.spawns === 93, `会刷 93 条（实际 ${cat.counts.spawns}）`);
check(cat.counts.animals === 21, `中立动物 21 条（实际 ${cat.counts.animals}）`);
check(cat.counts.monsters === 72, `怪物 72 条 = 会刷 93 − 动物 21（实际 ${cat.counts.monsters}）`);
check(cat.animalIds.length === 21, "动物清单 21 条");
check(
  cat.animalIds.every((id) => cat.byId.get(id)!.kind === "neutral" && cat.byId.get(id)!.status === "spawns"),
  "动物清单全是中立且会刷",
);
const animalStats = cat.animalIds.filter((id) => cat.byId.get(id)!.hasStats);
check(animalStats.length === 6, `6 种动物在属性脚本里有数值（实际 ${animalStats.length}）`);
check(animalStats.includes("naturalist:elephant"), "大象有数值");
check(!cat.byId.get("naturalist:giraffe")!.hasStats, "长颈鹿没有数值");
check(cat.animalIds.includes("naturalist:giraffe") && cat.animalIds.includes("minecraft:cat"), "长颈鹿与猫在动物清单");
check(!cat.animalIds.includes("necroanimalict:zheep"), "僵尸羊仍留在怪物清单");
const monsterT4 = cat.tierIds.T4.filter((id) => cat.byId.get(id)!.kind !== "neutral").length;
const monsterAny = cat.anywhereIds.filter((id) => cat.byId.get(id)!.kind !== "neutral").length;
check(monsterT4 === 15, `怪物页 T4 分组 15 条（实际 ${monsterT4}）`);
check(monsterAny === 28, `怪物页全图分组 28 条（实际 ${monsterAny}）`);
check(cat.counts.unimplemented === 60, `确认未实装 60 条（实际 ${cat.counts.unimplemented}）`);
check(cat.counts.unconfirmed === 47, `来源未确认 47 条（实际 ${cat.counts.unconfirmed}）`);
check(
  cat.counts.spawns + cat.counts.unimplemented + cat.counts.unconfirmed === cat.counts.total,
  "三类之和等于总数（互斥且不漏）",
);

/* ---------------- 2. id 与命名 ---------------- */
check(new Set(cat.entries.map((e) => e.id)).size === cat.entries.length, "目录内 id 唯一");
check(!byId.has("hordes:zombieplayer"), "hordes:zombieplayer 已归并到 hordes:zombie_player");
check(byId.has("hordes:zombie_player"), "hordes:zombie_player 在目录里");
check(byId.get("hordes:zombie_player")!.curated, "归并后带上了手写条目");
check(normalizeId("hordes:drownedplayer") === "hordes:drowned_player", "drowned 玩家变体 id 修正");
check(normalizeId("hordes:huskplayer") === "hordes:husk_player", "husk 玩家变体 id 修正");
const nameless = cat.entries.filter((e) => !e.name || e.name === e.id);
check(nameless.length === 0, `每条都有名字（缺 ${nameless.length}）`);

/* ---------------- 3. 梯度分组 ---------------- */
check(cat.tierIds.T1.length === 6, `T1 分组 6 只（实际 ${cat.tierIds.T1.length}）`);
check(cat.tierIds.T2.length === 11, `T2 分组 11 只（实际 ${cat.tierIds.T2.length}）`);
check(cat.tierIds.T3.length === 18, `T3 分组 18 只（实际 ${cat.tierIds.T3.length}）`);
check(cat.tierIds.T4.length === 34, `T4 分组 34 只（实际 ${cat.tierIds.T4.length}）`);
check(cat.anywhereIds.length === 30, `全图分组 30 只（实际 ${cat.anywhereIds.length}）`);
check(cat.abyssIds.length === 5, `深渊分组 5 只（实际 ${cat.abyssIds.length}）`);
check(cat.abyssIds.includes("spore:inf_husk"), "菌染尸壳在深渊组");
check(!cat.anywhereIds.includes("spore:inf_husk"), "深渊怪不算全图");
check(entryMatrix(byId.get("spore:inf_husk")!, input).every((s) => !s.key.startsWith("city-")), "深渊专属怪不显示城区段");
check(entryMatrix(byId.get("minecraft:zombie")!, input).some((s) => s.key === "city-T1"), "僵尸仍显示城区段");
check(cat.anywhereIds.includes("minecraft:zombie"), "僵尸在「全图」组");
check(cat.anywhereIds.includes("minecraft:husk"), "尸壳随僵尸进「全图」组");
check(cat.anywhereIds.includes("minecraft:drowned"), "溺尸随僵尸进「全图」组");
check(cat.tierIds.T1.includes("zombie_extreme:crawler"), "爬行尸在 T1");
check(!cat.tierIds.T4.includes("zombie_extreme:crawler"), "爬行尸不在 T4");
check(cat.tierIds.T1.includes("customnpcs:customnpc#Rogue"), "NPC·Rogue 在 T1");
check(cat.byId.get("zombie_extreme:crawler")!.kind === "hostile", "爬行尸是敌对");
check(cat.byId.get("naturalist:giraffe")!.kind === "neutral", "长颈鹿是中立");
check(cat.byId.get("customnpcs:customnpc#Bandit")!.kind === "npc", "Bandit 是 NPC");

/* 未实装不得带任何刷怪来源 */
for (const e of cat.entries) {
  if (e.status !== "unimplemented") continue;
  check(
    !e.tiers.length && !e.anywhere && !e.horde.normal.length && !e.horde.hard.length && !e.buildings.length,
    `${e.name} 判为未实装但仍有刷怪来源`,
  );
}
check(
  cat.entries.filter((e) => e.status === "unimplemented" && e.id.startsWith("spore:")).length === 49,
  "未实装里 49 只 Spore 实体",
);
check(
  cat.entries.filter((e) => e.status === "unconfirmed").every((e) => !e.generated),
  "来源未确认的都不在生成数据里",
);

/* ---------------- 4. 威胁等级 ---------------- */
const threats = new Set(THREATS as readonly string[]);
for (const e of cat.entries) check(threats.has(e.threat), `${e.name} 的威胁等级非法：${e.threat}`);
check(byId.get("minecraft:zombie")!.threat === "普通", "僵尸按手写等级=普通");
check(byId.get("spore:howitzer")!.threat === "灾厄", "菌械重炮按手写等级=灾厄");
check(byId.get("spore:brute")!.threat === "真菌", "蛮兽按手写等级=真菌");
const bucket = cat.entries.filter((e) => !e.level);
check(bucket.length > 0, "存在只能靠血量分档的条目");
check(bucket.every((e) => e.threat !== ""), "血量分档条目都有等级");

/* ---------------- 5. 数值矩阵锚点 ---------------- */
const zombie = byId.get("minecraft:zombie")!;
check(near(zombie.base?.hp, 20) && near(zombie.base?.dmg, 2) && near(zombie.base?.armor, 2), "僵尸基础 20/2/2");
const zMat = entryMatrix(zombie, input);
check(zMat.length === 7, `僵尸矩阵 7 段（野外 + 城区 T1–T4 + 天数尸潮 + 建筑尸潮）（实际 ${zMat.length}）`);
check(zMat[0].key === "wild", "首段是野外");
const zCityT1 = diff.entities["minecraft:zombie"].city.T1.hard;
check(near(zCityT1.hp, 25) && near(zCityT1.toPlayer, 3.75), "僵尸 T1 城区困难 25 血 / 3.75 对玩家");
const zHorde = zMat.find((s) => s.key === "horde")!;
check(zHorde.rows.length === 2, "天数尸潮段有普通 / 困难两行");
check(near(zHorde.rows[1].stats?.hp, 40), "僵尸天数尸潮困难 40 血");
const zHordeCity = zMat.find((s) => s.key === "horde-city")!;
check(zHordeCity.rows.length === 8, `建筑尸潮段 4 档 × 普通/困难 = 8 行（实际 ${zHordeCity.rows.length}）`);
check(near(zHordeCity.rows[0].stats?.hp, 20), "僵尸 T1 建筑尸潮·普通难度仍是 20 血（困难难度才叠区域倍率）");
check(near(zHordeCity.rows[1].stats?.hp, 50) && near(zHordeCity.rows[1].stats?.toPlayer, 5.63), "僵尸 T1 建筑尸潮困难 50 血 / 5.63");

/* 快览只给困难列，且覆盖 T1–T4 / 天数尸潮 / 建筑尸潮 */
const quick = quickRows(zombie, input);
const labels = quick.map((r) => r.label);
for (const want of ["野外", "城区 T1", "城区 T2", "城区 T3", "城区 T4", "天数尸潮", "建筑尸潮 T1", "建筑尸潮 T4"]) {
  check(labels.includes(want), `僵尸快览含「${want}」`);
}
check(near(quick.find((r) => r.label === "城区 T1")!.stats?.hp, 25), "僵尸快览 城区 T1 困难 25");

/* 真菌 Boss 的深渊与深渊尸潮推算 */
const howitzer = byId.get("spore:howitzer")!;
const hMat = entryMatrix(howitzer, input);
check(hMat.some((s) => s.key === "abyss"), "菌械重炮矩阵含深渊段");
check(hMat.some((s) => s.key === "abyss-horde"), "菌械重炮矩阵含深渊尸潮推算段");
const abyssHard = hMat.find((s) => s.key === "abyss")!.rows.find((r) => r.label === "困难")!;
check(near(abyssHard.stats?.hp, 12000), `菌械重炮 深渊困难 12000 血（实际 ${abyssHard.stats?.hp}）`);
check(near(abyssHard.stats?.armor, 127.5), "菌械重炮 深渊困难护甲 ×1.5");
const abyssHorde = hMat.find((s) => s.key === "abyss-horde")!.rows[0];
check(near(abyssHorde.stats?.hp, 24000), "菌械重炮 深渊尸潮推算 24000 血");

/* ---------------- 6. 尸潮建筑数值 ---------------- */
const zBuild = buildingStats(zombie, input);
check(zBuild.length >= 20, `僵尸出现在 ${zBuild.length} 座尸潮建筑`);
const police = zBuild.find((b) => b.key === "multi_policestation");
check(!!police, "僵尸出现在派出所");
check(near(police!.hp, 50), "派出所僵尸困难 50 血");
check(near(police!.toPlayer, 5.63), "派出所僵尸对玩家 5.63");
check(police!.tier === "T1", "派出所属于 T1");

/* ---------------- 7. 页面接线 ---------------- */
const html = readFileSync(join(ROOT, "index.html"), "utf8");
for (const f of ["monsters-difficulty.js", "horde-buildings.js", "monster-spawn-tiers.js"]) {
  check(html.includes("/data/" + f), `index.html 引入 ${f}`);
}
const swSrc = readFileSync(join(ROOT, "scripts/build-sw.ts"), "utf8");
for (const f of ["fusion-pixel-10px-monospaced-latin.otf.woff2", "fusion-pixel-10px-monospaced-zh_hans.otf.woff2"]) {
  check(existsSync(join(ROOT, "public/fonts", f)), `像素字体存在：${f}`);
  check(readFileSync(join(ROOT, "public/css/app.css"), "utf8").includes(f), `CSS 引入字体 ${f}`);
  check(swSrc.includes("./fonts/" + f), `SW 预缓存字体 ${f}`);
}
check(existsSync(join(ROOT, "public/fonts/OFL.txt")), "字体许可证 OFL.txt 随包分发");
check(readFileSync(join(ROOT, "public/fonts/OFL.txt"), "utf8").includes("SIL OPEN FONT LICENSE"), "OFL 全文完整");
const sw = swSrc;
for (const f of ["monsters-difficulty.js", "horde-buildings.js", "monster-spawn-tiers.js"]) {
  check(sw.includes("./data/" + f), `Service Worker 预缓存 ${f}`);
}
const app = readFileSync(join(ROOT, "src/client/app.ts"), "utf8");
check(app.includes("buildCatalog("), "app.ts 走 buildCatalog");
check(app.includes('data-action="monster-nums"'), "列表行有「数值」入口");
check(app.includes("monsterCatalog()"), "目录只构建一次");
check(app.includes("renderAnimals"), "动物页存在");
check(app.includes("#/creatures/animals"), "生物 hub 有动物入口");
check(app.includes('m.kind !== "neutral"'), "怪物清单排除动物");
check(app.includes("animalSpawnText"), "动物行给的是刷新规则");
check(app.includes("monsterAvatar(m, 40)"), "列表行左侧有生物图标");
check(app.includes('m.kind === "npc" ? "users"'), "无立绘时按类别给图标");
const css = readFileSync(join(ROOT, "public/css/app.css"), "utf8");
check(css.includes('[data-theme="light"] .num-btn'), "数值按钮的白底只在浅色主题生效");
check(!/(^|\n)\.num-btn \{ background: #fff; \}/.test(css), "没有裸 .num-btn 白底（暗色下会白字白底）");
check(/\.ico-hp \{ background-image: url\("\/images\/ui\/stat-heart-half\.png"\);/.test(css), "生命图标用半心（1 个 = 1 点）");
check(/\.ico-armor \{ background-image: url\("\/images\/ui\/stat-armor-half\.png"\);/.test(css), "护甲图标用半甲");
check(!/\.ico-hp \{ background-image: url\("[^"]*full/.test(css), "生命图标不再是满心");
check(!/\.ico-armor \{ background-image: url\("[^"]*full/.test(css), "护甲图标不再是满甲");
check(METRIC_ICON.hp.includes("stat-heart-half"), "METRIC_ICON.hp 指向半心文件");
check(METRIC_ICON.armor.includes("stat-armor-half"), "METRIC_ICON.armor 指向半甲文件");
check(/\.music-fab \{[^}]*right: 0;/s.test(css), "音乐按钮贴屏幕最右边");
check(!/\.music-fab \{[^}]*calc\(\(100vw - 760px\)/s.test(css), "音乐按钮不再按内容栏居中（面板 .music-panel 保持原样）");
for (const icon of [
  "stat-heart-full.png",
  "stat-heart-empty.png",
  "stat-armor-full.png",
  "stat-armor-empty.png",
  "stat-attack.png",
  "stat-heart-half.png",
  "stat-armor-half.png",
]) {
  check(existsSync(join(ROOT, "public/images/ui", icon)), `HUD 图标存在：${icon}`);
}
// 半点制之后，满心 / 满甲不再用在数值上（只留文件备查），实际用到的这五个必须被 CSS 引用
for (const icon of ["stat-heart-half.png", "stat-armor-half.png", "stat-heart-empty.png", "stat-armor-empty.png", "stat-attack.png"]) {
  check(readFileSync(join(ROOT, "public/css/app.css"), "utf8").includes(icon), `CSS 用到图标 ${icon}`);
}

/* ---------------- 8. 未实装详情不带假设数值 ---------------- */
const unimplemented = cat.entries.find((e) => e.status === "unimplemented" && e.hasStats)!;
check(!!unimplemented, "存在有属性但未实装的实体");
check(entryMatrix(unimplemented, input).length > 0, "它本身仍有可算的矩阵数据");
check(app.includes('m.status === "unimplemented"'), "详情页对未实装做了分支");
check(app.includes("const sections = spawns ? entryMatrix"), "未实装不渲染数值矩阵");

/* ---------------- 列表 / 网格视图（guide monster-grid 的移植） ---------------- */
{
  const css = readFileSync(join(ROOT, "public/css/app.css"), "utf8");
  check(app.includes('monsterView: "list"'), "网格视图默认关闭（默认仍是列表）");
  check(app.includes('data-action="monster-view"'), "有列表 / 网格切换按钮");
  check(app.includes('"list monster-cards"'), "网格模式给列表容器加 monster-cards");
  check(app.includes('localStorage.setItem("wz_monster_view"'), "视图选择记在本地");
  check(/\.list\.monster-cards \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/s.test(css), "网格视图两列");
  check(/@media \(max-width: 560px\) \{ \.list\.monster-cards \{ grid-template-columns: 1fr; \} \}/.test(css), "窄屏网格退化为单列");
}

console.log(`✓ 生物图鉴目录：${checks} 项断言通过`);
console.log(
  `  共 ${cat.counts.total} 条 · 会刷 ${cat.counts.spawns}（T1 ${cat.tierIds.T1.length} / T2 ${cat.tierIds.T2.length} / T3 ${cat.tierIds.T3.length} / T4 ${cat.tierIds.T4.length} / 全图 ${cat.anywhereIds.length} / 深渊 ${cat.abyssIds.length}）· 未实装 ${cat.counts.unimplemented} + 来源未确认 ${cat.counts.unconfirmed}`,
);
