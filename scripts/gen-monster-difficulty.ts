/**
 * 生成 public/data/monsters-difficulty.js：怪物数值的「难度 × 区域 × 尸潮」换算表。
 *
 * 用法：tsx scripts/gen-monster-difficulty.ts
 *
 * 只读整合包里的四处真源（不读站点数据，guides.js 只用来带中文名）：
 *   1. kubejs/startup_scripts/entity/attribute.js                     每个实体的基础属性
 *   2. config/incontrol/spawn.json                                    区域/难度倍率（InControl）
 *   3. config/hordes/data/hordes/horde_data/{tables,scripts}/<难度>/    尸潮名单与选表天数
 *   4. config/hordes-common.toml                                      尸潮规模参数
 *
 * 倍率怎么来的见 docs/monster-difficulty-analysis.md §8.5（区域）与 §5（尸潮）。
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readGlobal } from "./pack-readers.js";

const ROOT = process.cwd();
const PACK = join(ROOT, "DeceasedCraft5.11.19");
const OUT_REL = "public/data/monsters-difficulty.js";
const DOC_REL = "docs/monster-difficulty-table.md";

const OVERRIDES = join(PACK, "overrides");
const ATTR_FILE = join(PACK, "overrides/kubejs/startup_scripts/entity/attribute.js");
const SPAWN_FILE = join(OVERRIDES, "config/incontrol/spawn.json");
const HORDES_CFG = join(OVERRIDES, "config/hordes-common.toml");
const HORDE_DIR = join(OVERRIDES, "config/hordes/data/hordes/horde_data");

type Tier = "T1" | "T2" | "T3" | "T4";
const TIERS: Tier[] = ["T1", "T2", "T3", "T4"];

/** 区域标签 → 站点阶级；与 public/data/guides.js 的 region→tier 一致（verify 脚本交叉校验）。 */
const TIER_TAGS: Record<Tier, { name: string; tags: string[] }> = {
  T1: { name: "郊区住宅区", tags: ["deceasedcraft:suburb_residential"] },
  T2: { name: "摩天办公区 / 摩天住宅区", tags: ["deceasedcraft:highrise_office", "deceasedcraft:highrise_residential"] },
  T3: { name: "摩天酒店区 / 零售商业区", tags: ["deceasedcraft:highrise_hotel", "deceasedcraft:retail_district"] },
  T4: { name: "荒地", tags: ["deceasedcraft:wasteland"] },
};
const TAG_TIER = new Map<string, Tier>();
for (const t of TIERS) for (const tag of TIER_TAGS[t].tags) TAG_TIER.set(tag, t);

/** 原版难度只作用在「打向玩家的伤害」上：简单 min(D, 0.5D+1)、普通 D、困难 1.5D。 */
const VANILLA_LABEL: Record<string, string> = {
  easy: "min(D, 0.5D+1)",
  normal: "D",
  hard: "1.5D",
};
const vanillaFactor = (difficulty: string, d: number): number => {
  if (difficulty === "easy") return Math.min(d, 0.5 * d + 1);
  if (difficulty === "hard") return 1.5 * d;
  return d;
};

type Mult = { hp: number; dmg: number; armor: number };
const NO_MULT = (): Mult => ({ hp: 1, dmg: 1, armor: 1 });
const mul = (a: Mult, b: Mult): Mult => ({ hp: a.hp * b.hp, dmg: a.dmg * b.dmg, armor: a.armor * b.armor });
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * 补充的「原版数值」实体：整合包的 attribute.js 里没有 husk/drowned，
 * 但 InControl 的区域倍率对它们同样生效（`mob: [zombie, husk, drowned]`），
 * 所以按原版 1.20.1 数值补齐（与站内 guides.js 的同名条目一致），标 `baseSource: "vanilla"`。
 */
const VANILLA_EXTRA: Record<string, BaseStats> = {
  "minecraft:husk": { hp: 20, dmg: 3, armor: 2, speed: 0.23, follow: 35 },
  "minecraft:drowned": { hp: 20, dmg: 3, armor: 2, speed: 0.23, follow: 35 },
};

interface BaseStats {
  hp: number | null;
  dmg: number | null;
  armor: number | null;
  speed: number | null;
  follow: number | null;
}

/* ------------------------------------------------------------------ */
/* 1. attribute.js                                                     */
/* ------------------------------------------------------------------ */

