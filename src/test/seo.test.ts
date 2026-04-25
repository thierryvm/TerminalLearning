/// <reference types="node" />
/**
 * SEO, GEO, LLM-friendly, Security, Mobile static analysis tests - 2026 standards.
 * Covers: SEO/OG/Twitter/JSON-LD, GEO, LLM signals, viewport/PWA, CSP, HTTP headers.
 */

import { createHash } from 'crypto';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(__dirname, '../../');
const INDEX_HTML = join(ROOT, 'index.html');
const VERCEL_JSON = join(ROOT, 'vercel.json');
const SRC_DIR = join(ROOT, 'src');

function readHtml(): string { return readFileSync(INDEX_HTML, 'utf-8'); }
function readVercel(): Record<string, unknown> { return JSON.parse(readFileSync(VERCEL_JSON, 'utf-8')); }

function collectSrc(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) results.push(...collectSrc(full));
    else if (/\.(tsx?|jsx?)$/.test(entry)) results.push(full);
  }
  return results;
}

function getCsp(): string {
  const hdrs = readVercel().headers as Array<{ headers: Array<{ key: string; value: string }> }>;
  let result = '';
  for (const b of hdrs) for (const h of b.headers) if (h.key === 'Content-Security-Policy') result = h.value;
  return result;
}
function getHeader(key: string): string {
  const hdrs = readVercel().headers as Array<{ headers: Array<{ key: string; value: string }> }>;
  let result = '';
  for (const b of hdrs) for (const h of b.headers) if (h.key === key) result = h.value;
  return result;
}

// -- SEO meta tags -----------------------------------------------------------

describe('SEO -- index.html meta tags', () => {
  it('non-empty title', () => {
    const m = readHtml().match(/<title>(.+?)<\/title>/);
    expect(m).not.toBeNull(); expect(m![1].trim().length).toBeGreaterThan(0);
  });
  it('title has brand name', () => { expect(readHtml()).toContain('Terminal Learning'); });
  it('meta description >= 20 chars', () => {
    expect(readHtml()).toMatch(/meta\s+name="description"\s+content="[^"]{20,}"/);
  });
  it('canonical on terminallearning.dev', () => {
    expect(readHtml()).toMatch(/rel="canonical"\s+href="https:\/\/terminallearning\.dev\//);
  });
  it('robots = index, follow', () => {
    const h = readHtml(); expect(h).toContain('name="robots"'); expect(h).toContain('index, follow');
  });
  it('meta author has Thierry', () => {
    const h = readHtml(); expect(h).toContain('name="author"'); expect(h).toContain('Thierry');
  });
});

// -- Open Graph --------------------------------------------------------------

describe('SEO -- Open Graph tags', () => {
  it('og:type = website', () => {
    const h = readHtml(); expect(h).toContain('property="og:type"'); expect(h).toContain('content="website"');
  });
  it('og:title', () => { expect(readHtml()).toContain('property="og:title"'); });
  it('og:description', () => { expect(readHtml()).toContain('property="og:description"'); });
  it('og:url on terminallearning.dev', () => {
    expect(readHtml()).toMatch(/property="og:url"\s+content="https:\/\/terminallearning\.dev/);
  });
  it('og:image .png on terminallearning.dev', () => {
    expect(readHtml()).toMatch(/property="og:image"\s+content="https:\/\/terminallearning\.dev[^"]+\.png"/);
  });
  it('og:image dimensions', () => {
    const h = readHtml(); expect(h).toContain('og:image:width'); expect(h).toContain('og:image:height');
  });
  it('og:locale', () => { expect(readHtml()).toContain('og:locale'); });
  it('og:site_name', () => { expect(readHtml()).toContain('og:site_name'); });
});

// -- Twitter Card ------------------------------------------------------------

describe('SEO -- Twitter Card tags', () => {
  it('twitter:card = summary_large_image', () => {
    const h = readHtml(); expect(h).toContain('name="twitter:card"'); expect(h).toContain('summary_large_image');
  });
  it('twitter:title', () => { expect(readHtml()).toContain('name="twitter:title"'); });
  it('twitter:description', () => { expect(readHtml()).toContain('name="twitter:description"'); });
  it('twitter:image', () => { expect(readHtml()).toContain('name="twitter:image"'); });
  it('twitter:creator = @thierryvm', () => {
    const h = readHtml(); expect(h).toContain('name="twitter:creator"'); expect(h).toContain('@thierryvm');
  });
});

// -- JSON-LD -----------------------------------------------------------------

describe('SEO -- JSON-LD structured data (Schema.org)', () => {
  function extractJsonLd(): Record<string, unknown> {
    const html = readHtml();
    const m = html.match(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/);
    expect(m).not.toBeNull(); return JSON.parse(m![1]);
  }
  it('ld+json block present', () => { expect(readHtml()).toContain('application/ld+json'); });
  it('JSON-LD is valid JSON', () => { expect(() => extractJsonLd()).not.toThrow(); });
  it('@graph has >=2 nodes', () => {
    const g = extractJsonLd()['@graph'] as Array<Record<string, unknown>>;
    expect(Array.isArray(g)).toBe(true); expect(g.length).toBeGreaterThanOrEqual(2);
  });
  it('@graph contains WebSite', () => {
    const g = extractJsonLd()['@graph'] as Array<Record<string, unknown>>;
    expect(g.map((n) => n['@type'])).toContain('WebSite');
  });
  it('@graph contains SoftwareApplication or Course', () => {
    const g = extractJsonLd()['@graph'] as Array<Record<string, unknown>>;
    const t = g.map((n) => n['@type']);
    expect(t.some((v) => v === 'SoftwareApplication' || v === 'Course')).toBe(true);
  });
  it('SoftwareApplication.isAccessibleForFree = true', () => {
    const g = extractJsonLd()['@graph'] as Array<Record<string, unknown>>;
    const app = g.find((n) => n['@type'] === 'SoftwareApplication');
    expect(app?.['isAccessibleForFree']).toBe(true);
  });
});

// -- GEO ---------------------------------------------------------------------

describe('GEO -- geographic and language meta', () => {
  it('geo.region = BE', () => {
    const h = readHtml(); expect(h).toContain('name="geo.region"'); expect(h).toContain('BE');
  });
  it('language = French', () => {
    const h = readHtml(); expect(h).toContain('name="language"'); expect(h).toContain('French');
  });
  it('html[lang] = fr', () => { expect(readHtml()).toMatch(/<html[^>]+lang="fr"/); });
  it('og:locale = fr_BE', () => { expect(readHtml()).toContain('fr_BE'); });
});

// -- Mobile-first & PWA ------------------------------------------------------

describe('Mobile-first -- viewport, PWA and rendering', () => {
  it('viewport meta', () => { expect(readHtml()).toContain('name="viewport"'); });
  it('viewport width=device-width', () => {
    expect(readHtml()).toMatch(/name="viewport"\s+content="[^"]*width=device-width/);
  });
  it('viewport initial-scale=1', () => {
    expect(readHtml()).toMatch(/name="viewport"\s+content="[^"]*initial-scale=1/);
  });
  it('theme-color meta', () => { expect(readHtml()).toContain('name="theme-color"'); });
  it('color-scheme = dark', () => {
    const h = readHtml(); expect(h).toContain('name="color-scheme"'); expect(h).toContain('dark');
  });

  it('PWA manifest injected in main.tsx (skipped on Vercel preview domains)', () => {
    // manifest link is injected dynamically in main.tsx to avoid 401 on Vercel preview deployments
    const main = readFileSync(join(ROOT, 'src/main.tsx'), 'utf8');
    expect(main).toContain('manifest');
    expect(main).toContain('.webmanifest');
    expect(main).toContain('.vercel.app');
  });
  it('apple-touch-icon', () => { expect(readHtml()).toContain('rel="apple-touch-icon"'); });
  it('favicon', () => { expect(readHtml()).toContain('rel="icon"'); });
});

