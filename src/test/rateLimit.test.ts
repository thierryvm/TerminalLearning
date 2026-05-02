import { describe, it, expect, beforeEach } from 'vitest';
import {
  isRateLimited,
  maybeCleanup,
  extractClientIp,
  DEFAULT_RATE_POLICY,
  __resetForTests,
} from '../../api/_rate-limit';

describe('rateLimit — sliding window per IP (THI-135)', () => {
  beforeEach(() => __resetForTests());

  describe('isRateLimited', () => {
    it('allows requests below the max', () => {
      const ip = '203.0.113.1';
      const now = 1_000_000;
      for (let i = 0; i < DEFAULT_RATE_POLICY.max; i++) {
        expect(isRateLimited(ip, now + i, DEFAULT_RATE_POLICY)).toBe(false);
      }
    });

    it('blocks the request that exceeds the max within the window', () => {
      const ip = '203.0.113.2';
      const now = 1_000_000;
      for (let i = 0; i < DEFAULT_RATE_POLICY.max; i++) {
        expect(isRateLimited(ip, now + i, DEFAULT_RATE_POLICY)).toBe(false);
      }
      expect(isRateLimited(ip, now + DEFAULT_RATE_POLICY.max, DEFAULT_RATE_POLICY)).toBe(true);
    });

    it('allows again after the sliding window elapses', () => {
      const ip = '203.0.113.3';
      const t0 = 1_000_000;
      // Fill the window
      for (let i = 0; i < DEFAULT_RATE_POLICY.max; i++) {
        isRateLimited(ip, t0 + i, DEFAULT_RATE_POLICY);
      }
      // One past max — blocked
      expect(isRateLimited(ip, t0 + DEFAULT_RATE_POLICY.max, DEFAULT_RATE_POLICY)).toBe(true);
      // After window — old timestamps evicted, allowed again
      const afterWindow = t0 + DEFAULT_RATE_POLICY.windowMs + 1;
      expect(isRateLimited(ip, afterWindow, DEFAULT_RATE_POLICY)).toBe(false);
    });

    it('isolates rate limits per IP', () => {
      const t0 = 1_000_000;
      // Saturate IP A
      for (let i = 0; i < DEFAULT_RATE_POLICY.max; i++) {
        isRateLimited('A', t0 + i, DEFAULT_RATE_POLICY);
      }
      expect(isRateLimited('A', t0 + DEFAULT_RATE_POLICY.max, DEFAULT_RATE_POLICY)).toBe(true);
      // IP B is unaffected
      expect(isRateLimited('B', t0 + DEFAULT_RATE_POLICY.max, DEFAULT_RATE_POLICY)).toBe(false);
    });

    it('accepts custom policy', () => {
      const ip = '203.0.113.4';
      const tinyPolicy = { max: 2, windowMs: 1000 };
      expect(isRateLimited(ip, 100, tinyPolicy)).toBe(false);
      expect(isRateLimited(ip, 101, tinyPolicy)).toBe(false);
      expect(isRateLimited(ip, 102, tinyPolicy)).toBe(true);
    });
  });

  describe('maybeCleanup', () => {
    it('skips cleanup if called within the cleanup interval', () => {
      const ip = 'A';
      isRateLimited(ip, 1_000_000, DEFAULT_RATE_POLICY);
      // Trigger first cleanup baseline
      maybeCleanup(2_000_000, DEFAULT_RATE_POLICY);
      // Call again 1 second later — should be a no-op (no error)
      expect(() => maybeCleanup(2_001_000, DEFAULT_RATE_POLICY)).not.toThrow();
    });

    it('removes entries whose timestamps are all stale', () => {
      const ip = 'A';
      isRateLimited(ip, 1_000_000, DEFAULT_RATE_POLICY);
      // Cleanup well after the window — entry should be evictable
      const farFuture = 1_000_000 + DEFAULT_RATE_POLICY.windowMs + 10 * 60_000;
      maybeCleanup(farFuture, DEFAULT_RATE_POLICY);
      // Re-check by trying again from same IP — should be allowed (state was cleared)
      expect(isRateLimited(ip, farFuture + 1, DEFAULT_RATE_POLICY)).toBe(false);
    });
  });

  describe('extractClientIp', () => {
    it('reads x-vercel-forwarded-for from Headers (Edge runtime)', () => {
      const h = new Headers({ 'x-vercel-forwarded-for': '198.51.100.5' });
      expect(extractClientIp(h)).toBe('198.51.100.5');
    });

    it('reads x-vercel-forwarded-for from plain object (Node runtime)', () => {
      expect(extractClientIp({ 'x-vercel-forwarded-for': '198.51.100.6' })).toBe('198.51.100.6');
    });

    it('takes only the first IP from a comma-separated list', () => {
      expect(extractClientIp({ 'x-vercel-forwarded-for': '198.51.100.7, 10.0.0.1' })).toBe(
        '198.51.100.7',
      );
    });

    it('falls back to cf-connecting-ip', () => {
      expect(extractClientIp({ 'cf-connecting-ip': '198.51.100.8' })).toBe('198.51.100.8');
    });

    it('returns "unknown" when no trusted header is present', () => {
      expect(extractClientIp({})).toBe('unknown');
    });

    it('IGNORES x-forwarded-for (user-spoofable, security-auditor H5 fix)', () => {
      // Should not return the spoofable header even if it's the only one present
      expect(extractClientIp({ 'x-forwarded-for': '1.2.3.4' })).toBe('unknown');
    });

    it('handles array header values (Node IncomingMessage style)', () => {
      expect(extractClientIp({ 'x-vercel-forwarded-for': ['198.51.100.9', '10.0.0.2'] })).toBe(
        '198.51.100.9',
      );
    });
  });
});
