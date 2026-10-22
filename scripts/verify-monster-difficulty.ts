/**
 * 怪物难度数据表断言：生成结果必须满足的硬约束。
 * 用法：tsx scripts/verify-monster-difficulty.ts
 *
 * 数值来源与判据见 docs/monster-difficulty-analysis.md §8.5 / §5，
 * 生成器见 scripts/gen-monster-difficulty.ts。
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readGlobal } from "./pack-readers.js";

const ROOT = process.cwd();
let checks = 0;
function check(ok: boolean, what: string): void {
  checks++;
  if (!ok) {
    console.error(`✗ ${what}`);
    process.exit(1);
  }
}

const data = readGlobal(ROOT, "public/data/monsters-difficulty.js", "WZ_MONSTER_DIFF");
if (!data) {
  console.error("✗ 读不到 public/data/monsters-difficulty.js（先跑 npm run gen:monsters）");
  process.exit(1);
}
const guides = readGlobal(ROOT, "public/data/guides.js", "WZ_GUIDES");

const TIERS = ["T1", "T2", "T3", "T4"];
const near = (a: number | null, b: number, eps = 0.011) => a !== null && Math.abs(a - b) <= eps;
const E = data.entities as Record<string, any>;

/* ---------------- 1. 结构与来源 ---------------- */
check(data.source.entities >= 130, `实体数 ≥ 130（实际 ${data.source.entities}）`);
check(Object.keys(E).length >= 131, `实体条目 ≥ 131（实际 ${Object.keys(E).length}）`);
for (const id of [
  "minecraft:zombie",
  "minecraft:husk",
  "minecraft:drowned",
  "minecraft:spider",
  "minecraft:cave_spider",
  "zombie_extreme:infected_police",
  "undead_revamp2:great_visage",
  "deaceased:great_visage",
]) {
  if (id === "undead_revamp2:great_visage") continue;
  check(!!E[id], `实体存在：${id}`);
}
check(E["minecraft:zombie"].base.hp === 20 && E["minecraft:zombie"].base.dmg === 2, "僵尸基础值 20 血 / 2 攻击");
check(E["minecraft:husk"].baseSource === "vanilla", "尸壳标记为原版补值");
check(E["minecraft:zombie"].baseSource === "attribute.js", "僵尸来源是 attribute.js");

/* 只有僵尸/尸壳/溺尸吃普通难度的区域血量倍率 */
const scaledNormal = Object.keys(E).filter(
  (id) => E[id].city && TIERS.some((t) => E[id].city[t].normal.hp !== E[id].wild.normal.hp),
);
check(
  JSON.stringify(scaledNormal.sort()) === JSON.stringify(["minecraft:drowned", "minecraft:husk", "minecraft:zombie"]),
  `普通难度区域血量倍率只作用于僵尸/尸壳/溺尸（实际 ${scaledNormal.join(",")}）`,
);

/* ---------------- 2. 区域倍率（复算 §8.5.3） ---------------- */
const zombie = E["minecraft:zombie"];
const NORMAL_HP = { T1: 20, T2: 25, T3: 30, T4: 40 };
const HARD_HP = { T1: 25, T2: 37.5, T3: 52.5, T4: 80 };
for (const t of TIERS) {
  check(near(zombie.city[t].normal.hp, NORMAL_HP[t as keyof typeof NORMAL_HP]), `僵尸 ${t} 普通血量 = ${NORMAL_HP[t as keyof typeof NORMAL_HP]}（实际 ${zombie.city[t].normal.hp}）`);
  check(near(zombie.city[t].hard.hp, HARD_HP[t as keyof typeof HARD_HP]), `僵尸 ${t} 困难血量 = ${HARD_HP[t as keyof typeof HARD_HP]}（实际 ${zombie.city[t].hard.hp}）`);
  check(near(zombie.city[t].easy.hp, NORMAL_HP[t as keyof typeof NORMAL_HP] / 2), `僵尸 ${t} 简单血量 = 普通的一半（实际 ${zombie.city[t].easy.hp}）`);
}
check(near(zombie.wild.easy.hp, 10), "僵尸野外简单 10 血（×0.5）");
check(near(zombie.wild.normal.hp, 20), "僵尸野外普通不吃区域倍率");
check(near(zombie.wild.hard.hp, 20), "僵尸野外困难不吃区域倍率");
check(near(zombie.city.T4.normal.armor, 3), "僵尸 T4 普通护甲 ×1.5 = 3");
check(near(zombie.city.T3.normal.armor, 2.5), "僵尸 T3 普通护甲 ×1.25 = 2.5");

