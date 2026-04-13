/**
 * generate-demo-terminal-gif.cjs — Terminal preview demo
 *
 * Captures the animated terminal preview on the landing page (auto-typing
 * commands) and saves it as public/demo-terminal.gif for use in the README.
 *
 * The TerminalPreview component auto-types commands like pwd, ls, cd, etc.
 * This script scrolls to it and records the full animation cycle.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  Usage                                                              │
 * │                                                                     │
 * │    npm run generate-demo:terminal                                   │
 * │    npm run generate-demo:all          # both landing + terminal     │
 * │                                                                     │
 * │  Options (env vars)                                                 │
 * │                                                                     │
 * │    DEMO_URL     Target URL       (default: https://terminallearning.dev)
 * │    DEMO_WIDTH   Viewport width   (default: 1280)                    │
 * │    DEMO_HEIGHT  Viewport height  (default: 720, 16:9 ratio)        │
 * │    DEMO_FPS     Frames/second    (default: 10)                      │
 * │    DEMO_DURATION Recording secs  (default: 12)                      │
 * │    DEMO_OUTPUT  Output filename  (default: demo-terminal.gif)       │
 * │                                                                     │
 * │  Requirements                                                       │
 * │                                                                     │
 * │    npm install   (playwright, gif-encoder-2, pngjs are devDeps)     │
 * │    npx playwright install chromium   (if not already installed)      │
 * │                                                                     │
 * │  File location: scripts/generate-demo-terminal-gif.cjs              │
 * │  Output:        public/demo-terminal.gif                            │
 * └──────────────────────────────────────────────────────────────────────┘
 */

'use strict';

const { chromium } = require('playwright');
const GIFEncoder = require('gif-encoder-2');
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const URL      = process.env.DEMO_URL      || 'https://terminallearning.dev';
const WIDTH    = parseInt(process.env.DEMO_WIDTH    || '1280', 10);
const HEIGHT   = parseInt(process.env.DEMO_HEIGHT   || '720',  10);
const FPS      = parseInt(process.env.DEMO_FPS      || '10',   10);
const DURATION = parseInt(process.env.DEMO_DURATION || '12',   10);
const DELAY    = Math.round(1000 / FPS);
const OUTPUT   = path.join(__dirname, '..', 'public', process.env.DEMO_OUTPUT || 'demo-terminal.gif');

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function captureFrame(page) {
  const buf = await page.screenshot({ type: 'png' });
  const png = PNG.sync.read(buf);
  return png.data;
}

function encodeGif(frames, width, height, delay, outputPath) {
  const encoder = new GIFEncoder(width, height, 'octree', true, frames.length);
  encoder.setDelay(delay);
  encoder.setQuality(10);
  encoder.setThreshold(5);
  encoder.setRepeat(0);
  encoder.start();

  for (let i = 0; i < frames.length; i++) {
    process.stdout.write(`\r   Frame ${i + 1}/${frames.length}`);
    encoder.addFrame(frames[i]);
  }

  encoder.finish();

  const buffer = encoder.out.getData();
  fs.writeFileSync(outputPath, buffer);

  const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
  console.log(`\n\n   Saved → ${outputPath}`);
  console.log(`   Size  : ${sizeMB} MB (${frames.length} frames)`);

  if (parseFloat(sizeMB) > 5) {
    console.log('\n   File is large. To reduce: DEMO_WIDTH=960 or DEMO_FPS=6');
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const totalFrames = DURATION * FPS;

  console.log('  Terminal Learning — Terminal Preview GIF Generator');
  console.log(`   URL      : ${URL}`);
  console.log(`   Size     : ${WIDTH}x${HEIGHT} px`);
  console.log(`   FPS      : ${FPS} (${DELAY}ms/frame)`);
  console.log(`   Duration : ${DURATION}s (~${totalFrames} frames)`);
  console.log(`   Output   : ${OUTPUT}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

  // Navigate to landing page
  console.log('   Loading page...');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30_000 });
  await sleep(1500);

  // Scroll to the terminal preview component
  const terminalPreview = page.locator('[data-testid="terminal-preview"]');
  await terminalPreview.waitFor({ state: 'visible', timeout: 10_000 });
  await terminalPreview.scrollIntoViewIfNeeded();
  await sleep(500);

  // Center the terminal in the viewport
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="terminal-preview"]');
    if (el) {
      const rect = el.getBoundingClientRect();
      const offset = window.scrollY + rect.top - (window.innerHeight - rect.height) / 2;
      window.scrollTo({ top: Math.max(0, offset), behavior: 'instant' });
    }
  });
  await sleep(300);

  // ── Record the auto-typing animation ────────────────────────────────────────
  console.log(`   Recording ${DURATION}s of terminal animation...`);
  const allFrames = [];

  for (let i = 0; i < totalFrames; i++) {
    allFrames.push(await captureFrame(page));

    const elapsed = ((i + 1) * DELAY / 1000).toFixed(1);
    process.stdout.write(`\r   ${elapsed}s / ${DURATION}s (${i + 1} frames)`);

    if (i < totalFrames - 1) await sleep(DELAY);
  }

  console.log('');
  await browser.close();

  // ── Encode GIF ──────────────────────────────────────────────────────────────
  console.log(`\n   Encoding ${allFrames.length} frames...`);
  encodeGif(allFrames, WIDTH, HEIGHT, DELAY, OUTPUT);
}

main().catch((err) => {
  console.error('\n   Error:', err.message);
  process.exit(1);
});
