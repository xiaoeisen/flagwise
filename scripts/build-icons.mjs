/** Renders public/icons/icon.svg into the PNG sizes the web manifest and iOS need. */
import fs from 'node:fs';
import sharp from 'sharp';

const svg = fs.readFileSync('public/icons/icon.svg');
const out = (name, size, opts = {}) =>
  sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(`public/icons/${name}`)
    .then(() => console.log('wrote', name));

await out('icon-192.png', 192);
await out('icon-512.png', 512);
await out('apple-touch-icon.png', 180);

// Maskable icons need a safe zone: shrink the artwork to 80% on a solid background.
const inner = await sharp(svg, { density: 384 }).resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0D1B2E' } })
  .composite([{ input: inner, gravity: 'centre' }])
  .png()
  .toFile('public/icons/icon-maskable-512.png');
console.log('wrote icon-maskable-512.png');
