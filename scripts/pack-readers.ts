/**
 * 整合包读取工具（只读）：配方、可得性集合、材料 tag。
 * 供 scripts/gen-recipes.ts / scripts/gen-atlas-extra.ts / scripts/verify-recipes.ts 共用。
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

export interface RawMaterial {
  item?: string;
  tag?: string;
  count: number;
}

export interface RawRecipe {
  id: string;
  kind: "gun" | "attachment";
  materials: RawMaterial[];
  file: string;
}

export interface PackRecipes {
  guns: Map<string, RawRecipe>;
  attachments: Map<string, RawRecipe>;
  warnings: string[];
}

export interface Obtainability {
  chest: Set<string>;
  npc: Set<string>;
  store: Set<string>;
}

/** 去掉 JSONC 里的 // 与 /* *\/ 注释（跳过字符串内容），保留换行以便报错定位。 */
export function parseJsonc(text: string): any {
  let out = "";
  let i = 0;
  let inString = false;
  while (i < text.length) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (ch === "\\") {
        out += text[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (ch === '"') inString = false;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return JSON.parse(out);
}

export function readJsonc(file: string): any {
  return parseJsonc(readFileSync(file, "utf8"));
}

/** 递归收集目录下的 .json 文件（不存在则返回空）。 */
export function walkJson(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) walkJson(full, acc);
    else if (entry.endsWith(".json")) acc.push(full);
  }
  return acc;
}

function resultId(recipe: any): string | null {
  const result = recipe?.result;
  if (!result) return null;
  if (typeof result.id === "string" && result.id.includes(":")) return result.id;
  const nbt = result.item?.nbt ?? result.nbt;
  const gunId = typeof nbt === "string" ? nbt : nbt?.GunId;
  return typeof gunId === "string" && gunId.includes(":") ? gunId : null;
}

