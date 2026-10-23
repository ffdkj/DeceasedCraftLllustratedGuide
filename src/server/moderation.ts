import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Node = { next: Map<string, Node>; word?: string };
const root: Node = { next: new Map() };
let loaded = false;

function normalize(text: string) {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}_]+/gu, '');
}

function load() {
  if (loaded) return;
  loaded = true;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(process.cwd(), 'public/data/blocked-words.txt'),
    path.resolve(here, '../../public/data/blocked-words.txt'),
    path.resolve(here, '../public/data/blocked-words.txt'),
    path.resolve(process.cwd(), 'dist/client/data/blocked-words.txt')
  ];
  const file = candidates.find((p) => existsSync(p));
  let words: string[] = [];
  try {
    if (file) words = readFileSync(file, 'utf8').split(/\r?\n/).map((w) => w.trim()).filter(Boolean);
  } catch {}
  for (const raw of words) {
    const w = normalize(raw);
    if (w.length < 2) continue;
    let node = root;
    for (const ch of w) {
      let next = node.next.get(ch);
      if (!next) { next = { next: new Map() }; node.next.set(ch, next); }
      node = next;
    }
    node.word = raw;
  }
}

export function checkText(text: string) {
  load();
  const normalized = normalize(text);
  const hits = new Set<string>();
  for (let i = 0; i < normalized.length; i++) {
    let node = root;
    for (let j = i; j < normalized.length; j++) {
      const next = node.next.get(normalized[j]);
      if (!next) break;
      node = next;
      if (node.word) { hits.add(node.word); break; }
    }
  }
  return { ok: hits.size === 0, hits: [...hits].slice(0, 10), normalized };
}
