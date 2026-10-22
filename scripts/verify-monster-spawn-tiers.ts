/**
 * 刷怪梯度表断言。
 * 用法：tsx scripts/verify-monster-spawn-tiers.ts
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

const data = readGlobal(ROOT, "public/data/monster-spawn-tiers.js", "WZ_MONSTER_SPAWN");
if (!data) {
  console.error("✗ 读不到 public/data/monster-spawn-tiers.js（先跑 npm run gen:spawntiers）");
  process.exit(1);
}
const E = data.entities as Record<string, any>;
const near = (a: number, b: number, eps = 0.011) => Math.abs(a - b) <= eps;

/* ---------------- 1. 结构与分布 ---------------- */
check(data.counts.T1 === 6, `T1 刷 6 只（实际 ${data.counts.T1}）`);
check(data.counts.T2 === 11, `T2 刷 11 只（实际 ${data.counts.T2}）`);
check(data.counts.T3 === 18, `T3 刷 18 只（实际 ${data.counts.T3}）`);
check(data.counts.T4 === 34, `T4 条目 34（含动物）（实际 ${data.counts.T4}）`);
check(Object.keys(E).length >= 140, `实体条目 ≥140（实际 ${Object.keys(E).length}）`);

const hostileT4 = data.byTier.T4.filter((x: any) => E[x.id].hostile).length;
const animalsT4 = data.byTier.T4.length - hostileT4;
check(hostileT4 === 15, `T4 敌人 15 只（实际 ${hostileT4}）`);
check(animalsT4 === 19, `T4 动物 19 只（实际 ${animalsT4}）`);

/* ---------------- 2. 锚点：几个典型怪的梯度 ---------------- */
const zombie = E["minecraft:zombie"];
check(!!zombie, "僵尸在表里");
check(!zombie.city.T1 && !zombie.city.T4, "僵尸不走区域规则（没有 T 列）");
check(near(zombie.anywhere.rate, 0.2), `僵尸全图规则 0.2/秒（实际 ${zombie.anywhere?.rate}）`);
check(zombie.horde.normal.length === 9, `僵尸出现在 9 张普通尸潮表（实际 ${zombie.horde.normal.length}）`);
check(zombie.horde.normal[0] === 15, "首次进普通尸潮表 15");
check(zombie.horde.hard[0] === 15, "首次进困难尸潮表 15");

const visage = E["deaceased:great_visage"];
check(!!visage && near(visage.city.T4.rate, 0.01), "狰狞巨脸只刷 T4，0.01/秒");
check(!visage.city.T1 && !visage.city.T2 && !visage.city.T3, "狰狞巨脸不在 T1–T3");
check(visage.horde.hard.includes(800), "狰狞巨脸在困难 800 天档的尸潮表里");

const moon = E["undead_revamp2:the_moonflower"];
check(!!moon && near(moon.city.T3.rate, 0.1), "月光花 T3 0.1/秒");
check(!moon.city.T1, "月光花不在 T1");

const police = E["zombie_extreme:infected_police"];
check(!!police && !!police.city.T1 && !!police.city.T2, "被感染的警察 T1/T2 都刷");

const sporeHuman = E["spore:inf_human"];
check(!!sporeHuman && !sporeHuman.city.T1 && !sporeHuman.city.T4, "菌染人类不走区域规则");
check(/abyss/.test((sporeHuman.anywhere?.conditions ?? []).join("")), "菌染人类的规则标了深渊维度");

const rogue = E["customnpcs:customnpc#Rogue"];
check(!!rogue && nearc(rogue.city.T1, 0.05), `NPC Rogue 只刷 T1 0.05/秒`);
check(!!E["customnpcs:customnpc#Soldier"]?.city.T4, "NPC Soldier 只刷 T4");

/* ---------------- 3. 一致性 ---------------- */
let withCity = 0;
let withHorde = 0;
let withBuilding = 0;
let nothing = 0;
for (const [id, e] of Object.entries<any>(E)) {
  const hasCity = Object.keys(e.city).length > 0;
  const hasAny = !!e.anywhere;
  const hasHorde = e.horde.normal.length + e.horde.hard.length > 0;
  const hasBuilding = e.buildings.length > 0;
  if (hasCity) withCity++;
  if (hasHorde) withHorde++;
  if (hasBuilding) withBuilding++;
  check(Array.isArray(e.horde.normal) && e.horde.normal.every((x: number) => x > 0), `尸潮表号是正数：${id}`);
  if (hasHorde) {
    check(e.horde.normal.every((x: number, i: number, a: number[]) => i === 0 || x > a[i - 1]), `普通尸潮表号递增：${id}`);
    check(e.horde.hard.every((x: number, i: number, a: number[]) => i === 0 || x > a[i - 1]), `困难尸潮表号递增：${id}`);
  }
  check(!(hasCity && !e.hostile && e.city.T1), `动物不应当出现在区域敌人列：${id}`);
}
check(withCity > 40, `区域刷怪条目 ≥40（实际 ${withCity}）`);
check(withHorde === 31, `出现在天数尸潮的实体 31（实际 ${withHorde}）`);
check(withBuilding > 20, `出现在建筑尸潮的实体 ≥20（实际 ${withBuilding}）`);

/* 未实装的怪：四个来源都空 */
const unimplemented = Object.entries<any>(E).filter(([, e]) => e.status === "unimplemented");
check(unimplemented.length >= 55, `未实装 ≥55 只（实际 ${unimplemented.length}）`);
for (const [id, e] of unimplemented) {
  check(!Object.keys(e.city).length && !e.anywhere && !e.horde.normal.length && !e.buildings.length, `未实装四个来源都空：${id}`);
}

/* ---------------- 4. 文档 ---------------- */
const doc = join(ROOT, "docs/monster-spawn-tiers.md");
check(existsSync(doc), "人读文档已生成");
const text = readFileSync(doc, "utf8");
check(text.includes("## 1. 梯度总览"), "文档含总览");
check(text.includes("## 2. 逐怪物梯度表"), "文档含逐怪表");
check(text.includes("## 3. 梯度视角"), "文档含梯度视角");
check(text.includes("### T1（郊区住宅区）"), "文档含 T1 小节");

console.log(`✓ 刷怪梯度表：${checks} 项断言通过`);
console.log(
  `  T1 ${data.counts.T1} · T2 ${data.counts.T2} · T3 ${data.counts.T3} · T4 ${data.counts.T4}（敌人 ${hostileT4} + 动物 ${animalsT4}）· 实体 ${Object.keys(E).length}`,
);

function nearc(cell: any, rate: number): boolean {
  return !!cell && near(cell.rate, rate);
}
