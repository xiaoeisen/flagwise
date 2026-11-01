/**
 * Turns the single-file Vite build into a fragment that the artifact host can wrap
 * (it supplies <!doctype>, <html>, <head> and <body> itself).
 * Output: dist-artifact/index.html (the fragment) and dist-artifact/flags/*.svg.
 */
import fs from 'node:fs';

const file = 'dist-artifact/index.html';
const html = fs.readFileSync(file, 'utf8');

const all = (re) => [...html.matchAll(re)].map((m) => m[0]);
const title = all(/<title>[\s\S]*?<\/title>/g)[0] ?? '<title>Flagwise</title>';
const links = all(/<link\b[^>]*rel="(?:stylesheet|preconnect)"[^>]*>/g);
const styles = all(/<style\b[\s\S]*?<\/style>/g);
const scripts = all(/<script\b[\s\S]*?<\/script>/g);
const mountPoint = '<div id="app"></div>';

const fragment = [
  title,
  '<meta name="claude:viewport-fit-sides" content="cover">',
  ...links,
  ...styles,
  mountPoint,
  ...scripts,
].join('\n');

fs.writeFileSync(file, fragment);
console.log(`artifact fragment: ${Math.round(fragment.length / 1024)} KB, ${styles.length} style, ${scripts.length} script`);
