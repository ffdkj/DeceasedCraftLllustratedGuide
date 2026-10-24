/**
 * 梯度数据断言：生成结果必须满足的硬约束（判档规则见 specs/SPEC-gun-tiers.md）。
 * 用法：tsx scripts/verify-tiers.ts
 */
import { readGlobal } from "./pack-readers.js";

const EXPECTED_INFERRED = [
  "bf1:ef46",
  "bf1:handgun",
  "bf1:kolibri",
  "bf1:lunge_mine",
  "bf1:syringe",
  "gz:arx200_nero",
  "gz:m16a2",
  "gz:m700_carbon",
  "rebel:bq01",
  "rebel:c23",
  "rebel:t70th",
  "suffuse:knife",
  "suffuse:lifecard",
  "suffuse:trapper50cal",
  "tacz:taurus943",
];

const EXPECTED_MOLDLESS = [
  "bf1:fuel",
  "bf1:medkit",
  "rebel:105ac",
  "rebel:20ap",
  "rebel:37aphe",
  "suffuse:.22wmr",
  "suffuse:boomstickshot",
  "tacz:40mm",
  "tacz:rpg_rocket",
];

const EXPECTED_GUN_DIST: Record<string, number> = { T1: 30, T2: 32, T3: 56, T4: 60 };
const EXPECTED_BULLET_DIST: Record<string, number> = { T1: 45, T2: 21, T3: 45, T4: 44 };

const errors: string[] = [];
const notes: string[] = [];
const skipped: string[] = [];
function check(ok: boolean, message: string): void {
  if (ok) notes.push(`ok ${message}`);
  else errors.push(`FAIL ${message}`);
}

const tiers = readGlobal(".", "public/data/tiers.js", "WZ_TIERS");
const recipes = readGlobal(".", "public/data/recipes.js", "WZ_RECIPES");
const loot = readGlobal(".", "public/data/loot.js", "WZ_DATA");
const gunsmith = readGlobal(".", "public/data/gunsmith.js", "WZ_GUNSMITH");
const textures = readGlobal(".", "public/data/textures.js", "WZ_TEXTURES");
check(!!tiers, "读到 tiers.js");
if (!tiers || !recipes || !loot || !gunsmith) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const TIER_INDEX: Record<string, number> = { T1: 1, T2: 2, T3: 3, T4: 4 };
const gunIds: string[] = Object.keys(gunsmith.guns || {});
const parts: Record<string, any> = tiers.parts || {};
const guns: Record<string, any> = tiers.guns || {};
const bullets: Record<string, any> = tiers.bullets || {};

/* ---------------- 结构完整性 ---------------- */
check(Object.keys(parts).length === 7, `组装元件 7 个（实际 ${Object.keys(parts).length}）`);
check(gunIds.length === 178, `枪械 178 把（实际 ${gunIds.length}）`);
check(Object.keys(guns).length === gunIds.length, `每把枪都有梯度（${Object.keys(guns).length}/${gunIds.length}）`);
check(JSON.stringify(tiers.tiers) === JSON.stringify(["T1", "T2", "T3", "T4"]), "档位表为 T1–T4");

for (const gunId of gunIds) check(!!guns[gunId], `枪存在于梯度表：${gunId}`);

/* ---------------- 枪械梯度：分布与推断 ---------------- */
const gunDist: Record<string, number> = { T1: 0, T2: 0, T3: 0, T4: 0 };
const inferred: string[] = [];
for (const gunId of Object.keys(guns)) {
  const row = guns[gunId];
  gunDist[row.tier] = (gunDist[row.tier] || 0) + 1;
  if (row.inferred) inferred.push(gunId);
}
for (const tier of ["T1", "T2", "T3", "T4"]) {
  check(gunDist[tier] === EXPECTED_GUN_DIST[tier], `枪械梯度 ${tier} = ${EXPECTED_GUN_DIST[tier]}（实际 ${gunDist[tier]}）`);
}
check(
  JSON.stringify(inferred.slice().sort()) === JSON.stringify(EXPECTED_INFERRED.slice().sort()),
  `推断档位名单与预期一致（${inferred.length} 把）`,
);

