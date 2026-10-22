/**
 * 生成 public/data/horde-buildings.js：每个「尸潮建筑」的僵尸清单 + 全部怪物的刷怪来源分类。
 *
 * 用法：tsx scripts/gen-horde-buildings.ts [--mods <已下载的模组 jar 目录>]
 *
 * 真源：
 *   1. DCTweaks jar 里的 data/deceasedcraft/lostsouls/buildings/<区域>/<建筑>.json
 *      —— LostSouls 的「尸潮建筑」定义：出怪权重、规模、血量加成、同屏上限、装甲、闹鬼概率
 *   2. config/incontrol/spawner.json —— 区域刷怪器（= 平时会刷的怪）
 *   3. config/hordes/data/hordes/horde_data —— 天数尸潮（= 15 天一波那种）
 *   4. public/data/monsters-difficulty.js —— 已算好的基础属性与难度倍率（先跑 npm run gen:monsters）
 *   5. --mods 目录里的 jar（可选）—— 读 data/<mod>/forge/biome_modifier/*.json 的 forge:add_spawns，
 *      用来判断「模组自带的自然刷新」；缺省指向 .cache/mods（未下载时会警告，分类只按整合包配置算）
 *
 * LostSouls 刷怪用的是 MobSpawnType.MOB_SUMMONED（反编译 ForgeEventHandlers 确认），
 * 所以困难难度下 InControl 的 `spawntype: [event, mob_summoned]` 那条 ×2 也会命中。
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readGlobal } from "./pack-readers.js";

const ROOT = process.cwd();
const PACK = join(ROOT, "DeceasedCraft5.11.19");
const OUT_REL = "public/data/horde-buildings.js";
const DOC_REL = "docs/horde-buildings.md";
const DIFF_REL = "public/data/monsters-difficulty.js";

const args = process.argv.slice(2);
const modsDir = (() => {
  const i = args.indexOf("--mods");
  return i >= 0 && args[i + 1] ? join(ROOT, args[i + 1]) : join(ROOT, ".cache/mods");
})();

const DISTRICT_TIER: Record<string, string> = {
  suburb_residential: "T1",
  highrise_residential: "T2",
  highrise_office: "T2",
  retail_district: "T3",
  highrise_hotel: "T3",
  wasteland: "T4",
};
const DISTRICT_NAME: Record<string, string> = {
  suburb_residential: "郊区住宅区",
  highrise_residential: "摩天住宅区",
  highrise_office: "摩天办公区",
  retail_district: "零售商业区",
  highrise_hotel: "摩天酒店区",
  wasteland: "荒地",
};

/** 站点 loot 里没有的建筑名（按 id 意译；仅 multi_residentialbunker 一个） */
const NAME_OVERRIDE: Record<string, string> = {
  multi_residentialbunker: "居民地堡",
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ */
/* 1. 从 DCTweaks jar 读 LostSouls 定义                                 */
/* ------------------------------------------------------------------ */

function findPackJar(): string {
  const dir = join(PACK, "overrides/mods");
  const hit = readdirSync(dir).find((f) => /^DCTweaks.*\.jar$/i.test(f));
  if (!hit) throw new Error(`没找到 DCTweaks jar：${dir}`);
  return join(dir, hit);
}

function readLostsoulsDefs(jar: string): { file: string; district: string; raw: any }[] {
  const out: { file: string; district: string; raw: any }[] = [];
  const listing = execFileSync("unzip", ["-Z1", jar, "data/deceasedcraft/lostsouls/buildings/*"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  })
    .split("\n")
    .filter((p) => /^data\/deceasedcraft\/lostsouls\/buildings\/[^/]+\/[^/]+\.json$/.test(p))
    .sort();
  for (const entry of listing) {
    const district = entry.split("/")[4];
    const raw = JSON.parse(
      execFileSync("unzip", ["-p", jar, entry], {
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
    out.push({ file: entry.replace("data/deceasedcraft/lostsouls/buildings/", ""), district, raw });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 2. 名称表                                                           */
/* ------------------------------------------------------------------ */

/** LostSouls 真正生效的加成来自 defaultconfigs/lostsouls-server.toml（建筑 JSON 里的 healthbonus 在 4.1.7 里没被调用）。 */
function readLostSoulsConfig() {
  const file = join(PACK, "overrides/defaultconfigs/lostsouls-server.toml");
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  const num = (key: string, fallback: number) => {
    const m = new RegExp(`^\\s*${key}\\s*=\\s*(-?[\\d.]+)`, "m").exec(text);
    return m ? Number(m[1]) : fallback;
  };
  return {
    minHealthBonus: num("minHealthBonus", 1),
    maxHealthBonus: num("maxHealthBonus", 1),
    minDamageBonus: num("minDamageBonus", 0.5),
    maxDamageBonus: num("maxDamageBonus", 1),
    spawnMaxInBuilding: num("spawnMaxInBuilding", 15),
  };
}

function readBuildingNames(): Map<string, string> {
  const loot = readGlobal(ROOT, "public/data/loot.js", "WZ_DATA");
  const map = new Map<string, string>();
  for (const region of loot?.regions ?? []) {
    for (const b of region.buildings ?? []) if (b?.id && b?.name) map.set(String(b.id), String(b.name));
  }
  return map;
}

function readMobNames(): Map<string, string> {
  const guides = readGlobal(ROOT, "public/data/guides.js", "WZ_GUIDES");
  const map = new Map<string, string>();
  for (const m of guides?.monsters ?? []) if (m.entityId) map.set(String(m.entityId), String(m.name));
  return map;
}

/* ------------------------------------------------------------------ */
/* 3. 刷怪来源                                                         */
/* ------------------------------------------------------------------ */

function readSpawnerIds(): { ids: Set<string>; rate: Map<string, number> } {
  const raw = JSON.parse(readFileSync(join(PACK, "overrides/config/incontrol/spawner.json"), "utf8")) as any[];
  const ids = new Set<string>();
  const rate = new Map<string, number>();
  for (const rule of raw) {
    const m = rule.mob;
    const arr = Array.isArray(m) ? m : m && typeof m === "object" ? [m] : [];
    for (const x of arr) {
      const id = typeof x === "string" ? x : x?.mob ? String(x.mob) : "";
      if (!id) continue;
      ids.add(id);
      rate.set(id, r2((rate.get(id) ?? 0) + Number(rule.persecond ?? 0)));
    }
  }
  return { ids, rate };
}

function readNaturalIds(dir: string): { ids: Set<string>; mods: number; warnings: string[] } {
  const ids = new Set<string>();
  const warnings: string[] = [];
  let mods = 0;
  if (!existsSync(dir)) {
    warnings.push(`没找到模组目录 ${dir}：本次分类只按整合包配置（区域刷怪器 + 尸潮），「模组自然刷」一栏留空`);
    return { ids, mods, warnings };
  }
  for (const jarName of readdirSync(dir).filter((f) => f.endsWith(".jar"))) {
    const jar = join(dir, jarName);
    let entries: string[];
    try {
      entries = execFileSync("unzip", ["-Z1", jar, "data/*/forge/biome_modifier/*"], {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      })
        .split("\n")
        .filter((p) => /\/forge\/biome_modifier\/.*\.json$/.test(p));
    } catch {
      continue;
    }
    let hit = false;
    for (const entry of entries) {
      let json: any;
      try {
        json = JSON.parse(
          execFileSync("unzip", ["-p", jar, entry], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
        );
      } catch {
        continue;
      }
      if (json?.type !== "forge:add_spawns") continue;
      const spawners = Array.isArray(json.spawners) ? json.spawners : json.spawners ? [json.spawners] : [];
      for (const s of spawners) {
        if (!s?.type) continue;
        if (Number(s.weight ?? 0) <= 0) continue; // weight 0 = 关掉
        ids.add(String(s.type));
        hit = true;
      }
    }
    if (hit) mods++;
  }
  return { ids, mods, warnings };
}

/* ------------------------------------------------------------------ */
/* 4. 组装                                                             */
/* ------------------------------------------------------------------ */

function main() {
  const warnings: string[] = [];
  const diff = readGlobal(ROOT, DIFF_REL, "WZ_MONSTER_DIFF");
  if (!diff) throw new Error(`读不到 ${DIFF_REL}：先跑 npm run gen:monsters`);
  const stats = diff.entities as Record<string, any>;
  const eventRule = (diff.rules?.hardEvent ?? [])[0] ?? {};
  const eventHpMult = Number(eventRule.hp ?? 2);
  const eventDmgMult = Number(eventRule.dmg ?? 1.5);
  const eventArmorMult = Number(eventRule.armor ?? 1.5);
  const vanillaFactor = (difficulty: "normal" | "hard", d: number) => (difficulty === "hard" ? 1.5 * d : d);

  const ls = readLostSoulsConfig();
  const jar = findPackJar();
  const defs = readLostsoulsDefs(jar);
  const buildingNames = readBuildingNames();
  const mobNames = readMobNames();
  const { ids: spawnerIds, rate: spawnerRate } = readSpawnerIds();
  const { ids: naturalIds, mods: scannedMods, warnings: modWarn } = readNaturalIds(modsDir);
  warnings.push(...modWarn);

  const hordeIds = new Set<string>();
  for (const band of [...(diff.horde?.bands?.normal ?? []), ...(diff.horde?.bands?.hard ?? [])]) {
    for (const row of band.rows) hordeIds.add(String(row.id));
  }

  const buildingHordeIds = new Set<string>();
  for (const def of defs) for (const m of def.raw.mobs ?? []) buildingHordeIds.add(String(m.name));

  // 每个建筑（多建筑文件可能挂多个 id）一份清单
  const buildings: any[] = [];
  for (const def of defs) {
    const { raw, district, file } = def;
    // 同一个建筑的四个朝向（_90/_180/_270）会各列一条，去重到基名
    const ids = [
      ...new Set(
        [...(raw.buildings ?? []), ...(raw.multibuildings ?? [])].map((x: string) =>
          String(x).replace(/^deceasedcraft:/, "").split("/")[0],
        ),
      ),
    ];
    const tier = DISTRICT_TIER[district] ?? null;
    const mobs = (raw.mobs ?? []).map((m: any) => ({ id: String(m.name), weight: Number(m.weight ?? 1) }));
    const totalWeight = mobs.reduce((s: number, m: any) => s + m.weight, 0) || 1;
    const amount = raw.mobamounts ?? {};
    const min = Number(amount.min ?? 0);
    const max = Number(amount.max ?? 0);
    const avg = (min + max) / 2;
    const hb = Number(raw.healthbonus?.min ?? raw.healthbonus?.max ?? 1);
    const hbMax = Number(raw.healthbonus?.max ?? hb);

    const rows = mobs.map((m: any) => {
      const e = stats[m.id];
      // 建筑尸潮走的是 onjoin 批（不吃 finalize），所以取 horde.city 而不是 city
      const cellNormal = tier ? e?.horde?.city?.[tier]?.normal : e?.horde?.normal;
      const cellHard = tier ? e?.horde?.city?.[tier]?.hard : e?.horde?.hard;
      const armorNormal = cellNormal?.armor ?? null;
      const armorHard = cellHard?.armor ?? null;
      const dmgNormal = cellNormal?.dmg ?? null;
      const dmgHard = cellHard?.dmg ?? null;
      return {
        id: m.id,
        name: mobNames.get(m.id) ?? e?.name ?? null,
        weight: m.weight,
        share: r2((m.weight / totalWeight) * 100),
        expect: r1((avg * m.weight) / totalWeight),
        hpNormal: cellNormal?.hp ?? null,
        hpHard: cellHard?.hp ?? null,
        armorNormal,
        armorHard,
        // LostSouls 的 boostEntity 会把攻击力乘上全局 [minDamageBonus, maxDamageBonus]
        dmgNormalMin: dmgNormal === null ? null : r2(dmgNormal * ls.minDamageBonus),
        dmgNormalMax: dmgNormal === null ? null : r2(dmgNormal * ls.maxDamageBonus),
        dmgHardMin: dmgHard === null ? null : r2(dmgHard * ls.minDamageBonus),
        dmgHardMax: dmgHard === null ? null : r2(dmgHard * ls.maxDamageBonus),
        toPlayerNormal: dmgNormal === null ? null : r2(vanillaFactor("normal", dmgNormal * ls.maxDamageBonus)),
        toPlayerHard: dmgHard === null ? null : r2(vanillaFactor("hard", dmgHard * ls.maxDamageBonus)),
      };
    });

    for (const id of ids) {
      buildings.push({
        key: id,
        name: buildingNames.get(id) ?? NAME_OVERRIDE[id] ?? id,
        district,
        districtName: DISTRICT_NAME[district] ?? district,
        tier,
        kind: /horde/i.test(file) ? "generic" : "specific",
        def: file,
        amount: { min, max, avg: r1(avg) },
        healthBonus: { min: hb, max: hbMax },
        spawnMaxInBuilding: raw.spawnmaxinbuilding ?? null,
        hauntedChance: raw.hauntedchance ?? null,
        armor: {
          helmets: (raw.helmets ?? []).map(String),
          chestplates: (raw.chestplates ?? []).map(String),
          leggings: (raw.leggings ?? []).map(String),
          boots: (raw.boots ?? []).map(String),
        },
        mobs: rows,
      });
    }
  }
  buildings.sort((a, b) => String(a.tier).localeCompare(String(b.tier)) || a.name.localeCompare(b.name, "zh"));

  // 每只怪出现在哪些建筑
  const mobBuildings = new Map<string, string[]>();
  for (const b of buildings) {
    for (const m of b.mobs) {
      const list = mobBuildings.get(m.id) ?? [];
      if (!list.includes(b.key)) list.push(b.key);
      mobBuildings.set(m.id, list);
    }
  }

  /* 全部怪物的刷怪来源分类 */
  const mobs: Record<string, any> = {};
  for (const id of Object.keys(stats)) {
    const e = stats[id];
    if (e.statsMissing) continue;
    if (e.baseSource === "vanilla") continue; // husk/drowned 是我们为难度表补的原版值，不算「包内实体」
    const sources: string[] = [];
    if (spawnerIds.has(id)) sources.push("区域刷怪器");
    if (naturalIds.has(id)) sources.push("模组自然刷");
    if (hordeIds.has(id)) sources.push("天数尸潮");
    if (buildingHordeIds.has(id)) sources.push("尸潮建筑");
    const onlyHorde = sources.length > 0 && sources.every((s) => s === "天数尸潮" || s === "尸潮建筑");
    const status = sources.length === 0 ? "unimplemented" : onlyHorde ? "hordeOnly" : "normal";
    mobs[id] = {
      name: mobNames.get(id) ?? e.name ?? null,
      namespace: id.split(":")[0],
      status,
      sources,
      buildings: (mobBuildings.get(id) ?? []).slice(0, 40),
      base: e.base,
      // 真菌模组：它自己有 biome modifier（自定义类型 spore:inf_spawns），不在 forge:add_spawns 口径里
      sporeBiome: id.startsWith("spore:"),
      hordeTables: Boolean(e.hordeTables),
      // 在尸潮名单里、但平时不在城市刷怪器里：玩家会觉得「只在尸潮见到」
      hordeNotInSpawner: (hordeIds.has(id) || buildingHordeIds.has(id)) && !spawnerIds.has(id),
      // 城市里平时每秒会刷多少（0 = 城市刷怪器里没有；数字越小越像「尸潮专属」）
      spawnRate: spawnerRate.get(id) ?? 0,
    };
  }

  const missingHordeIds = [...new Set([...hordeIds, ...buildingHordeIds])].filter((id) => !stats[id] || stats[id].statsMissing);

  const counts = {
    buildings: buildings.length,
    defs: defs.length,
    mobs: Object.keys(mobs).length,
    normal: Object.values(mobs).filter((m: any) => m.status === "normal").length,
    hordeOnly: Object.values(mobs).filter((m: any) => m.status === "hordeOnly").length,
    unimplemented: Object.values(mobs).filter((m: any) => m.status === "unimplemented").length,
  };

  const data = {
    generated: new Date().toISOString().slice(0, 10),
    source: {
      pack: "DeceasedCraft 5.11.19",
      defs: "DCTweaks jar: data/deceasedcraft/lostsouls/buildings/<区域>/<建筑>.json",
      spawner: "config/incontrol/spawner.json",
      hordeTables: "config/hordes/data/hordes/horde_data",
      stats: DIFF_REL,
      naturalSpawnJars: existsSync(modsDir) ? `${scannedMods} 个模组的 forge:add_spawns` : null,
      note: "husk/drowned 是按原版补进难度表的，没有算进这里的来源统计；未实装 = 四个来源都没有",
      spawnType: "MOB_SUMMONED（LostSouls ForgeEventHandlers）",
      difficultyStack: "血量/护甲 = 基础 × 区域/难度倍率 × (困难 ? 事件倍率 : 1)；攻击再 ×LostSouls 的 [minDamageBonus, maxDamageBonus]",
      lostSoulsBoost: ls,
      healthBonusNote: "建筑 JSON 的 healthbonus 在 LostSouls 4.1.7 里没有调用点（getHealthBonus 全文无引用），实际生效的是 toml 全局值",
    },
    tiers: DISTRICT_TIER,
    eventMult: { hp: eventHpMult, dmg: eventDmgMult, armor: eventArmorMult },
    counts,
    missingHordeIds,
    buildings,
    mobs,
  };

  writeFileSync(
    join(ROOT, OUT_REL),
    `/* 亡者世界 · 尸潮建筑清单与刷怪来源分类（由 scripts/gen-horde-buildings.ts 生成，勿手改） */\n` +
      `window.WZ_HORDE_BUILDINGS = ${JSON.stringify(data)};\n`,
  );
  writeDoc(data);
  console.log(`写出 ${OUT_REL}（${(JSON.stringify(data).length / 1024).toFixed(0)} KB）`);
  console.log(
    `建筑 ${counts.buildings} 个（${counts.defs} 份定义） · 怪物 ${counts.mobs}：正常 ${counts.normal} / 仅尸潮 ${counts.hordeOnly} / 未实装 ${counts.unimplemented}`,
  );
  for (const w of warnings) console.warn("警告：" + w);
}

/* ------------------------------------------------------------------ */
/* 5. 人读表格                                                         */
/* ------------------------------------------------------------------ */

function writeDoc(data: any) {
  const L: string[] = [];
  const statusText: Record<string, string> = {
    normal: "正常刷新",
    hordeOnly: "仅尸潮",
    unimplemented: "未实装",
  };
  L.push("# 尸潮建筑僵尸清单（生成物，勿手改）");
  L.push("");
  L.push(`- 生成：\`tsx scripts/gen-horde-buildings.ts\`，生成时间 ${data.generated}`);
  L.push(`- 机读数据：\`${OUT_REL}\`（\`window.WZ_HORDE_BUILDINGS\`）`);
  L.push(`- 出怪定义：${data.source.defs}`);
  L.push(`- 规模：建筑自带的 \`mobamounts\`；血量/护甲：建筑尸潮走 \`onjoin\` 批（实测不吃 \`finalize\` 区域批），困难再叠事件倍率`);
  L.push(`- 攻击：在上面基础上再乘 LostSouls 全局配置 \`minDamageBonus…maxDamageBonus\`（本包 ${data.source.lostSoulsBoost.minDamageBonus}–${data.source.lostSoulsBoost.maxDamageBonus}），所以是一个区间`);
  L.push(`- 建筑 JSON 里的 \`healthbonus\` 在 LostSouls 4.1.7 里没有调用点（\`getHealthBonus\` 全文无引用），实际加了血的是 toml 全局 \`minHealthBonus…maxHealthBonus\`（本包 ${data.source.lostSoulsBoost.minHealthBonus}）`);
  L.push(`- 「打向玩家」= 攻击上限 × 原版难度系数（困难 1.5D），不含玩家护甲`);
  L.push(`- 刷怪类型：${data.source.spawnType}，所以困难难度下事件那条 ×2 对它同样生效`);
  L.push("");
  L.push("## 1. 一览");
  L.push("");
  L.push("| 阶级 | 建筑 | 区域 | 尸潮规模 | healthbonus（本版本未生效） | 同屏上限 | 闹鬼概率 | 出怪 |");
  L.push("|---|---|---|---:|---:|---:|---:|---|");
  for (const b of data.buildings) {
    const mobs = b.mobs.map((m: any) => `${m.name ?? m.id} ${m.weight}（${m.share}%≈${m.expect}只）`).join("、");
    L.push(
      `| ${b.tier ?? "—"} | ${b.name}${b.kind === "generic" ? "（通用尸潮）" : ""} | ${b.districtName} | ${b.amount.min}–${b.amount.max} | ×${b.healthBonus.min} | ${b.spawnMaxInBuilding ?? "—"} | ${b.hauntedChance ?? "—"} | ${mobs} |`,
    );
  }
  L.push("");
  L.push("## 2. 逐建筑清单（含困难血量）");
  L.push("");
  let lastTier = "";
  for (const b of data.buildings) {
    if (b.tier !== lastTier) {
      L.push(`### ${b.tier ?? "—"} 阶级`);
      L.push("");
      lastTier = b.tier;
    }
    L.push(`#### ${b.name}${b.kind === "generic" ? "（通用尸潮）" : ""} · ${b.districtName}`);
    L.push("");
    L.push(
      `规模 ${b.amount.min}–${b.amount.max}（均 ${b.amount.avg} 只）· 定义里 healthbonus ×${b.healthBonus.min}` +
        `${b.healthBonus.max !== b.healthBonus.min ? `–×${b.healthBonus.max}` : ""}（4.1.7 未生效）· 同屏 ${b.spawnMaxInBuilding ?? "—"} · 闹鬼 ${b.hauntedChance ?? "—"}`,
    );
    const armored = ["helmets", "chestplates", "leggings", "boots"].filter((k) => (b.armor[k] ?? []).length);
    if (armored.length) L.push(`装备：${armored.map((k) => b.armor[k].join("/")).join("；")}`);
    L.push("");
    L.push("| 怪物 | 权重 | 占比 | 期望只数 | 普通 血/甲/攻 | 困难 血/甲/攻 | 困难打向玩家 |");
    L.push("|---|---:|---:|---:|---|---|---:|");
    const rng = (lo: any, hi: any) => (lo === null || lo === undefined ? "—" : lo === hi ? String(lo) : `${lo}–${hi}`);
    for (const m of b.mobs) {
      L.push(
        `| ${m.name ?? m.id}（${m.id}） | ${m.weight} | ${m.share}% | ${m.expect} | ` +
          `${m.hpNormal ?? "—"} / ${m.armorNormal ?? "—"} / ${rng(m.dmgNormalMin, m.dmgNormalMax)} | ` +
          `${m.hpHard ?? "—"} / ${m.armorHard ?? "—"} / ${rng(m.dmgHardMin, m.dmgHardMax)} | ${m.toPlayerHard ?? "—"} |`,
      );
    }
    L.push("");
  }
  L.push("## 3. 刷怪来源分类（167 只站内怪物对应的实体）");
  L.push("");
  L.push("口径：`区域刷怪器` = `incontrol/spawner.json`（平时在城市里刷的）；`模组自然刷` = jar 里的 `forge:add_spawns`；");
  L.push("`天数尸潮` = 15 天一波的尸潮表；`尸潮建筑` = 上表的建筑尸潮。四者都没有 = **未实装**。");
  L.push("");
  for (const status of ["hordeOnly", "unimplemented"]) {
    const list = Object.entries<any>(data.mobs)
      .filter(([, m]) => m.status === status)
      .sort(([a], [b]) => a.localeCompare(b));
    L.push(`### ${statusText[status]}（${list.length}）`);
    L.push("");
    L.push("| 实体 | 名称 | 来源 | 备注 |");
    L.push("|---|---|---|---|");
    for (const [id, m] of list) {
      const note = m.sporeBiome ? "真菌模组（自带 biome modifier，社区视为未上线的 T5）" : "";
      L.push(`| \`${id}\` | ${m.name ?? "—"} | ${m.sources.join(" + ") || "—"} | ${note} |`);
    }
    L.push("");
  }
  const normalByNs: Record<string, number> = {};
  for (const m of Object.values<any>(data.mobs)) {
    if (m.status !== "normal") continue;
    normalByNs[m.namespace] = (normalByNs[m.namespace] ?? 0) + 1;
  }
  const hordeIds = Object.entries<any>(data.mobs).filter(([, m]) => m.hordeTables || m.buildings.length);
  const lowRate = hordeIds
    .filter(([, m]) => m.spawnRate > 0 && m.spawnRate <= 0.05)
    .sort((a, b) => a[1].spawnRate - b[1].spawnRate);
  L.push("### 补充：尸潮名单里出现、但平时城市里刷得极稀的怪");
  L.push("");
  L.push("严格按四来源口径，**没有一只「只在尸潮出现」的怪**（尸潮名单里的实体全都能在平时刷到）。");
  L.push("但下面这些在尸潮名单里、城市刷怪器概率 ≤0.05/秒，实战中基本只在尸潮里见到：");
  L.push("");
  L.push("| 实体 | 名称 | 城市刷怪器概率/秒 | 在尸潮表 | 在建筑尸潮 |");
  L.push("|---|---|---:|---|---|");
  for (const [id, m] of lowRate) {
    L.push(`| \`${id}\` | ${m.name ?? "—"} | ${m.spawnRate} | ${m.hordeTables ? "是" : "—"} | ${m.buildings.length ? "是" : "—"} |`);
  }
  L.push("");
  if ((data.missingHordeIds ?? []).length) {
    L.push("### 数据问题：尸潮表引用了不存在的实体");
    L.push("");
    for (const id of data.missingHordeIds) {
      L.push(`- \`${id}\`：整合包没有属性覆盖，模组 jar 里也找不到对应实体类（疑为 id 拼错，实际不会刷出任何东西）`);
    }
    L.push("");
  }
  L.push(`### 正常刷新（${data.counts.normal}）`);
  L.push("");
  L.push(
    "按命名空间：" +
      Object.entries(normalByNs)
        .map(([k, v]) => `${k} ${v}`)
        .join("、"),
  );
  L.push("");
  writeFileSync(join(ROOT, DOC_REL), L.join("\n") + "\n");
  console.log(`写出 ${DOC_REL}`);
}

if (!existsSync(join(ROOT, "docs"))) mkdirSync(join(ROOT, "docs"), { recursive: true });
main();