/* 非僵尸类在普通难度不吃区域倍率（例如警察） */
const police = E["zombie_extreme:infected_police"];
check(near(police.city.T4.normal.hp, police.base.hp), "非僵尸类普通难度不吃区域血量倍率");
check(near(police.city.T4.hard.hp, police.base.hp * 2), "非僵尸类困难难度吃 ×2.0 血量倍率");
check(near(police.horde.hard.hp, police.base.hp * 2), "尸潮困难 ×2 血量");
check(near(police.horde.normal.hp, police.base.hp), "尸潮普通不吃倍率");

/* 简单批只作用于 hostile */
const bear = E["naturalist:bear"];
check(bear && bear.hostile === false, "naturalist 动物标记为非 hostile");
check(near(bear.wild.easy.hp, bear.base.hp), "非 hostile 不吃简单 ×0.5");

/* 蜘蛛洞穴层 */
for (const id of ["minecraft:spider", "minecraft:cave_spider"]) {
  const depth = E[id].depth ?? [];
  check(depth.length === 2, `${id} 有两条洞穴倍率`);
  check(near(depth[0].hp, E[id].base.hp * 1.25), `${id} y≤0 血量 ×1.25`);
  check(near(depth[1].hp, E[id].base.hp * 1.5), `${id} y≤-30 血量 ×1.5`);
}

/* ---------------- 3. 尸潮 ---------------- */
const H = data.horde;
check(H.spawnAmount === 20, `每波 20 只（实际 ${H.spawnAmount}）`);
check(H.wavesPerEvent === 5, `每场 5 次（实际 ${H.wavesPerEvent}）`);
check(near(H.expectedPerEvent, 100), `每场约 100 只（实际 ${H.expectedPerEvent}）`);
check(H.bands.normal.length === 17, `普通档 17 张表（实际 ${H.bands.normal.length}）`);
check(H.bands.hard.length === 21, `困难档 21 张表（实际 ${H.bands.hard.length}）`);

const first = H.bands.normal[0];
check(first.table === 15, `首档是表 15（实际 ${first.table}）`);
check(JSON.stringify(first.playerDay) === JSON.stringify([0, 28]), `首档覆盖玩家天数 0–28（实际 ${JSON.stringify(first.playerDay)}）`);
check(JSON.stringify(first.worldDays) === JSON.stringify([15]), `首档对应世界第 15 天（实际 ${JSON.stringify(first.worldDays)}）`);
check(near(first.expectTotal, 20), `首档单波期望合计 = 20（实际 ${first.expectTotal}）`);

for (const diff of ["normal", "hard"] as const) {
  for (const band of H.bands[diff]) {
    check(band.rows.length >= 1, `${diff} 表 ${band.table} 至少一个条目`);
    check(near(band.expectTotal, H.spawnAmount), `${diff} 表 ${band.table} 单波合计 ${band.expectTotal} ≠ ${H.spawnAmount}`);
    for (const row of band.rows) {
      check(!!E[row.id], `${diff} 表 ${band.table} 的实体存在于数据表：${row.id}`);
      check(row.expect >= 0, `${diff} 表 ${band.table} 期望非负：${row.id}`);
    }
  }
  const last = H.bands[diff][H.bands[diff].length - 1];
  check(last.playerDay[1] === null && last.worldDaysFrom !== null, `${diff} 最后一档开放结束且给出起始世界天数`);
}

/* 首次出现的表按天数递增 */
for (const diff of ["normal", "hard"] as const) {
  const bands = H.bands[diff];
  for (let i = 1; i < bands.length; i++) {
    check(bands[i].playerDay[0] > bands[i - 1].playerDay[0], `${diff} 档位天数递增：${bands[i].table}`);
  }
}

/* 尸潮实体都带 horde 场景数值或有占位标记 */
for (const [id, e] of Object.entries<any>(E)) {
  if (!e.hordeTables || e.statsMissing) continue;
  check(!!e.horde && near(e.horde.hard.hp, e.base.hp * 2), `尸潮实体困难血量 ×2：${id}`);
}

