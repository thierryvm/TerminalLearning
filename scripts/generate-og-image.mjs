/**
 * generate-og-image.mjs
 * Converts public/og-image.svg → public/og-image.png at 1200×630.
 *
 * Font files (Inter 400/700 + JetBrains Mono 400) live in scripts/fonts/
 * and are committed to the repo (SIL Open Font License).
 * They are loaded explicitly so Resvg produces a deterministic PNG that
 * matches the browser rendering of the SVG exactly.
 *
 * To regenerate after editing og-image.svg:  npm run generate-og
 */
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const OG_WIDTH  = 1200;
const OG_HEIGHT = 630;

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = resolve(__dirname, '..');
const fontsDir  = resolve(__dirname, 'fonts');

const svgPath = resolve(root, 'public', 'og-image.svg');
const pngPath = resolve(root, 'public', 'og-image.png');

// Font files — Inter 4.0 + JetBrains Mono 2.304 (both SIL OFL)
// Must match the font-family declarations used in og-image.svg
const fontFiles = [
  resolve(fontsDir, 'inter-700.ttf'),
  resolve(fontsDir, 'inter-400.ttf'),
  resolve(fontsDir, 'jetbrains-mono-400.ttf'),
];

let svg;
try {
  svg = readFileSync(svgPath, 'utf-8');
} catch (err) {
  console.error(`❌ Could not read ${svgPath}: ${err.message}`);
  process.exit(1);
}

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: OG_WIDTH },
  font: {
    loadSystemFonts: false, // deterministic — only the fonts we explicitly load
    fontFiles,
  },
});

const rendered = resvg.render();
const { width, height } = rendered;

if (width !== OG_WIDTH || height !== OG_HEIGHT) {
  console.warn(`⚠️  Output ${width}×${height} ≠ expected ${OG_WIDTH}×${OG_HEIGHT}. Check og-image.svg viewBox.`);
}

const pngBuffer = rendered.asPng();

try {
  writeFileSync(pngPath, pngBuffer);
} catch (err) {
  console.error(`❌ Could not write ${pngPath}: ${err.message}`);
  process.exit(1);
}

console.log(`og-image.png generated (${width}×${height}, ${pngBuffer.length} bytes) ✅`);
