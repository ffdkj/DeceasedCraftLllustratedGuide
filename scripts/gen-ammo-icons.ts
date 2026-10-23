/**
 * 生成「子弹本体」图标：public/images/ammo/<name>.webp（幂等）。
 *
 * 为什么单独出图，不塞进图集：
 * - 图集 atlas.webp 是有损 webp，补格子必须整图重编码，会把已有 2000+ 枚图标一起再压一遍；
 * - 弹药槽贴图只有 15 张、单张 32x32，单独无损 webp 一共几十 KB，只在实际渲染时才请求；
 * - 梯度缩写要显示子弹本体（不是冲压模具那张图），点击落地页仍是模具页。
 *
 * 源：整合包 overrides/tacz 下任意包的 textures/ammo/slot/<name>.png，
 * 这是 TACZ 弹药物品的物品图标（弹药槽贴图）。
 *
 * 用法：tsx scripts/gen-ammo-icons.ts --pack ./DeceasedCraft5.11.19 [--force]
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { readGlobal } from "./pack-readers.js";

function argOf(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

/** overrides/tacz 下所有 textures/ammo/slot/<name>.png，按文件名建索引。 */
function slotIndex(packDir: string): Map<string, string> {
  const index = new Map<string, string>();
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      const m = /\/textures\/ammo\/slot\/([^/]+)\.png$/.exec(full);
      if (m && !index.has(m[1])) index.set(m[1], full);
    }
  };
  walk(join(packDir, "overrides"));
  return index;
}

async function main(): Promise<void> {
  const root = resolve(argOf("site", "."));
  const packDir = resolve(argOf("pack", join(root, "DeceasedCraft5.11.19")));
  const force = process.argv.includes("--force");
  const tiers = readGlobal(root, "public/data/tiers.js", "WZ_TIERS");
  if (!tiers) throw new Error("读不到 public/data/tiers.js");
  const outDir = join(root, "public/images/ammo");
  mkdirSync(outDir, { recursive: true });
  const slots = slotIndex(packDir);

  const written: string[] = [];
  const skipped: string[] = [];
  const missing: string[] = [];
  for (const ammoId of Object.keys(tiers.bullets ?? {})) {
    const row = tiers.bullets[ammoId];
    if (!row || !row.mold) continue; // 无模具弹药没有子弹梯度，梯度缩写不出现
    const name = ammoId.split(":")[1];
    if (!name) continue;
    const out = join(outDir, `${name}.webp`);
    if (!force && existsSync(out)) {
      skipped.push(name);
      continue;
    }
    const src = slots.get(name);
    if (!src) {
      missing.push(`${ammoId}（没有 textures/ammo/slot/${name}.png）`);
      continue;
    }
    const png = readFileSync(src);
    await sharp(png).webp({ lossless: true, effort: 6 }).toFile(out);
    written.push(`${name} ← ${src.slice(packDir.length + 1)}`);
  }

  for (const line of written) console.log(`写出 ${line}`);
  console.log(
    `弹药本体图标：新增 ${written.length} · 已存在 ${skipped.length} · 缺源 ${missing.length}`,
  );
  if (missing.length) console.error(`缺源：\n  ${missing.join("\n  ")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
