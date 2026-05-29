import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  isStaleChunkError,
  reloadOnceForStaleChunk,
  STALE_CHUNK_RELOAD_KEY,
} from '../app/lib/lazyWithRetry';

describe('isStaleChunkError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://x/assets/UserMenu-D4jfd8IN.js',
    'Importing a module script failed.',
    'Expected a JavaScript module script but the server responded with a MIME type of "text/html". ... is not a valid JavaScript MIME type',
    'text/html',
  ])('detects stale-chunk message: %s', (msg) => {
    expect(isStaleChunkError(new Error(msg))).toBe(true);
    expect(isStaleChunkError(msg)).toBe(true); // raw string reason too
  });

  it.each([
    'TypeError: cannot read properties of undefined',
    'Network request failed',
    '',
  ])('does NOT flag unrelated error: %s', (msg) => {
    expect(isStaleChunkError(new Error(msg))).toBe(false);
  });

  it('handles null/undefined reason safely', () => {
    expect(isStaleChunkError(null)).toBe(false);
    expect(isStaleChunkError(undefined)).toBe(false);
  });
});

describe('reloadOnceForStaleChunk — once-per-session guard', () => {
  let reloadSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    reloadSpy = vi.fn();
    // jsdom location.reload is non-configurable on some versions — redefine.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('reloads once and sets the flag', () => {
    expect(reloadOnceForStaleChunk()).toBe(true);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY)).toBe('1');
  });

  it('does NOT reload a second time in the same session (anti-loop)', () => {
    reloadOnceForStaleChunk();
    reloadSpy.mockClear();
    expect(reloadOnceForStaleChunk()).toBe(false);
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
