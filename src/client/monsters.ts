/* 生物图鉴目录：把「手写条目」与「生成数据」按实体 id 合并成一份目录。
 *
 * 纯函数，不碰 DOM：站点（app.ts）与验证脚本（scripts/verify-monster-guide.ts）共用同一套规则，
 * 避免页面上一套算法、文档里另一套。
 *
 * 数据来源（都在 index.html 里静态引入）：
 *   guides.js             167 条手写条目（图片 / 打法 / 掉落 / 威胁等级）
 *   monster-spawn-tiers.js 153 条刷怪梯度（区域 T1–T4 / 全图 / 天数尸潮 / 尸潮建筑 / 状态）
 *   monsters-difficulty.js 133 条数值矩阵（野生 / 城区 / 天数尸潮 / 深渊）
 *   horde-buildings.js      33 座尸潮建筑 + 每只怪的困难数值
 */

export const TIERS = ["T1", "T2", "T3", "T4"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABEL: Record<Tier, string> = {
  T1: "郊区住宅区",
  T2: "摩天办公区 / 摩天住宅区",
  T3: "摩天酒店区 / 零售商业区",
  T4: "荒地",
};

export const DIFFS = ["easy", "normal", "hard"] as const;
export type Diff = (typeof DIFFS)[number];
export const DIFF_LABEL: Record<Diff, string> = { easy: "简单", normal: "普通", hard: "困难" };

export const METRICS = ["hp", "dmg", "armor", "toPlayer"] as const;
export type Metric = (typeof METRICS)[number];
export const METRIC_LABEL: Record<Metric, string> = {
  hp: "生命",
  dmg: "攻击",
  armor: "护甲",
  toPlayer: "对玩家",
};
export const METRIC_ICON: Record<Metric, string> = {
  hp: "/images/ui/stat-heart-full.png",
  dmg: "/images/ui/stat-attack.png",
  armor: "/images/ui/stat-armor-full.png",
  toPlayer: "/images/ui/stat-heart-half.png",
};
export const ICON_EMPTY = "/images/ui/stat-heart-empty.png";
export const ICON_ARMOR_EMPTY = "/images/ui/stat-armor-empty.png";

/** 手写条目里 3 处 id 拼写与包内注册名不一致（少一个下划线）。 */
export const ID_FIXES: Record<string, string> = {
  "hordes:zombieplayer": "hordes:zombie_player",
  "hordes:huskplayer": "hordes:husk_player",
  "hordes:drownedplayer": "hordes:drowned_player",
};

/** 没有手写条目时的名称：取自模组 jar 的 lang/zh_cn.json / en_us.json（原版取官方译名）。
 *  模组本身没翻译的就保留英文名，不自己编中文。 */
export const ENTITY_NAMES: Record<string, string> = {
  "deaceased:flayedmansections": "Flayedman Sections",
  "deaceased:flayedmantail": "Flayedman Tail",
  "deaceased:tougueentity": "Reeler's Tongue",
  "deaceased:visage_pod": "Great Visage Pod",
  "spore:howit_arm": "菌械重炮肢体",
  "undead_revamp2:night_hunter": "Night Hunter",
  "minecraft:cat": "猫",
  "minecraft:wolf": "狼",
  "minecraft:spider": "蜘蛛",
  "minecraft:cave_spider": "洞穴蜘蛛",
  "naturalist:bear": "灰熊",
  "naturalist:boar": "Boar",
  "naturalist:elephant": "大象",
  "naturalist:lion": "狮子",
  "naturalist:rhino": "犀牛",
  "naturalist:giraffe": "长颈鹿",
  "naturalist:zebra": "斑马",
  "naturalist:alligator": "Alligator",
  "naturalist:finch": "Finch",
  "naturalist:sparrow": "Sparrow",
  "naturalist:vulture": "Vulture",
  "naturalist:moose": "Moose",
  "naturalist:bluejay": "冠蓝鸦",
  "naturalist:butterfly": "蝴蝶",
  "naturalist:canary": "金丝雀",
  "naturalist:cardinal": "主红雀",
  "naturalist:robin": "旅鸫",
  "naturalist:snail": "蜗牛",
  "quark:shiba": "Shiba",
  "necroanimalict:zolphin": "Zolphin",
};

/** 原版僵尸变体：刷怪由原版逻辑接管（随僵尸一起生成），不落在任何 InControl 规则上。 */
export const VARIANT_OF: Record<string, string> = {
  "minecraft:husk": "minecraft:zombie",
  "minecraft:drowned": "minecraft:zombie",
};

export const THREATS = ["普通", "特殊", "小头目", "头领", "灾厄", "真菌", "未评级"] as const;
export type Threat = (typeof THREATS)[number];

export type CatalogStatus = "spawns" | "unimplemented" | "unconfirmed";
export type CatalogKind = "hostile" | "neutral" | "npc";

export interface Stats {
  hp: number | null;
  dmg: number | null;
  armor: number | null;
  toPlayer: number | null;
}

export interface BuildingRef {
  key: string;
  name: string;
  tier: Tier | null;
}

export interface CatalogEntry {
  id: string;
  name: string;
  en: string | null;
  image: string | null;
  thumb: string | null;
  imageNote: string | null;
  category: string | null;
  source: string | null;
  level: string | null;
  threat: Threat;
  kind: CatalogKind;
  status: CatalogStatus;
  curated: boolean;
  generated: boolean;
  hasStats: boolean;
  /** attribute.js 原值 */
  base: Stats | null;
  tiers: Tier[];
  /** 各梯度上命中的 InControl 规则（每秒触发概率 / 条件 / 区域名） */
  cityDetail: Record<string, { rate: number; conditions: string[]; districts: string[] }>;
  anywhere: { rate: number; conditions: string[] } | null;
  horde: { normal: number[]; hard: number[] };
  buildings: BuildingRef[];
  behavior: string | null;
  strategy: string | null;
  drops: string | null;
  spawnText: string | null;
  spawnTypes: string[];
  /** 手写值与生成值不一致时记在这里 */
  conflicts: string[];
  /** 数据来源说明 */
  evidence: string[];
}

export interface Catalog {
  entries: CatalogEntry[];
  byId: Map<string, CatalogEntry>;
  counts: {
    total: number;
    spawns: number;
    unimplemented: number;
    unconfirmed: number;
    curatedMerged: number;
    generatedOnly: number;
    curatedOnly: number;
  };
  /** 梯度 → 会在该梯度刷新的实体 id（不含未实装） */
  tierIds: Record<Tier, string[]>;
  /** 全图 / 无梯度刷新的实体 id（不含深渊专属） */
  anywhereIds: string[];
  /** 只在深渊维度刷新的实体 id */
  abyssIds: string[];
}

export interface CatalogInput {
  guides: any;
  spawn: any;
  diff: any;
  buildings: any;
}

function num(v: any): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function statsFrom(cell: any): Stats | null {
  if (!cell) return null;
  return { hp: num(cell.hp), dmg: num(cell.dmg), armor: num(cell.armor), toPlayer: num(cell.toPlayer) };
}

function hpThreat(hp: number | null): Threat {
  if (hp == null) return "未评级";
  if (hp < 100) return "普通";
  if (hp < 500) return "特殊";
  if (hp < 2000) return "小头目";
  if (hp < 5000) return "头领";
  return "灾厄";
}

export function normalizeId(id: string): string {
  return ID_FIXES[id] || id;
}

function kindOf(id: string, hostile: boolean | null): CatalogKind {
  if (id.startsWith("customnpcs:")) return "npc";
  // 以生成数据里的 hostile 为准：手写的「感染动物」类目里也有僵尸羊、僵尸猪这种会咬人的
  if (hostile === false) return "neutral";
  if (hostile === true) return "hostile";
  return "hostile";
}

export function buildCatalog(input: CatalogInput): Catalog {
  const curatedList: any[] = input?.guides?.monsters || [];
  const spawnEntities: Record<string, any> = input?.spawn?.entities || {};
  const diffEntities: Record<string, any> = input?.diff?.entities || {};
  const hbMobs: Record<string, any> = input?.buildings?.mobs || {};
  const buildingDefs: any[] = input?.buildings?.buildings || [];

  const buildingTier = new Map<string, Tier | null>();
  for (const b of buildingDefs) buildingTier.set(b.key, (b.tier as Tier) || null);

  const map = new Map<string, CatalogEntry>();
  let curatedMerged = 0;
  let generatedOnly = 0;
  let curatedOnly = 0;

  const blank = (id: string): CatalogEntry => ({
    id,
    name: id,
    en: null,
    image: null,
    thumb: null,
    imageNote: null,
    category: null,
    source: null,
    level: null,
    threat: "未评级",
    kind: "hostile",
    status: "unconfirmed",
    curated: false,
    generated: false,
    hasStats: false,
    base: null,
    tiers: [],
    cityDetail: {},
    anywhere: null,
    horde: { normal: [], hard: [] },
    buildings: [],
    behavior: null,
    strategy: null,
    drops: null,
    spawnText: null,
    spawnTypes: [],
    conflicts: [],
    evidence: [],
  });

  // 1) 手写条目
  for (const m of curatedList) {
    if (!m || !m.entityId) continue;
    const id = normalizeId(String(m.entityId));
    const e = blank(id);
    e.curated = true;
    e.name = m.name || id;
    e.en = m.en || null;
    e.image = m.image || null;
    e.thumb = m.thumb || null;
    e.imageNote = m.imageNote || null;
    e.category = m.category || null;
    e.source = m.source || null;
    e.level = m.level || null;
    e.behavior = m.behavior || null;
    e.strategy = m.strategy || null;
    e.drops = m.drops || null;
    e.spawnText = m.spawn || null;
    e.spawnTypes = Array.isArray(m.spawnTypes) ? m.spawnTypes.slice() : [];
    const hp = num(m.hp);
    const dmg = num(m.damage != null ? m.damage : m.attack);
    const armor = num(m.armor);
    if (hp != null || dmg != null || armor != null) {
      e.base = { hp, dmg, armor, toPlayer: null };
      e.hasStats = hp != null;
    }
    e.threat = (e.level as Threat) || hpThreat(hp);
    e.evidence.push("手写条目（guides.js）");
    map.set(id, e);
  }

  // 2) 生成数据（含只在生成侧出现的实体）
  for (const [rawId, s] of Object.entries(spawnEntities)) {
    const id = normalizeId(rawId);
    let e = map.get(id);
    if (e) {
      curatedMerged += 1;
    } else {
      e = blank(id);
      generatedOnly += 1;
      map.set(id, e);
    }
    e.generated = true;
    e.name = e.curated && e.name !== id ? e.name : s.name || ENTITY_NAMES[id] || e.name;
    if (!e.curated && !s.name && ENTITY_NAMES[id]) e.evidence.push("名称来自模组语言文件");
    const hostile = s.hostile == null ? null : Boolean(s.hostile);
    e.kind = kindOf(id, hostile);

    const tiers = TIERS.filter((t) => s.city && s.city[t]);
    e.tiers = tiers;
    e.cityDetail = {};
    for (const t of tiers) {
      const c = s.city[t];
      if (c) e.cityDetail[t] = { rate: num(c.rate) ?? 0, conditions: c.conditions || [], districts: c.districts || [] };
    }
    e.anywhere = s.anywhere || null;
    e.horde = {
      normal: Array.isArray(s.horde?.normal) ? s.horde.normal.slice() : [],
      hard: Array.isArray(s.horde?.hard) ? s.horde.hard.slice() : [],
    };
    e.buildings = Array.isArray(s.buildings)
      ? s.buildings.map((b: any) => ({ key: b.key, name: b.name, tier: buildingTier.get(b.key) ?? null }))
      : [];

    if (s.status === "unimplemented") {
      e.status = "unimplemented";
      e.evidence.push("四个刷怪来源全空（区域刷怪器 / 模组自然刷 / 天数尸潮 / 尸潮建筑）");
    } else {
      e.status = "spawns";
      const src = hbMobs[id]?.sources;
      if (Array.isArray(src) && src.length) e.evidence.push(...src.map((x: string) => "来源：" + x));
      if (s.status === "unknown") e.evidence.push("原版僵尸变体，刷怪由原版逻辑接管，不在 InControl 规则里");
      if (s.status === "missing") e.evidence.push("属性脚本无数据，数值以「无数值」标注");
    }
    const base = hbMobs[id]?.base;
    if (base && base.hp != null) {
      const gen: Stats = { hp: num(base.hp), dmg: num(base.dmg), armor: num(base.armor), toPlayer: null };
      if (!e.hasStats || !e.base || e.base.hp == null) {
        e.base = gen;
        e.hasStats = gen.hp != null;
      } else if (e.base && (e.base.hp !== gen.hp || e.base.dmg !== gen.dmg || e.base.armor !== gen.armor)) {
        // 生成数据优先：手写值存档到 conflicts
        e.conflicts.push(
          `属性 手写 ${e.base.hp}/${e.base.dmg}/${e.base.armor} → 生成 ${gen.hp}/${gen.dmg}/${gen.armor}`
        );
        e.base = gen;
        e.hasStats = gen.hp != null;
      }
    }
    if (!e.level) e.threat = hpThreat(e.base ? e.base.hp : null);
  }

  // 3) 数值矩阵（difficulty）补齐属性
  for (const [rawId, d] of Object.entries(diffEntities)) {
    const id = normalizeId(rawId);
    const e = map.get(id);
    if (!e) continue;
    if (!e.hasStats && d.base && d.base.hp != null) {
      e.base = { hp: num(d.base.hp), dmg: num(d.base.dmg), armor: num(d.base.armor), toPlayer: null };
      e.hasStats = d.base.hp != null;
      if (!e.level) e.threat = hpThreat(e.base.hp);
    }
    if (d.statsMissing) e.evidence.push("属性脚本缺失，仅有刷怪记录");
  }

  // 4) 收尾：状态、兜底名、证据
  const entries = Array.from(map.values());
  for (const e of entries) {
    const variant = VARIANT_OF[e.id];
    if (
      e.status === "spawns" &&
      !variant &&
      !e.tiers.length &&
      !e.anywhere &&
      !e.horde.normal.length &&
      !e.horde.hard.length &&
      !e.buildings.length
    ) {
      // 生成侧说会刷，但四个来源都没落到这只怪身上
      e.status = "unimplemented";
    }
    if (variant) e.evidence.push("原版变体，随 " + variant.split(":")[1] + " 一起刷新");
    if (!e.curated && !e.generated) e.status = "unconfirmed";
    if (!e.name || e.name === e.id) e.name = ENTITY_NAMES[e.id] || e.id;
    if (!e.curated && e.status === "unconfirmed") {
      e.evidence.push("包内有注册名，但四个刷怪来源都扫不到");
    }
    if (e.curated && e.spawnText) {
      const claimed = String(e.spawnText);
      e.evidence.push("手写条目原话：" + claimed.slice(0, 40));
    }
    if (e.curated && !e.generated) curatedOnly += 1;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name, "zh"));

  const byId = new Map(entries.map((e) => [e.id, e]));
  const tierIds = { T1: [], T2: [], T3: [], T4: [] } as Record<Tier, string[]>;
  const anywhereIds: string[] = [];
  const abyssIds: string[] = [];
  for (const e of entries) {
    if (e.status !== "spawns") continue;
    for (const t of e.tiers) tierIds[t].push(e.id);
    if (e.tiers.length) continue;
    if (abyssOnly(e)) abyssIds.push(e.id);
    else if (e.anywhere || e.horde.normal.length || e.horde.hard.length || VARIANT_OF[e.id]) anywhereIds.push(e.id);
  }

  return {
    entries,
    byId,
    counts: {
      total: entries.length,
      spawns: entries.filter((e) => e.status === "spawns").length,
      unimplemented: entries.filter((e) => e.status === "unimplemented").length,
      unconfirmed: entries.filter((e) => e.status === "unconfirmed").length,
      curatedMerged,
      generatedOnly,
      curatedOnly,
    },
    tierIds,
    anywhereIds,
    abyssIds,
  };
}

