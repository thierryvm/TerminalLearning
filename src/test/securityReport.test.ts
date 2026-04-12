import { describe, it, expect } from 'vitest';
import {
  parseNpmAudit,
  parseHeaders,
  scoreAudit,
  formatSummary,
  type AuditReport,
} from '../lib/securityReport';

// ─── parseNpmAudit ────────────────────────────────────────────────────────────

describe('parseNpmAudit', () => {
  it('parses a JSON with vulnerabilities', () => {
    const json = JSON.stringify({
      metadata: { vulnerabilities: { critical: 1, high: 2, moderate: 3, low: 4, info: 0, total: 10 } },
    });
    expect(parseNpmAudit(json)).toEqual({ critical: 1, high: 2, moderate: 3, low: 4, info: 0, total: 10 });
  });

  it('returns zeros for a clean audit', () => {
    const json = JSON.stringify({
      metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0 } },
    });
    expect(parseNpmAudit(json)).toEqual({ critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0 });
  });

  it('returns zeros for invalid JSON', () => {
    expect(parseNpmAudit('not json')).toEqual({ critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0 });
  });

  it('returns zeros for missing metadata key', () => {
    expect(parseNpmAudit('{}')).toEqual({ critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0 });
  });

  it('handles partial vulnerability object', () => {
    const json = JSON.stringify({ metadata: { vulnerabilities: { critical: 2 } } });
    const result = parseNpmAudit(json);
    expect(result.critical).toBe(2);
    expect(result.high).toBe(0);
    expect(result.total).toBe(0);
  });
});

// ─── parseHeaders ────────────────────────────────────────────────────────────

describe('parseHeaders', () => {
  const allHeaders = {
    'Content-Security-Policy':    "default-src 'self'",
    'Strict-Transport-Security':  'max-age=63072000; includeSubDomains; preload',
    'X-Frame-Options':            'DENY',
    'X-Content-Type-Options':     'nosniff',
    'Referrer-Policy':            'strict-origin-when-cross-origin',
  };

  it('detects all 5 headers', () => {
    const result = parseHeaders(allHeaders);
    expect(result.csp).toBe(true);
    expect(result.hsts).toBe(true);
    expect(result.xFrameOptions).toBe(true);
    expect(result.xContentTypeOptions).toBe(true);
    expect(result.referrerPolicy).toBe(true);
    expect(result.score).toBe(5);
  });

  it('returns score 0 for empty headers', () => {
    const result = parseHeaders({});
    expect(result.csp).toBe(false);
    expect(result.hsts).toBe(false);
    expect(result.score).toBe(0);
  });

  it('is case-insensitive', () => {
    const result = parseHeaders({ 'content-security-policy': "default-src 'self'" });
    expect(result.csp).toBe(true);
  });

  it('counts partial headers correctly', () => {
    const result = parseHeaders({ 'Strict-Transport-Security': 'max-age=31536000' });
    expect(result.hsts).toBe(true);
    expect(result.csp).toBe(false);
    expect(result.score).toBe(1);
  });
});

// ─── scoreAudit ──────────────────────────────────────────────────────────────

describe('scoreAudit', () => {
  const cleanNpm = { critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0 };
  const goodHeaders = {
    csp: true, hsts: true, xFrameOptions: true, xContentTypeOptions: true, referrerPolicy: true, score: 5,
  };

  it('returns pass when npm and headers are clean', () => {
    expect(scoreAudit(cleanNpm, goodHeaders)).toBe('pass');
  });

  it('returns fail for critical npm vulnerability', () => {
    expect(scoreAudit({ ...cleanNpm, critical: 1 }, goodHeaders)).toBe('fail');
  });

  it('returns fail for high npm vulnerability', () => {
    expect(scoreAudit({ ...cleanNpm, high: 1 }, goodHeaders)).toBe('fail');
  });

  it('returns fail when CSP is missing', () => {
    expect(scoreAudit(cleanNpm, { ...goodHeaders, csp: false, score: 4 })).toBe('fail');
  });

  it('returns fail when HSTS is missing', () => {
    expect(scoreAudit(cleanNpm, { ...goodHeaders, hsts: false, score: 4 })).toBe('fail');
  });

  it('returns warning for moderate npm vulnerability', () => {
    expect(scoreAudit({ ...cleanNpm, moderate: 1 }, goodHeaders)).toBe('warning');
  });

  it('returns warning when header score < 4', () => {
    expect(scoreAudit(cleanNpm, { ...goodHeaders, xFrameOptions: false, xContentTypeOptions: false, score: 3 })).toBe('warning');
  });

  it('npm critical takes precedence over header issues', () => {
    expect(scoreAudit({ ...cleanNpm, critical: 1 }, { ...goodHeaders, csp: false, score: 0 })).toBe('fail');
  });
});

// ─── formatSummary ───────────────────────────────────────────────────────────

describe('formatSummary', () => {
  const baseReport: AuditReport = {
    timestamp: '2026-04-12T06:00:00.000Z',
    target: 'https://terminallearning.dev',
    npmAudit: { critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0 },
    headers: { csp: true, hsts: true, xFrameOptions: true, xContentTypeOptions: true, referrerPolicy: true, score: 5 },
    status: 'pass',
  };

  it('includes ✅ icon and PASS for pass status', () => {
    const s = formatSummary(baseReport);
    expect(s).toContain('✅');
    expect(s).toContain('PASS');
  });

  it('includes ❌ icon and FAIL for fail status', () => {
    const s = formatSummary({ ...baseReport, status: 'fail' });
    expect(s).toContain('❌');
    expect(s).toContain('FAIL');
  });

  it('includes ⚠️ icon and WARNING for warning status', () => {
    const s = formatSummary({ ...baseReport, status: 'warning' });
    expect(s).toContain('⚠️');
    expect(s).toContain('WARNING');
  });

  it('includes the timestamp', () => {
    expect(formatSummary(baseReport)).toContain('2026-04-12T06:00:00.000Z');
  });

  it('includes the target URL', () => {
    expect(formatSummary(baseReport)).toContain('https://terminallearning.dev');
  });

  it('shows header score', () => {
    expect(formatSummary(baseReport)).toContain('5/5');
  });

  it('shows vulnerability counts', () => {
    const report: AuditReport = {
      ...baseReport,
      npmAudit: { critical: 2, high: 1, moderate: 0, low: 0, info: 0, total: 3 },
      status: 'fail',
    };
    const s = formatSummary(report);
    expect(s).toContain('Critical: 2');
    expect(s).toContain('High: 1');
  });
});