// -- Security: HTTP headers --------------------------------------------------

describe('Security -- HTTP headers (vercel.json)', () => {
  it('HSTS max-age >= 1 year', () => {
    const hsts = getHeader('Strict-Transport-Security');
    const m = hsts.match(/max-age=(\d+)/); expect(m).not.toBeNull();
    expect(parseInt(m![1])).toBeGreaterThanOrEqual(31536000);
  });
  it('HSTS includeSubDomains + preload', () => {
    const hsts = getHeader('Strict-Transport-Security');
    expect(hsts).toContain('includeSubDomains'); expect(hsts).toContain('preload');
  });
  it('X-Frame-Options = DENY', () => { expect(getHeader('X-Frame-Options')).toBe('DENY'); });
  it('X-Content-Type-Options = nosniff', () => { expect(getHeader('X-Content-Type-Options')).toBe('nosniff'); });
  it('Referrer-Policy set', () => { expect(getHeader('Referrer-Policy').length).toBeGreaterThan(0); });
  it('Cross-Origin-Opener-Policy = same-origin', () => {
    expect(getHeader('Cross-Origin-Opener-Policy')).toBe('same-origin');
  });
  it('Permissions-Policy: camera, mic, geolocation', () => {
    const pp = getHeader('Permissions-Policy');
    expect(pp).toContain('camera=()'); expect(pp).toContain('microphone=()'); expect(pp).toContain('geolocation=()');
  });
  it('Permissions-Policy: payment, usb', () => {
    const pp = getHeader('Permissions-Policy');
    expect(pp).toContain('payment=()'); expect(pp).toContain('usb=()');
  });
});

// -- Security: CSP -----------------------------------------------------------

