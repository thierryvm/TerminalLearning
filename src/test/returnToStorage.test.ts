/**
 * Tests for returnToStorage — THI-235 Sprint 2.A étape 2.bis.
 *
 * Covers :
 *   - setReturnTo writes to sessionStorage
 *   - consumeReturnTo reads + clears + validates atomically
 *   - returns safe fallback on invalid stored value (attacker XSS scenario)
 *   - silently no-ops when sessionStorage is unavailable (SSR / private browsing)
 *   - one-shot semantics : second consume returns fallback (cleared by first)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setReturnTo, consumeReturnTo } from '../lib/auth/returnToStorage';

const SAFE_FALLBACK = '/app';

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('setReturnTo + consumeReturnTo — happy path', () => {
  it('stores a safe path then consumes it', () => {
    setReturnTo('/app/teacher');
    expect(consumeReturnTo()).toBe('/app/teacher');
  });

  it('clears the storage after consume (one-shot semantics)', () => {
    setReturnTo('/app/admin');
    expect(consumeReturnTo()).toBe('/app/admin');
    // second call returns fallback because storage was cleared
    expect(consumeReturnTo()).toBe(SAFE_FALLBACK);
  });

  it('stores and consumes /app (the safe fallback path itself)', () => {
    setReturnTo('/app');
    expect(consumeReturnTo()).toBe('/app');
  });
});

describe('consumeReturnTo — validation at read time', () => {
  it('returns safe fallback when no value stored', () => {
    expect(consumeReturnTo()).toBe(SAFE_FALLBACK);
  });

  it('returns safe fallback when malicious value is in storage (XSS scenario)', () => {
    // Simulate an XSS attack that wrote a malicious value directly to sessionStorage
    window.sessionStorage.setItem('auth_return_to', 'https://evil.com');
    expect(consumeReturnTo()).toBe(SAFE_FALLBACK);
    // storage is still cleared even on rejection
    expect(window.sessionStorage.getItem('auth_return_to')).toBeNull();
  });

  it('returns safe fallback on protocol-relative URL', () => {
    window.sessionStorage.setItem('auth_return_to', '//evil.com/app');
    expect(consumeReturnTo()).toBe(SAFE_FALLBACK);
  });

  it('returns safe fallback on javascript: URI', () => {
    window.sessionStorage.setItem('auth_return_to', 'javascript:alert(1)');
    expect(consumeReturnTo()).toBe(SAFE_FALLBACK);
  });

  it('returns safe fallback on path traversal', () => {
    window.sessionStorage.setItem('auth_return_to', '/app/../etc/passwd');
    expect(consumeReturnTo()).toBe(SAFE_FALLBACK);
  });
});

describe('setReturnTo — defensive when storage unavailable', () => {
  it('silently no-ops when sessionStorage.setItem throws', () => {
    // We test the contract "does not throw"; spy invocation is implementation
    // detail (vitest jsdom may proxy through globalThis.sessionStorage which
    // is not the same instance as window.sessionStorage in some setups).
    const proto = Object.getPrototypeOf(window.sessionStorage) as Storage;
    vi.spyOn(proto, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => setReturnTo('/app/teacher')).not.toThrow();
  });
});

describe('consumeReturnTo — defensive when storage unavailable', () => {
  it('returns safe fallback when sessionStorage.getItem throws', () => {
    vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(consumeReturnTo()).toBe(SAFE_FALLBACK);
  });
});

describe('storage key isolation', () => {
  it('does not interfere with other sessionStorage keys', () => {
    window.sessionStorage.setItem('unrelated_key', 'unrelated_value');
    setReturnTo('/app/teacher');
    expect(consumeReturnTo()).toBe('/app/teacher');
    // unrelated key is preserved
    expect(window.sessionStorage.getItem('unrelated_key')).toBe('unrelated_value');
  });
});
