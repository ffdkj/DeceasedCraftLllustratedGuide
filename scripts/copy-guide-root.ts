import { cpSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const src = path.resolve('public/guide');
const out = path.resolve('dist/client');
if (!existsSync(path.join(src, 'index.html'))) {
  console.log('guide root: public/guide/index.html not found, skip');
} else {
  for (const entry of readdirSync(src)) {
    cpSync(path.join(src, entry), path.join(out, entry), { recursive: true, force: true });
  }
  console.log('guide root: copied public/guide -> dist/client');
}
