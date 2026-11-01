/**
 * Enforces the dependency rule from docs/ARCHITECTURE.md:
 *
 *   ui  ->  app  ->  domain
 *            |         ^
 *            +-> services (ports and adapters)
 *
 * Inner layers must not import outer ones, and domain/app must not touch browser globals.
 * Exits non-zero on any violation so it can run in CI or a pre-commit hook.
 */
import fs from 'node:fs';
import path from 'node:path';

const RULES = {
  domain: { forbidImports: ['app', 'ui', 'services'], forbidGlobals: ['document', 'window', 'localStorage', 'navigator', 'location'] },
  app: { forbidImports: ['ui'], forbidGlobals: ['document', 'window', 'localStorage', 'navigator', 'location'] },
  services: { forbidImports: ['ui', 'app'], forbidGlobals: [] },
  ui: { forbidImports: [], forbidGlobals: [] },
};

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

let problems = 0;
for (const [layer, rule] of Object.entries(RULES)) {
  const root = path.join('src', layer);
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root).filter((f) => f.endsWith('.ts'))) {
    const code = stripComments(fs.readFileSync(file, 'utf8'));
    for (const m of code.matchAll(/from\s+'(\.[^']+)'/g)) {
      const target = path.relative('src', path.resolve(path.dirname(file), m[1])).split(path.sep)[0];
      if (rule.forbidImports.includes(target)) {
        console.error(`${file}: "${layer}" must not import from "${target}" (${m[1]})`);
        problems++;
      }
    }
    for (const g of rule.forbidGlobals) {
      if (new RegExp(`(?<![\\w.])${g}\\b(?!\\s*:)`).test(code)) {
        console.error(`${file}: "${layer}" must not use browser global "${g}"`);
        problems++;
      }
    }
  }
}
if (problems) {
  console.error(`\n${problems} layer violation(s)`);
  process.exit(1);
}
console.log('layers ok');
