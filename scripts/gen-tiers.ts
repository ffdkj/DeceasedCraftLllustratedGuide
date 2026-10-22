/**
 * 生成 public/data/tiers.js：枪械梯度（配方组装元件）与子弹梯度（模具最低可搜刮区域档）。
 *
 * 用法：tsx scripts/gen-tiers.ts
 * 只读已生成的 public/data/recipes.js 与 public/data/loot.js；不碰整合包。
 * 输出确定性：同输入两次运行字节一致（generated 日期除外）。
 *
 * 判档规则见 specs/SPEC-gun-tiers.md。
 */
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readGlobal } from "./pack-readers.js";

const SITE_HEADER = "/* 亡者世界 · 枪械梯度与子弹梯度（由 scripts/gen-tiers.ts 生成，勿手改） */\n";

type Tier = "T1" | "T2" | "T3" | "T4";
const TIER_INDEX: Record<Tier, number> = { T1: 1, T2: 2, T3: 3, T4: 4 };

/**
 * 组装元件：档位 + 难度序（1 = 最难，人工排定，同档并列时取靠前者）+ 中文名。
 * 难度序依据（战利品来源数 / 最高掉率）见 specs/SPEC-gun-tiers.md 的表格。
 */
const PARTS: { id: string; label: string; tier: Tier; difficulty: number }[] = [
  { id: "deceasedcraft:special_assembly_parts", label: "特殊武器组装元件", tier: "T4", difficulty: 1 },
  { id: "deceasedcraft:sniper_assembly_parts", label: "狙击枪组装元件", tier: "T4", difficulty: 2 },
  { id: "deceasedcraft:hmg_assembly_parts", label: "机枪组装元件", tier: "T4", difficulty: 3 },
  { id: "deceasedcraft:rifle_assembly_parts", label: "步枪组装元件", tier: "T3", difficulty: 4 },
  { id: "deceasedcraft:shotgun_assembly_parts", label: "霰弹枪组装元件", tier: "T2", difficulty: 5 },
  { id: "deceasedcraft:smg_assembly_parts", label: "冲锋枪组装元件", tier: "T2", difficulty: 6 },
  { id: "deceasedcraft:pistol_assembly_parts", label: "手枪组装元件", tier: "T1", difficulty: 7 },
];

/** 没有配方时按枪械类型回落（用户决定：回落档位标「推断」）。 */
const TYPE_TIER: Record<string, Tier> = {
  手枪: "T1",
  冲锋枪: "T2",
  霰弹枪: "T2",
  步枪: "T3",
  机枪: "T4",
  狙击枪: "T4",
  特殊: "T4",
  重型武器: "T4",
};

/**
 * 弹药 → 口径名 + 模具后缀（模具 id = deceasedcraft:mold_bullet_casing_<mold>）。
 * mold 为 null 表示整合包没有这个口径的模具（40mm 榴弹、火箭、燃料等特殊弹药）。
 */
const AMMO: Record<string, { caliber: string; mold: string | null }> = {
  "tacz:9mm": { caliber: "9×19mm", mold: "9mm" },
  "tacz:12g": { caliber: "12 号霰弹", mold: "12g" },
  "tacz:45acp": { caliber: ".45 ACP", mold: "45acp" },
  "tacz:50ae": { caliber: ".50 AE", mold: "ae50" },
  "tacz:357mag": { caliber: ".357 Magnum", mold: "357magnum" },
  "tacz:500mag": { caliber: ".500 S&W", mold: "500mag" },
  "tacz:556x45": { caliber: "5.56×45mm", mold: "556x45" },
  "tacz:57x28": { caliber: "5.7×28mm", mold: "57x28" },
  "tacz:58x42": { caliber: "5.8×42mm", mold: "58x42" },
  "tacz:762x39": { caliber: "7.62×39mm", mold: "762x39" },
  "tacz:762x54": { caliber: "7.62×54R", mold: "762x54" },
  "tacz:308": { caliber: ".308 Win", mold: "308" },
  "tacz:30_06": { caliber: ".30-06", mold: "30_06" },
  "tacz:338": { caliber: ".338 Lapua", mold: "338" },
  "tacz:50bmg": { caliber: ".50 BMG", mold: "50bmg" },
  "tacz:40mm": { caliber: "40mm 榴弹", mold: null },
  "tacz:rpg_rocket": { caliber: "RPG 火箭弹", mold: null },
  "rebel:105ac": { caliber: "105mm 火炮支援", mold: null },
  "rebel:20ap": { caliber: "20mm 穿甲弹", mold: null },
  "rebel:37aphe": { caliber: "37mm 高爆穿甲弹", mold: null },
  "suffuse:.22wmr": { caliber: ".22 WMR", mold: null },
  "suffuse:boomstickshot": { caliber: ".50 火帽弹", mold: null },
  "bf1:fuel": { caliber: "燃料", mold: null },
  "bf1:medkit": { caliber: "医疗包", mold: null },
};

