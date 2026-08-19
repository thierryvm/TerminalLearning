/**
 * THI-340 — age gate logic (RGPD Art. 8, Belgium = 13).
 *
 * The threshold flips on a birthday, so every boundary case here is written as
 * a pair: the day before and the day of. A one-day drift is not a rounding
 * detail — it is the difference between creating a child's account and not.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DIGITAL_CONSENT_AGE,
  computeAge,
  evaluateBirthDate,
  getAgeBlockedUntil,
  isAgeVerified,
  markAgeBlocked,
  markAgeVerified,
  parseBirthDate,
  resetAgeGate,
} from '../lib/auth/ageGate';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('parseBirthDate', () => {
  it('accepts a well-formed date', () => {
    expect(parseBirthDate('2005-07-14')).toEqual({ year: 2005, month: 7, day: 14 });
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseBirthDate('  2005-07-14 ')).toEqual({ year: 2005, month: 7, day: 14 });
  });

  it('rejects a malformed or empty value', () => {
    expect(parseBirthDate('')).toBeNull();
    expect(parseBirthDate('14/07/2005')).toBeNull();
    expect(parseBirthDate('2005-7-4')).toBeNull();
    expect(parseBirthDate('not a date')).toBeNull();
  });

  it('rejects an out-of-range month or day', () => {
    expect(parseBirthDate('2005-13-01')).toBeNull();
    expect(parseBirthDate('2005-00-01')).toBeNull();
    expect(parseBirthDate('2005-07-00')).toBeNull();
    expect(parseBirthDate('2005-07-32')).toBeNull();
  });

  it('rejects a calendar day that does not exist', () => {
    // Date would silently roll over to 2 March without the round-trip check.
    expect(parseBirthDate('2025-02-30')).toBeNull();
    expect(parseBirthDate('2025-04-31')).toBeNull();
    // 2025 is not a leap year; 2024 is.
    expect(parseBirthDate('2025-02-29')).toBeNull();
    expect(parseBirthDate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
  });

  it('rejects an implausibly old year (typo guard)', () => {
    expect(parseBirthDate('0012-07-14')).toBeNull();
    expect(parseBirthDate('1899-12-31')).toBeNull();
    expect(parseBirthDate('1900-01-01')).toEqual({ year: 1900, month: 1, day: 1 });
  });
});

describe('computeAge', () => {
  const birth = { year: 2010, month: 6, day: 15 };

  it('counts a full year only once the birthday has passed', () => {
    // Day before the 13th birthday.
    expect(computeAge(birth, new Date(2023, 5, 14))).toBe(12);
    // The birthday itself — you are 13 on the day.
    expect(computeAge(birth, new Date(2023, 5, 15))).toBe(13);
    expect(computeAge(birth, new Date(2023, 5, 16))).toBe(13);
  });

  it('handles the month boundary', () => {
    expect(computeAge(birth, new Date(2023, 4, 31))).toBe(12); // 31 May
    expect(computeAge(birth, new Date(2023, 6, 1))).toBe(13); // 1 July
  });

  it('returns a negative age for a date in the future', () => {
    expect(computeAge({ year: 2030, month: 1, day: 1 }, new Date(2026, 7, 19))).toBeLessThan(0);
  });
});

describe('evaluateBirthDate', () => {
  const now = new Date(2026, 7, 19); // 19 August 2026

  it('allows someone at or above the threshold', () => {
    expect(evaluateBirthDate('2000-01-01', now)).toEqual({ allowed: true });
    // Exactly 13 today.
    expect(evaluateBirthDate('2013-08-19', now)).toEqual({ allowed: true });
  });

  it('blocks someone below the threshold and says when they become eligible', () => {
    // 13th birthday is tomorrow.
    expect(evaluateBirthDate('2013-08-20', now)).toEqual({
      allowed: false,
      eligibleAt: '2026-08-20',
    });
    expect(evaluateBirthDate('2020-03-05', now)).toEqual({
      allowed: false,
      eligibleAt: '2033-03-05',
    });
  });

  it('keeps the eligibility date on the right calendar day (no UTC drift)', () => {
    // Parsing via new Date('2015-01-01') would land on 31 December west of
    // Greenwich; the eligibility date must stay on 1 January.
    expect(evaluateBirthDate('2015-01-01', now).eligibleAt).toBe('2028-01-01');
  });

  it('treats an unusable entry as "ask again", not as a block', () => {
    for (const bad of ['', 'nope', '2025-02-30', '2099-01-01']) {
      const verdict = evaluateBirthDate(bad, now);
      expect(verdict.allowed).toBe(false);
      // No eligibility date → the UI re-asks instead of refusing.
      expect(verdict.eligibleAt).toBeUndefined();
    }
  });

  it('uses the Belgian threshold', () => {
    expect(DIGITAL_CONSENT_AGE).toBe(13);
  });
});

describe('verification flag (tab-scoped)', () => {
  it('is absent until the screen is passed', () => {
    expect(isAgeVerified()).toBe(false);
    markAgeVerified();
    expect(isAgeVerified()).toBe(true);
  });

  it('lives in sessionStorage, so a new tab asks again', () => {
    markAgeVerified();
    expect(sessionStorage.getItem('tl.age.verified')).not.toBeNull();
    expect(localStorage.getItem('tl.age.verified')).toBeNull();
  });
});

describe('block flag (device-scoped, self-expiring)', () => {
  it('holds until the eligibility date', () => {
    markAgeBlocked('2033-03-05');
    expect(getAgeBlockedUntil(new Date(2026, 7, 19))).toBe('2033-03-05');
    expect(getAgeBlockedUntil(new Date(2033, 2, 4))).toBe('2033-03-05');
  });

  it('lifts by itself on the 13th birthday and clears the stale key', () => {
    markAgeBlocked('2033-03-05');
    expect(getAgeBlockedUntil(new Date(2033, 2, 5))).toBeNull();
    expect(localStorage.getItem('tl.age.blocked_until')).toBeNull();
  });

  it('survives a tab close (localStorage, not sessionStorage)', () => {
    markAgeBlocked('2033-03-05');
    sessionStorage.clear(); // simulates a fresh tab
    expect(getAgeBlockedUntil(new Date(2026, 7, 19))).toBe('2033-03-05');
  });

  it('drops a hand-edited value rather than trusting it forever', () => {
    localStorage.setItem('tl.age.blocked_until', 'whenever');
    expect(getAgeBlockedUntil(new Date(2026, 7, 19))).toBeNull();
    expect(localStorage.getItem('tl.age.blocked_until')).toBeNull();
  });

  it('reports no block when nothing was stored', () => {
    expect(getAgeBlockedUntil(new Date(2026, 7, 19))).toBeNull();
  });
});

describe('resetAgeGate', () => {
  it('clears both flags', () => {
    markAgeVerified();
    markAgeBlocked('2033-03-05');
    resetAgeGate();
    expect(isAgeVerified()).toBe(false);
    expect(getAgeBlockedUntil(new Date(2026, 7, 19))).toBeNull();
  });
});
