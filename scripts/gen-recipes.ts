/**
 * 生成 public/data/recipes.js：枪械/配件配方、材料字典、可得性与未实装名单。
 *
 * 用法：tsx scripts/gen-recipes.ts --pack ./DeceasedCraft5.11.19
 * 只读整合包；输出确定性（同输入两次运行字节一致）。
 */
import { existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  readGlobal,
  readItemTags,
  readObtainability,
  readPackRecipes,
  type RawMaterial,
} from "./pack-readers.js";

const SITE_HEADER = "/* 亡者世界 · 枪械与配件配方数据（由 scripts/gen-recipes.ts 生成，勿手改） */\n";

/** 材料字典：key 为物品 id 或 "tag:<tag>"。label 中文名人工校准，icon 必须能被 textures.js 解析。 */
interface MaterialMeta {
  label: string;
  icon: string;
  fallbackIcon?: string;
  approx?: boolean;
}

const ITEM_META: Record<string, MaterialMeta> = {
  "deceasedcraft:attachment_assembly_parts": { label: "配件组装元件", icon: "deceasedcraft:attachment_assembly_parts" },
  "deceasedcraft:high_carbon_steel_alloy": { label: "高碳钢合金", icon: "deceasedcraft:high_carbon_steel_alloy" },
  "deceasedcraft:hmg_assembly_parts": { label: "机枪组装元件", icon: "deceasedcraft:hmg_assembly_parts" },
  "deceasedcraft:pistol_assembly_parts": { label: "手枪组装元件", icon: "deceasedcraft:pistol_assembly_parts" },
  "deceasedcraft:rifle_assembly_parts": { label: "步枪组装元件", icon: "deceasedcraft:rifle_assembly_parts" },
  "deceasedcraft:rubber": { label: "橡胶", icon: "deceasedcraft:rubber" },
  "deceasedcraft:shotgun_assembly_parts": { label: "霰弹枪组装元件", icon: "deceasedcraft:shotgun_assembly_parts" },
  "deceasedcraft:smg_assembly_parts": { label: "冲锋枪组装元件", icon: "deceasedcraft:smg_assembly_parts" },
  "deceasedcraft:sniper_assembly_parts": { label: "狙击枪组装元件", icon: "deceasedcraft:sniper_assembly_parts" },
  "deceasedcraft:special_assembly_parts": { label: "特殊武器组装元件", icon: "deceasedcraft:special_assembly_parts" },
  "immersiveengineering:component_steel": { label: "钢组件", icon: "immersiveengineering:component_steel" },
  "minecraft:fire_charge": { label: "火焰弹", icon: "minecraft:fire_charge", fallbackIcon: "minecraft:flint_and_steel" },
  "minecraft:iron_axe": { label: "铁斧", icon: "minecraft:iron_axe" },
  "minecraft:netherite_sword": { label: "下界合金剑", icon: "minecraft:netherite_sword" },
  "minecraft:pointed_dripstone": { label: "滴水石锥", icon: "minecraft:pointed_dripstone", fallbackIcon: "minecraft:flint" },
  "tacz:modern_kinetic_gun": { label: "现代枪械组件", icon: "tacz:modern_kinetic_gun" },
};

const TAG_META: Record<string, MaterialMeta> = {
  "forge:dusts/glowstone": { label: "荧石粉", icon: "minecraft:glowstone_dust" },
  "forge:dusts/redstone": { label: "红石粉", icon: "minecraft:redstone" },
  "forge:dyes/blue": { label: "蓝色染料", icon: "minecraft:blue_dye" },
  "forge:gems/amethyst": { label: "紫水晶", icon: "minecraft:amethyst_shard" },
  "forge:glass": { label: "玻璃", icon: "minecraft:glass" },
  "forge:ingots/gold": { label: "金锭", icon: "minecraft:gold_ingot" },
  "forge:ingots/iron": { label: "铁锭", icon: "minecraft:iron_ingot" },
  "forge:ingots/steel": { label: "钢锭", icon: "immersiveengineering:ingot_steel" },
  "forge:leather": { label: "皮革", icon: "minecraft:leather" },
  "forge:obsidian": { label: "黑曜石", icon: "minecraft:obsidian" },
  "forge:plates/aluminum": { label: "铝板", icon: "immersiveengineering:plate_aluminum" },
  "forge:plates/plastic": { label: "塑料板", icon: "minecraft:paper", approx: true },
  "forge:rods/blaze": { label: "烈焰棒", icon: "minecraft:blaze_rod" },
  "forge:slimeballs": { label: "黏液球", icon: "minecraft:slime_ball" },
  "minecraft:logs": { label: "原木", icon: "minecraft:oak_log" },
  "minecraft:planks": { label: "木板", icon: "minecraft:oak_planks" },
  "minecraft:wool": { label: "羊毛", icon: "minecraft:white_wool" },
};

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