const MOLD_PREFIX = "deceasedcraft:mold_bullet_casing_";

function tierOfPart(id: string): { tier: Tier; difficulty: number; label: string } | null {
  const hit = PARTS.filter((p) => p.id === id)[0];
  return hit ? { tier: hit.tier, difficulty: hit.difficulty, label: hit.label } : null;
}

/** 区域档位字符串（"T1" / "T1-T3"）→ 低界数字（"最低能搜到"）。 */
function regionTierFloor(tier: unknown): number {
  const m = String(tier == null ? "" : tier).match(/T(\d)/);
  return m ? Number(m[1]) : 0;
}

interface LootEvidence {
  sources: number;
  bestDrop: number;
  regions: string[];
  regionTiers: number[];
  name: string;
}

/** 扫一遍战利品表，收集某个物品 id 的出现证据。 */
function scanLoot(loot: any): Map<string, LootEvidence> {
  const out = new Map<string, LootEvidence>();
  const regions: any[] = Array.isArray(loot?.regions) ? loot.regions : [];
  for (const region of regions) {
    const floor = regionTierFloor(region.tier);
    for (const building of region.buildings || []) {
      for (const part of building.parts || []) {
        for (const floorObj of part.floors || []) {
          for (const container of floorObj.containers || []) {
            for (const item of container.items || []) {
              const id = Array.isArray(item) ? String(item[0] || "") : "";
              if (!id) continue;
              const row = out.get(id) || { sources: 0, bestDrop: 0, regions: [], regionTiers: [], name: "" };
              row.sources += 1;
              row.bestDrop = Math.max(row.bestDrop, Number(item[4]) || 0);
              if (!row.name && item[1]) row.name = String(item[1]);
              if (row.regions.indexOf(String(region.name)) < 0) row.regions.push(String(region.name));
              if (row.regionTiers.indexOf(floor) < 0) row.regionTiers.push(floor);
              out.set(id, row);
            }
          }
        }
      }
    }
  }
  return out;
}

