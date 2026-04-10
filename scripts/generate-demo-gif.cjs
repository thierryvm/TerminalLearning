/**
 * generate-demo-gif.cjs
 * Captures the landing page environment-switching animation and saves it as
 * public/demo.gif for use in the README.
 *
 * Usage:
 *   npm run generate-demo
 *
 * Options (env vars):
 *   DEMO_URL   — URL to record (default: https://terminal-learning.vercel.app)
 *   DEMO_WIDTH — Viewport width in px (default: 1280)
 *   DEMO_FPS   — Frames per second (default: 5)
 *
 * Requirements: npm install (gif-encoder-2 + pngjs are devDependencies)
 * Note: a local dev server is NOT required — targets the live site by default.
 */

'use strict';

const { chromium } = require('playwright');
const GIFEncoder = require('gif-encoder-2');
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const URL    = process.env.DEMO_URL    || 'https://terminal-learning.vercel.app';
const WIDTH  = parseInt(process.env.DEMO_WIDTH  || '960',  10);
const FPS    = parseInt(process.env.DEMO_FPS    || '10',   10);
const DELAY  = Math.round(1000 / FPS); // ms per frame
const HEIGHT = parseInt(process.env.DEMO_HEIGHT || String(Math.round(WIDTH * (3 / 4))), 10); // 4:3 — shows env switcher + module cards
const SCROLL = parseInt(process.env.DEMO_SCROLL || '80',   10); // px to scroll after load (reveals terminal cards)
const OUTPUT = path.join(__dirname, '..', 'public', process.env.DEMO_OUTPUT || 'demo.gif');

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function captureFrame(page) {
  const buf = await page.screenshot({ type: 'png' });
  const png = PNG.sync.read(buf);
  return png.data; // raw RGBA Buffer accepted by GIFEncoder.addFrame()
}

/** Take `count` frames, sleeping DELAY ms between each. */
async function record(page, count) {
  const frames = [];
  for (let i = 0; i < count; i++) {
    frames.push(await captureFrame(page));
    if (i < count - 1) await sleep(DELAY);
  }
  return frames;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🎬 Terminal Learning — Demo GIF Generator');
  console.log(`   URL    : ${URL}`);
  console.log(`   Size   : ${WIDTH}×${HEIGHT} px`);
  console.log(`   FPS    : ${FPS} (${DELAY}ms/frame)`);
  console.log(`   Output : ${OUTPUT}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

  console.log('⏳ Loading page...');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30_000 });
  await sleep(1200); // let Motion animations settle
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), SCROLL);

  const allFrames = [];

  // ── 1. Linux (default) — 1.6s ──────────────────────────────────────────────
  process.stdout.write('📸 Linux     ');
  allFrames.push(...await record(page, 8));
  console.log(`→ ${allFrames.length} frames`);

  // ── 2. Switch → macOS ──────────────────────────────────────────────────────
  process.stdout.write('📸 → macOS   ');
  await page.click('button:has-text("macOS")');
  await sleep(80); // let click animation start
  allFrames.push(...await record(page, 10));
  console.log(`→ ${allFrames.length} frames`);

  // ── 3. Switch → Windows ────────────────────────────────────────────────────
  process.stdout.write('📸 → Windows ');
  await page.click('button:has-text("Windows")');
  await sleep(80);
  allFrames.push(...await record(page, 10));
  console.log(`→ ${allFrames.length} frames`);

  // ── 4. Back → Linux ────────────────────────────────────────────────────────
  process.stdout.write('📸 → Linux   ');
  await page.click('button:has-text("Linux")');
  await sleep(80);
  allFrames.push(...await record(page, 8));
  console.log(`→ ${allFrames.length} frames`);

  await browser.close();

  // ── Encode GIF ─────────────────────────────────────────────────────────────
  console.log(`\n🎞  Encoding ${allFrames.length} frames...`);

  const encoder = new GIFEncoder(WIDTH, HEIGHT, 'octree', true, allFrames.length);
  encoder.setDelay(DELAY);
  encoder.setQuality(12);    // 1 = best/slowest, 30 = fastest/roughest
  encoder.setThreshold(5);   // skip re-encoding frames with < 5% color change
  encoder.setRepeat(0);      // loop forever
  encoder.start();

  for (let i = 0; i < allFrames.length; i++) {
    process.stdout.write(`\r   Frame ${i + 1}/${allFrames.length}`);
    encoder.addFrame(allFrames[i]);
  }

  encoder.finish();

  const buffer = encoder.out.getData();
  fs.writeFileSync(OUTPUT, buffer);

  const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
  console.log(`\n\n✅ Saved → ${OUTPUT}`);
  console.log(`   Size   : ${sizeMB} MB (${allFrames.length} frames)`);

  if (parseFloat(sizeMB) > 6) {
    console.log('\n⚠  File is large for a README GIF. To reduce size:');
    console.log('   • Lower resolution: DEMO_WIDTH=960 npm run generate-demo');
    console.log('   • Fewer FPS:        DEMO_FPS=4   npm run generate-demo');
  }

  console.log('\nNext steps:');
  console.log('  1. Check the GIF: open public/demo.gif');
  console.log('  2. If satisfied, update README.md:');
  console.log('     Replace <!-- screenshot --> with:');
  console.log('     ![Terminal Learning — environment switching demo](public/demo.gif)');
  console.log('  3. Commit: git add public/demo.gif README.md');
}

main().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
