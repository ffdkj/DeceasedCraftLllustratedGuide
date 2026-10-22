/**
 * 生成 public/data/compat.js：枪械 × 配件的**真实兼容性**与配件字段补丁。
 *
 * 兼容性来源：TaCZ 的 `data/<ns>/tacz_tags/attachments/allow_attachments/<枪>.json`
 * （源码 AbstractGunItem.allowAttachment → AllowAttachmentTagMatcher.match）。
 * 条目可以是配件 id，也可以是 `#tag`，这里递归展开。
 *
 * 用法：
 *   tsx scripts/gen-compat.ts [--pack ./DeceasedCraft5.11.19] [--jar <tacz.jar> ...] [--dir <默认包根> ...]
 *
 * --jar 读模组 jar（zip）里的 tacz_tags；--dir 读解压后的目录（本地核对用）。
 * 缺省自动探测 <pack>/overrides/mods/*tacz*.jar。
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { readGlobal } from "./pack-readers.js";

const SITE_HEADER = "/* 亡者世界 · 枪械配件兼容性与配件字段补丁（由 scripts/gen-compat.ts 生成，勿手改） */\n";

function argValues(name: string): string[] {
  const out: string[] = [];
  process.argv.forEach((v, i) => {
    if (v === `--${name}` && process.argv[i + 1]) out.push(process.argv[i + 1]);
  });
  return out;
}
function argValue(name: string, fallback: string): string {
  return argValues(name)[0] || fallback;
}

/* ---------------- 数据收集 ---------------- */
interface Collected {
  tags: Map<string, Set<string>>;
  allow: Map<string, Set<string>>;
  attachData: Map<string, any>; // 配件 id → data json（用于补丁）
  sources: string[];
  tagFiles: number;
  jars: number;
  fromJar: boolean;
  jarTagFiles: number;
  jarNames: string[];
}

function addInto(map: Map<string, Set<string>>, key: string, list: unknown): void {
  if (!Array.isArray(list)) return;
  const set = map.get(key) || new Set<string>();
  for (const item of list) set.add(String(item));
  map.set(key, set);
}

/** 处理单个 tacz_tags 文件：区分 allow_attachments/<枪> 与普通 tag。 */
function takeTagFile(collected: Collected, path: string, json: unknown): void {
  if (!Array.isArray(json)) return;
  collected.tagFiles += 1;
  if (collected.fromJar) collected.jarTagFiles += 1;
  const m = /(?:^|\/)([^/]+)\/tacz_tags\/attachments\/(.+)$/.exec(path.replace(/\\/g, "/"));
  if (!m) return;
  const ns = m[1];
  const rel = m[2].replace(/\.json$/, "");
  if (rel.startsWith("allow_attachments/")) addInto(collected.allow, ns + ":" + rel.slice("allow_attachments/".length), json);
  else addInto(collected.tags, ns + ":" + rel, json);
}

/** 配件数据文件 → 补丁候选。path 形如 …/data/<ns>/data/attachments/<name>_data.json */
function takeAttachmentData(collected: Collected, path: string, json: any): void {
  const m = /(?:^|\/)data\/([^/]+)\/data\/attachments\/([^/]+?)(?:_data)?\.json$/.exec(path.replace(/\\/g, "/"));
  if (!m || !json || typeof json !== "object") return;
  const id = m[1] + ":" + m[2].replace(/_data$/, "");
  collected.attachData.set(id, json);
}

function scanZip(collected: Collected, jarPath: string): void {
  let listText = "";
  try {
    listText = execFileSync("unzip", ["-Z1", jarPath], { maxBuffer: 256 * 1024 * 1024, encoding: "utf8" });
  } catch (error) {
    console.warn(`跳过无法读取的 jar：${jarPath}`);
    return;
  }
  const entries = listText.split("\n").map((x) => x.trim()).filter(Boolean);
  collected.fromJar = true;
  collected.jarNames.push(jarPath);
  const tagEntries = entries.filter((e) => /tacz_tags\/attachments\/.+\.json$/.test(e));
  const dataEntries = entries.filter((e) => /\/data\/attachments\/.+\.json$/.test(e));
  for (const entry of tagEntries) {
    try {
      const text = execFileSync("unzip", ["-p", jarPath, entry], { maxBuffer: 8 * 1024 * 1024, encoding: "utf8" });
      takeTagFile(collected, entry, JSON.parse(text));
    } catch (error) {
      console.warn(`解析失败：${jarPath}!${entry}`);
    }
  }
  for (const entry of dataEntries) {
    try {
      const text = execFileSync("unzip", ["-p", jarPath, entry], { maxBuffer: 8 * 1024 * 1024, encoding: "utf8" });
      takeAttachmentData(collected, entry, JSON.parse(text));
    } catch (error) {
      /* 非 JSON 或无内容，忽略 */
    }
  }
  collected.jars += 1;
  collected.fromJar = false;
  collected.sources.push(jarPath);
}

