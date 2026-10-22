/**
 * 配件兼容性与补丁的断言（判据见 specs/SPEC-attachment-compat.md）。
 * 用法：tsx scripts/verify-compat.ts
 */
import { readGlobal } from "./pack-readers.js";

const EXPECTED_NO_WHITELIST = [
  "bf1:ef46",
  "bf1:f_faust",
  "bf1:lunge_mine",
  "bf1:m2_2",
  "bf1:mg0815",
  "bf1:obrez",
  "bf1:syringe",
  "bf1:tg1918",
  "rebel:bq01",
  "rebel:fmc",
  "rebel:mta",
  "suffuse:aiyasinrpg",
  "suffuse:aks74u",
  "suffuse:mas38",
  "suffuse:saddam_golden_ak",
  "suffuse:trapper50cal",
  "suffuse:tt33",
  "suffuse:webley1913",
  "tacz:m320",
  "tacz:minigun",
  "tacz:rpg7",
  "tacz:taurus943",
];

const EXPECTED_FIXES: Record<string, { recoilPitchMult: number; recoilYawMult: number; inaccAdd: number }> = {
  "rebel:stock_sp": { recoilPitchMult: 0.7, recoilYawMult: 0.85, inaccAdd: -0.5 },
  "rebel:stock_spa": { recoilPitchMult: 0.65, recoilYawMult: 0.8, inaccAdd: -0.5 },
};

const errors: string[] = [];
const notes: string[] = [];
function check(ok: boolean, message: string): void {
  if (ok) notes.push(`ok ${message}`);
  else errors.push(`FAIL ${message}`);
}

const compat = readGlobal(".", "public/data/compat.js", "WZ_COMPAT");
const gunsmith = readGlobal(".", "public/data/gunsmith.js", "WZ_GUNSMITH");
check(!!compat, "读到 compat.js");
if (!compat || !gunsmith) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const guns: Record<string, string[]> = compat.guns || {};
const fixes: Record<string, any> = compat.fixes || {};
const attachments: Record<string, any> = gunsmith.attachments || {};
const gunIds: string[] = Object.keys(gunsmith.guns || {});

check(Object.keys(guns).length === gunIds.length, `每把枪都有兼容性条目（${Object.keys(guns).length}/${gunIds.length}）`);

/* 无白名单的枪 */
const noWhitelist = (compat.meta?.noWhitelist ?? []).slice().sort();
check(
  JSON.stringify(noWhitelist) === JSON.stringify(EXPECTED_NO_WHITELIST.slice().sort()),
  `无 allow_attachments 白名单的枪 ${EXPECTED_NO_WHITELIST.length} 把且名单一致（实际 ${noWhitelist.length}）`,
);
for (const gunId of EXPECTED_NO_WHITELIST) check(Array.isArray(guns[gunId]) && guns[gunId].length === 0, `无白名单的枪为空集：${gunId}`);

/* 每把枪的配件 id 必须存在于 gunsmith 数据里 */
let pairs = 0;
for (const gunId of Object.keys(guns)) {
  for (const attId of guns[gunId]) {
    pairs += 1;
    if (!attachments[attId]) check(false, `枪 ${gunId} 的兼容性引用了站内不存在的配件 ${attId}`);
  }
}
check(pairs > 8000 && pairs < 14000, `游戏内允许的枪×配件组合在合理区间（实际 ${pairs}）`);

/* 专属配件：只出现在该枪的集合里 */
const owners = (attId: string): string[] => Object.keys(guns).filter((gunId) => guns[gunId].indexOf(attId) >= 0);
check(JSON.stringify(owners("rebel:stock_spa")) === JSON.stringify(["rebel:lss"]), `Lss专用枪托只属于 rebel:lss（实际 ${owners("rebel:stock_spa").join(", ")}）`);
check(JSON.stringify(owners("rebel:stock_sp")) === JSON.stringify(["rebel:hsp", "rebel:lss"]), `Hsp/Lss通用枪托只属于 hsp/lss（实际 ${owners("rebel:stock_sp").join(", ")}）`);

/* 抽样：常规枪的集合规模与关键配件 */
const m4a1 = guns["tacz:m4a1"] || [];
check(m4a1.length > 100, `tacz:m4a1 可装配件 > 100（实际 ${m4a1.length}）`);
check(m4a1.indexOf("tacz:scope_acog_ta31") >= 0, "tacz:m4a1 含 ACOG 瞄具");
check(m4a1.indexOf("rebel:stock_spa") < 0, "tacz:m4a1 不含 Lss专用枪托");
const ak47 = guns["tacz:ak47"] || [];
check(ak47.length > 60, `tacz:ak47 可装配件 > 60（实际 ${ak47.length}）`);
for (const gunId of ["tacz:minigun", "tacz:m320", "tacz:rpg7"]) check((guns[gunId] || []).length === 0, `${gunId} 无可用配件`);

/* 补丁 */
for (const attId of Object.keys(EXPECTED_FIXES)) {
  const fix = fixes[attId];
  const want = EXPECTED_FIXES[attId];
  check(!!fix, `补丁存在：${attId}`);
  if (!fix) continue;
  check(Math.abs(fix.recoilPitchMult - want.recoilPitchMult) < 0.001, `${attId} 垂直后坐力乘数 ${want.recoilPitchMult}（实际 ${fix.recoilPitchMult}）`);
  check(Math.abs(fix.recoilYawMult - want.recoilYawMult) < 0.001, `${attId} 水平后坐力乘数 ${want.recoilYawMult}（实际 ${fix.recoilYawMult}）`);
  check(Math.abs(fix.inaccAdd - want.inaccAdd) < 0.001, `${attId} 散布加数 ${want.inaccAdd}（实际 ${fix.inaccAdd}）`);
  check(typeof fix.note === "string" && fix.note.length > 0, `${attId} 补丁带来源说明`);
}
for (const attId of Object.keys(fixes)) {
  check(!!attachments[attId], `补丁目标存在于站内配件：${attId}`);
  const pitch = Number(fixes[attId].recoilPitchMult);
  if (Number.isFinite(pitch)) check(pitch > 0, `${attId} 补丁后的后坐力乘数为正（实际 ${pitch}）`);
}

/* 站内不允许出现负的 recoil 乘数（旧版百分比写法必须被补丁覆盖或标记） */
for (const [attId, a] of Object.entries(attachments)) {
  const pitch = Number(a.recoilPitchMult);
  if (Number.isFinite(pitch) && pitch < 0) {
    check(!!fixes[attId], `负后坐力乘数的配件必须有补丁：${attId}`);
  }
}

/* 生成器自检 */
check((compat.meta?.warnings ?? []).every((w: string) => !/没有读到|读不到/.test(w)), "生成器读到了标签文件");
check(typeof compat.source?.tagFiles === "number" && compat.source.tagFiles > 100, `标签文件数 > 100（实际 ${compat.source?.tagFiles}）`);

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} 项失败 / ${notes.length} 项通过`);
  process.exit(1);
}
console.log(`ok 全部通过：${notes.length} 项断言`);
console.log(`游戏内允许的枪×配件组合 ${pairs} · 无白名单的枪 ${noWhitelist.length} · 补丁 ${Object.keys(fixes).length}`);
if ((compat.meta?.warnings ?? []).length) {
  console.log("生成器 warning：");
  for (const w of compat.meta.warnings) console.log("  · " + w);
}