describe('Security -- Content Security Policy', () => {
  it('CSP header present', () => { expect(getCsp().length).toBeGreaterThan(0); });
  it("CSP default-src 'self'", () => { expect(getCsp()).toContain("default-src 'self'"); });
  it("CSP no unsafe-eval", () => { expect(getCsp()).not.toContain("'unsafe-eval'"); });
  it("CSP frame-ancestors 'none'", () => { expect(getCsp()).toContain("frame-ancestors 'none'"); });
  it("CSP base-uri 'self'", () => { expect(getCsp()).toContain("base-uri 'self'"); });
  it("CSP form-action 'self'", () => { expect(getCsp()).toContain("form-action 'self'"); });
  it('CSP upgrade-insecure-requests', () => { expect(getCsp()).toContain('upgrade-insecure-requests'); });
  it('CSP Supabase in connect-src', () => { expect(getCsp()).toContain('supabase.co'); });
  it('CSP Sentry in connect-src', () => { expect(getCsp()).toContain('sentry.io'); });

  /**
   * Drift guard: the SHA-256 hash in vercel.json style-src MUST match the actual
   * critical CSS inline block in index.html. If index.html <style> changes, the
   * CSP hash must be recomputed or the inline style will be silently blocked in
   * prod (white flash before React hydrates). This test catches the drift in CI.
   */
  it('CSP SHA-256 hash matches critical CSS inline in index.html', () => {
    // Normalize line endings to LF — git autocrlf on Windows can produce CRLF
    // in working tree, but browsers receive the file as served by the build pipeline.
    // The browser-reported hash is computed on the bytes between <style> and </style>
    // as they appear in the served HTML (LF). We normalize here so the test result
    // is identical on Windows, macOS, Linux, and CI.
    const html = readHtml().replace(/\r\n/g, '\n');
    const m = html.match(/<style>([\s\S]*?)<\/style>/);
    expect(m, '<style> block missing in index.html').not.toBeNull();
    const css = m![1];
    const expectedHash = 'sha256-' + createHash('sha256').update(css, 'utf-8').digest('base64');
    const csps = readVercel().headers as Array<{ headers: Array<{ key: string; value: string }> }>;
    const allCspValues = csps.flatMap((b) => b.headers.filter((h) => h.key === 'Content-Security-Policy').map((h) => h.value));
    expect(allCspValues.length).toBeGreaterThan(0);
    for (const csp of allCspValues) {
      expect(csp, `CSP block missing required hash for critical CSS — recompute via: python3 -c "import hashlib, base64, re; css = re.search(r'<style>(.*?)</style>', open('index.html').read(), re.DOTALL).group(1); print('${expectedHash}')"`).toContain(expectedHash);
    }
  });
});

// -- Security: source code static analysis -----------------------------------

describe('Security -- source code static analysis', () => {
  it('no explicit any in production TypeScript', () => {
    const violations: string[] = [];
    for (const file of collectSrc(SRC_DIR)) {
      if (file.includes('.test.')) continue;
      const lines = readFileSync(file, 'utf-8').split('\n');
      lines.forEach((line: string, i: number) => {
        const t = line.trimStart();
        if (t.startsWith('//') || t.startsWith('*')) return;
        if (/:s*any/.test(line) || /ass+any/.test(line)) violations.push(file + ':' + (i + 1));
      });
    }
    expect(violations).toEqual([]);
  });
  it('no hardcoded secret key patterns (sk-/AKIA/ghp_)', () => {
    // Exclude test files — they may contain synthetic test credentials for scrubber/scanner validation
    const src = collectSrc(SRC_DIR)
      .filter((f) => !f.includes('.test.'))
      .map((f) => readFileSync(f, 'utf-8'))
      .join('\n');
    expect(/sk-[a-zA-Z0-9]{20,}/.test(src)).toBe(false);
    expect(/AKIA[A-Z0-9]{16}/.test(src)).toBe(false);
    expect(/ghp_[a-zA-Z0-9]{36}/.test(src)).toBe(false);
  });
  it('no console.log in production source files', () => {
    const violations: string[] = [];
    for (const file of collectSrc(SRC_DIR)) {
      if (file.includes('.test.') || file.includes('main.tsx')) continue;
      const lines = readFileSync(file, 'utf-8').split('\n');
      lines.forEach((line: string, i: number) => {
        if (line.trimStart().startsWith('//')) return;
        if (/console\.log\(/.test(line)) violations.push(file + ':' + (i + 1));
      });
    }
    expect(violations).toEqual([]);
  });
});

// -- LLM-friendly ------------------------------------------------------------

describe('LLM-friendly -- machine-readable signals', () => {
  it('JSON-LD for crawlers', () => { expect(readHtml()).toContain('application/ld+json'); });
  it('EducationalApplication type', () => { expect(readHtml()).toContain('EducationalApplication'); });
  it('teaches array', () => { expect(readHtml()).toContain('teaches'); });
  it('codeRepository on github.com', () => {
    const h = readHtml(); expect(h).toContain('codeRepository'); expect(h).toContain('github.com');
  });
  it('EducationalAudience defined', () => { expect(readHtml()).toContain('EducationalAudience'); });
  it('hasCourseInstance with online mode', () => {
    const h = readHtml(); expect(h).toContain('hasCourseInstance'); expect(h).toContain('online');
  });
});
