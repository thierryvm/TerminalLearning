import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const svgPath = resolve(root, 'public', 'og-image.svg');
const pngPath = resolve(root, 'public', 'og-image.png');

const svg = readFileSync(svgPath, 'utf-8');

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: { loadSystemFonts: false },
});

const pngBuffer = resvg.render().asPng();
writeFileSync(pngPath, pngBuffer);

console.log(`og-image.png generated (${pngBuffer.length} bytes) ✅`);
