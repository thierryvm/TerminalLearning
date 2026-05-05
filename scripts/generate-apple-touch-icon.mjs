/**
 * generate-apple-touch-icon.mjs
 * Converts public/apple-touch-icon-source.svg → public/apple-touch-icon.png
 * at 180×180 (Apple HIG requirement for iOS home-screen icons).
 *
 * The source SVG has a fully opaque background (`#0d1117`). iOS auto-applies
 * a rounded-corner mask, so we MUST NOT include transparency in the PNG —
 * otherwise the iPhone wallpaper bleeds through the corners.
 *
 * To regenerate after editing apple-touch-icon-source.svg:
 *   npm run icons:apple
 *
 * Same render pipeline as scripts/generate-og-image.mjs (resvg-js, no system
 * fonts needed for this glyph-free icon).
 */
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ICON_SIZE = 180;

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const svgPath = resolve(root, 'public', 'apple-touch-icon-source.svg');
const pngPath = resolve(root, 'public', 'apple-touch-icon.png');

let svg;
try {
  svg = readFileSync(svgPath, 'utf-8');
} catch (err) {
  console.error(`❌ Could not read ${svgPath}: ${err.message}`);
  process.exit(1);
}

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: ICON_SIZE },
  // The icon is glyph-free (rect + path), so no font loading is needed.
});

const rendered = resvg.render();
const { width, height } = rendered;

if (width !== ICON_SIZE || height !== ICON_SIZE) {
  console.warn(
    `⚠️  Output ${width}×${height} ≠ expected ${ICON_SIZE}×${ICON_SIZE}. Check apple-touch-icon-source.svg viewBox.`,
  );
}

const pngBuffer = rendered.asPng();

try {
  writeFileSync(pngPath, pngBuffer);
} catch (err) {
  console.error(`❌ Could not write ${pngPath}: ${err.message}`);
  process.exit(1);
}

console.log(
  `apple-touch-icon.png generated (${width}×${height}, ${pngBuffer.length} bytes) ✅`,
);
