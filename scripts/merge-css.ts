/**
 * 把 guide 版 CSS 合并成根站 CSS（guide 为基座，根站新增/修复块保留）。
 *
 * 做法：
 *   1. 基座 = public/guide/css/app.css 原文（保留它自己的注释与顺序，guide 是视觉权威）；
 *   2. 追加 = 只存在于根站的规则（梯度点阵、数值条、像素字、弹药图标、动物页等新增块）；
 *   3. 覆盖 = 两边都有但根站带修复/新语义的规则（见 scripts/css-merge-overrides.json），排在最后确保生效。
 *
 * @font-face / @keyframes 这类无选择器的 at-rule 总是追加根站的，不参与「只在/都在」判定——
 * 重复声明同族字体不会互相破坏，但丢了会直接掉字。
 *
 * 用法：
 *   tsx scripts/merge-css.ts --report   # 只统计，不写文件
 *   tsx scripts/merge-css.ts            # 写出 public/css/app.css
 */
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';

const GUIDE = path.resolve('public/guide/css/app.css');
const ROOT = path.resolve('public/css/app.css');
const OVERRIDES = path.resolve('scripts/css-merge-overrides.json');

type Block = { wrapper: string | null; head: string; body: string; atRule: boolean };

/** 顶层块切分；@media/@supports 内部递归展平，wrapper 记条件串。 */
function parse(css: string, wrapper: string | null = null, out: Block[] = []): Block[] {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];
    if (ch === '{') {
      depth += 1;
      continue;
    }
    if (ch !== '}') continue;
    depth -= 1;
    if (depth !== 0) continue;
    const text = css.slice(start, i + 1);
    start = i + 1;
    const brace = text.indexOf('{');
    if (brace < 0) continue;
    const head = text.slice(0, brace).replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!head) continue;
    const body = text.slice(brace + 1, text.lastIndexOf('}')).trim();
    if (/^@(?:media|supports)/.test(head)) {
      parse(body, head, out);
      continue;
    }
    for (const part of head.split(',').map((s) => s.trim()).filter(Boolean)) {
      out.push({ wrapper, head: part, body, atRule: head.startsWith('@') });
    }
  }
  return out;
}

const escapeRe = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const keyOf = (block: Block): string => (block.wrapper ?? '') + '||' + block.head.replace(/\s+/g, ' ');
/** at-rule（@font-face/@keyframes）没有选择器，用 头+正文 做键，避免互相覆盖。 */
const uniqKey = (block: Block): string => (block.atRule ? keyOf(block) + '||' + block.body : keyOf(block));

function emit(blocks: Block[]): string {
  const lines: string[] = [];
  let wrapper: string | null = null;
  for (const block of blocks) {
    if (block.wrapper !== wrapper) {
      if (wrapper !== null) lines.push('}');
      wrapper = block.wrapper;
      if (wrapper !== null) lines.push(wrapper + ' {');
    }
    lines.push(`${block.head} { ${block.body} }`);
  }
  if (wrapper !== null) lines.push('}');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const guideExists = await fs.stat(GUIDE).then(() => true).catch(() => false);
  if (!guideExists) {
    console.error('找不到 public/guide/css/app.css：合并已经完成过，guide 副本也已删除。');
    console.error('如需重跑，先从 git 历史取回该文件（git show <commit>:public/guide/css/app.css > public/guide/css/app.css）。');
    process.exit(1);
  }
  const guideText = await fs.readFile(GUIDE, 'utf8');
  const rootText = await fs.readFile(ROOT, 'utf8');
  if (!process.argv.includes('--force') && rootText.includes('合并自根站的新增块')) {
    console.error('目标文件已经是合并产物；先 git checkout public/css/app.css 再跑（或加 --force）');
    process.exit(1);
  }
  const guide = parse(guideText);
  const root = parse(rootText);
  const overrides: Record<string, string> = JSON.parse(
    await fs.readFile(OVERRIDES, 'utf8').catch(() => '{}'),
  );
  // 覆盖按选择器匹配，忽略 @media 包裹（同一个选择器可能在不同断点里各有一条）
  const overrideSel = new Set(Object.keys(overrides));
  const report = process.argv.includes('--report');

  const guideKeys = new Set(guide.map(uniqKey));
  const appendBlocks = root.filter((block) => block.atRule || !guideKeys.has(uniqKey(block)));
  const overrideBlocks = root.filter((block) => overrideSel.has(block.head));

  console.log(`guide 规则 ${guide.length} · root 规则 ${root.length}`);
  console.log(`追加 ${appendBlocks.length} 条（root 独有 + 全部 @font-face/@keyframes）· 覆盖 ${overrideBlocks.length} 条`);
  if (report) {
    console.log('\n-- 被覆盖的根站规则 --');
    for (const block of overrideBlocks) console.log(block.head);
    return;
  }

  /* 被覆盖的选择器：guide 基座里的那条必须删掉，否则旧正文仍然留在文件里
     （例如 music-fab 的旧居中算式，verify 会按「文件里不能再出现」断言）。 */
  let baseText = guideText;
  for (const selector of overrideSel) {
    // 按「选择器 + 一段不含花括号的正文」删，避免受原始换行/缩进影响
    const pattern = new RegExp(escapeRe(selector) + '\\s*\\{[^}]*\\}', 'g');
    baseText = baseText.replace(pattern, '');
  }

  /* guide 基座里引用了只存在于对象存储的全尺寸图（例如页面背景），
     这些引用要改写成 /media 前缀，否则本地根本没有这个文件。 */
  const mediaManifest: string[] = JSON.parse(
    await fs.readFile(path.resolve('public/media-manifest.json'), 'utf8').catch(() => '[]'),
  );
  const manifestSet = new Set(mediaManifest);
  const beforeMedia = baseText;
  let mediaRewrites = 0;
  baseText = baseText.replace(/url\((['"]?)(?:\.\.\/|\.\/|\/)?(images\/[^'")]+)\1\)/g, (match, quote: string, rel: string) => {
    const local = path.resolve('public', rel);
    if (existsSync(local)) return match;
    const remote = '/media/' + rel;
    if (!manifestSet.has(remote)) return match;
    mediaRewrites += 1;
    return `url(${quote || ''}${remote}${quote || ''})`;
  });
  if (beforeMedia !== baseText) console.log(`全尺寸图引用改指 /media：${mediaRewrites} 处`);

  const merged =
    baseText.trimEnd() +
    '\n\n/* ==========================================================================\n' +
    '   合并自根站的新增块（guide 里没有）：梯度点阵 / 数值条 / 像素字 / 弹药图标 / 动物页 等\n' +
    '   由 scripts/merge-css.ts 生成，改这些块请直接改本文件末尾这一段\n' +
    '   ========================================================================== */\n\n' +
    emit(appendBlocks) +
    (overrideBlocks.length
      ? '\n\n/* ---- 根站修复 / 新语义的覆盖（同特异性下最后生效） ---- */\n' + emit(overrideBlocks)
      : '') +
    '\n';

  await fs.writeFile(ROOT, merged, 'utf8');
  console.log(`写出 ${path.relative(process.cwd(), ROOT)}：${merged.split('\n').length} 行`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
