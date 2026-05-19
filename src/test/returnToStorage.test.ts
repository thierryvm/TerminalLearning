/**
 * Tests for returnToStorage — THI-235 Sprint 2.A étape 2.bis + 2.ter.
 *
 * Covers :
 *   - setReturnTo writes to sessionStorage
 *   - consumeReturnTo reads + clears + validates atomically
 *   - returns null when no value, invalid value, or storage unavailable
 *   - returns the validated path when stored value is safe
 *   - one-shot semantics : second consume returns null (cleared by first)
 *   - special case : if stored value is literally '/app', return it (don't
 *     conflate with the validateReturnTo `/app` rejection fallback)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setReturnTo, consumeReturnTo } from '../lib/auth/returnToStorage';

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
    // second call returns null because storage was cleared
    expect(consumeReturnTo()).toBeNull();
  });

  it('stores and consumes literal /app (the safe fallback path itself)', () => {
    // Edge case : the user explicitly stored '/app' as their returnTo.
    // Validate that we preserve this intent (not conflate with the
    // validateReturnTo `/app` rejection fallback).
    setReturnTo('/app');
    expect(consumeReturnTo()).toBe('/app');
  });
});

describe('consumeReturnTo — returns null when no explicit intent', () => {
  it('returns null when no value stored', () => {
    expect(consumeReturnTo()).toBeNull();
  });

  it('returns null when malicious value is in storage (XSS scenario)', () => {
    // Simulate an XSS attack that wrote a malicious value directly to sessionStorage
    window.sessionStorage.setItem('auth_return_to', 'https://evil.com');
    expect(consumeReturnTo()).toBeNull();
    // storage is still cleared even on rejection
    expect(window.sessionStorage.getItem('auth_return_to')).toBeNull();
  });

  it('returns null on protocol-relative URL', () => {
    window.sessionStorage.setItem('auth_return_to', '//evil.com/app');
    expect(consumeReturnTo()).toBeNull();
  });

  it('returns null on javascript: URI', () => {
    window.sessionStorage.setItem('auth_return_to', 'javascript:alert(1)');
    expect(consumeReturnTo()).toBeNull();
  });

  it('returns null on path traversal', () => {
    window.sessionStorage.setItem('auth_return_to', '/app/../etc/passwd');
    expect(consumeReturnTo()).toBeNull();
  });

  it('returns null on empty string', () => {
    window.sessionStorage.setItem('auth_return_to', '');
    expect(consumeReturnTo()).toBeNull();
  });
});

describe('setReturnTo — defensive when storage unavailable', () => {
  it('silently no-ops when sessionStorage.setItem throws', () => {
    const proto = Object.getPrototypeOf(window.sessionStorage) as Storage;
    vi.spyOn(proto, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => setReturnTo('/app/teacher')).not.toThrow();
  });
});

describe('consumeReturnTo — defensive when storage unavailable', () => {
  it('returns null when sessionStorage.getItem throws', () => {
    vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(consumeReturnTo()).toBeNull();
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