function scanDir(collected: Collected, root: string): void {
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(file);
        continue;
      }
      if (!/\.json$/.test(file)) continue;
      const rel = relative(root, file).replace(/\\/g, "/");
      let json: unknown;
      try {
        json = JSON.parse(readFileSync(file, "utf8"));
      } catch (error) {
        continue;
      }
      if (/tacz_tags\/attachments\//.test(rel)) takeTagFile(collected, rel, json);
      else if (/^data\/[^/]+\/data\/attachments\//.test(rel)) takeAttachmentData(collected, rel, json);
    }
  };
  walk(root);
  collected.sources.push(root);
}

/** 展开 #tag（递归，带环检测）。 */
function resolveTags(collected: Collected, entries: Set<string> | undefined): Set<string> {
  const out = new Set<string>();
  const seen = new Set<string>();
  const walk = (set: Set<string>): void => {
    for (const item of set) {
      if (item.startsWith("#")) {
        const id = item.slice(1);
        if (seen.has(id)) continue;
        seen.add(id);
        const sub = collected.tags.get(id);
        if (sub) walk(sub);
      } else {
        out.add(item);
      }
    }
  };
  if (entries) walk(entries);
  return out;
}

/* ---------------- 补丁推导 ---------------- */
interface Fix {
  recoilPitchMult?: number;
  recoilYawMult?: number;
  inaccAdd?: number;
  note: string;
}

/** 旧版 recoil_modifier 是「百分比」写法（-0.35 → 乘数 0.65），新版 recoil 才是乘数。 */
function deriveFix(data: any): Fix | null {
  if (!data || typeof data !== "object") return null;
  const fix: Fix = { note: "" };
  const legacy = data.recoil_modifier;
  if (legacy && typeof legacy === "object") {
    const pitch = Number(legacy.pitch);
    const yaw = Number(legacy.yaw);
    if (Number.isFinite(pitch)) fix.recoilPitchMult = Number((1 + pitch).toFixed(4));
    if (Number.isFinite(yaw)) fix.recoilYawMult = Number((1 + yaw).toFixed(4));
    if (fix.recoilPitchMult != null || fix.recoilYawMult != null) fix.note = "recoil_modifier 旧版百分比写法已折算为乘数";
  }
  const inaccAdd = Number(data.inaccuracy_addend);
  if (Number.isFinite(inaccAdd) && inaccAdd !== 0) {
    fix.inaccAdd = inaccAdd;
    fix.note = fix.note ? fix.note + "；补 inaccuracy_addend" : "补 inaccuracy_addend";
  }
  return fix.note ? fix : null;
}