/* ---------------- 数值矩阵 ---------------- */

export interface MatrixRow {
  label: string;
  diff: Diff | "horde-hard";
  stats: Stats | null;
  note?: string;
}
export interface MatrixSection {
  key: string;
  title: string;
  rows: MatrixRow[];
}

/** 深渊规则只看维度，不会被城区倍率影响。 */
function abyssOnly(e: CatalogEntry): boolean {
  if (e.tiers.length) return false;
  const conds = (e.anywhere?.conditions || []).slice();
  for (const c of Object.values(e.cityDetail)) conds.push(...(c.conditions || []));
  return conds.some((c) => c === "维度 abyss" || c === "维度 深渊");
}

/** 该实体在「城区」段要显示哪些梯度：会刷的梯度；全图刷新的怪按四档全显示，深渊专属的不显示。 */
function cityTiers(e: CatalogEntry): Tier[] {
  if (e.tiers.length) return e.tiers.slice();
  if (abyssOnly(e)) return [];
  if (e.anywhere || e.horde.normal.length || e.horde.hard.length || e.buildings.length) return TIERS.slice();
  return [];
}

/** 该实体在「尸潮建筑」段要显示哪些梯度：按它实际出现的建筑所属梯度。 */
function buildingTiers(e: CatalogEntry): Tier[] {
  const set = new Set<Tier>();
  for (const b of e.buildings) if (b.tier) set.add(b.tier);
  return TIERS.filter((t) => set.has(t));
}

