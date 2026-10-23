/**
 * 生成 public/data/monster-spawn-tiers.js + docs/monster-spawn-tiers.md：
 * 每只怪物「会在哪些梯度刷」——城市区域 T1–T4、天数尸潮档位、尸潮建筑、野外自然刷。
 *
 * 用法：tsx scripts/gen-monster-spawn-tiers.ts
 * 依赖已有的两个生成物（先跑 gen:monsters / gen:hordebuildings）：
 *   - public/data/monsters-difficulty.js  基础属性 + 尸潮天数档
 *   - public/data/horde-buildings.js      刷怪来源分类 + 建筑尸潮归属
 * 真源仍是 config/incontrol/spawner.json（区域刷怪器）等，见 docs/monster-handbook.md。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readGlobal } from "./pack-readers.js";

const ROOT = process.cwd();
const OUT_REL = "public/data/monster-spawn-tiers.js";
const DOC_REL = "docs/monster-spawn-tiers.md";
const PACK = join(ROOT, "DeceasedCraft5.11.19");

const TIERS = ["T1", "T2", "T3", "T4"] as const;
type Tier = (typeof TIERS)[number];

const TAG_TIER: Record<string, Tier> = {
  "deceasedcraft:suburb_residential": "T1",
  "deceasedcraft:highrise_office": "T2",
  "deceasedcraft:highrise_residential": "T2",
  "deceasedcraft:highrise_hotel": "T3",
  "deceasedcraft:retail_district": "T3",
  "deceasedcraft:wasteland": "T4",
};
const TAG_NAME: Record<string, string> = {
  "deceasedcraft:suburb_residential": "郊区住宅区",
  "deceasedcraft:highrise_office": "摩天办公区",
  "deceasedcraft:highrise_residential": "摩天住宅区",
  "deceasedcraft:highrise_hotel": "摩天酒店区",
  "deceasedcraft:retail_district": "零售商业区",
  "deceasedcraft:wasteland": "荒地",
};

const r2 = (n: number) => Math.round(n * 100) / 100;

interface SpawnHit {
  rate: number;
  conditions: string[];
  districts: string[];
}

function flatten(cond: any, acc: Record<string, any[]>): void {
  if (!cond || typeof cond !== "object") return;
  for (const [k, v] of Object.entries<any>(cond)) {
    if (k === "and" || k === "or" || k === "not") flatten(v, acc);
    else acc[k] = (acc[k] ?? []).concat(Array.isArray(v) ? v : [v]);
  }
}

function readRegionalSpawns() {
  const raw = JSON.parse(readFileSync(join(PACK, "overrides/config/incontrol/spawner.json"), "utf8")) as any[];
  const byMob = new Map<string, SpawnHit[]>();
  const anywhere = new Map<string, { rate: number; conditions: string[] }[]>();
  const label0 = (cond: Record<string, any[]>) => {
    const out: string[] = [];
    if (cond.dimension) out.push(`维度 ${cond.dimension.map(String).join("/").replace("minecraft:", "").replace("deceasedcraft:", "")}`);
    if (cond.incity) out.push("城市内");
    if (cond.cave) out.push("洞穴");
    if (cond.inwater) out.push("水中");
    if (cond.seesky) out.push("见天");
    if (cond.maxlight) out.push(`亮度≤${cond.maxlight[0]}`);
    if (cond.minheight) out.push(`y≥${cond.minheight[0]}`);
    if (cond.maxheight) out.push(`y≤${cond.maxheight[0]}`);
    if (cond.biometags) out.push(`群系标签 ${cond.biometags.map((b: any) => String(b).replace("minecraft:", "")).join("/")}`);
    if (cond.biome) out.push(`群系 ${cond.biome.map((b: any) => String(b).replace("minecraft:", "")).join("/")}`);
    if (cond.kubejs) out.push("apocalypseMode 条件");
    return out;
  };
  for (const rule of raw) {
    const cond: Record<string, any[]> = {};
    flatten(rule.conditions ?? {}, cond);
    const tags = (cond.biometags ?? []).map(String).filter((t: string) => TAG_TIER[t]);
    if (!tags.length) {
      // 非区域规则（全图 / 洞穴 / 指定群系 / 深渊）单独记一栏
      const mobs0 = (Array.isArray(rule.mob) ? rule.mob : [rule.mob]).map((m: any) =>
        typeof m === "string" ? m : m?.cloneName ? `${m.mob}#${m.cloneName}` : String(m?.mob),
      );
      for (const id of mobs0) {
        if (!id) continue;
        const list = anywhere.get(id) ?? [];
        list.push({ rate: Number(rule.persecond ?? 0), conditions: label0(cond) });
        anywhere.set(id, list);
      }
      continue;
    }
    const mobs = (Array.isArray(rule.mob) ? rule.mob : [rule.mob]).map((m: any) =>
      typeof m === "string" ? m : m?.cloneName ? `${m.mob}#${m.cloneName}` : String(m?.mob),
    );
    const label: string[] = [];
    if (cond.incity) label.push("城市内");
    if (cond.inbuilding) label.push("室内");
    if (cond.instreet) label.push("街道");
    if (cond.cave) label.push("洞穴");
    if (cond.inwater) label.push("水中");
    if (cond.minheight) label.push(`y≥${cond.minheight[0]}`);
    if (cond.maxheight) label.push(`y≤${cond.maxheight[0]}`);
    if (cond.kubejs) label.push("apocalypseMode 专属");
    for (const id of mobs) {
      if (!id) continue;
      const list = byMob.get(id) ?? [];
      list.push({
        rate: Number(rule.persecond ?? 0),
        conditions: label,
        districts: tags.map((t: string) => TAG_NAME[t]),
      });
      byMob.set(id, list);
    }
  }
  return { byMob, anywhere };
}

function main() {
  const diff = readGlobal(ROOT, "public/data/monsters-difficulty.js", "WZ_MONSTER_DIFF");
  if (!diff) throw new Error("读不到 monsters-difficulty.js：先跑 npm run gen:monsters");
  const hb = readGlobal(ROOT, "public/data/horde-buildings.js", "WZ_HORDE_BUILDINGS");
  if (!hb) throw new Error("读不到 horde-buildings.js：先跑 npm run gen:hordebuildings");

  const { byMob: regional, anywhere } = readRegionalSpawns();
  const buildingNames = new Map<string, string>();
  for (const b of hb.buildings) buildingNames.set(b.key, b.name);

  // 天数尸潮：实体 → 出现在哪些表
  const hordeBands: Record<string, Record<string, number[]>> = { normal: {}, hard: {} };
  for (const d of ["normal", "hard"] as const) {
    for (const band of diff.horde.bands[d]) {
      for (const row of band.rows) {
        const list = (hordeBands[d][row.id] = hordeBands[d][row.id] ?? []);
        if (!list.includes(band.table)) list.push(band.table);
      }
    }
  }

  const entities: Record<string, any> = {};
  for (const [id, e] of Object.entries<any>(diff.entities)) {
    const meta = hb.mobs[id];
    const hits = regional.get(id) ?? [];
    const city: Record<string, any> = {};
    for (const t of TIERS) {
      const matched = hits.filter((h) => h.districts.some((d) => d && tagTier(d) === t));
      if (!matched.length) continue;
      city[t] = {
        rate: r2(matched.reduce((s, h) => s + h.rate, 0)),
        conditions: [...new Set(matched.flatMap((h) => h.conditions))],
        districts: [...new Set(matched.flatMap((h) => h.districts))],
      };
    }
    entities[id] = {
      name: e.name ?? meta?.name ?? null,
      status: meta?.status ?? (e.statsMissing ? "missing" : "unknown"),
      hostile: e.hostile !== false,
      natural: meta?.sources?.includes("模组自然刷") ?? false,
      city,
      anywhere: (() => {
        const hits = anywhere.get(id) ?? [];
        if (!hits.length) return null;
        return {
          rate: r2(hits.reduce((s, h) => s + h.rate, 0)),
          conditions: [...new Set(hits.flatMap((h) => h.conditions))],
        };
      })(),
      horde: {
        normal: (hordeBands.normal[id] ?? []).sort((a, b) => a - b),
        hard: (hordeBands.hard[id] ?? []).sort((a, b) => a - b),
      },
      buildings: (meta?.buildings ?? []).map((k: string) => ({ key: k, name: buildingNames.get(k) ?? k })),
    };
  }

  // customnpcs 的克隆体不在 attribute.js 里，单独补进来
  for (const id of new Set([...regional.keys()])) {
    if (entities[id]) continue;
    const hits = regional.get(id) ?? [];
    const city: Record<string, any> = {};
    for (const t of TIERS) {
      const matched = hits.filter((h) => h.districts.some((d) => d && tagTier(d) === t));
      if (!matched.length) continue;
      city[t] = {
        rate: r2(matched.reduce((sum, h) => sum + h.rate, 0)),
        conditions: [...new Set(matched.flatMap((h) => h.conditions))],
        districts: [...new Set(matched.flatMap((h) => h.districts))],
      };
    }
    entities[id] = {
      name: id.includes("#") ? `NPC·${id.split("#")[1]}` : id,
      status: "npc",
      // 动物/中立：naturalist 全系、quark 宠物、猫狗
      hostile: !/^naturalist:|^quark:shiba$|^minecraft:(cat|wolf)$/.test(id),
      natural: false,
      city,
      anywhere: null,
      horde: { normal: [], hard: [] },
      buildings: [],
    };
  }

  const byTier: Record<string, any[]> = {};
  for (const t of TIERS) {
    byTier[t] = Object.entries(entities)
      .filter(([, e]) => e.city[t])
      .map(([id, e]) => ({ id, name: e.name, rate: e.city[t].rate }))
      .sort((a, b) => b.rate - a.rate);
  }

  const data = {
    generated: new Date().toISOString().slice(0, 10),
    source: {
      regional: "config/incontrol/spawner.json（只取带 deceasedcraft 区域标签的规则）",
      horde: "config/hordes/data/hordes/horde_data（天数档：表名里的天数）",
      buildings: "DCTweaks jar: lostsouls/buildings（建筑尸潮）",
      stats: "public/data/monsters-difficulty.js",
    },
    counts: Object.fromEntries(TIERS.map((t) => [t, byTier[t].length])),
    byTier,
    entities,
  };

  writeFileSync(
    join(ROOT, OUT_REL),
    `/* 亡者世界 · 每只怪物的刷怪梯度（由 scripts/gen-monster-spawn-tiers.ts 生成，勿手改） */\n` +
      `window.WZ_MONSTER_SPAWN = ${JSON.stringify(data)};\n`,
  );
  writeDoc(data, entities, byTier);
  console.log(`写出 ${OUT_REL}（${(JSON.stringify(data).length / 1024).toFixed(0)} KB）`);
  console.log(
    `区域刷怪：` + TIERS.map((t) => `${t} ${byTier[t].length} 只`).join(" · ") + ` · 实体 ${Object.keys(entities).length}`,
  );
}

function tagTier(name: string): Tier | null {
  for (const [tag, t] of Object.entries(TAG_TIER)) if (TAG_NAME[tag] === name) return t;
  return null;
}

function writeDoc(data: any, entities: Record<string, any>, byTier: Record<string, any[]>) {
  const L: string[] = [];
  const statusText: Record<string, string> = {
    normal: "正常刷新",
    hordeOnly: "仅尸潮",
    unimplemented: "未实装",
    missing: "无属性覆盖",
    npc: "NPC",
    unknown: "—",
  };
  L.push("# 每只怪物的刷怪梯度（生成物，勿手改）");
  L.push("");
  L.push(`- 生成：\`tsx scripts/gen-monster-spawn-tiers.ts\`，${data.generated}；机读数据 \`${OUT_REL}\``);
  L.push(`- 区域列 = \`config/incontrol/spawner.json\` 里带区域标签的规则（城市内），数字是「每秒触发概率」之和`);
  L.push(`- 尸潮列 = 15 天一波的天数尸潮表号（表号 = 该档起始世界天数）`);
  L.push(`- 建筑列 = 尸潮建筑（LostSouls）名单；\`自然\` = 模组自带 \`forge:add_spawns\`，任何群系都能刷`);
  const unimplemented = Object.values(entities).filter((e: any) => e.status === "unimplemented").length;
  const hordeCount = Object.values(entities).filter((e: any) => e.horde.normal.length + e.horde.hard.length > 0).length;
  const buildingCount = Object.values(entities).filter((e: any) => e.buildings.length > 0).length;
  L.push("");
  L.push(
    `共 ${Object.keys(entities).length} 个实体条目：区域刷怪 T1 ${data.counts.T1} / T2 ${data.counts.T2} / T3 ${data.counts.T3} / T4 ${data.counts.T4}；` +
      `天数尸潮 ${hordeCount} 只；建筑尸潮 ${buildingCount} 只；**未实装 ${unimplemented} 只**（四个来源都没有）。`,
  );
  L.push("");
  L.push("相关文档：`docs/monster-handbook.md`（属性 / 结算 / 刷怪 / 尸潮单篇）、`docs/horde-buildings.md`（逐建筑尸潮）、`docs/monster-difficulty-table.md`（场景抽样与尸潮天数档）。");
  L.push("");
  L.push("## 1. 梯度总览");
  L.push("");
  L.push("| 梯度 | 区域 | 敌人 | 动物/中立 |");
  L.push("|---|---|---:|---:|");
  for (const t of ["T1", "T2", "T3", "T4"]) {
    const hostile = byTier[t].filter((x) => entities[x.id].hostile).length;
    const total = byTier[t].length;
    L.push(`| ${t} | ${tierDistricts(t)} | ${hostile} | ${total - hostile} |`);
  }
  L.push("");
  L.push("## 2. 逐怪物梯度表");
  L.push("");
  L.push(
    "| 怪物 | T1 | T2 | T3 | T4 | 全图规则（非区域） | 天数尸潮（普通） | 天数尸潮（困难） | 尸潮建筑 | 自然 | 状态 |",
  );
  L.push("|---|---|---|---|---|---|---|---|---|---|---|");
  const cell = (e: any, t: string) => (e.city[t] ? String(e.city[t].rate) : "—");
  const rows = Object.entries(entities).sort((a, b) => {
    const order = { normal: 0, npc: 1, hordeOnly: 2, unimplemented: 3, missing: 4, unknown: 5 } as Record<string, number>;
    const d = (order[a[1].status] ?? 9) - (order[b[1].status] ?? 9);
    return d !== 0 ? d : (a[1].name ?? a[0]).localeCompare(b[1].name ?? b[0], "zh");
  });
  for (const [id, e] of rows) {
    L.push(
      `| ${e.name ?? id}（${id}） | ${cell(e, "T1")} | ${cell(e, "T2")} | ${cell(e, "T3")} | ${cell(e, "T4")} | ` +
        `${e.anywhere ? e.anywhere.rate : "—"} | ` +
        `${e.horde.normal.join(",") || "—"} | ${e.horde.hard.join(",") || "—"} | ` +
        `${e.buildings.map((b: any) => b.name).join("、") || "—"} | ${e.natural ? "是" : "—"} | ${statusText[e.status] ?? e.status} |`,
    );
  }
  L.push("");
  L.push("## 3. 梯度视角：每个 T 级分别刷谁");
  L.push("");
  for (const t of ["T1", "T2", "T3", "T4"]) {
    L.push(`### ${t}（${tierDistricts(t)}）`);
    L.push("");
    L.push("| 怪物 | 概率/秒 | 条件 |");
    L.push("|---|---:|---|");
    for (const row of byTier[t]) {
      const cellInfo = entities[row.id].city[t];
      L.push(`| ${row.name ?? row.id}（${row.id}） | ${cellInfo.rate} | ${cellInfo.conditions.join(" · ") || "—"} |`);
    }
    L.push("");
  }
  writeFileSync(join(ROOT, DOC_REL), L.join("\n") + "\n");
  console.log(`写出 ${DOC_REL}`);
}

function tierDistricts(t: string): string {
  if (t === "T1") return "郊区住宅区";
  if (t === "T2") return "摩天办公区 / 摩天住宅区";
  if (t === "T3") return "摩天酒店区 / 零售商业区";
  return "荒地";
}

main();