function toStats(attrs: Record<string, number>): BaseStats {
  const pick = (k: string) => (k in attrs ? attrs[k] : null);
  return {
    hp: pick("minecraft:generic.max_health"),
    dmg: pick("minecraft:generic.attack_damage"),
    armor: pick("minecraft:generic.armor"),
    speed: pick("minecraft:generic.movement_speed"),
    follow: pick("minecraft:generic.follow_range"),
  };
}

function readAttributes(): Map<string, BaseStats> {
  const lines = readFileSync(ATTR_FILE, "utf8").split("\n");
  const out = new Map<string, BaseStats>();
  let cur: { id: string; attrs: Record<string, number> } | null = null;
  const flush = () => {
    if (cur && Object.keys(cur.attrs).length) out.set(cur.id, toStats(cur.attrs));
    cur = null;
  };
  for (const line of lines) {
    const head = /event\.modify\('([^']+)'/.exec(line);
    if (head) {
      flush();
      cur = { id: head[1], attrs: {} };
      continue;
    }
    if (!cur) continue;
    const add = /entity\.add\('([^']+)',\s*(-?[\d.]+)\)/.exec(line);
    if (add) cur.attrs[add[1]] = Number(add[2]);
    if (/^\s*\}\)\s*$/.test(line)) flush();
  }
  flush();
  return out;
}

/* ------------------------------------------------------------------ */
/* 2. config/incontrol/spawn.json                                      */
/* ------------------------------------------------------------------ */

interface SpawnRule {
  mobs: string[] | null;
  hostileOnly: boolean;
  tiers: Tier[] | null;
  tags: string[] | null;
  incity: boolean;
  difficulty: string | null;
  when: string | null;
  spawnTypes: string[] | null;
  dimension: string[] | null;
  maxY: number | null;
  mult: Mult;
}

function flatten(cond: any, acc: Record<string, any[]>): void {
  if (!cond || typeof cond !== "object") return;
  for (const [k, v] of Object.entries<any>(cond)) {
    if (k === "and" || k === "or" || k === "not") flatten(v, acc);
    else acc[k] = (acc[k] ?? []).concat(Array.isArray(v) ? v : [v]);
  }
}

function readSpawnRules(): { rules: SpawnRule[]; warnings: string[] } {
  const raw = JSON.parse(readFileSync(SPAWN_FILE, "utf8")) as any[];
  const warnings: string[] = [];
  const rules: SpawnRule[] = [];
  for (const r of raw) {
    const mult: Mult = {
      hp: Number(r.healthmultiply ?? 1),
      dmg: Number(r.damagemultiply ?? 1),
      armor: Number(r.armormultiply ?? 1),
    };
    if (mult.hp === 1 && mult.dmg === 1 && mult.armor === 1) continue;
    const cond: Record<string, any[]> = {};
    flatten(r, cond);
    const tags = cond.biometags ? cond.biometags.map(String) : null;
    const rule: SpawnRule = {
      mobs: Array.isArray(r.mob) ? r.mob.map(String) : null,
      hostileOnly: Boolean(cond.hostile),
      tags,
      tiers: tags ? [...new Set(tags.map((t) => TAG_TIER.get(t)).filter(Boolean))] as Tier[] : null,
      incity: Boolean(cond.incity),
      difficulty: cond.difficulty ? String(cond.difficulty[0]) : null,
      when: cond.when ? String(cond.when[0]) : null,
      spawnTypes: cond.spawntype ? cond.spawntype.map(String) : null,
      dimension: cond.dimension ? cond.dimension.map(String) : null,
      maxY: cond.maxheight ? Number(cond.maxheight[0]) : null,
      mult,
    };
    if (!rule.mobs && !rule.hostileOnly) warnings.push(`规则既没有 mob 也没有 hostile：${JSON.stringify(r).slice(0, 70)}`);
    if (tags && !rule.tiers?.length) warnings.push(`区域标签对不上阶级：${tags.join(",")}`);
    rules.push(rule);
  }
  return { rules, warnings };
}

/* ------------------------------------------------------------------ */
/* 3. 尸潮                                                             */
/* ------------------------------------------------------------------ */

interface HordeRow {
  id: string;
  name: string | null;
  weight: number;
  min: number;
  max: number;
  expect: number;
}
interface HordeBand {
  table: number;
  playerDay: [number, number | null];
  worldDays: number[] | null;
  worldDaysFrom: number | null;
  rows: HordeRow[];
  expectTotal: number;
}

