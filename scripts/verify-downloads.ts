/**
 * 数据表下载断言：public/downloads 里的三张表必须与数据源同源、可解析。
 *
 * 用法：npm run verify:downloads
 */
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { readGlobal } from './pack-readers.js';

const ROOT = process.cwd();
const errors: string[] = [];
let notes = 0;
function check(cond: boolean, message: string): void {
  if (cond) notes += 1;
  else errors.push('✗ ' + message);
}

const guides = readGlobal(ROOT, 'public/data/guides.js', 'WZ_GUIDES') as any;
const files = ['index.html', 'guns.csv', 'guns.html', 'ammo.csv', 'ammo.html', 'vehicles.csv', 'vehicles.html'];

for (const file of files) {
  try {
    check(statSync(join(ROOT, 'public/downloads', file)).size > 200, `${file} 已生成且非空`);
  } catch {
    check(false, `${file} 已生成（缺失）`);
  }
}

function rows(file: string): string[] {
  return readFileSync(join(ROOT, 'public/downloads', file), 'utf8')
    .replace(/^\ufeff/, '')
    .trim()
    .split(/\r?\n/);
}

const guns = rows('guns.csv');
const ammo = rows('ammo.csv');
const vehicles = rows('vehicles.csv');
check(guns[0].startsWith('名称,ID,类型,弹药'), '枪械表头正确');
check(ammo[0].startsWith('名称,ID,类型'), '弹药表头正确');
check(vehicles[0].startsWith('名称,ID,分组'), '载具表头正确');
check(guns.length - 1 === (guides.guns || []).length, `枪械行数与数据一致（${guns.length - 1} / ${(guides.guns || []).length}）`);
check(ammo.length - 1 === (guides.ammo || []).length, `弹药行数与数据一致（${ammo.length - 1} / ${(guides.ammo || []).length}）`);
check(vehicles.length - 1 === (guides.vehicles || []).length, `载具行数与数据一致（${vehicles.length - 1} / ${(guides.vehicles || []).length}）`);

const index = readFileSync(join(ROOT, 'public/downloads/index.html'), 'utf8');
for (const slug of ['guns', 'ammo', 'vehicles']) {
  check(index.includes(`./${slug}.csv`), `索引页链接到 ${slug}.csv`);
}
const app = readFileSync(join(ROOT, 'src/client/app.ts'), 'utf8');
check(app.includes('href="/downloads/"'), '设置页有数据表下载入口');

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} 项失败 / ${notes} 项通过`);
  process.exit(1);
}
console.log(`ok 全部通过：${notes} 项断言`);
console.log(`枪械 ${guns.length - 1} 行 · 弹药 ${ammo.length - 1} 行 · 载具 ${vehicles.length - 1} 行`);
