/**
 * 配方数据断言：生成结果必须满足的硬约束。
 * 用法：tsx scripts/verify-recipes.ts
 */
import { readGlobal } from "./pack-readers.js";

const EXPECTED_UNRELEASED = [
  "bf1:handgun",
  "bf1:kolibri",
  "bf1:lunge_mine",
  "bf1:syringe",
  "gz:arx200_nero",
  "rebel:bq01",
  "rebel:c23",
  "rebel:t70th",
  "suffuse:knife",
  "suffuse:lifecard",
  "suffuse:trapper50cal",
];

const errors: string[] = [];
const notes: string[] = [];
function check(ok: boolean, message: string): void {
  if (ok) notes.push(`ok ${message}`);
  else errors.push(`FAIL ${message}`);
}

const recipes = readGlobal(".", "public/data/recipes.js", "WZ_RECIPES");
const gunsmith = readGlobal(".", "public/data/gunsmith.js", "WZ_GUNSMITH");
const textures = readGlobal(".", "public/data/textures.js", "WZ_TEXTURES");
check(!!recipes, "读到 recipes.js");
if (!recipes) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const gunIds = new Set(Object.keys(gunsmith?.guns ?? {}));
const attachmentIds = new Set(Object.keys(gunsmith?.attachments ?? {}));
const gunRecipes: Record<string, [string, number][]> = recipes.recipes?.guns ?? {};
const attachmentRecipes: Record<string, [string, number][]> = recipes.recipes?.attachments ?? {};
const materials: Record<string, { label?: string; icon?: string; approx?: boolean }> = recipes.materials ?? {};

check(Object.keys(gunRecipes).length >= 164, `枪配方 ≥164（实际 ${Object.keys(gunRecipes).length}）`);
check(Object.keys(attachmentRecipes).length >= 186, `配件配方 ≥186（实际 ${Object.keys(attachmentRecipes).length}）`);
check(JSON.stringify(recipes.unreleased) === JSON.stringify(EXPECTED_UNRELEASED), "未实装名单与预期一致");
check(Object.keys(materials).length >= 30, `材料字典 ≥30（实际 ${Object.keys(materials).length}）`);

for (const id of Object.keys(gunRecipes)) check(gunIds.has(id), `枪配方 id 存在于站内：${id}`);
for (const id of Object.keys(attachmentRecipes)) check(attachmentIds.has(id), `配件配方 id 存在于站内：${id}`);

const hasIcon = (id: string) => textures?.items?.[id] != null || textures?.blocks?.[id] != null;
const usedKeys = new Set<string>();
for (const list of [...Object.values(gunRecipes), ...Object.values(attachmentRecipes)]) {
  for (const [key, count] of list) {
    usedKeys.add(key);
    if (typeof count !== "number" || count <= 0) errors.push(`FAIL 材料数量非法：${key}=${count}`);
  }
}
for (const key of usedKeys) {
  const meta = materials[key];
  check(!!meta, `材料 key 在字典里：${key}`);
  if (meta) {
    check(typeof meta.label === "string" && meta.label.length > 0, `材料有中文名：${key}`);
    check(!!meta.icon && hasIcon(meta.icon), `材料图标可解析：${key} → ${meta.icon}`);
  }
}
check((recipes.meta?.missingIcons ?? []).length === 0, "无缺图标材料");
check(Array.isArray(recipes.meta?.warnings), "meta.warnings 是数组");

/* 代表性抽样 */
const m4a1 = gunRecipes["tacz:m4a1"] ?? [];
const m4a1Text = m4a1.map(([key, count]) => `${materials[key]?.label ?? key}×${count}`).join(" · ");
check(
  JSON.stringify(m4a1) ===
    JSON.stringify([
      ["immersiveengineering:component_steel", 12],
      ["tag:forge:plates/aluminum", 6],
      ["tag:forge:plates/plastic", 6],
      ["deceasedcraft:rubber", 6],
      ["deceasedcraft:rifle_assembly_parts", 1],
    ]),
  `M4A1 配方与整合包一致（${m4a1Text}）`,
);
check(!gunRecipes["tacz:taurus943"], "taurus943 无配方");
check(recipes.obtainable?.["tacz:taurus943"]?.chest === true, "taurus943 可从战利品获得");
for (const id of EXPECTED_UNRELEASED) {
  check(!gunRecipes[id], `未实装 ${id} 无配方`);
  const ob = recipes.obtainable?.[id] ?? {};
  check(!ob.chest && !ob.npc && !ob.store, `未实装 ${id} 三种途径都拿不到`);
}

for (const line of notes) console.log(line);
if (errors.length) {
  console.error(`\n${errors.length} 项失败：`);
  for (const line of errors.slice(0, 40)) console.error(line);
  process.exit(1);
}
console.log(`\n全部通过（${notes.length} 项断言）`);
