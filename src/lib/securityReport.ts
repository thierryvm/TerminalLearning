// Pure functions for parsing Security Sentinel audit results.
// Tested in src/test/securityReport.test.ts
// Used by the GitHub Actions workflow (via JSON) and scripts/security-audit.cjs

export interface NpmAuditResult {
  critical: number;
  high: number;
  moderate: number;
  low: number;
  info: number;
  total: number;
}

export interface HeadersResult {
  csp: boolean;
  hsts: boolean;
  xFrameOptions: boolean;
  xContentTypeOptions: boolean;
  referrerPolicy: boolean;
  score: number; // 0–5
}

export type AuditStatus = 'pass' | 'warning' | 'fail';

export interface AuditReport {
  timestamp: string;
  target: string;
  npmAudit: NpmAuditResult;
  headers: HeadersResult;
  status: AuditStatus;
}

/** Parse `npm audit --json` output into a flat vulnerability count. */
export function parseNpmAudit(json: string): NpmAuditResult {
  try {
    const data = JSON.parse(json) as { metadata?: { vulnerabilities?: Partial<NpmAuditResult> } };
    const v = data?.metadata?.vulnerabilities ?? {};
    return {
      critical: v.critical ?? 0,
      high:     v.high     ?? 0,
      moderate: v.moderate ?? 0,
      low:      v.low      ?? 0,
      info:     v.info     ?? 0,
      total:    v.total    ?? 0,
    };
  } catch {
    return { critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0 };
  }
}

/**
 * Evaluate HTTP response headers (case-insensitive keys).
 * Input: `{ 'Content-Security-Policy': '...', ... }`
 */
export function parseHeaders(headers: Record<string, string>): HeadersResult {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  );
  const csp                = 'content-security-policy'   in lower;
  const hsts               = 'strict-transport-security' in lower;
  const xFrameOptions      = 'x-frame-options'           in lower;
  const xContentTypeOptions= 'x-content-type-options'    in lower;
  const referrerPolicy     = 'referrer-policy'            in lower;
  const score = [csp, hsts, xFrameOptions, xContentTypeOptions, referrerPolicy].filter(Boolean).length;
  return { csp, hsts, xFrameOptions, xContentTypeOptions, referrerPolicy, score };
}

/** Derive overall audit status from npm + headers results. */
export function scoreAudit(npm: NpmAuditResult, headers: HeadersResult): AuditStatus {
  if (npm.critical > 0 || npm.high > 0)  return 'fail';
  if (!headers.csp || !headers.hsts)      return 'fail';
  if (npm.moderate > 0 || headers.score < 4) return 'warning';
  return 'pass';
}

/** Human-readable terminal summary for a completed audit report. */
export function formatSummary(report: AuditReport): string {
  const icon = { pass: '✅', warning: '⚠️', fail: '❌' }[report.status];
  const h = report.headers;
  const n = report.npmAudit;
  return [
    `${icon} Security Sentinel — ${report.timestamp}`,
    `   Target: ${report.target}`,
    '',
    '📦 npm audit:',
    `   Critical: ${n.critical}  High: ${n.high}  Moderate: ${n.moderate}  Low: ${n.low}  Info: ${n.info}`,
    '',
    '🌐 HTTP Headers:',
    `   CSP: ${h.csp ? '✅' : '❌'}  HSTS: ${h.hsts ? '✅' : '❌'}  X-Frame: ${h.xFrameOptions ? '✅' : '❌'}  X-Content-Type: ${h.xContentTypeOptions ? '✅' : '❌'}  Referrer-Policy: ${h.referrerPolicy ? '✅' : '❌'}`,
    `   Score: ${h.score}/5`,
    '',
    `Status: ${report.status.toUpperCase()}`,
  ].join('\n');
}