export function entryMatrix(e: CatalogEntry, input: CatalogInput): MatrixSection[] {
  const d = input?.diff?.entities?.[e.id];
  const out: MatrixSection[] = [];
  if (!d) return out;

  const wild = d.wild || {};
  if (wild.easy || wild.normal || wild.hard) {
    out.push({
      key: "wild",
      title: "野外 · 无区域加成",
      rows: DIFFS.map((k) => ({ label: DIFF_LABEL[k], diff: k, stats: statsFrom(wild[k]) })),
    });
  }

  const city = d.city || {};
  for (const t of cityTiers(e)) {
    const cell = city[t];
    if (!cell) continue;
    out.push({
      key: "city-" + t,
      title: `城区 ${t} · ${TIER_LABEL[t]}`,
      rows: DIFFS.map((k) => ({ label: DIFF_LABEL[k], diff: k, stats: statsFrom(cell[k]) })),
    });
  }

  const horde = d.horde || {};
  if (e.horde.normal.length || e.horde.hard.length) {
    const rows: MatrixRow[] = [];
    if (horde.normal) rows.push({ label: "普通", diff: "normal", stats: statsFrom(horde.normal) });
    if (horde.hard) rows.push({ label: "困难", diff: "hard", stats: statsFrom(horde.hard) });
    out.push({ key: "horde", title: "天数尸潮 · 与区域无关", rows });
  }

  const bt = buildingTiers(e);
  if (bt.length && horde.city) {
    const rows: MatrixRow[] = [];
    for (const t of bt) {
      const cell = horde.city[t];
      if (!cell) continue;
      const names = e.buildings.filter((b) => b.tier === t).map((b) => b.name);
      if (cell.normal) rows.push({ label: `T${t.slice(1)} 普通`, diff: "normal", stats: statsFrom(cell.normal) });
      if (cell.hard) rows.push({ label: `T${t.slice(1)} 困难`, diff: "hard", stats: statsFrom(cell.hard) });
      if (names.length) {
        const last = rows[rows.length - 1];
        if (last) last.note = names.slice(0, 3).join("、") + (names.length > 3 ? ` 等 ${names.length} 座` : "");
      }
    }
    out.push({ key: "horde-city", title: "建筑尸潮 · 按建筑所在梯度", rows });
  }

  const abyss = d.abyss || {};
  const isAbyssMob = abyssOnly(e) || e.id.startsWith("spore:") || Boolean(input?.diff?.abyssSpawns?.some((x: any) => normalizeId(x.id) === e.id));
  if (isAbyssMob && (abyss.normal || abyss.hard)) {
    out.push({
      key: "abyss",
      title: "深渊 · 不死生物维度",
      rows: [
        { label: "普通", diff: "normal", stats: statsFrom(abyss.normal) },
        { label: "困难", diff: "hard", stats: statsFrom(abyss.hard) },
      ],
    });
    if (abyss.hordeHard) {
      out.push({
        key: "abyss-horde",
        title: "深渊尸潮 · 推算",
        rows: [{ label: "困难", diff: "horde-hard", stats: statsFrom(abyss.hordeHard), note: "包里尚未写入深渊尸潮配置" }],
      });
    }
  }
  return out;
}