/* ---------------- 枪械梯度：规则复算 ---------------- */
function partInfo(id: string): { tier: string; difficulty: number } | null {
  const row = parts[id];
  return row ? { tier: row.tier, difficulty: row.difficulty } : null;
}

let recomputed = 0;
for (const gunId of Object.keys(guns)) {
  const row = guns[gunId];
  const materials: [string, number][] = (recipes.recipes?.guns ?? {})[gunId] || [];
  const found = materials
    .map((pair) => ({ id: String(pair[0]), info: partInfo(String(pair[0])) }))
    .filter((x) => !!x.info) as { id: string; info: { tier: string; difficulty: number } }[];
  found.sort((a, b) => TIER_INDEX[b.info.tier] - TIER_INDEX[a.info.tier] || a.info.difficulty - b.info.difficulty);

  if (row.inferred) {
    check(row.part === null, `推断档位无定档元件：${gunId}`);
    check((row.parts || []).length === 0, `推断档位无元件列表：${gunId}`);
    const type = String(gunsmith.guns[gunId]?.type || "");
    const typeTier: Record<string, string> = {
      手枪: "T1",
      冲锋枪: "T2",
      霰弹枪: "T2",
      步枪: "T3",
      机枪: "T4",
      狙击枪: "T4",
      特殊: "T4",
      重型武器: "T4",
    };
    check(row.tier === typeTier[type], `推断档位按类型回落：${gunId}（${type} → ${row.tier}）`);
    continue;
  }

  recomputed += 1;
  const best = found[0];
  check(!!best, `有元件的枪必须能复算出元件：${gunId}`);
  if (!best) continue;
  check(row.tier === best.info.tier, `枪械梯度取最高档：${gunId}（${row.tier} vs 复算 ${best.info.tier}）`);
  check(row.part === best.id, `定档元件取最高档且同档取更难者：${gunId}（${row.part} vs 复算 ${best.id}）`);
  check(
    JSON.stringify(row.parts) === JSON.stringify(found.map((f) => f.id)),
    `元件列表与配方一致：${gunId}`,
  );
  check(!row.inferred, `有元件的枪不标推断：${gunId}`);
}
check(recomputed + inferred.length === gunIds.length, `非推断 ${recomputed} + 推断 ${inferred.length} = ${gunIds.length}`);

/* ---------------- 同档并列 / 抽样 ---------------- */
const SPOT: Record<string, [string, string | null]> = {
  "tacz:m4a1": ["T3", "deceasedcraft:rifle_assembly_parts"],
  "tacz:minigun": ["T4", "deceasedcraft:special_assembly_parts"],
  "tacz:p90": ["T4", "deceasedcraft:hmg_assembly_parts"],
  "tacz:spas_12": ["T3", "deceasedcraft:rifle_assembly_parts"],
  "tacz:rhino357": ["T2", "deceasedcraft:shotgun_assembly_parts"],
  "gz:m16a2": ["T3", null],
  "tacz:taurus943": ["T1", null],
  "bf1:ef46": ["T4", null],
  "suffuse:knife": ["T3", null],
};
for (const gunId of Object.keys(SPOT)) {
  const [tier, part] = SPOT[gunId];
  check(guns[gunId]?.tier === tier && guns[gunId]?.part === part, `抽样：${gunId} → ${tier} / ${part ?? "无元件"}`);
}

