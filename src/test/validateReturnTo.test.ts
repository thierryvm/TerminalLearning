/**
 * Tests for validateReturnTo - THI-235 Sprint 2.A etape 2.bis security helper.
 *
 * This is the core open-redirect protection for the post-login redirect flow.
 * Coverage is exhaustive because every miss here = potential phishing vector.
 *
 * Note: adversarial characters (null byte, RTL override, em-dash in paths) are
 * built at runtime via String.fromCharCode to keep this source file pure ASCII
 * (avoids Git treating it as binary, blocking Sourcery + diff review).
 */
import { describe, it, expect } from 'vitest';

import { validateReturnTo } from '../lib/auth/validateReturnTo';

const SAFE_FALLBACK = '/app';
const NULL_BYTE = String.fromCharCode(0);
const RTL_OVERRIDE = String.fromCharCode(0x202e);

describe('validateReturnTo - accepted paths', () => {
  it.each([
    ['/app'],
    ['/app/teacher'],
    ['/app/admin'],
    ['/app/profile'],
    ['/app/settings'],
    ['/app/reference'],
    ['/app/learn'],
    ['/app/learn/navigation'],
    ['/app/learn/navigation/orientation'],
    ['/app/teacher/'],
    ['/app/teacher/classes'],
    ['/app/some-module/lesson_id'],
    // THI-235 Sprint 2.A étape 3 — invitation_code query param allowlist
    ['/app/join?code=a4368184d202'],
    ['/app/join/?code=abcdef012345'],
  ])('accepts safe path %s', (input) => {
    expect(validateReturnTo(input)).toBe(input);
  });
});

describe('validateReturnTo - rejected inputs (returns safe fallback)', () => {
  it.each([
    ['external URL https', 'https://evil.com'],
    ['external URL http', 'http://evil.com/app'],
    ['protocol-relative URL', '//evil.com/app'],
    ['javascript protocol', 'javascript:alert(1)'],
    ['data URI', 'data:text/html,<script>alert(1)</script>'],
    ['file protocol', 'file:///etc/passwd'],
    ['root path', '/'],
    ['not /app prefix', '/admin'],
    ['arbitrary path', '/etc/passwd'],
    ['path traversal dotdot', '/app/../etc/passwd'],
    ['path traversal anywhere', '/app/teacher/../../etc'],
    ['home shorthand', '/app/~/secret'],
    ['backslash injection', '/app\\evil'],
    ['null byte injection', `/app${NULL_BYTE}/teacher`],
    ['whitespace mid-path', '/app /teacher'],
    ['leading whitespace', ' /app/teacher'],
    ['tab character', '/app\t/teacher'],
    ['newline injection', '/app\n/teacher'],
    ['URL-encoded slash', '/app%2Fevil'],
    ['URL-encoded dotdot', '/app%2e%2e/etc'],
    ['unknown query param', '/app/teacher?foo=bar'],
    ['code query with uppercase hex (regex strict lowercase)', '/app/join?code=A4368184D202'],
    ['code query 11 chars (too short)', '/app/join?code=a436818d20'],
    ['code query 13 chars (too long)', '/app/join?code=a4368184d2020'],
    ['code query non-hex chars', '/app/join?code=ghijklmnopqr'],
    ['multiple query params', '/app/join?code=a4368184d202&evil=1'],
    ['fragment not allowed', '/app/teacher#section'],
    ['double slash inside', '/app//teacher'],
    ['empty string', ''],
  ])('rejects %s (input: %s)', (_label, input) => {
    expect(validateReturnTo(input)).toBe(SAFE_FALLBACK);
  });
});

describe('validateReturnTo - non-string inputs', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['number', 42],
    ['boolean true', true],
    ['boolean false', false],
    ['object', { path: '/app/teacher' }],
    ['array', ['/app/teacher']],
    ['function', () => '/app/teacher'],
  ])('rejects non-string input : %s', (_label, input) => {
    expect(validateReturnTo(input)).toBe(SAFE_FALLBACK);
  });
});

describe('validateReturnTo - length boundary', () => {
  it('accepts a path exactly at the 200-char limit', () => {
    // /app/ + 195 chars
    const segment = 'a'.repeat(195);
    const input = `/app/${segment}`;
    expect(input).toHaveLength(200);
    expect(validateReturnTo(input)).toBe(input);
  });

  it('rejects a path 1 char over the 200-char limit', () => {
    const segment = 'a'.repeat(196);
    const input = `/app/${segment}`;
    expect(input).toHaveLength(201);
    expect(validateReturnTo(input)).toBe(SAFE_FALLBACK);
  });

  it('rejects extremely long inputs', () => {
    const input = '/app/' + 'a'.repeat(10_000);
    expect(validateReturnTo(input)).toBe(SAFE_FALLBACK);
  });
});

describe('validateReturnTo - does NOT throw on adversarial input', () => {
  it.each([
    ['regex backtrack bomb', '/' + 'a/'.repeat(1000)],
    ['embedded null byte', `/app${NULL_BYTE}/teacher`],
    ['unicode RTL override', `/app/${RTL_OVERRIDE}teacher`],
    ['emoji surrogate pair', '/app/teacher\u{1f600}'],
  ])('handles %s without throwing', (_label, input) => {
    expect(() => validateReturnTo(input)).not.toThrow();
    // also expect a safe fallback (none of these match the strict regex)
    expect(validateReturnTo(input)).toBe(SAFE_FALLBACK);
  });
});
