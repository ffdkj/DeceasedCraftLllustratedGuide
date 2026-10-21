import { promises as fs } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST = path.resolve('dist/client');
const EXT = new Set(['.html', '.js', '.css', '.json', '.svg', '.webmanifest']);

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

async function newer(src: string, target: string): Promise<boolean> {
  try {
    const [a, b] = await Promise.all([fs.stat(src), fs.stat(target)]);
    return b.mtimeMs >= a.mtimeMs;
  } catch {
    return false;
  }
}

async function main() {
  const files = (await walk(DIST)).filter((f) => EXT.has(path.extname(f).toLowerCase()));
  let wrote = 0;
  let bytes = 0;

  for (const file of files) {
    const input = await fs.readFile(file);
    const br = file + '.br';
    const gz = file + '.gz';

    if (!(await newer(file, br))) {
      const out = zlib.brotliCompressSync(input, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
          [zlib.constants.BROTLI_PARAM_SIZE_HINT]: input.length
        }
      });
      await fs.writeFile(br, out);
      wrote++;
      bytes += out.length;
    }
    if (!(await newer(file, gz))) {
      const out = zlib.gzipSync(input, { level: 9 });
      await fs.writeFile(gz, out);
      wrote++;
      bytes += out.length;
    }
  }

  console.log(`precompressed ${files.length} files -> ${wrote} sidecars, ${(bytes / 1048576).toFixed(2)}MB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