function argOf(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function keyOf(material: RawMaterial): string {
  return material.item ? material.item : `tag:${material.tag}`;
}

function main(): void {
  const siteRoot = resolve(argOf("site", "."));
  const packDir = resolve(argOf("pack", join(siteRoot, "DeceasedCraft5.11.19")));
  if (!existsSync(packDir)) throw new Error(`整合包目录不存在：${packDir}`);

  const gunsmith = readGlobal(siteRoot, "public/data/gunsmith.js", "WZ_GUNSMITH");
  const textures = readGlobal(siteRoot, "public/data/textures.js", "WZ_TEXTURES");
  const siteGuns: string[] = Object.keys(gunsmith?.guns ?? {});
  const siteAttachments: string[] = Object.keys(gunsmith?.attachments ?? {});
  const hasIcon = (id: string) => textures?.items?.[id] != null || textures?.blocks?.[id] != null;

  const pack = readPackRecipes(packDir);
  const warnings = [...pack.warnings];
  const values = readItemTags(packDir);
  const obtainability = readObtainability(packDir);

  const gunSet = new Set(siteGuns);
  const attachmentSet = new Set(siteAttachments);

  const gunRecipes: Record<string, [string, number][]> = {};
  for (const [id, recipe] of [...pack.guns].sort(([a], [b]) => a.localeCompare(b))) {
    if (!gunSet.has(id)) {
      warnings.push(`配方产物不在站内枪械列表，已忽略：${id}（${recipe.file.split("overrides/tacz/")[1]}）`);
      continue;
    }
    gunRecipes[id] = recipe.materials.map((m) => [keyOf(m), m.count] as [string, number]);
  }
  const attachmentRecipes: Record<string, [string, number][]> = {};
  for (const [id, recipe] of [...pack.attachments].sort(([a], [b]) => a.localeCompare(b))) {
    if (!attachmentSet.has(id)) {
      warnings.push(`配方产物不在站内配件列表，已忽略：${id}`);
      continue;
    }
    attachmentRecipes[id] = recipe.materials.map((m) => [keyOf(m), m.count] as [string, number]);
  }

  /* 材料字典：只保留配方里真正用到的 key */
  const used = new Set<string>();
  for (const list of [...Object.values(gunRecipes), ...Object.values(attachmentRecipes)]) {
    for (const [key] of list) used.add(key);
  }
  const materials: Record<string, MaterialMeta> = {};
  const missingIcons: string[] = [];
  for (const key of [...used].sort()) {
    const isTag = key.startsWith("tag:");
    const bare = isTag ? key.slice(4) : key;
    const meta = (isTag ? TAG_META[bare] : ITEM_META[bare]) ?? null;
    const localTagItems = isTag ? values.get(bare) : undefined;
    let label = meta?.label ?? bare;
    let icon = meta?.icon ?? bare;
    let approx = meta?.approx ?? false;
    if (!hasIcon(icon) && meta?.fallbackIcon && hasIcon(meta.fallbackIcon)) {
      icon = meta.fallbackIcon;
      approx = true;
      warnings.push(`图标退化：${bare} 使用近似图标 ${icon}`);
    } else if (!hasIcon(icon) && localTagItems?.length) {
      const candidate = localTagItems.find((id) => hasIcon(id));
      if (candidate) {
        icon = candidate;
        approx = true;
        warnings.push(`图标退化：${bare} 使用本地 tag 首个带图物品 ${candidate}`);
      }
    }
    if (!hasIcon(icon)) missingIcons.push(bare);
    if (!meta) warnings.push(`材料字典缺项：${bare}（已用原始 id 兜底）`);
    materials[key] = approx ? { label, icon, approx } : { label, icon };
  }

  const obtainable: Record<string, { chest: boolean; npc: boolean; store: boolean }> = {};
  for (const id of siteGuns) {
    obtainable[id] = {
      chest: obtainability.chest.has(id),
      npc: obtainability.npc.has(id),
      store: obtainability.store.has(id),
    };
  }

  const canObtain = (id: string) =>
    obtainability.chest.has(id) || obtainability.npc.has(id) || obtainability.store.has(id);
  const unreleased = siteGuns.filter((id) => !gunRecipes[id] && !canObtain(id)).sort();
  const missing = EXPECTED_UNRELEASED.filter((id) => !unreleased.includes(id));
  const extra = unreleased.filter((id) => !EXPECTED_UNRELEASED.includes(id));
  if (missing.length || extra.length) {
    console.error("未实装名单与预期不符：");
    if (missing.length) console.error("  预期但未命中：", missing.join(", "));
    if (extra.length) console.error("  额外命中：", extra.join(", "));
    process.exitCode = 1;
  }

  const payload = {
    generated: new Date().toISOString().slice(0, 10),
    source: {
      pack: "DeceasedCraft 5.11.19",
      guns: Object.keys(gunRecipes).length,
      attachments: Object.keys(attachmentRecipes).length,
    },
    materials,
    recipes: { guns: gunRecipes, attachments: attachmentRecipes },
    obtainable,
    unreleased,
    meta: { missingIcons, warnings },
  };
  const outFile = join(siteRoot, "public/data/recipes.js");
  writeFileSync(outFile, `${SITE_HEADER}window.WZ_RECIPES = ${JSON.stringify(payload)};\n`, "utf8");

  const bytes = Buffer.byteLength(JSON.stringify(payload));
  console.log(`写出 ${outFile}`);
  console.log(
    `枪配方 ${payload.source.guns} 条 · 配件配方 ${payload.source.attachments} 条 · 材料 ${Object.keys(materials).length} 种 · 未实装 ${unreleased.length} 把 · ${(bytes / 1024).toFixed(1)} KB`,
  );
  console.log(`可得性：掉落 ${obtainability.chest.size} · 交易 ${obtainability.npc.size} · 陈列 ${obtainability.store.size}`);
  if (missingIcons.length) console.log(`缺图标（会退首字方块）：${missingIcons.join(", ")}`);
  if (warnings.length) {
    console.log(`warnings ${warnings.length} 条：`);
    for (const line of warnings.slice(0, 20)) console.log(`  · ${line}`);
    if (warnings.length > 20) console.log(`  · …其余 ${warnings.length - 20} 条省略`);
  }
}

main();
