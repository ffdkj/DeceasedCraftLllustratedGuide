/**
 * 尸潮建筑清单断言。
 * 用法：tsx scripts/verify-horde-buildings.ts
 *
 * 生成器见 scripts/gen-horde-buildings.ts；数据口径见 docs/horde-buildings.md。
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

const data = readGlobal(ROOT, "public/data/horde-buildings.js", "WZ_HORDE_BUILDINGS");
if (!data) {
  console.error("✗ 读不到 public/data/horde-buildings.js（先跑 npm run gen:hordebuildings）");
  process.exit(1);
}
const diff = readGlobal(ROOT, "public/data/monsters-difficulty.js", "WZ_MONSTER_DIFF");
if (!diff) {
  console.error("✗ 读不到 public/data/monsters-difficulty.js（先跑 npm run gen:monsters）");
  process.exit(1);
}

const near = (a: number, b: number, eps = 0.11) => Math.abs(a - b) <= eps;
const B = data.buildings as any[];
const M = data.mobs as Record<string, any>;
const byKey = new Map(B.map((b) => [b.key, b]));

/* ---------------- 1. 结构 ---------------- */
check(B.length === 33, `建筑 33 个（实际 ${B.length}）`);
check(data.counts.defs === 23, `定义文件 23 份（实际 ${data.counts.defs}）`);
check(new Set(B.map((b) => b.key)).size === B.length, "建筑 key 不重复");
check(B.every((b) => b.mobs.length >= 1), "每个建筑至少一种怪");
check(B.every((b) => b.tier === "T1" || b.tier === "T2" || b.tier === "T3" || b.tier === "T4"), "每个建筑都有阶级");
check(B.filter((b) => b.kind === "generic").length === 14, `通用尸潮建筑 14 个（实际 ${B.filter((b) => b.kind === "generic").length}）`);

/* 占比合计 100、期望只数合计 ≈ 规模均值 */
for (const b of B) {
  const share = b.mobs.reduce((s: number, m: any) => s + m.share, 0);
  check(near(share, 100, 0.6), `占比合计 100%：${b.key}（实际 ${share.toFixed(2)}%）`);
  const expect = b.mobs.reduce((s: number, m: any) => s + m.expect, 0);
  check(near(expect, b.amount.avg, 0.6), `期望只数合计 ≈ 规模均值：${b.key}（${expect.toFixed(1)} vs ${b.amount.avg}）`);
  for (const m of b.mobs) {
    check(!!diff.entities[m.id], `建筑里的怪在难度数据表里：${b.key} → ${m.id}`);
    check(typeof m.hpNormal === "number" && Number.isFinite(m.hpNormal), `普通血量是数字：${m.id}`);
    check(typeof m.hpHard === "number" && Number.isFinite(m.hpHard), `困难血量是数字：${m.id}`);
  }
}

/* ---------------- 2. 锚点 ---------------- */
const air = byKey.get("multi_airforcebase");
check(!!air, "存在 C-X联合军事中心");
check(air.tier === "T4" && air.district === "wasteland", "军事中心属 T4 荒地");
check(air.amount.min === 60 && air.amount.max === 70, `军事中心规模 60–70（实际 ${air.amount.min}–${air.amount.max}）`);
check(air.healthBonus.min === 1.25, `军事中心血量 ×1.25（实际 ${air.healthBonus.min}）`);
check(air.mobs.length === 6, `军事中心 6 种怪（实际 ${air.mobs.length}）`);
check(air.spawnMaxInBuilding === 20, "军事中心同屏 20");
const airZombie = air.mobs.find((m: any) => m.id === "minecraft:zombie");
check(!!airZombie, "军事中心名单里有僵尸");
check(near(airZombie.hpNormal, 50, 0.02), `军事中心僵尸普通血量 50（实际 ${airZombie.hpNormal}）`);
check(near(airZombie.hpHard, 200, 0.02), `军事中心僵尸困难血量 200（40×1.25×2×2）（实际 ${airZombie.hpHard}）`);
check(near(airZombie.expect, 14.8, 0.15), `军事中心僵尸期望 14.8 只（实际 ${airZombie.expect}）`);

