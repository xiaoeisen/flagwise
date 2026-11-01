/**
 * Copies the flags used by the quiz from the flag-icons package into public/flags,
 * optimized with SVGO. Run after editing src/domain/data/countries.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { optimize } from 'svgo';

const data = fs.readFileSync('src/domain/data/countries.ts', 'utf8');
const codes = [...data.matchAll(/code: "([a-z]{2})"/g)].map((m) => m[1]);
fs.mkdirSync('public/flags', { recursive: true });

let bytes = 0;
for (const code of codes) {
  const src = path.join('node_modules/flag-icons/flags/4x3', `${code}.svg`);
  if (!fs.existsSync(src)) {
    console.error(`Missing flag for ${code}`);
    process.exitCode = 1;
    continue;
  }
  const { data: svg } = optimize(fs.readFileSync(src, 'utf8'), { multipass: true, plugins: ['preset-default'] });
  fs.writeFileSync(path.join('public/flags', `${code}.svg`), svg);
  bytes += svg.length;
}
console.log(`${codes.length} flags, ${Math.round(bytes / 1024)} KB`);