function main(): void {
  const siteRoot = ".";
  const recipesFile = join(siteRoot, "public/data/recipes.js");
  const lootFile = join(siteRoot, "public/data/loot.js");
  for (const file of [recipesFile, lootFile]) {
    if (!existsSync(file)) {
      console.error(`缺少 ${file}：先跑 npm run gen:recipes 并确认 loot.js 存在。`);
      process.exit(1);
    }
  }

  const recipes = readGlobal(siteRoot, "public/data/recipes.js", "WZ_RECIPES");
  const loot = readGlobal(siteRoot, "public/data/loot.js", "WZ_DATA");
  const gunsmith = readGlobal(siteRoot, "public/data/gunsmith.js", "WZ_GUNSMITH");
  const textures = readGlobal(siteRoot, "public/data/textures.js", "WZ_TEXTURES");
  if (!recipes || !loot || !gunsmith) {
    console.error("读取数据失败：recipes.js / loot.js / gunsmith.js 至少一个无法解析。");
    process.exit(1);
  }

  const warnings: string[] = [];
  const textureItems: Record<string, number> = (textures && textures.items) || {};
  const hasIcon = (id: string) => Object.prototype.hasOwnProperty.call(textureItems, id);

  /* ---------------- 组装元件字典 ---------------- */
  const lootIndex = scanLoot(loot);
  const parts: Record<string, any> = {};
  for (const part of PARTS) {
    const ev = lootIndex.get(part.id);
    parts[part.id] = {
      label: part.label,
      tier: part.tier,
      difficulty: part.difficulty,
      icon: part.id,
      evidence: { lootSources: ev ? ev.sources : 0, bestDrop: ev ? Number(ev.bestDrop.toFixed(2)) : 0 },
    };
  }
  // 难度序必须与档位单调：档位越低（T1）难度值必须越大。
  for (const a of PARTS) {
    for (const b of PARTS) {
      if (TIER_INDEX[a.tier] < TIER_INDEX[b.tier] && a.difficulty <= b.difficulty) {
        warnings.push(`难度序与档位不单调：${a.id}(${a.tier}) 的难度 ${a.difficulty} ≤ ${b.id}(${b.tier}) 的 ${b.difficulty}`);
      }
    }
  }

  /* ---------------- 枪械梯度 ---------------- */
  const gunTier: Record<string, any> = {};
  const gunIds = Object.keys(gunsmith.guns || {});
  for (const gunId of gunIds) {
    const gun = gunsmith.guns[gunId];
    const materials: [string, number][] = recipes.recipes?.guns?.[gunId] || [];
    const found: { id: string; tier: Tier; difficulty: number; used: number }[] = [];
    for (const pair of materials) {
      const info = tierOfPart(String(pair[0] || ""));
      if (!info) {
        // 未知 *_assembly_parts：可能是整合包新增的元件，必须显式补表。
        if (/_assembly_parts$/.test(String(pair[0] || ""))) warnings.push(`${gunId} 用到未登记的组装元件 ${pair[0]}`);
        continue;
      }
      found.push({ id: String(pair[0]), tier: info.tier, difficulty: info.difficulty, used: Number(pair[1]) || 1 });
    }
    // 先按档位从高到低，同档按难度从难到易（difficulty 小者优先）。
    found.sort((a, b) => TIER_INDEX[b.tier] - TIER_INDEX[a.tier] || a.difficulty - b.difficulty);
    const best = found[0];
    if (best) {
      gunTier[gunId] = {
        tier: best.tier,
        part: best.id,
        parts: found.map((f) => f.id),
        inferred: false,
      };
      continue;
    }
    const fallback = TYPE_TIER[String(gun?.type || "")];
    if (!fallback) {
      warnings.push(`${gunId} 既无组装元件配方，也没有可回落的中文类型「${gun?.type || ""}」`);
      continue;
    }
    gunTier[gunId] = { tier: fallback, part: null, parts: [], inferred: true, basis: "type" };
  }

  /* ---------------- 子弹梯度 ---------------- */
  const bullets: Record<string, any> = {};
  for (const ammoId of Object.keys(AMMO)) {
    const spec = AMMO[ammoId];
    if (!spec.mold) {
      bullets[ammoId] = { tier: null, caliber: spec.caliber, mold: null, reason: "no-mold" };
      continue;
    }
    const moldId = MOLD_PREFIX + spec.mold;
    const ev = lootIndex.get(moldId);
    if (!ev || !ev.regionTiers.length) {
      warnings.push(`${ammoId} 的模具 ${moldId} 在战利品表里找不到，子弹梯度记为缺失`);
      bullets[ammoId] = { tier: null, caliber: spec.caliber, mold: moldId, reason: "mold-not-found" };
      continue;
    }
    const floor = Math.min.apply(null, ev.regionTiers);
    const tier = ("T" + floor) as Tier;
    bullets[ammoId] = {
      tier,
      caliber: spec.caliber,
      mold: moldId,
      moldName: ev.name || moldId,
      regions: ev.regions,
      evidence: { lootSources: ev.sources, bestDrop: Number(ev.bestDrop.toFixed(2)) },
    };
    if (ev.regionTiers.some((t) => t === 0)) warnings.push(`${ammoId} 有区域档位无法解析的掉落记录`);
  }

  /* ---------------- 每把枪用到的弹药是否都已映射 ---------------- */
  const ammoSeen = new Set<string>();
  for (const gunId of gunIds) {
    const ammo = String(gunsmith.guns[gunId]?.ammo || "");
    if (!ammo) continue;
    ammoSeen.add(ammo);
    if (!AMMO[ammo]) warnings.push(`${gunId} 的弹药 ${ammo} 没有在 AMMO 表里映射`);
  }

  /* ---------------- 图标可解析性 ---------------- */
  const missingIcons: string[] = [];
  for (const part of PARTS) if (!hasIcon(part.id)) missingIcons.push(part.id);
  for (const ammoId of Object.keys(bullets)) {
    const mold = bullets[ammoId].mold;
    if (mold && !hasIcon(mold)) missingIcons.push(mold);
  }
  if (missingIcons.length) warnings.push(`缺图标（会退首字方块）：${missingIcons.join(", ")}`);

  const payload = {
    generated: new Date().toISOString().slice(0, 10),
    source: {
      pack: "DeceasedCraft 5.11.19",
      guns: Object.keys(gunTier).length,
      molds: Object.keys(bullets).filter((id) => !!bullets[id].mold).length,
    },
    tiers: ["T1", "T2", "T3", "T4"],
    parts,
    guns: gunTier,
    bullets,
    meta: { missingIcons, warnings, ammoMapped: ammoSeen.size },
  };

  const outFile = join(siteRoot, "public/data/tiers.js");
  writeFileSync(outFile, `${SITE_HEADER}window.WZ_TIERS = ${JSON.stringify(payload)};\n`, "utf8");

  const gunDist: Record<string, number> = { T1: 0, T2: 0, T3: 0, T4: 0 };
  let inferred = 0;
  for (const id of Object.keys(gunTier)) {
    gunDist[gunTier[id].tier] += 1;
    if (gunTier[id].inferred) inferred += 1;
  }
  const bulletDist: Record<string, number> = { T1: 0, T2: 0, T3: 0, T4: 0, "无模具": 0, "无弹药": 0 };
  for (const gunId of gunIds) {
    const ammo = String(gunsmith.guns[gunId]?.ammo || "");
    if (!ammo) bulletDist["无弹药"] += 1;
    else if (!bullets[ammo] || !bullets[ammo].tier) bulletDist["无模具"] += 1;
    else bulletDist[bullets[ammo].tier] += 1;
  }

  const bytes = Buffer.byteLength(JSON.stringify(payload));
  console.log(`写出 ${outFile}（${(bytes / 1024).toFixed(1)} KB）`);
  console.log(`枪械梯度 ${Object.keys(gunTier).length} 把：T1 ${gunDist.T1} · T2 ${gunDist.T2} · T3 ${gunDist.T3} · T4 ${gunDist.T4}（推断 ${inferred}）`);
  console.log(
    `子弹梯度 ${Object.keys(bullets).length} 个口径：T1 ${bulletDist.T1} · T2 ${bulletDist.T2} · T3 ${bulletDist.T3} · T4 ${bulletDist.T4} · 无模具 ${bulletDist["无模具"]} · 无弹药 ${bulletDist["无弹药"]}（按枪计）`,
  );
  if (missingIcons.length) console.log(`缺图标：${missingIcons.join(", ")}`);
  if (warnings.length) {
    console.log(`warnings ${warnings.length} 条：`);
    for (const line of warnings.slice(0, 20)) console.log(`  · ${line}`);
    if (warnings.length > 20) console.log(`  · …其余 ${warnings.length - 20} 条省略`);
  }
}

main();