/* ---------------- 元件字典 ---------------- */
const difficulties = new Set<number>();
for (const id of Object.keys(parts)) {
  const row = parts[id];
  check(!!TIER_INDEX[row.tier], `元件档位合法：${id}（${row.tier}）`);
  check(typeof row.difficulty === "number", `元件有难度序：${id}`);
  check(!difficulties.has(row.difficulty), `难度序唯一：${id}`);
  difficulties.add(row.difficulty);
  check(row.icon === id, `元件图标指向自身：${id}`);
  check(row.evidence && typeof row.evidence.lootSources === "number", `元件有战利品证据：${id}`);
}
for (const a of Object.keys(parts)) {
  for (const b of Object.keys(parts)) {
    if (TIER_INDEX[parts[a].tier] > TIER_INDEX[parts[b].tier]) {
      check(parts[a].difficulty < parts[b].difficulty, `难度序与档位单调：${a}(${parts[a].tier}) 应比 ${b}(${parts[b].tier}) 难`);
    }
  }
}
check(parts["deceasedcraft:special_assembly_parts"]?.difficulty === 1, "特殊元件难度序为 1（最难）");
check(parts["deceasedcraft:special_assembly_parts"]?.evidence?.lootSources === 0, "特殊元件全站无战利品来源");
check(parts["deceasedcraft:sniper_assembly_parts"]?.difficulty < parts["deceasedcraft:hmg_assembly_parts"]?.difficulty, "狙击枪元件比机枪元件更难");

/* ---------------- 子弹梯度：独立复算 ---------------- */
const regionFloor = (tier: unknown): number => {
  const m = String(tier == null ? "" : tier).match(/T(\d)/);
  return m ? Number(m[1]) : 0;
};
const lootMin = new Map<string, number>();
const lootCount = new Map<string, number>();
for (const region of loot.regions || []) {
  const floor = regionFloor(region.tier);
  for (const building of region.buildings || []) {
    for (const part of building.parts || []) {
      for (const floorObj of part.floors || []) {
        for (const container of floorObj.containers || []) {
          for (const item of container.items || []) {
            const id = String(item[0] || "");
            if (id.indexOf("deceasedcraft:mold_bullet_casing_") !== 0) continue;
            const prev = lootMin.get(id);
            lootMin.set(id, prev == null ? floor : Math.min(prev, floor));
            lootCount.set(id, (lootCount.get(id) || 0) + 1);
          }
        }
      }
    }
  }
}

const moldIds = Object.keys(bullets).filter((id) => !!bullets[id].mold);
check(moldIds.length === 15, `有模具的口径 15 个（实际 ${moldIds.length}）`);
check(lootMin.size === 15, `战利品表里 15 个模具（实际 ${lootMin.size}）`);

for (const ammoId of Object.keys(bullets)) {
  const row = bullets[ammoId];
  check(typeof row.caliber === "string" && row.caliber.length > 0, `口径有显示名：${ammoId}`);
  if (!row.mold) {
    check(row.tier === null && row.reason === "no-mold", `无模具弹药记为空档：${ammoId}（${row.reason}）`);
    continue;
  }
  const expectedTier = "T" + lootMin.get(row.mold);
  check(row.tier === expectedTier, `子弹梯度 = 模具最低可搜刮区域档：${ammoId} → ${row.tier}（战利品 ${expectedTier}）`);
  check(row.evidence?.lootSources === lootCount.get(row.mold), `掉落来源数与战利品表一致：${ammoId}`);
  check((row.regions || []).length > 0, `记录了可搜刮区域：${ammoId}`);
}

const moldless = Object.keys(bullets)
  .filter((id) => bullets[id].reason === "no-mold")
  .sort();
check(JSON.stringify(moldless) === JSON.stringify(EXPECTED_MOLDLESS.slice().sort()), `无模具弹药 9 种且名单一致（实际 ${moldless.length}）`);

const MOLD_SPOT: Record<string, string> = {
  "tacz:9mm": "T1",
  "tacz:45acp": "T1",
  "tacz:12g": "T2",
  "tacz:50ae": "T2",
  "tacz:357mag": "T2",
  "tacz:556x45": "T3",
  "tacz:762x39": "T3",
  "tacz:58x42": "T3",
  "tacz:30_06": "T4",
  "tacz:308": "T4",
  "tacz:338": "T4",
  "tacz:500mag": "T4",
  "tacz:50bmg": "T4",
  "tacz:762x54": "T4",
  "tacz:57x28": "T4",
};
for (const ammoId of Object.keys(MOLD_SPOT)) {
  check(bullets[ammoId]?.tier === MOLD_SPOT[ammoId], `抽样：${ammoId} 子弹梯度 ${MOLD_SPOT[ammoId]}（实际 ${bullets[ammoId]?.tier}）`);
}
check(bullets["tacz:357mag"]?.mold === "deceasedcraft:mold_bullet_casing_357magnum", "不规则映射 tacz:357mag → 357magnum");
check(bullets["tacz:50ae"]?.mold === "deceasedcraft:mold_bullet_casing_ae50", "不规则映射 tacz:50ae → ae50");