/** 列表行的快览：只给「困难」这一列的常用场景。 */
export interface QuickRow {
  label: string;
  stats: Stats | null;
  note?: string;
}
export function quickRows(e: CatalogEntry, input: CatalogInput): QuickRow[] {
  const d = input?.diff?.entities?.[e.id];
  const out: QuickRow[] = [];
  if (!d) return out;
  const rows: QuickRow[] = [];
  if (d.wild?.hard) rows.push({ label: "野外", stats: statsFrom(d.wild.hard) });
  for (const t of cityTiers(e)) {
    const cell = d.city?.[t]?.hard;
    if (cell) rows.push({ label: `城区 ${t}`, stats: statsFrom(cell) });
  }
  if (e.horde.hard.length && d.horde?.hard) rows.push({ label: "天数尸潮", stats: statsFrom(d.horde.hard) });
  for (const t of buildingTiers(e)) {
    const cell = d.horde?.city?.[t]?.hard;
    if (cell) rows.push({ label: `建筑尸潮 ${t}`, stats: statsFrom(cell) });
  }
  if (e.id.startsWith("spore:") && d.abyss?.hard) rows.push({ label: "深渊", stats: statsFrom(d.abyss.hard) });
  for (const r of rows) out.push(r);
  return out;
}

/** 尸潮建筑里该怪的具体困难数值（建筑之间 dmg 有区间）。 */
export function buildingStats(e: CatalogEntry, input: CatalogInput): Array<{
  key: string;
  name: string;
  tier: Tier | null;
  hp: number | null;
  armor: number | null;
  dmgMin: number | null;
  dmgMax: number | null;
  toPlayer: number | null;
  weight: number | null;
  share: number | null;
}> {
  const defs: any[] = input?.buildings?.buildings || [];
  const out: any[] = [];
  for (const b of defs) {
    const row = (b.mobs || []).find((m: any) => normalizeId(m.id) === e.id);
    if (!row) continue;
    out.push({
      key: b.key,
      name: b.name,
      tier: (b.tier as Tier) || null,
      hp: num(row.hpHard),
      armor: num(row.armorHard),
      dmgMin: num(row.dmgHardMin),
      dmgMax: num(row.dmgHardMax),
      toPlayer: num(row.toPlayerHard),
      weight: num(row.weight),
      share: num(row.share),
    });
  }
  return out;
}
