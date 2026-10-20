// Sinh icon PNG cho PWA / iPhone từ public/favicon.svg.
// Chạy: npm run icons (chỉ cần chạy lại khi đổi favicon.svg).
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const svg = await readFile(new URL('../public/favicon.svg', import.meta.url));
const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname;

const targets = [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
];

for (const [name, size] of targets) {
  // iOS không hỗ trợ icon trong suốt → làm phẳng lên nền kem.
  await sharp(svg, { density: 384 }).resize(size, size).flatten({ background: '#f6dcc0' }).png().toFile(out(name));
  console.log(`✓ public/${name} (${size}×${size})`);
}
