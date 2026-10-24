/**
 * 改枪台「枪械数值」断言：数值条上配件的加减颜色必须与「变化」列同源。
 *
 * 判据：每个指标都声明了 better（high / low）方向，statClass() 用它算出 good / bad；
 * 「变化」列的数字颜色、当前值的颜色、数值条上那一段绿 / 红，都来自同一个 cls。
 * 所以后坐力、散布、瞄准时间、重量这类「越低越好」的指标，被配件压下去时是绿条。
 *
 * 用法：tsx scripts/verify-gunsmith.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
/* 站点以 guide 为准（public/guide 覆盖 dist/client），所以断言读 guide 那一份 */
const src = readFileSync(join(root, "public/guide/js/gunsmith.js"), "utf8");
const css = readFileSync(join(root, "public/guide/css/app.css"), "utf8");

const errors: string[] = [];
let notes = 0;
function check(cond: boolean, message: string): void {
  if (cond) notes += 1;
  else errors.push("✗ " + message);
}

/* ---------------- 指标方向 ---------------- */
const statEntries = Array.from(
  src.matchAll(/\{ key: "([A-Za-z]+)", label: "([^"]+)"[^}]*?better: "(high|low)"/g),
).map((m) => ({ key: m[1], label: m[2], better: m[3] }));
check(statEntries.length === 15, `数值表 15 项（实际 ${statEntries.length}）`);
const LOWER_IS_BETTER = ["reload", "recoilPitch", "recoilYaw", "inaccStand", "inaccAim", "aimTime", "weight"];
for (const stat of statEntries) {
  const want = LOWER_IS_BETTER.indexOf(stat.key) >= 0 ? "low" : "high";
  check(stat.better === want, `${stat.label} 的方向 = ${want}（实际 ${stat.better}）`);
}
const declaredRows = (src.match(/\{ key: "[A-Za-z]+", label: "/g) || []).length;
check(declaredRows === statEntries.length, `每个指标都写了方向（${statEntries.length} / ${declaredRows}）`);

/* ---------------- 数值条：底座段 + 变化段 ---------------- */
check(/const lo = Math\.min\(width, baseWidth\);/.test(src), "底座段取当前值与基础值的较小者");
check(/const hi = Math\.max\(width, baseWidth\);/.test(src), "变化段右端取两者较大者");
check(/const deltaWidth = hi - lo;/.test(src), "变化段宽度 = 两者之差");
check(
  src.includes("const deltaBar = cls === \"same\" || deltaWidth < 0.4 ? \"\" :"),
  "没有变化时不画段（也不留半像素假色边）",
);
check(
  src.includes("'<i class=\"' + cls + '\" style=\"left:' + lo + '%;width:' + deltaWidth + '%\"></i>'"),
  "变化段用 cls（good / bad）上色，并从较小值处起画",
);
check(
  src.includes("'<div class=\"gs-stat-bar\"><i class=\"base\" style=\"width:' + lo + '%\"></i>' + deltaBar"),
  "底座段用 .base，变化段拼在它右边",
);
check(!src.includes("<div class=\"gs-stat-bar\"><i style=\"width:' + width"), "没有残留「单段填充」的旧写法");

/* 同源：一行只判一次 cls */
check((src.match(/const cls = statClass\(b, c, def\.better\);/g) || []).length === 1, "每行只判定一次 cls");
check(src.includes("'<div class=\"gs-stat-value ' + cls + '\">'"), "当前值的颜色来自 cls");
check(src.includes("'<div class=\"gs-stat-delta ' + cls + '\">'"), "变化列的颜色来自 cls");

/* ---------------- 图例文案 ---------------- */
check(src.includes("绿=改善"), "图例写明绿＝改善");
check(src.includes("红=变差"), "图例写明红＝变差");

/* ---------------- CSS ---------------- */
check(/\.gs-stat-bar \{[^}]*height: 4px/s.test(css), "数值条 4px（3px 时绿 / 红段看不清）");
check(/\.gs-stat-bar \{[^}]*overflow: hidden/s.test(css), "条两端裁圆角");
check(/\.gs-stat-bar i \{[^}]*position: absolute/s.test(css), "各段绝对定位并排");
check(
  /\.gs-stat-bar i \{[^}]*background: var\(--amber\);/s.test(css),
  "底座段用主题主色（实色，不再用渐变）",
);
check(!/\.gs-stat-bar i \{[^}]*linear-gradient/s.test(css), "底座段不再出现渐变（渐变在 4px 上读起来像脏色）");
check(/\.gs-stat-bar i\.good \{ background: var\(--green\); \}/.test(css), "变化段绿色 = 改善");
check(/\.gs-stat-bar i\.bad \{ background: var\(--red\); \}/.test(css), "变化段红色 = 变差");

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} 项失败 / ${notes} 项通过`);
  process.exit(1);
}
console.log(`ok 全部通过：${notes} 项断言`);
console.log(
  `指标方向：${statEntries.filter((s) => s.better === "low").length} 项越低越好 · ` +
    `${statEntries.filter((s) => s.better === "high").length} 项越高越好`,
);