/** 一轮（spawnAmount 只）里每个条目的期望只数：先满足 min，剩余按权重分，受 max 限制。 */
function expectPerWave(rows: { weight: number; min: number; max: number }[], total: number): number[] {
  const cnt = rows.map((r) => r.min);
  let left = total - cnt.reduce((a, b) => a + b, 0);
  for (let iter = 0; iter < 200 && left > 1e-3; iter++) {
    const elig = rows.map((r, i) => ({ i, r })).filter((o) => !o.r.max || cnt[o.i] < o.r.max - 1e-9);
    if (!elig.length) break;
    const w = elig.reduce((s, o) => s + o.r.weight, 0);
    if (w <= 0) break;
    let used = 0;
    for (const o of elig) {
      const add = (left * o.r.weight) / w;
      cnt[o.i] += add;
      used += add;
    }
    left -= used;
    let over = 0;
    for (const o of elig) {
      if (o.r.max && cnt[o.i] > o.r.max) {
        over += cnt[o.i] - o.r.max;
        cnt[o.i] = o.r.max;
      }
    }
    left += over;
  }
  return cnt;
}

function readHordeCfg() {
  const text = readFileSync(HORDES_CFG, "utf8");
  const num = (key: string, fallback: number) => {
    const m = new RegExp(`^\\s*${key}\\s*=\\s*(-?[\\d.]+)`, "m").exec(text);
    return m ? Number(m[1]) : fallback;
  };
  return {
    spawnAmount: num("spawnAmount", 20),
    interval: num("hordeSpawnInterval", 2000),
    duration: num("hordeSpawnDuration", 10000),
    spawnMax: num("hordeSpawnMax", 150),
    everyDays: num("hordeSpawnDays", 15),
    multiplier: num("hordeSpawnMultiplier", 1),
    startTime: num("hordeStartTime", 12000),
    firstDay: /^\s*spawnFirstDay\s*=\s*true/m.test(text),
  };
}

function readHordeBands(
  diff: "normal" | "hard",
  spawnAmount: number,
  everyDays: number,
  names: (id: string) => string | null,
): HordeBand[] {
  const scripts = readdirSync(join(HORDE_DIR, "scripts", diff))
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const s = JSON.parse(readFileSync(join(HORDE_DIR, "scripts", diff, f), "utf8"));
      let day = 0;
      let table: string | null = null;
      const walk = (v: any) => {
        if (Array.isArray(v)) return v.forEach(walk);
        if (!v || typeof v !== "object") return;
        if (v.function === "hordes:set_spawntable" && Array.isArray(v.value)) table = String(v.value[0]);
        for (const x of Object.values(v)) walk(x);
      };
      walk(s.value);
      for (const c of s.conditions ?? []) if (c?.name === "hordes:player_day") day = Number(c.value);
      return { day, table };
    })
    .filter((s): s is { day: number; table: string } => Boolean(s.table))
    .sort((a, b) => a.day - b.day);

  // 相邻脚本指向同一张表时合并（wave_0 与 wave_1 都指首表，所以首档覆盖 0–28）
  const groups: { table: string; from: number; to: number | null }[] = [];
  for (const s of scripts) {
    const last = groups[groups.length - 1];
    if (last && last.table === s.table) continue;
    if (last) last.to = s.day - 1;
    groups.push({ table: s.table, from: s.day, to: null });
  }

  const bands: HordeBand[] = [];
  for (let i = 0; i < groups.length; i++) {
    const table = Number(/_(\d+)$/.exec(groups[i].table)![1]);
    const from = groups[i].from;
    const to = groups[i].to;
    const file = join(HORDE_DIR, "tables", diff, `mobs_${diff}_${table}.json`);
    if (!existsSync(file)) continue;
    const raw = JSON.parse(readFileSync(file, "utf8")) as any[];
    const rows = raw.map((r) => ({
      id: String(r.entity),
      name: names(String(r.entity)),
      weight: Number(r.weight ?? 1),
      min: Number(r.min_spawns ?? 0),
      max: Number(r.max_spawns ?? 0),
    }));
    const exp = expectPerWave(rows, spawnAmount);
    const band: HordeBand = {
      table,
      playerDay: [from, to],
      worldDays: null,
      worldDaysFrom: null,
      rows: rows.map((row, k) => ({ ...row, expect: r2(exp[k]) })),
      expectTotal: r2(exp.reduce((a, b) => a + b, 0)),
    };
    const days: number[] = [];
    for (let d = everyDays; d <= 2000; d += everyDays) {
      const pd = d - 1;
      if (pd >= from && (to === null || pd <= to)) days.push(d);
    }
    if (to === null && days.length) {
      band.worldDaysFrom = days[0];
      band.worldDays = null;
    } else band.worldDays = days;
    bands.push(band);
  }
  return bands;
}

