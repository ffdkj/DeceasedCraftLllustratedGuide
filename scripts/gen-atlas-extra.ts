/**
 * 把配方材料里缺失的少数图标补进图集（幂等）。
 *
 * - deceasedcraft:special_assembly_parts：从整合包 DCTweaks jar 取真实贴图
 * - minecraft:fire_charge / minecraft:pointed_dripstone：联网取 1.20.1 原版贴图；
 *   取不到则跳过（gen-recipes 会自动退近似图标并标 approx）
 *
 * 用法：tsx scripts/gen-atlas-extra.ts --pack ./DeceasedCraft5.11.19
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { readGlobal } from "./pack-readers.js";

interface Sprite {
  id: string;
  source: { kind: "jar"; jar: RegExp; entry: string } | { kind: "url"; url: string };
}

const SPRITES: Sprite[] = [
  {
    id: "deceasedcraft:special_assembly_parts",
    source: { kind: "jar", jar: /^DCTweaks.*\.jar$/i, entry: "assets/deceasedcraft/textures/item/gun_parts_special.png" },
  },
  {
    id: "minecraft:fire_charge",
    source: {
      kind: "url",
      url: "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/item/fire_charge.png",
    },
  },
  {
    id: "minecraft:pointed_dripstone",
    source: {
      kind: "url",
      url: "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/item/pointed_dripstone.png",
    },
  },
];

function argOf(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function spriteFile(root: string, id: string, packDir: string): string | null {
  const cacheDir = join(root, ".cache/atlas-extra");
  mkdirSync(cacheDir, { recursive: true });
  const target = join(cacheDir, `${id.replace(/[:]/g, "_")}.png`);
  const spec = SPRITES.find((s) => s.id === id)!;
  if (spec.source.kind === "jar") {
    const modsDir = join(packDir, "overrides/mods");
    if (!existsSync(modsDir)) return null;
    const jar = readdirSync(modsDir).find((name) => spec.source.kind === "jar" && spec.source.jar.test(name));
    if (!jar) return null;
    try {
      const png = execFileSync("unzip", ["-p", join(modsDir, jar), spec.source.entry], { maxBuffer: 32 * 1024 * 1024 });
      writeFileSync(target, png);
      return target;
    } catch {
      return null;
    }
  }
  if (existsSync(target) && statSync(target).size > 64) return target;
  try {
    execFileSync("curl", ["-fsSL", "--max-time", "25", "-o", target, spec.source.url], { maxBuffer: 4 * 1024 * 1024 });
    return existsSync(target) && statSync(target).size > 64 ? target : null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const root = resolve(argOf("site", "."));
  const packDir = resolve(argOf("pack", join(root, "DeceasedCraft5.11.19")));
  const atlasPath = join(root, "public/textures/atlas.webp");
  const texturesFile = join(root, "public/data/textures.js");
  const textures = readGlobal(root, "public/data/textures.js", "WZ_TEXTURES");
  if (!textures) throw new Error(`读不到 ${texturesFile}`);
  const items: Record<string, number> = textures.items ?? {};
  const meta = await sharp(atlasPath).metadata();
  const size = Number(textures.size) || 32;
  const cols = Number(textures.cols) || 64;
  const rows = Number(textures.rows) || 36;
  if (!meta.width || !meta.height || meta.width !== cols * size || meta.height !== rows * size) {
    throw new Error(`图集尺寸与 textures.js 不一致：${meta.width}x${meta.height} vs ${cols}x${rows}@${size}`);
  }

  const pending = SPRITES.filter((s) => items[s.id] == null);
  if (!pending.length) {
    console.log("图集已包含全部额外图标，跳过");
    return;
  }

  let next = Math.max(...Object.values(items)) + 1;
  const { data, info } = await sharp(atlasPath).raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const canvas = Buffer.from(data); // 复制一份，避免修改原 buffer
  const added: string[] = [];
  for (const sprite of pending) {
    if (next >= cols * rows) throw new Error("图集没有空格子，请扩行");
    const file = spriteFile(root, sprite.id, packDir);
    if (!file) {
      console.log(`跳过 ${sprite.id}：取不到源贴图（将退近似图标）`);
      continue;
    }
    const cell = await sharp(file).resize(size, size, { kernel: "nearest" }).ensureAlpha().raw().toBuffer();
    const index = next;
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x0 = col * size;
    const y0 = row * size;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const src = (y * size + x) * 4;
        const dst = ((y0 + y) * info.width + (x0 + x)) * channels;
        const alpha = cell[src + 3] / 255;
        if (alpha <= 0) continue;
        for (let c = 0; c < Math.min(4, channels); c += 1) {
          canvas[dst + c] = Math.round(cell[src + c] * alpha + canvas[dst + c] * (1 - alpha));
        }
        if (channels === 4) canvas[dst + 3] = Math.max(canvas[dst + 3], cell[src + 3]);
      }
    }
    items[sprite.id] = index;
    next += 1;
    added.push(`${sprite.id} → #${index}`);
  }

  if (!added.length) {
    console.log("没有可补的图标，图集未改动");
    return;
  }

  const encoded = await sharp(canvas, { raw: { width: info.width, height: info.height, channels } })
    .webp({ quality: 90, effort: 4 })
    .toBuffer();
  writeFileSync(atlasPath, encoded);
  const header = readFileSync(texturesFile, "utf8").split("window.WZ_TEXTURES")[0];
  const sortedItems: Record<string, number> = {};
  for (const key of Object.keys(items).sort()) sortedItems[key] = items[key];
  writeFileSync(
    texturesFile,
    `${header}window.WZ_TEXTURES = ${JSON.stringify({ ...textures, items: sortedItems })};\n`,
    "utf8",
  );
  console.log(`图集补图 ${added.length} 个：${added.join("；")}`);
  console.log(`atlas.webp ${(encoded.length / 1024).toFixed(0)} KB`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
