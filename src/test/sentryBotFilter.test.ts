/**
 * THI-317 — Sentry crawler/bot noise filter.
 *
 * Standalone test file (NOT added to sentry.test.ts) on purpose: that file holds
 * synthetic API-key fixtures for the scrubber, and the pre-commit credential
 * hook scans whole staged files — re-staging it would false-positive. This file
 * contains only User-Agent strings (no secrets), so it commits cleanly.
 */
import { describe, it, expect } from 'vitest';
import { isCrawlerUserAgent } from '@/lib/sentry';

describe('isCrawlerUserAgent — Sentry bot noise filter (THI-317)', () => {
  it('detects common crawlers', () => {
    expect(isCrawlerUserAgent('Mozilla/5.0 (Macintosh) AppleWebKit/600 (KHTML, like Gecko) Applebot/0.1')).toBe(true);
    expect(isCrawlerUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    expect(isCrawlerUserAgent('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true);
    expect(isCrawlerUserAgent('Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)')).toBe(true);
    expect(isCrawlerUserAgent('facebookexternalhit/1.1')).toBe(true);
  });

  it('detects AI crawlers (GPTBot / ClaudeBot)', () => {
    expect(isCrawlerUserAgent('Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)')).toBe(true);
    expect(isCrawlerUserAgent('Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)')).toBe(true);
  });

  it('does NOT flag real desktop / mobile browsers', () => {
    expect(isCrawlerUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15')).toBe(false);
    expect(isCrawlerUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')).toBe(false);
    expect(isCrawlerUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36')).toBe(false);
  });

  it('does NOT flag real devices whose name merely contains "bot" (e.g. Cubot)', () => {
    // code-reviewer THI-317: a bare `bot` substring would false-positive here.
    expect(isCrawlerUserAgent('Mozilla/5.0 (Linux; Android 10; Cubot Note 20 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36')).toBe(false);
  });

  it('handles empty / undefined / null safely', () => {
    expect(isCrawlerUserAgent('')).toBe(false);
    expect(isCrawlerUserAgent(undefined)).toBe(false);
    expect(isCrawlerUserAgent(null)).toBe(false);
  });
});
