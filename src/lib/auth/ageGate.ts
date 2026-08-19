/**
 * ageGate — THI-340. Neutral age screen before account creation.
 *
 * ─── Why this exists ─────────────────────────────────────────────────────────
 * RGPD Art. 8 applies to information society services offered directly to a
 * child. In **Belgium** the digital consent age is **13** (the Regulation lets
 * each Member State pick between 13 and 16; Belgium chose the floor).
 *
 * Terminal Learning's whole curriculum works **without an account** — the
 * account only adds cross-device progress sync. So the proportionate posture
 * is: under 13, we do not create an account at all. Nothing is collected,
 * therefore there is no children's data to find a legal basis for, no parental
 * consent to chase, and no parent email to store. The child still gets 100% of
 * the pedagogical content anonymously.
 *
 * Art. 8(2) asks for "reasonable efforts to verify [...] taking into
 * consideration available technology". For a free, volunteer-run service that
 * collects an email and a progress row, a **neutral age screen** is the
 * proportionate effort — this is deliberately NOT identity verification, and
 * the code never pretends otherwise.
 *
 * ─── Neutrality ──────────────────────────────────────────────────────────────
 * The screen asks for a date of birth and never hints at the threshold. A
 * leading control ("I confirm I am 13 or older") teaches the user which answer
 * unlocks the form; a neutral date does not. That is why there is no such
 * checkbox anywhere in this flow.
 *
 * ─── Data minimisation ───────────────────────────────────────────────────────
 * The date of birth is **never sent anywhere**. It is read, turned into a
 * yes/no, and dropped. What reaches the server is a single timestamp
 * (`profiles.age_confirmed_at`) meaning "this account passed the age screen on
 * that date" — proof of the Art. 5(2) accountability duty without storing one
 * extra byte of personal data.
 *
 * ─── Storage asymmetry (deliberate) ──────────────────────────────────────────
 * The permissive answer is short-lived, the restrictive answer is durable:
 *
 *   - PASS  → sessionStorage, dies with the browser tab. On a shared family
 *             device, a parent signing up does not silently clear the gate for
 *             a child who opens a new tab tomorrow.
 *   - BLOCK → localStorage, survives tab close. A blocked visitor cannot simply
 *             reopen a tab and answer differently. It stores the date the
 *             visitor *becomes* eligible, so the block lifts by itself on their
 *             13th birthday — no permanent lockout, and still no date of birth
 *             at rest (a 13-year offset is not the birth date, and it never
 *             leaves the device).
 *
 * Neither flag is a security control — a determined visitor can clear storage
 * or lie to the screen. They are the honest, documented "reasonable effort".
 */

/** Digital consent age in Belgium (RGPD Art. 8(1), national floor). */
export const DIGITAL_CONSENT_AGE = 13;

/** Tab-scoped: cleared when the tab closes (see storage asymmetry above). */
const VERIFIED_KEY = 'tl.age.verified';
/** Device-scoped: survives tab close, auto-expires on the 13th birthday. */
const BLOCKED_UNTIL_KEY = 'tl.age.blocked_until';

/** Earliest birth year accepted by the screen — rejects typos like year 12. */
const MIN_BIRTH_YEAR = 1900;

export interface AgeVerdict {
  /** `true` when the visitor may proceed to account creation. */
  allowed: boolean;
  /**
   * ISO date (YYYY-MM-DD) at which a blocked visitor turns
   * `DIGITAL_CONSENT_AGE`. Only present when `allowed` is false.
   */
  eligibleAt?: string;
}

/**
 * Parse a `YYYY-MM-DD` string (the native `<input type="date">` value) into
 * calendar parts, WITHOUT going through `new Date(string)`.
 *
 * `new Date('2013-05-04')` is parsed as UTC midnight, then read back in local
 * time — west of Greenwich that is the 3rd, not the 4th. For a threshold that
 * flips on a birthday, a one-day drift is a real wrong answer, so the parts are
 * extracted textually and only ever combined via the local-time
 * `new Date(y, m, d)` constructor.
 *
 * Returns `null` for anything malformed, out of range, or non-existent
 * (31 February, 30 February, leap-day in a common year…).
 */