function materialsOf(recipe: any): RawMaterial[] {
  const list: any[] = Array.isArray(recipe?.materials) ? recipe.materials : [];
  const out: RawMaterial[] = [];
  for (const entry of list) {
    const spec = entry?.item ?? {};
    const count = Number(entry?.count) || 1;
    if (typeof spec.item === "string") out.push({ item: spec.item, count });
    else if (typeof spec.tag === "string") out.push({ tag: spec.tag.replace(/^#/, ""), count });
  }
  return out;
}

const RECIPE_DIRS = ["recipes/gun", "recipes/attachments", "recipes/attachment"];

/** 读取全部枪械与配件配方；只认枪械工坊配方（type 含 gun_smith）。 */
export function readPackRecipes(packDir: string): PackRecipes {
  const guns = new Map<string, RawRecipe>();
  const attachments = new Map<string, RawRecipe>();
  const warnings: string[] = [];
  const taczRoot = join(packDir, "overrides/tacz");
  if (!existsSync(taczRoot)) return { guns, attachments, warnings: [`未找到 ${taczRoot}`] };

  for (const pack of readdirSync(taczRoot)) {
    const dataRoot = join(taczRoot, pack, "data");
    if (!existsSync(dataRoot)) continue;
    for (const ns of readdirSync(dataRoot)) {
      for (const rel of RECIPE_DIRS) {
        for (const file of walkJson(join(dataRoot, ns, rel))) {
          let recipe: any;
          try {
            recipe = readJsonc(file);
          } catch (error) {
            warnings.push(`配方解析失败 ${file}: ${(error as Error).message}`);
            continue;
          }
          const type = String(recipe?.type ?? "");
          const isGunDir = rel === "recipes/gun";
          if (!isGunDir && !type.includes("gun_smith")) continue;
          if (isGunDir && recipe?.materials == null) continue;
          const id = resultId(recipe);
          if (!id) {
            warnings.push(`配方没有可解析的产物 id：${file}`);
            continue;
          }
          const raw: RawRecipe = { id, kind: isGunDir ? "gun" : "attachment", materials: materialsOf(recipe), file };
          const bucket = isGunDir ? guns : attachments;
          if (bucket.has(id)) warnings.push(`重复配方 ${id}：${bucket.get(id)!.file} 与 ${file}`);
          bucket.set(id, raw);
        }
      }
    }
  }
  return { guns, attachments, warnings };
}

/** 从 DCTweaks jar 的战利品表里取 GunId（枪在 loot 里是 modern_kinetic_gun + NBT）。 */
export function readChestGunIds(packDir: string): Set<string> {
  const ids = new Set<string>();
  const modsDir = join(packDir, "overrides/mods");
  if (!existsSync(modsDir)) return ids;
  const jar = readdirSync(modsDir).find((name) => /^DCTweaks.*\.jar$/i.test(name));
  if (!jar) return ids;
  let text = "";
  try {
    text = execFileSync("unzip", ["-p", join(modsDir, jar), "*/loot_tables/*.json"], {
      maxBuffer: 1024 * 1024 * 1024,
      encoding: "utf8",
    });
  } catch (error) {
    // unzip 在有文件匹配时会返回 0；宽泛匹配失败时退回逐个条目未必要，这里直接放弃并记录
    return ids;
  }
  for (const match of text.matchAll(/GunId\s*:\s*\\?"([a-z0-9_]+:[a-z0-9_]+)\\?"/g)) ids.add(match[1]);
  return ids;
}

/** 唯一注入到原版奖励箱的枪（tacz_loot_injectors）。 */
export function readLootInjectorGunIds(packDir: string): Set<string> {
  const ids = new Set<string>();
  for (const file of walkJson(join(packDir, "overrides/tacz"))) {
    if (!file.includes("loot_injector")) continue;
    for (const match of readFileSync(file, "utf8").matchAll(/GunId\s*[:=]\s*\\?"([a-z0-9_]+:[a-z0-9_]+)\\?"/g)) ids.add(match[1]);
  }
  return ids;
}

/** NPC 商店配置里出售的枪。 */
export function readNpcShopGunIds(packDir: string): Set<string> {
  const ids = new Set<string>();
  const dir = join(packDir, "overrides/config/dochi_rpg_maker/npc_shops");
  if (!existsSync(dir)) return ids;
  for (const file of readdirSync(dir)) {
    const full = join(dir, file);
    if (!statSync(full).isFile()) continue;
    const text = readFileSync(full, "utf8");
    for (const match of text.matchAll(/GunId\s*[:=]\s*\\?"([a-z0-9_]+:[a-z0-9_]+)\\?"/g)) ids.add(match[1]);
  }
  return ids;
}

/** 枪店展示（命令方块随机生成）用的枪池。 */
export function readStoreDisplayGunIds(packDir: string): Set<string> {
  const ids = new Set<string>();
  const file = join(packDir, "overrides/kubejs/server_scripts/functions/spawns/spawn_gun_commands.js");
  if (!existsSync(file)) return ids;
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/['"]([a-z0-9_]+:[a-z0-9_]+)['"]/g)) {
    if (/(tacz|bf1|gz|rebel|suffuse):/.test(match[1])) ids.add(match[1]);
  }
  return ids;
}

export function readObtainability(packDir: string): Obtainability {
  return {
    chest: new Set([...readChestGunIds(packDir), ...readLootInjectorGunIds(packDir)]),
    npc: readNpcShopGunIds(packDir),
    store: readStoreDisplayGunIds(packDir),
  };
}

/** 本地 tags（整合包内 data/<ns>/tags/items），用于 tag → 具体物品代表。 */
export function readItemTags(packDir: string): Map<string, string[]> {
  const tags = new Map<string, string[]>();
  const add = (tag: string, value: string) => {
    const list = tags.get(tag) ?? [];
    if (!list.includes(value)) list.push(value);
    tags.set(tag, list);
  };
  for (const root of walkJson(join(packDir, "overrides/tacz"))) {
    if (!root.includes(`${join("tags", "items")}`)) continue;
    let doc: any;
    try {
      doc = readJsonc(root);
    } catch {
      continue;
    }
    const values: any[] = Array.isArray(doc?.values) ? doc.values : [];
    const rel = root.split(`${join("tags", "items")}`)[1]?.replace(/\.json$/, "").replace(/\\/g, "/") ?? "";
    if (!rel) continue;
    for (const value of values) {
      if (typeof value !== "string" || value.startsWith("#")) continue;
      add(rel, value);
    }
  }
  return tags;
}

/** 读站内某个 window.WZ_* 全局数据文件。 */
export function readGlobal(siteRoot: string, relFile: string, name: string): any {
  const file = join(siteRoot, relFile);
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  const marker = `window.${name}`;
  const at = text.indexOf(marker);
  if (at < 0) return null;
  const start = text.indexOf("{", at);
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  return JSON.parse(text.slice(start, end + 1));
}

export const PACK_REL_DIRS = { recipes: RECIPE_DIRS } as const;
export { basename };