const police = byKey.get("multi_policestation");
check(!!police, "存在派出所");
check(police.tier === "T1", "派出所属 T1");
check(police.healthBonus.min === 0.75, `派出所血量 ×0.75（实际 ${police.healthBonus.min}）`);
check(police.mobs.length === 2, `派出所 2 种怪（实际 ${police.mobs.length}）`);
check(police.mobs.some((m: any) => m.id === "zombie_extreme:infected_police"), "派出所名单里有被感染的警察");

const nuke = byKey.get("multi_nuclearpowerplant");
check(!!nuke && nuke.amount.max === 90, "核电站规模 80–90");

/* ---------------- 3. 来源分类 ---------------- */
check(data.counts.mobs === 130, `参与分类的实体 130（实际 ${data.counts.mobs}）`);
check(data.counts.normal === 70, `正常刷新 70（实际 ${data.counts.normal}）`);
check(data.counts.hordeOnly === 0, `仅尸潮 0 只（实际 ${data.counts.hordeOnly}）`);
check(data.counts.unimplemented === 60, `未实装 60 只（实际 ${data.counts.unimplemented}）`);

const unimplemented = Object.entries(M).filter(([, m]) => m.status === "unimplemented");
const sporeUnimpl = unimplemented.filter(([id]) => id.startsWith("spore:"));
check(sporeUnimpl.length >= 45, `未实装里真菌模组 ≥45 只（实际 ${sporeUnimpl.length}）`);
check(!!M["hordes:zombie_player"] && M["hordes:zombie_player"].status === "unimplemented", "hordes 玩家变体标为未实装");
check(!!M["deaceased:bugger"] && M["deaceased:bugger"].status === "unimplemented", "bugger（自然刷权重 0）标为未实装");
check(M["minecraft:zombie"].status === "normal", "僵尸是正常刷新");
check(M["minecraft:zombie"].sources.includes("区域刷怪器"), "僵尸来源含区域刷怪器");
check(M["zombie_extreme:infected_police"].sources.includes("区域刷怪器"), "被感染的警察来源含区域刷怪器");
check(!M["minecraft:husk"], "husk 不参与来源分类（难度表里是原版补值）");

/* 每只怪要么有来源、要么未实装，不能两头空/两头有 */
for (const [id, m] of Object.entries(M)) {
  check(Array.isArray(m.sources), `sources 是数组：${id}`);
  check(m.status === "unimplemented" ? m.sources.length === 0 : m.sources.length > 0, `状态与来源一致：${id}`);
  check(!(m.status === "hordeOnly" && m.sources.some((s: string) => s.includes("刷怪器") || s.includes("自然"))), `仅尸潮不含正常来源：${id}`);
}

/* ---------------- 4. 数据问题 ---------------- */
check(
  JSON.stringify(data.missingHordeIds) === JSON.stringify(["undead_revamp2:night_hunter"]),
  `尸潮表里的无效 id 只有 undead_revamp2:night_hunter（实际 ${JSON.stringify(data.missingHordeIds)}）`,
);

/* ---------------- 5. 文档 ---------------- */
const doc = join(ROOT, "docs/horde-buildings.md");
check(existsSync(doc), "人读清单已生成");
const text = readFileSync(doc, "utf8");
check(text.includes("## 2. 逐建筑清单"), "文档含逐建筑清单");
check(text.includes("#### C-X联合军事中心"), "文档含军事中心小节");
check(text.includes("## 3. 刷怪来源分类") || text.includes("### 未实装"), "文档含来源分类");

console.log(`✓ 尸潮建筑清单：${checks} 项断言通过`);
console.log(`  建筑 ${B.length} · 怪物 ${Object.keys(M).length}（正常 ${data.counts.normal} / 未实装 ${data.counts.unimplemented}）`);