export function parseBirthDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < MIN_BIRTH_YEAR) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  // Round-trip through a local-time Date to reject non-existent calendar days:
  // new Date(2025, 1, 30) rolls over to 2 March, so the parts come back changed.
  const probe = new Date(year, month - 1, day);
  if (
    probe.getFullYear() !== year ||
    probe.getMonth() !== month - 1 ||
    probe.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

/**
 * Whole years elapsed between `birth` and `now`, birthday-accurate.
 *
 * `now` is injected rather than read from the clock so the threshold can be
 * tested on both sides of a birthday without freezing global time.
 */
export function computeAge(
  birth: { year: number; month: number; day: number },
  now: Date,
): number {
  let age = now.getFullYear() - birth.year;
  const monthDelta = now.getMonth() - (birth.month - 1);
  // Birthday not reached yet this year → one year less.
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.day)) {
    age -= 1;
  }
  return age;
}

/** Local-time `YYYY-MM-DD` — `toISOString()` would shift the day east of UTC. */
function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Turn a raw `<input type="date">` value into the gate verdict.
 *
 * A date in the future, or one that fails `parseBirthDate`, is treated as
 * **not allowed** with no `eligibleAt` — the caller shows a "check your date"
 * message rather than a block screen, and nothing is persisted.
 */
export function evaluateBirthDate(value: string, now: Date): AgeVerdict {
  const birth = parseBirthDate(value);
  if (!birth) return { allowed: false };

  const age = computeAge(birth, now);
  // Negative age = date in the future. Not a minor, just an invalid entry.
  if (age < 0) return { allowed: false };
  if (age >= DIGITAL_CONSENT_AGE) return { allowed: true };

  // Local-time constructor keeps the birthday on the right calendar day.
  const eligible = new Date(birth.year + DIGITAL_CONSENT_AGE, birth.month - 1, birth.day);
  return { allowed: false, eligibleAt: toIsoDate(eligible) };
}

/**
 * Record that the visitor passed the screen, for this tab only.
 * Silently no-ops when storage is unavailable (private browsing, SSR) — the
 * gate then simply asks again, which fails safe.
 */
export function markAgeVerified(now: Date = new Date()): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(VERIFIED_KEY, now.toISOString());
  } catch {
    // Quota exceeded / storage disabled — re-asking is the safe fallback.
  }
}

/** Has the visitor passed the screen in this tab? */
export function isAgeVerified(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(VERIFIED_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Record a block until the visitor's 13th birthday. Durable across tabs.
 * Called only with the `eligibleAt` produced by `evaluateBirthDate`.
 */
export function markAgeBlocked(eligibleAt: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BLOCKED_UNTIL_KEY, eligibleAt);
  } catch {
    // See markAgeVerified — re-asking fails safe.
  }
}

/**
 * Is the visitor currently blocked?
 *
 * Returns the ISO eligibility date while the block holds, `null` once it has
 * lapsed (the stale key is cleared on the way out, so the block truly ends on
 * the birthday rather than lingering as dead storage).
 */
export function getAgeBlockedUntil(now: Date = new Date()): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(BLOCKED_UNTIL_KEY);
    if (!stored) return null;

    const parsed = parseBirthDate(stored);
    // Corrupted value (hand-edited storage) — drop it and let the screen re-ask
    // rather than trusting an unparseable block forever.
    if (!parsed) {
      window.localStorage.removeItem(BLOCKED_UNTIL_KEY);
      return null;
    }

    if (toIsoDate(now) >= stored) {
      window.localStorage.removeItem(BLOCKED_UNTIL_KEY);
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

/** Test/maintenance helper — clears both flags. */
export function resetAgeGate(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(VERIFIED_KEY);
    window.localStorage.removeItem(BLOCKED_UNTIL_KEY);
  } catch {
    // Nothing to do — absent storage means nothing to clear.
  }
}