/* ------------------------------------------------------------------ */
/* 4. 组装                                                             */
/* ------------------------------------------------------------------ */

interface Context {
  tier: Tier | null;
  difficulty: "easy" | "normal" | "hard";
  event: boolean;
  abyss: boolean;
}

function main() {
  const warnings: string[] = [];
  const base = readAttributes();
  if (base.size === 0) throw new Error(`attribute.js 没解析到实体：${ATTR_FILE}`);
  const fromPack = new Set(base.keys());
  for (const [id, s] of Object.entries(VANILLA_EXTRA)) if (!base.has(id)) base.set(id, s);

  const guides = readGlobal(ROOT, "public/data/guides.js", "WZ_GUIDES");
  const siteById = new Map<string, any>();
  for (const m of guides?.monsters ?? []) if (m.entityId) siteById.set(String(m.entityId), m);
  const nameOf = (id: string): string | null => siteById.get(id)?.name ?? null;

  const { rules, warnings: ruleWarnings } = readSpawnRules();
  warnings.push(...ruleWarnings);

  const finalize = rules.filter((r) => r.when === "finalize" && r.tiers && r.maxY === null);
  const spiders = rules.filter((r) => r.when === "finalize" && r.maxY !== null);
  const hardDistrict = rules.filter((r) => r.difficulty === "hard" && r.tiers);
  const hardAbyss = rules.filter((r) => r.difficulty === "hard" && !r.tiers && r.dimension?.includes("deceasedcraft:abyss"));
  const hardEvent = rules.filter((r) => r.difficulty === "hard" && r.spawnTypes?.includes("event"));
  const easy = rules.filter((r) => r.difficulty === "easy");
  if (hardAbyss.length !== 1) warnings.push(`深渊·困难 规则 ${hardAbyss.length} 条（预期 1）`);
  if (hardEvent.length !== 1) warnings.push(`事件·困难 规则 ${hardEvent.length} 条（预期 1）`);
  if (easy.length !== 1) warnings.push(`简单 规则 ${easy.length} 条（预期 1）`);
  const zombies = new Set(finalize.flatMap((r) => r.mobs ?? []));
  const animals = new Set([...base.keys()].filter((id) => id.startsWith("naturalist:")));
  const hordeEventMult = hardEvent[0]?.mult ?? NO_MULT();

  /** 命中哪些倍率：区域批在城区生效；困难批叠加；简单批叠乘；事件批只在尸潮。 */
  function multipliers(id: string, ctx: Context): Mult {
    let m = NO_MULT();
    const hostile = !animals.has(id);
    if (ctx.tier) {
      for (const r of finalize) {
        if (!r.mobs?.includes(id)) continue;
        if (!r.tiers!.includes(ctx.tier)) continue;
        m = mul(m, r.mult);
      }
      if (ctx.difficulty === "hard") {
        for (const r of hardDistrict) {
          if (!r.hostileOnly && r.mobs && !r.mobs.includes(id)) continue;
          if (!r.tiers!.includes(ctx.tier)) continue;
          m = mul(m, r.mult);
        }
      }
    }
    if (ctx.abyss) for (const r of hardAbyss) if (hostile) m = mul(m, r.mult);
    if (ctx.difficulty === "easy") for (const r of easy) if (hostile) m = mul(m, r.mult);
    if (ctx.event && ctx.difficulty === "hard") m = mul(m, hordeEventMult);
    return m;
  }

  const cell = (s: BaseStats, ctx: Context) => {
    const m = multipliers(s === null ? "" : (s as any).id ?? "", ctx);
    return cellWith(s, m, ctx.difficulty);
  };
  const cellWith = (s: BaseStats, m: Mult, difficulty: "easy" | "normal" | "hard") => {
    const rawDmg = s.dmg === null ? null : s.dmg * m.dmg;
    return {
      hp: s.hp === null ? null : r2(s.hp * m.hp),
      dmg: rawDmg === null ? null : r2(rawDmg),
      armor: s.armor === null ? null : r2(s.armor * m.armor),
      // 打向玩家：用未四舍五入的攻击值算，避免二次取整
      toPlayer: rawDmg === null ? null : r2(vanillaFactor(difficulty, rawDmg)),
    };
  };

  const cfg = readHordeCfg();
  const waves = Math.floor(cfg.duration / cfg.interval);
  const bands = {
    normal: readHordeBands("normal", cfg.spawnAmount, cfg.everyDays, nameOf),
    hard: readHordeBands("hard", cfg.spawnAmount, cfg.everyDays, nameOf),
  };

  const hordeUse = new Map<string, { normal: number[]; hard: number[] }>();
  for (const diff of ["normal", "hard"] as const) {
    for (const band of bands[diff]) {
      for (const row of band.rows) {
        const hit = hordeUse.get(row.id) ?? { normal: [], hard: [] };
        if (!hit[diff].includes(band.table)) hit[diff].push(band.table);
        hordeUse.set(row.id, hit);
      }
    }
  }

  const entities: Record<string, any> = {};
  for (const [id, s] of [...base.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const city: Record<string, any> = {};
    for (const t of TIERS) {
      city[t] = {
        easy: cellWith(s, multipliers(id, { tier: t, difficulty: "easy", event: false, abyss: false }), "easy"),
        normal: cellWith(s, multipliers(id, { tier: t, difficulty: "normal", event: false, abyss: false }), "normal"),
        hard: cellWith(s, multipliers(id, { tier: t, difficulty: "hard", event: false, abyss: false }), "hard"),
      };
    }
    const e: any = {
      name: nameOf(id),
      baseSource: fromPack.has(id) ? "attribute.js" : "vanilla",
      hostile: !animals.has(id),
      zombieLike: zombies.has(id),
      base: s,
      wild: {
        easy: cellWith(s, multipliers(id, { tier: null, difficulty: "easy", event: false, abyss: false }), "easy"),
        normal: cellWith(s, multipliers(id, { tier: null, difficulty: "normal", event: false, abyss: false }), "normal"),
        hard: cellWith(s, multipliers(id, { tier: null, difficulty: "hard", event: false, abyss: false }), "hard"),
      },
      city,
      // 尸潮：wild = 不在城区（只吃事件那条）；city = 落在城区（区域倍率再叠一层）
      horde: {
        normal: cellWith(s, multipliers(id, { tier: null, difficulty: "normal", event: true, abyss: false }), "normal"),
        hard: cellWith(s, multipliers(id, { tier: null, difficulty: "hard", event: true, abyss: false }), "hard"),
        city: Object.fromEntries(
          TIERS.map((t) => [
            t,
            {
              normal: cellWith(s, multipliers(id, { tier: t, difficulty: "normal", event: true, abyss: false }), "normal"),
              hard: cellWith(s, multipliers(id, { tier: t, difficulty: "hard", event: true, abyss: false }), "hard"),
            },
          ]),
        ),
      },
    };
    if (spiders.some((r) => r.mobs?.includes(id))) {
      e.depth = spiders
        .filter((r) => r.mobs?.includes(id))
        .map((r) => ({ maxY: r.maxY, ...cellWith(s, r.mult, "normal") }));
    }
    const use = hordeUse.get(id);
    if (use) e.hordeTables = use;
    entities[id] = e;
  }

  // 尸潮表里出现、但整合包没有属性覆盖的实体：留占位，别让名单缺人
  for (const id of hordeUse.keys()) {
    if (entities[id]) continue;
    entities[id] = {
      name: nameOf(id),
      baseSource: null,
      hostile: true,
      base: null,
      statsMissing: true,
      hordeTables: hordeUse.get(id),
    };
  }

  const data = {
    generated: new Date().toISOString().slice(0, 10),
    source: {
      pack: "DeceasedCraft 5.11.19",
      attributes: "kubejs/startup_scripts/entity/attribute.js",
      regional: "config/incontrol/spawn.json",
      horde: "config/hordes/data/hordes/horde_data/{tables,scripts}",
      hordeConfig: "config/hordes-common.toml",
      entities: base.size,
    },
    rules: {
      vanillaDifficulty: VANILLA_LABEL,
      finalize: finalize.map(summary),
      spider: spiders.map(summary),
      hardDistrict: hardDistrict.map(summary),
      hardAbyss: hardAbyss.map(summary),
      hardEvent: hardEvent.map(summary),
      easy: easy.map(summary),
    },
    districts: Object.fromEntries(TIERS.map((t) => [t, { name: TIER_TAGS[t].name, tags: TIER_TAGS[t].tags }])),
    horde: {
      spawnAmount: cfg.spawnAmount,
      intervalTicks: cfg.interval,
      durationTicks: cfg.duration,
      wavesPerEvent: waves,
      spawnMax: cfg.spawnMax,
      everyDays: cfg.everyDays,
      startTime: cfg.startTime,
      spawnFirstDay: cfg.firstDay,
      expectedPerEvent: r2(cfg.spawnAmount * waves),
      bands,
    },
    entities,
  };

  writeFileSync(
    join(ROOT, OUT_REL),
    `/* 亡者世界 · 怪物难度数据表（由 scripts/gen-monster-difficulty.ts 生成，勿手改） */\n` +
      `window.WZ_MONSTER_DIFF = ${JSON.stringify(data)};\n`,
  );
  writeDoc(data, cfg, waves);

  const scaled = Object.keys(entities).filter(
    (id) => entities[id].city && TIERS.some((t) => entities[id].city[t].normal.hp !== entities[id].wild.normal.hp),
  );
  console.log(`写出 ${OUT_REL}（${(JSON.stringify(data).length / 1024).toFixed(0)} KB）`);
  console.log(`实体 ${base.size} · 普通难度吃区域血量倍率的 ${scaled.length} · 尸潮实体 ${hordeUse.size}`);
  console.log(`尸潮天数档 normal ${bands.normal.length} / hard ${bands.hard.length} · 每场约 ${data.horde.expectedPerEvent} 只`);
  for (const w of warnings) console.warn("警告：" + w);
}

function summary(r: SpawnRule) {
  return {
    ids: r.mobs,
    hostileOnly: r.hostileOnly,
    tiers: r.tiers,
    tags: r.tags,
    incity: r.incity,
    difficulty: r.difficulty,
    when: r.when,
    spawnTypes: r.spawnTypes,
    dimension: r.dimension,
    maxY: r.maxY,
    hp: r.mult.hp,
    dmg: r.mult.dmg,
    armor: r.mult.armor,
  };
}

/* ------------------------------------------------------------------ */
/* 5. 人读表格                                                         */
/* ------------------------------------------------------------------ */

const SAMPLE = [
  "minecraft:zombie",
  "minecraft:husk",
  "minecraft:drowned",
  "minecraft:spider",
  "minecraft:cave_spider",
  "zombie_extreme:crawler",
  "zombie_extreme:infected_police",
  "undead_revamp2:thesmoker",
  "undead_revamp2:bomber",
  "undead_revamp2:the_moonflower",
  "undead_revamp2:theskeeper",
  "zombie_extreme:infected_hazmat",
  "undead_revamp2:therabidus",
  "deaceased:great_visage",
];

function writeDoc(data: any, cfg: ReturnType<typeof readHordeCfg>, waves: number) {
  const fmt = (v: number | null) => (v === null ? "—" : String(v));
  const label = (id: string) => {
    const e = data.entities[id];
    return e?.name ? `${e.name}（${id}）` : id;
  };
  const L: string[] = [];
  L.push("# 怪物难度数据表（生成物，勿手改）");
  L.push("");
  L.push(`- 生成：\`tsx scripts/gen-monster-difficulty.ts\`，生成时间 ${data.generated}`);
  L.push(`- 数据源：\`${data.source.attributes}\`（基础属性）、\`${data.source.regional}\`（区域/难度倍率）、\`${data.source.horde}\`、\`${data.source.hordeConfig}\``);
  L.push(`- 机读数据：\`${OUT_REL}\`（\`window.WZ_MONSTER_DIFF\`，${data.source.entities} 个实体；未接入站点）`);
  L.push("");
  L.push("## 1. 口径");
  L.push("");
  L.push("| 项 | 说明 |");
  L.push("|---|---|");
  L.push("| 血量 / 护甲 | 属性值（`generic.max_health` / `generic.armor`），已并入 InControl 倍率 |");
  L.push("| 攻击 | 属性值（`generic.attack_damage`），已并入倍率 |");
  L.push("| 打向玩家 | 攻击 × 原版难度系数（简单 `min(D, 0.5D+1)`、普通 `D`、困难 `1.5D`），不含玩家护甲 |");
  L.push("| 城市内 | 命中区域标签 + `incity`：普通难度只有僵尸/尸壳/溺尸吃 `finalize` 批，困难难度全部 hostile 再吃一批 |");
  L.push("| 野外 | 无区域标签：血量/护甲/攻击不到 InControl 的区域倍率（简单仍 ×0.5） |");
  L.push("| 尸潮 | `spawntype: event` 在困难下额外 ×2 血 / ×1.5 甲 / ×1.5 攻击；简单再 ×0.5 |");
  L.push("| hostile 判定 | 除 `naturalist:*` 动物外，其余实体都按 `hostile: true` 处理（困难批只对 hostile 生效） |");
  L.push("| 尸潮分两种 | `尸潮 · 野外` 只吃 `spawntype: event` 那条；`尸潮 · 城区` 是尸潮落进区域标签范围，区域倍率会再叠一层（代码里 `continue: true`，两批都跑） |");
  L.push("");
  L.push(`每场尸潮：${cfg.spawnAmount} 只/次 × ${waves} 次 ≈ ${data.horde.expectedPerEvent} 只，同屏上限 ${cfg.spawnMax}，每 ${cfg.everyDays} 天一次。`);
  L.push("");
  L.push("## 2. 抽样：同一只怪在各场景下的数值");
  L.push("");
  for (const id of SAMPLE) {
    const e = data.entities[id];
    if (!e) continue;
    L.push(`### ${label(id)}`);
    L.push("");
    L.push("| 场景 | 血量 | 攻击 | 护甲 | 打向玩家 |");
    L.push("|---|---:|---:|---:|---:|");
    const row = (name: string, c: any) => L.push(`| ${name} | ${fmt(c.hp)} | ${fmt(c.dmg)} | ${fmt(c.armor)} | ${fmt(c.toPlayer)} |`);
    row("野外 · 简单", e.wild.easy);
    row("野外 · 普通", e.wild.normal);
    row("野外 · 困难", e.wild.hard);
    for (const t of TIERS) row(`${t} 城市 · 普通`, e.city[t].normal);
    for (const t of TIERS) row(`${t} 城市 · 困难`, e.city[t].hard);
    row("尸潮 · 野外 · 普通", e.horde.normal);
    row("尸潮 · 野外 · 困难", e.horde.hard);
    row("尸潮 · 城区 T1 · 困难", e.horde.city.T1.hard);
    row("尸潮 · 城区 T4 · 困难", e.horde.city.T4.hard);
    for (const d of e.depth ?? []) row(`洞穴 y≤${d.maxY}`, d);
    L.push("");
  }
  L.push("## 3. 尸潮天数档（单波 20 只的期望，×5 波 = 每场）");
  L.push("");
  for (const diff of ["normal", "hard"] as const) {
    L.push(`### ${diff === "normal" ? "普通 / 简单" : "困难"}（${data.horde.bands[diff].length} 档）`);
    L.push("");
    L.push("| 玩家天数 | 世界天数 | 表 | 名单（权重 / 单波期望 / 每场约） |");
    L.push("|---|---|---|---|");
    for (const b of data.horde.bands[diff]) {
      const days = b.worldDaysFrom ? `≥${b.worldDaysFrom}（每 ${cfg.everyDays} 天）` : (b.worldDays ?? []).join("、");
      const list = b.rows
        .slice()
        .sort((a: HordeRow, b2: HordeRow) => b2.expect - a.expect)
        .map((r: HordeRow) => `${r.name ?? r.id} ${r.weight} / ${r.expect} / ${r2(r.expect * waves)}`)
        .join("；");
      L.push(`| ${b.playerDay[0]}–${b.playerDay[1] ?? "∞"} | ${days || "—"} | ${b.table} | ${list} |`);
    }
    L.push("");
  }
  writeFileSync(join(ROOT, DOC_REL), L.join("\n") + "\n");
  console.log(`写出 ${DOC_REL}`);
}

main();
