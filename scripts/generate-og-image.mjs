import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const svgPath = resolve(root, 'public', 'og-image.svg');
const pngPath = resolve(root, 'public', 'og-image.png');

let svg;
try {
  svg = readFileSync(svgPath, 'utf-8');
} catch (err) {
  console.error(`❌ Could not read ${svgPath}: ${err.message}`);
  process.exit(1);
}

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: OG_WIDTH },
  font: { loadSystemFonts: false },
});

const rendered = resvg.render();
const { width, height } = rendered;
if (width !== OG_WIDTH || height !== OG_HEIGHT) {
  console.warn(`⚠️  Output dimensions ${width}×${height} differ from expected ${OG_WIDTH}×${OG_HEIGHT}. Check og-image.svg viewBox.`);
}

const pngBuffer = rendered.asPng();

try {
  writeFileSync(pngPath, pngBuffer);
} catch (err) {
  console.error(`❌ Could not write ${pngPath}: ${err.message}`);
  process.exit(1);
}

console.log(`og-image.png generated (${width}×${height}, ${pngBuffer.length} bytes) ✅`);