/* ---------------- 按枪计的三态分布 ---------------- */
const bulletDist: Record<string, number> = { T1: 0, T2: 0, T3: 0, T4: 0, 无模具: 0, 无弹药: 0 };
for (const gunId of gunIds) {
  const ammo = String(gunsmith.guns[gunId]?.ammo || "");
  if (!ammo) {
    bulletDist["无弹药"] += 1;
    continue;
  }
  check(!!bullets[ammo], `枪的弹药已映射：${gunId} → ${ammo}`);
  const tier = bullets[ammo]?.tier;
  if (!tier) bulletDist["无模具"] += 1;
  else bulletDist[tier] += 1;
}
for (const tier of ["T1", "T2", "T3", "T4"]) {
  check(bulletDist[tier] === EXPECTED_BULLET_DIST[tier], `子弹梯度 ${tier} = ${EXPECTED_BULLET_DIST[tier]} 把（实际 ${bulletDist[tier]}）`);
}
check(bulletDist["无模具"] === 22, `无模具弹药 22 把（实际 ${bulletDist["无模具"]}）`);
check(bulletDist["无弹药"] === 1, `无弹药 1 把（实际 ${bulletDist["无弹药"]}）`);
check(gunsmith.guns["suffuse:knife"]?.ammo === "", "无弹药样本：suffuse:knife");

/* ---------------- 图标 ---------------- */
const { existsSync, statSync } = await import("node:fs");
const { join: pathJoin } = await import("node:path");
const textureItems: Record<string, number> = (textures && textures.items) || {};
for (const id of Object.keys(parts)) check(Object.prototype.hasOwnProperty.call(textureItems, id), `元件图标可解析：${id}`);
for (const ammoId of moldIds) {
  const mold = bullets[ammoId].mold;
  check(Object.prototype.hasOwnProperty.call(textureItems, mold), `模具图标可解析：${mold}`);
  // 梯度缩写显示子弹本体（单独出图），不是冲压模具；模具图仍留在图集里给模具页用。
  const name = ammoId.split(":")[1];
  const file = pathJoin(process.cwd(), "public/images/ammo", `${name}.webp`);
  check(existsSync(file), `子弹本体图标存在：public/images/ammo/${name}.webp`);
  if (existsSync(file)) check(statSync(file).size > 64, `子弹本体图标非空：${name}.webp`);
}
check(Object.prototype.hasOwnProperty.call(textureItems, "tacz:ammo"), "无模具弹药退用 tacz:ammo 图标（可解析）");

