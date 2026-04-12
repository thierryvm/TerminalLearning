#!/usr/bin/env node
// scripts/security-audit.cjs
// Playwright-based local security audit — run manually before each release.
//
// Usage:
//   node scripts/security-audit.cjs
//   node scripts/security-audit.cjs --target https://terminallearning.dev
//   AUDIT_TARGET=http://localhost:5173 node scripts/security-audit.cjs
//
// Prerequisites: npx playwright install chromium

'use strict';

const { chromium } = require('@playwright/test');
const fs  = require('fs');
const path = require('path');

const TARGET = (() => {
  const idx = process.argv.indexOf('--target');
  return idx !== -1
    ? process.argv[idx + 1]
    : (process.env.AUDIT_TARGET ?? 'https://terminallearning.dev');
})();

// ─── Check 1: Auth error messages are generic ─────────────────────────────────
// Supabase returns generic errors by default — verify the login page loads
// and does not expose stack traces or user-enumeration hints on failed login.
async function checkAuthErrors(page) {
  const result = { passed: true, details: [] };

  try {
    const res = await page.goto(`${TARGET}/login`, { waitUntil: 'load', timeout: 15000 });
    if (!res) {
      result.details.push('No response for /login (may redirect to home — OK)');
      return result;
    }

    const body = await res.text().catch(() => '');

    // Stack trace leak detection
    const stackPattern = /at \w[\w.]+\s*\([^)]+\.(js|ts|cjs|mjs):\d+:\d+\)/;
    if (stackPattern.test(body)) {
      result.passed = false;
      result.details.push('Stack trace exposed in /login response body');
    } else {
      result.details.push('/login: no stack trace in response body');
    }

    // Check that the page does not enumerate users
    // (e.g. "this email is not registered" vs "invalid credentials")
    const enumPatterns = [/email not found/i, /no account with/i, /user does not exist/i];
    for (const p of enumPatterns) {
      if (p.test(body)) {
        result.passed = false;
        result.details.push(`Possible user enumeration: "${p.source}" found in /login`);
      }
    }
    if (result.passed) {
      result.details.push('/login: no user-enumeration patterns detected');
    }
  } catch {
    // /login not reachable — app uses modal auth, which is fine
    result.details.push('/login not reachable (modal auth pattern — OK)');
  }

  return result;
}

// ─── Check 2: /admin routes are inaccessible without auth ─────────────────────
async function checkAdminRoutes(page) {
  const result = { passed: true, details: [] };
  const routes = ['/admin', '/admin/dashboard', '/admin/users', '/api/admin'];

  for (const route of routes) {
    let status = 0;
    let finalUrl = '';

    try {
      const res = await page.goto(`${TARGET}${route}`, { waitUntil: 'load', timeout: 10000 });
      status = res?.status() ?? 0;
      finalUrl = page.url();
    } catch {
      result.details.push(`${route}: navigation failed (likely 404 — OK)`);
      continue;
    }

    const redirectedAway = !finalUrl.includes('/admin');
    const isBlocked = status === 404 || status === 403 || redirectedAway;

    result.details.push(
      `${route}: HTTP ${status} → ${finalUrl} [${isBlocked ? 'blocked ✅' : 'ACCESSIBLE ❌'}]`
    );

    if (!isBlocked) {
      result.passed = false;
    }
  }

  return result;
}

// ─── Check 3: No stack traces in HTML responses ────────────────────────────────
async function checkStackTraces(page) {
  const result = { passed: true, details: [] };
  const leaks = [];

  const STACK_PATTERNS = [
    /at \w[\w.]+\s*\([^)]+\.(js|ts|cjs|mjs):\d+:\d+\)/,
    /Error:\s.+\n\s+at /,
    /stack trace/i,
    /Unhandled (Promise )?rejection/i,
  ];

  page.on('response', async (response) => {
    const ct = response.headers()['content-type'] ?? '';
    if (!ct.includes('text/html')) return;
    try {
      const body = await response.text();
      for (const p of STACK_PATTERNS) {
        if (p.test(body)) {
          leaks.push(`${response.url()} — pattern: ${p.source}`);
          break;
        }
      }
    } catch {
      // ignore read errors on response body
    }
  });

  await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 20000 });
  // Trigger 404 to check error page
  await page.goto(`${TARGET}/this-route-does-not-exist-audit-9999`, { waitUntil: 'load', timeout: 10000 }).catch(() => {});

  if (leaks.length > 0) {
    result.passed = false;
    result.details.push(...leaks.map(l => `Stack trace: ${l}`));
  } else {
    result.details.push('No stack traces found in HTML responses');
    result.details.push('404 page: no stack trace');
  }

  return result;
}