/* ---------------- 主流程 ---------------- */
function main(): void {
  const packDir = resolve(argValue("pack", "DeceasedCraft5.11.19"));
  const siteRoot = ".";
  const gunsmith = readGlobal(siteRoot, "public/data/gunsmith.js", "WZ_GUNSMITH");
  if (!gunsmith) {
    console.error("读不到 public/data/gunsmith.js");
    process.exit(1);
  }
  const gunIds: string[] = Object.keys(gunsmith.guns || {});
  const attachments: Record<string, any> = gunsmith.attachments || {};

  const collected: Collected = {
    tags: new Map(), allow: new Map(), attachData: new Map(), sources: [],
    tagFiles: 0, jars: 0, fromJar: false, jarTagFiles: 0, jarNames: [],
  };

  // 1) 整合包内枪包的标签
  const packTacz = join(packDir, "overrides/tacz");
  if (existsSync(packTacz)) {
    for (const entry of readdirSync(packTacz)) {
      const dir = join(packTacz, entry);
      if (statSync(dir).isDirectory()) scanDir(collected, dir);
    }
  } else {
    console.warn(`找不到 ${packTacz}，只读 jar。`);
  }

  // 2) 模组 jar：显式 --jar，或自动探测整合包 mods 目录里的 tacz jar
  const jars = argValues("jar");
  if (jars.length) {
    for (const jar of jars) scanZip(collected, resolve(jar));
  } else {
    const modsDir = join(packDir, "overrides/mods");
    if (existsSync(modsDir)) {
      const found = readdirSync(modsDir).filter((f) => /tacz|classic/i.test(f) && /\.jar$/.test(f));
      for (const jar of found) scanZip(collected, join(modsDir, jar));
      if (!found.length) console.warn(`在 ${modsDir} 里没找到 tacz 模组 jar：请用 --jar 指定。`);
    }
  }
  // 3) 额外目录（解压后的默认包，本地核对用）
  for (const dir of argValues("dir")) scanDir(collected, resolve(dir));

  if (!collected.tagFiles) {
    console.error("没有读到任何 tacz_tags/attachments 文件：请提供 tacz 模组 jar（--jar）或解压目录（--dir）。");
    process.exit(1);
  }

  const warnings: string[] = [];
  if (!collected.jarTagFiles) {
    warnings.push(
      `没有从模组 jar 读到任何 tacz_tags 文件（扫到的 jar：${collected.jarNames.join(", ") || "无"}）：基础 tag 来自 --dir 目录，数据需用真 jar 复核`,
    );
  }
  const guns: Record<string, string[]> = {};
  const unknown: Set<string> = new Set();
  const noWhitelist: string[] = [];
  const everAllowed = new Set<string>();

  for (const gunId of gunIds) {
    const raw = collected.allow.get(gunId);
    if (!raw) {
      noWhitelist.push(gunId);
      guns[gunId] = [];
      continue;
    }
    const resolved = resolveTags(collected, raw);
    const list: string[] = [];
    for (const id of resolved) {
      everAllowed.add(id);
      if (!attachments[id]) {
        unknown.add(id);
        continue;
      }
      list.push(id);
    }
    list.sort();
    guns[gunId] = list;
  }

  // 补丁：只保留与站内数据不一致的项
  const fixes: Record<string, Fix> = {};
  for (const [id, data] of collected.attachData) {
    const site = attachments[id];
    if (!site) continue;
    const fix = deriveFix(data);
    if (!fix) continue;
    const pitchDiffers = fix.recoilPitchMult != null && Math.abs(Number(site.recoilPitchMult) - fix.recoilPitchMult) > 0.0001;
    const yawDiffers = fix.recoilYawMult != null && Math.abs(Number(site.recoilYawMult) - fix.recoilYawMult) > 0.0001;
    const inaccMissing = fix.inaccAdd != null && site.inaccAdd == null;
    const keep: Fix = { note: fix.note };
    if (pitchDiffers) keep.recoilPitchMult = fix.recoilPitchMult;
    if (yawDiffers) keep.recoilYawMult = fix.recoilYawMult;
    if (inaccMissing) keep.inaccAdd = fix.inaccAdd;
    if (keep.recoilPitchMult != null || keep.recoilYawMult != null || keep.inaccAdd != null) fixes[id] = keep;
  }

  const neverAllowed = Object.keys(attachments).filter((id) => !everAllowed.has(id));
  if (unknown.size) warnings.push(`标签里引用了站内不存在的配件：${Array.from(unknown).join(", ")}`);
  if (neverAllowed.length) warnings.push(`站内有、但没有任何枪允许的配件 ${neverAllowed.length} 个：${neverAllowed.join(", ")}`);
  if (noWhitelist.length) warnings.push(`整合包没有 allow_attachments 文件的枪 ${noWhitelist.length} 把（游戏内装不了任何配件）`);

  const payload = {
    generated: new Date().toISOString().slice(0, 10),
    source: {
      pack: "DeceasedCraft 5.11.19",
      sources: collected.sources.map((s) => relative(process.cwd(), s) || s),
      tagFiles: collected.tagFiles,
      tags: collected.tags.size,
      jars: collected.jars,
      jarTagFiles: collected.jarTagFiles,
      guns: gunIds.length,
      attachments: Object.keys(attachments).length,
    },
    guns,
    fixes,
    meta: { noWhitelist, unknownAttachments: Array.from(unknown).sort(), neverAllowed: neverAllowed.sort(), warnings },
  };

  const outFile = join(siteRoot, "public/data/compat.js");
  writeFileSync(outFile, `${SITE_HEADER}window.WZ_COMPAT = ${JSON.stringify(payload)};\n`, "utf8");

  const totalPairs = Object.keys(guns).reduce((sum, id) => sum + guns[id].length, 0);
  const bytes = Buffer.byteLength(JSON.stringify(payload));
  console.log(`写出 ${outFile}（${(bytes / 1024).toFixed(1)} KB）`);
  console.log(`标签文件 ${collected.tagFiles} · tag ${collected.tags.size} · 枪 ${gunIds.length} · 配件 ${Object.keys(attachments).length}`);
  console.log(`游戏内允许的「枪×配件」组合 ${totalPairs} · 无白名单的枪 ${noWhitelist.length} · 补丁 ${Object.keys(fixes).length} 条`);
  for (const id of Object.keys(fixes)) console.log(`  补丁 ${id}: ${JSON.stringify(fixes[id])}`);
  if (warnings.length) {
    console.log(`warnings ${warnings.length} 条：`);
    for (const line of warnings) console.log(`  · ${line}`);
  }
}

main();