/* 尸潮落在城区时：区域倍率再叠一层（困难荒地僵尸 = 2×2×2 = 8×） */
check(near(zombie.horde.normal.hp, 20), "僵尸野外尸潮·普通 20 血");
check(near(zombie.horde.hard.hp, 40), "僵尸野外尸潮·困难 40 血（事件 ×2）");
check(near(zombie.horde.city.T1.hard.hp, 50), "僵尸城区 T1 尸潮·困难 50 血（1.25×2）");
check(near(zombie.horde.city.T2.hard.hp, 60), "僵尸城区 T2 尸潮·困难 60 血（1.5×2）");
check(near(zombie.horde.city.T3.hard.hp, 70), "僵尸城区 T3 尸潮·困难 70 血（1.75×2，实测值）");
check(near(zombie.horde.city.T4.hard.hp, 80), "僵尸城区 T4 尸潮·困难 80 血（2×2，实测值）");
check(near(zombie.horde.city.T4.hard.armor, 6), "僵尸城区 T4 尸潮·困难 护甲 6（×3）");
check(near(zombie.horde.city.T4.hard.dmg, 4.5), "僵尸城区 T4 尸潮·困难 攻击 4.5（×2.25）");
check(near(zombie.horde.city.T4.normal.hp, 20), "尸潮不吃 finalize：普通难度尸潮僵尸仍是 20 血");
check(near(police.horde.city.T4.hard.hp, police.base.hp * 4), "非僵尸类城区 T4 尸潮·困难 = 4×（区域 ×2 × 事件 ×2）");

/* 剧面（4000 血）作为困难尸潮的锚点 */
const visage = E["deaceased:great_visage"];
check(visage && near(visage.base.hp, 4000), "狰狞巨脸基础 4000 血");
check(near(visage.horde.hard.hp, 8000), "狰狞巨脸困难尸潮 8000 血");

/* ---------------- 4. 站点区域→阶级一致 ---------------- */
/* 站点里的「区域 → 阶级」权威来源是 NPC 章节（每个 NPC 标了所在区域与 T 级） */
const npcRegionTier = new Map<string, Set<string>>();
for (const n of guides?.npcs ?? []) {
  if (!n?.region || !n?.tier) continue;
  if (!npcRegionTier.has(n.region)) npcRegionTier.set(n.region, new Set());
  npcRegionTier.get(n.region)!.add(String(n.tier));
}
const expectRegion: Record<string, string> = {
  郊区住宅区: "T1",
  摩天办公区: "T2",
  摩天住宅区: "T2",
  摩天酒店区: "T3",
  零售商业区: "T3",
  荒地: "T4",
};
let regionChecked = 0;
for (const [region, tier] of Object.entries(expectRegion)) {
  const found = npcRegionTier.get(region);
  check(!!found, `站点 NPC 章节里有区域「${region}」`);
  regionChecked++;
  check(found!.size === 1 && found!.has(tier), `站点区域「${region}」映射到 ${tier}（实际 ${[...found!].join(",")}）`);
}
check(regionChecked === 6, `站点 6 个区域全部交叉校验（实际 ${regionChecked}）`);

/* ---------------- 5. 无 NaN / 无遗漏 ---------------- */
let cells = 0;
for (const [id, e] of Object.entries<any>(E)) {
  if (e.statsMissing) {
    check(e.base === null, `占位实体没有 base：${id}`);
    continue;
  }
  check(e.base.hp !== null, `实体有基础血量：${id}`);
  for (const t of TIERS) {
    for (const diff of ["easy", "normal", "hard"]) {
      const c = e.city[t][diff];
      cells++;
      for (const k of ["hp", "dmg", "armor", "toPlayer"]) {
        check(typeof c[k] === "number" && Number.isFinite(c[k]), `${id} ${t} ${diff} ${k} 是有限数字（实际 ${c[k]}）`);
        check(c[k] >= 0, `${id} ${t} ${diff} ${k} 非负`);
      }
    }
  }
}
check(cells > 1000, `至少校验 1000 个单元格（实际 ${cells}）`);

/* 文档存在且列了抽样 */
const doc = join(ROOT, "docs/monster-difficulty-table.md");
check(existsSync(doc), "人读表格已生成");
const docText = readFileSync(doc, "utf8");
check(docText.includes("## 2. 抽样"), "文档含抽样章节");
check(docText.includes("### 僵尸（minecraft:zombie）"), "文档含僵尸抽样表");

console.log(`✓ 怪物难度数据表：${checks} 项断言通过`);
console.log(`  实体 ${Object.keys(E).length} · 单元格 ${cells} · 尸潮档 ${H.bands.normal.length}/${H.bands.hard.length}`);
