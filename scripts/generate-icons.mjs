/**
 * Generates all PWA icons from the base SVG.
 * Usage: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')));
const PROJECT = join(ROOT, '..');
const SVG = readFileSync(join(PROJECT, 'public', 'images', 'inmogrid-icon.svg'));

const targets = [
  // Next.js file-based favicon
  { path: 'src/app/icon.png', size: 128 },
  // Android
  { path: 'public/images/android/android-launchericon-48-48.png', size: 48 },
  { path: 'public/images/android/android-launchericon-72-72.png', size: 72 },
  { path: 'public/images/android/android-launchericon-96-96.png', size: 96 },
  { path: 'public/images/android/android-launchericon-144-144.png', size: 144 },
  { path: 'public/images/android/android-launchericon-192-192.png', size: 192 },
  { path: 'public/images/android/android-launchericon-512-512.png', size: 512 },
  // iOS
  { path: 'public/images/ios/16.png', size: 16 },
  { path: 'public/images/ios/20.png', size: 20 },
  { path: 'public/images/ios/29.png', size: 29 },
  { path: 'public/images/ios/32.png', size: 32 },
  { path: 'public/images/ios/40.png', size: 40 },
  { path: 'public/images/ios/50.png', size: 50 },
  { path: 'public/images/ios/57.png', size: 57 },
  { path: 'public/images/ios/58.png', size: 58 },
  { path: 'public/images/ios/60.png', size: 60 },
  { path: 'public/images/ios/72.png', size: 72 },
  { path: 'public/images/ios/76.png', size: 76 },
  { path: 'public/images/ios/80.png', size: 80 },
  { path: 'public/images/ios/87.png', size: 87 },
  { path: 'public/images/ios/100.png', size: 100 },
  { path: 'public/images/ios/114.png', size: 114 },
  { path: 'public/images/ios/120.png', size: 120 },
  { path: 'public/images/ios/128.png', size: 128 },
  { path: 'public/images/ios/144.png', size: 144 },
  { path: 'public/images/ios/152.png', size: 152 },
  { path: 'public/images/ios/167.png', size: 167 },
  { path: 'public/images/ios/180.png', size: 180 },
  { path: 'public/images/ios/192.png', size: 192 },
  { path: 'public/images/ios/256.png', size: 256 },
  { path: 'public/images/ios/512.png', size: 512 },
  { path: 'public/images/ios/1024.png', size: 1024 },
];

async function generate() {
  for (const { path: relPath, size } of targets) {
    const outPath = join(PROJECT, relPath);
    const dir = dirname(outPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    await sharp(SVG)
      .resize(size, size)
      .png()
      .toFile(outPath);

    console.log(`  ${size}x${size} -> ${relPath}`);
  }
  console.log(`\nDone! Generated ${targets.length} icons.`);
}

generate().catch(console.error);
