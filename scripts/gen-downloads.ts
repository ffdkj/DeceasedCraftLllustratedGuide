/**
 * 生成站点数据表下载（CSV + HTML），输出到 public/downloads/。
 *
 * 三张表：枪械 / 弹药 / 载具。数据源是 public/data/guides.js（WZ_GUIDES），
 * 与页面同一份，避免出现「下载的表和页面数据不一致」。
 *
 * CSV 带 UTF-8 BOM，Excel 直接打开不乱码；HTML 是自包含静态页（不依赖 SPA 的 JS）。
 *
 * 用法：tsx scripts/gen-downloads.ts（npm run gen:downloads）
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readGlobal } from './pack-readers.js';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public/downloads');

type Row = (string | number | null | undefined)[];

const BOM = '\ufeff';

function csv(header: string[], rows: Row[]): string {
  const cell = (value: string | number | null | undefined): string => {
    const text = value == null ? '' : String(value);
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  return BOM + [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

function esc(value: unknown): string {
  return String(value == null ? '' : value).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  );
}

function htmlPage(title: string, note: string, header: string[], rows: Row[]): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · 亡者世界图鉴</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 24px; font: 14px/1.6 system-ui, "PingFang SC", "Microsoft YaHei", sans-serif; background: #f5f7fb; color: #172231; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .note { color: #5f7085; font-size: 12px; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; background: #fff; box-shadow: 0 1px 3px rgba(20,40,70,.08); }
  th, td { padding: 8px 10px; border-bottom: 1px solid #e3eaf3; text-align: left; vertical-align: top; font-variant-numeric: tabular-nums; }
  th { background: #eef4fb; font-size: 12px; white-space: nowrap; }
  tr:hover td { background: #f8fbff; }
  td.num { text-align: right; }
  a { color: #1e88e5; }
  @media (prefers-color-scheme: dark) {
    body { background: #12161c; color: #e6edf5; }
    table { background: #171c23; box-shadow: none; }
    th { background: #1e252e; }
    th, td { border-color: #2a323c; }
    tr:hover td { background: #1b222b; }
  }
</style>
</head>
<body>
<h1>${esc(title)}</h1>
<div class="note">${esc(note)} · 数据来源 DeceasedCraft 5.11.19 整合包 · <a href="./index.html">全部数据表</a></div>
<table>
<thead><tr>${header.map((h) => '<th>' + esc(h) + '</th>').join('')}</tr></thead>
<tbody>
${rows.map((row) => '<tr>' + row.map((cell) => '<td>' + esc(cell) + '</td>').join('') + '</tr>').join('\n')}
</tbody>
</table>
</body>
</html>
`;
}

function tagOf(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(tagOf).filter(Boolean).join(' / ');
  if (typeof value === 'object') return (value as { name?: string }).name ?? '';
  return '';
}

async function main(): Promise<void> {
  const guides = readGlobal(ROOT, 'public/data/guides.js', 'WZ_GUIDES') as any;
  if (!guides) throw new Error('读不到 public/data/guides.js');
  await fs.mkdir(OUT, { recursive: true });

  /* ---- 枪械 ---- */
  const gunHeader = ['名称', 'ID', '类型', '弹药', '弹容', '射速 RPM', '伤害', '护甲穿透 %', '爆头倍率', '来源'];
  const gunRows: Row[] = (guides.guns || []).map((g: any) => [
    g.name, g.id, g.type ?? '', g.ammo ?? g.ammoId ?? '', g.mag ?? '', g.rpm ?? '', g.damage ?? '',
    g.armorIgnore == null ? '' : Math.round(Number(g.armorIgnore) * 100), g.headshot ?? '', tagOf(g.source),
  ]);
  await fs.writeFile(path.join(OUT, 'guns.csv'), csv(gunHeader, gunRows), 'utf8');
  await fs.writeFile(
    path.join(OUT, 'guns.html'),
    htmlPage('枪械数据表', `共 ${gunRows.length} 把`, gunHeader, gunRows),
    'utf8',
  );

  /* ---- 弹药 ---- */
  const ammoHeader = ['名称', 'ID', '类型', '可堆叠', '适用枪械数', '合成材料', '来源区域'];
  const ammoRows: Row[] = (guides.ammo || []).map((a: any) => [
    a.name, a.id, a.type ?? '', a.stack ?? '', (a.guns || []).length,
    (a.recipe?.materials || []).map((m: any) => `${m.name}×${m.count}`).join('; '),
    (a.sources || []).map((s: any) => s.region).filter(Boolean).filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i).join(' / '),
  ]);
  await fs.writeFile(path.join(OUT, 'ammo.csv'), csv(ammoHeader, ammoRows), 'utf8');
  await fs.writeFile(
    path.join(OUT, 'ammo.html'),
    htmlPage('弹药数据表', `共 ${ammoRows.length} 种`, ammoHeader, ammoRows),
    'utf8',
  );

  /* ---- 载具 ---- */
  const vehicleHeader = ['名称', 'ID', '分组', '变体数', '别名', '来源'];
  const vehicleRows: Row[] = (guides.vehicles || []).map((v: any) => [
    v.name, v.id, v.group ?? '', v.variants ?? '', (v.aliases || []).join(' / '), tagOf(v.source),
  ]);
  await fs.writeFile(path.join(OUT, 'vehicles.csv'), csv(vehicleHeader, vehicleRows), 'utf8');
  await fs.writeFile(
    path.join(OUT, 'vehicles.html'),
    htmlPage('载具清单', `共 ${vehicleRows.length} 辆`, vehicleHeader, vehicleRows),
    'utf8',
  );

  /* ---- 索引 ---- */
  const index = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>数据表下载 · 亡者世界图鉴</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 24px; font: 14px/1.7 system-ui, "PingFang SC", "Microsoft YaHei", sans-serif; background: #f5f7fb; color: #172231; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .note { color: #5f7085; font-size: 12px; margin-bottom: 16px; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { background: #fff; border: 1px solid #e3eaf3; padding: 12px 14px; margin-bottom: 8px; }
  b { display: block; }
  a { color: #1e88e5; margin-right: 12px; }
  @media (prefers-color-scheme: dark) {
    body { background: #12161c; color: #e6edf5; }
    li { background: #171c23; border-color: #2a323c; }
  }
</style>
</head>
<body>
<h1>数据表下载</h1>
<div class="note">与站内页面同源生成（DeceasedCraft 5.11.19）· CSV 带 BOM，可直接用 Excel 打开</div>
<ul>
${[
  ['枪械数据表', gunRows.length + ' 把', 'guns'],
  ['弹药数据表', ammoRows.length + ' 种', 'ammo'],
  ['载具清单', vehicleRows.length + ' 辆', 'vehicles'],
]
  .map(([title, count, slug]) => `<li><b>${esc(title)} · ${esc(count)}</b><a href="./${slug}.csv">下载 CSV</a><a href="./${slug}.html">在线查看</a></li>`)
  .join('\n')}
</ul>
</body>
</html>
`;
  await fs.writeFile(path.join(OUT, 'index.html'), index, 'utf8');

  console.log(`写出 public/downloads：枪械 ${gunRows.length} · 弹药 ${ammoRows.length} · 载具 ${vehicleRows.length}`);
  for (const name of ['index.html', 'guns.csv', 'guns.html', 'ammo.csv', 'ammo.html', 'vehicles.csv', 'vehicles.html']) {
    const size = (await fs.stat(path.join(OUT, name))).size;
    console.log(`  ${name.padEnd(14)} ${(size / 1024).toFixed(1)}KB`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