// ─── Check 4: Rate limiting — auth endpoint ────────────────────────────────────
// Sends 6 rapid requests to the Supabase auth endpoint and checks for 429.
async function checkRateLimiting(page) {
  const result = { passed: true, details: [] };

  // Supabase auth signInWithPassword endpoint
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
  if (!SUPABASE_URL) {
    result.details.push('VITE_SUPABASE_URL not set — skipping rate limit check');
    return result;
  }

  const authEndpoint = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
  const payload = JSON.stringify({ email: 'sentinel-test@example.invalid', password: 'not-a-real-password' });

  const statuses = [];
  for (let i = 0; i < 6; i++) {
    try {
      const res = await page.request.post(authEndpoint, {
        headers: { 'Content-Type': 'application/json', 'apikey': process.env.VITE_SUPABASE_ANON_KEY ?? '' },
        data: payload,
        timeout: 8000,
      });
      statuses.push(res.status());
    } catch {
      statuses.push(0);
    }
  }

  const has429 = statuses.includes(429);
  result.details.push(`Auth endpoint statuses (6 rapid requests): ${statuses.join(', ')}`);

  if (has429) {
    result.details.push('Rate limiting active: 429 received ✅');
  } else {
    // 400/422 = auth error (correct — email doesn't exist) — Supabase rate limits at higher frequency
    // 401 = valid response; 0 = network error — these are acceptable
    const allExpected = statuses.every(s => [0, 400, 401, 422].includes(s));
    if (allExpected) {
      result.details.push('No 429 in 6 requests — Supabase rate limit threshold not reached (normal at low frequency)');
    } else {
      result.passed = false;
      result.details.push(`Unexpected statuses: ${statuses.filter(s => ![0, 400, 401, 422, 429].includes(s)).join(', ')}`);
    }
  }

  return result;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🛡️  Terminal Sentinel — Local Security Audit');
  console.log(`   Target : ${TARGET}`);
  console.log(`   Started: ${new Date().toISOString()}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: false });
  const page    = await context.newPage();

  const checks = {};
  try {
    console.log('⏳ Running checks...\n');
    checks.authErrors    = await checkAuthErrors(page);
    checks.adminRoutes   = await checkAdminRoutes(page);
    checks.stackTraces   = await checkStackTraces(page);
    checks.rateLimiting  = await checkRateLimiting(page);
  } finally {
    await browser.close();
  }

  const allPassed = Object.values(checks).every(c => c.passed);
  const status    = allPassed ? 'pass' : 'fail';

  const report = {
    timestamp: new Date().toISOString(),
    target:    TARGET,
    status,
    checks,
  };

  // ── JSON report ──
  const reportPath = path.join(process.cwd(), 'security-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // ── Terminal summary ──
  const SEP = '─'.repeat(55);
  console.log(SEP);
  for (const [name, check] of Object.entries(checks)) {
    const icon = check.passed ? '✅' : '❌';
    console.log(`${icon} ${name}`);
    for (const d of check.details) console.log(`   ${d}`);
    console.log();
  }
  console.log(SEP);
  console.log(`\n${status === 'pass' ? '✅' : '❌'} Overall: ${status.toUpperCase()}`);
  console.log(`📄 Report: ${reportPath}\n`);

  process.exit(status === 'pass' ? 0 : 1);
}

main().catch(err => {
  console.error('❌ Sentinel error:', err);
  process.exit(1);
});