/* ---------------- 卡片上的梯度缩写接线 ---------------- */
{
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const root = process.cwd();
  const tiersSrc = readFileSync(join(root, "src/client/tiers.ts"), "utf8");
  const gsSrc = readFileSync(join(root, "src/client/gunsmith.ts"), "utf8");
  /* 站点以 guide 为准：样式看 guide 那份；根站样式只作存档 */
  const gesCss = readFileSync(join(root, "public/guide/css/app.css"), "utf8");
  const rootCss = readFileSync(join(root, "public/css/app.css"), "utf8");
  const css = rootCss + "\n" + gesCss;
  /* G1（改枪台梯度缩写）还没搬进 guide。没搬就记「未移植」而不是失败；
     一旦 guide 里出现 .gs-tier-mini，这些断言自动升级为硬断言，不会被永久静音。 */
  const G1 = /\.gs-tier-mini\b/.test(gesCss);
  const ui = (ok: boolean, message: string): void => {
    if (ok) notes.push(`ok ${message}`);
    else if (G1) errors.push(`FAIL ${message}`);
    else skipped.push(message);
  };
  check(/mini: mini,/.test(tiersSrc), "WZ_TIERS_UI 暴露 mini()");
  check(/kind === "gun" \? "枪械" : "子弹"/.test(tiersSrc), "缩写文案是 枪械 / 子弹 + 档位");
  check(gsSrc.includes("tiersUI().mini(g.id)"), "枪械卡片副标题用 mini()");
  check(gsSrc.includes("tiersUI().mini(gunId, true)"), "改枪台头部也用缩写（可点）");
  check(gsSrc.includes('class="gs-tier-minis"'), "头部缩写包在 .gs-tier-minis 里，两枚不会拆成上下两行");
  check(tiersSrc.includes("clickable && row.href"), "缩写支持可点版本");
  ui(/\.gs-tier-minis \{[^}]*display: inline-flex/s.test(css), "缩写组是 inline-flex（同排）");
  ui(/\.tier-ico \.item-ico[\s\S]{0,220}border: 0/.test(css), "梯度图标去掉 1px 边框（否则 border-box 下图案被裁偏）");
  ui(/\.gs-head-body \{ padding-right: 0; \}/.test(css), "窄屏头部不再给整块留 40px，梯度标签能用满宽度");
  ui(/\.tier-tag \.tier-ico \.item-ico \{ width: 16px; height: 16px; \}/.test(css), "详情页满标签的图标仍是 16px");
  check(gsSrc.includes('class="gs-sub-text"'), "副标题文本单独包一层，超长只截文本");
  for (const t of ["T1", "T2", "T3", "T4"]) {
    ui(css.includes(`.gs-tier-mini.tier-${t}`), `卡片梯度缩写配色 ${t}`);
  }
  ui(/\[data-theme="light"\] \.gs-tier-mini\.tier-T1/.test(css), "缩写配色有浅色主题覆盖");
  /* 子弹图标 = 子弹本体（public/images/ammo 单独出图），不是冲压模具；点击仍落模具页 */
  check(tiersSrc.includes("function ammoIcon("), "子弹图标单独解析：ammoIcon()");
  check(tiersSrc.includes('"/images/ammo/" + name + ".webp"'), "子弹图标走 /images/ammo/<口径名>.webp");
  check(/img: ammoIcon\(ammo\)/.test(tiersSrc), "子弹行带上 img（子弹本体图标）");
  check(/ico: "",\s*\n\s*img: ammoIcon\(ammo\)/.test(tiersSrc), "子弹行不再用模具图标（ico 为空，走 img）");
  check(!/ico: b\.mold/.test(tiersSrc), "没有残留「子弹行用模具图标」的写法");
  check(/href: b\.mold \? "#\/item\/" \+ encodeURIComponent\(b\.mold\)/.test(tiersSrc), "点击落地页仍是模具页");
  ui(/\.tier-ico \.item-ico\.ammo-ico \{/.test(css), "子弹图标有独立样式（缩放到 14/16px）");
  ui(/image-rendering: pixelated/.test(css.slice(css.indexOf(".item-ico.ammo-ico"), css.indexOf(".item-ico.ammo-ico") + 300)), "子弹图标保持像素边缘");
}

/* ---------------- 生成器自检干净 ---------------- */
check((tiers.meta?.warnings ?? []).length === 0, `生成器无 warning（实际 ${(tiers.meta?.warnings ?? []).length}）`);
check((tiers.meta?.missingIcons ?? []).length === 0, `无缺图标（实际 ${(tiers.meta?.missingIcons ?? []).length}）`);

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} 项失败 / ${notes.length} 项通过`);
  process.exit(1);
}
console.log(`ok 全部通过：${notes.length} 项断言`);
if (skipped.length) console.log(`  未移植 ${skipped.length} 项（G1 改枪台梯度缩写，guide 还没有这个功能）：${skipped.slice(0, 3).join(" / ")} …`);
console.log(`枪械梯度 ${JSON.stringify(gunDist)}（推断 ${inferred.length}）`);
console.log(`子弹梯度（按枪） ${JSON.stringify(bulletDist)}`);
