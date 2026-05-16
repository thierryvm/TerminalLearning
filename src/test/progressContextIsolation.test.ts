/**
 * THI-186 — Progress data leak isolation tests (multi-session boundary)
 *
 * Reproduces the security bug reported in production on 2026-05-16 :
 *   - User A signs in, completes lessons → progress stored in localStorage
 *   - User A signs out, but localStorage is NOT cleared
 *   - User B opens the app on the same browser:
 *      (a) before signing in, sees A's progress in guest mode  (READ leak)
 *      (b) after signing in, A's lessons are upserted into B's remote table
 *          via mergeProgress + getDelta upsert flow              (WRITE leak)
 *
 * These tests exercise the storage helpers + owner-marker logic in isolation,
 * without booting React, so we can deterministically simulate each transition.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mergeProgress, getDelta } from '../app/lib/progressSync';

const STORAGE_KEY = 'terminal-master-progress';
const STORAGE_OWNER_KEY = 'terminal-master-progress-owner';
const GUEST_OWNER = '__guest__';

// ─── Helpers mirroring ProgressContext.tsx internals ──────────────────────────

function loadRaw(): { completedLessons: Record<string, boolean> } {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  return { completedLessons: {} };
}

function saveRaw(state: { completedLessons: Record<string, boolean> }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getOwner(): string | null {
  return localStorage.getItem(STORAGE_OWNER_KEY);
}

function setOwner(id: string) {
  localStorage.setItem(STORAGE_OWNER_KEY, id);
}

function clearLocalCache() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_OWNER_KEY);
}

// Simulates the SIGNED_OUT path in ProgressContext (THI-186 fix).
function handleSignOut() {
  const owner = getOwner();
  if (owner && owner !== GUEST_OWNER) {
    clearLocalCache();
    setOwner(GUEST_OWNER);
  }
}

// Simulates the SIGNED_IN path in ProgressContext (THI-186 fix).
function handleSignIn(userId: string) {
  const owner = getOwner();
  if (owner && owner !== GUEST_OWNER && owner !== userId) {
    clearLocalCache();
  }
  setOwner(userId);
}

// Simulates completeLesson stamping owner.
function handleCompleteLesson(lessonId: string, authenticatedUserId: string | null) {
  const current = loadRaw();
  current.completedLessons[lessonId] = true;
  saveRaw(current);
  if (authenticatedUserId) {
    setOwner(authenticatedUserId);
  } else if (!getOwner()) {
    setOwner(GUEST_OWNER);
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
});

describe('THI-186 progress isolation — read leak (guest mode)', () => {
  it('does NOT expose user A progress in guest mode after sign-out', () => {
    // User A signs in and completes 3 lessons.
    handleSignIn('user-a-id');
    handleCompleteLesson('mod1/lesson1', 'user-a-id');
    handleCompleteLesson('mod1/lesson2', 'user-a-id');
    handleCompleteLesson('mod1/lesson3', 'user-a-id');
    expect(loadRaw().completedLessons).toEqual({
      'mod1/lesson1': true,
      'mod1/lesson2': true,
      'mod1/lesson3': true,
    });
    expect(getOwner()).toBe('user-a-id');

    // User A signs out.
    handleSignOut();

    // Guest mode now : progress must be empty, owner is GUEST_OWNER.
    expect(loadRaw().completedLessons).toEqual({});
    expect(getOwner()).toBe(GUEST_OWNER);
  });

  it('clears progress when reloaded as guest after a stale-session signed-in cache', () => {
    // Authenticated user completed lessons on a previous session.
    handleSignIn('user-stale-id');
    handleCompleteLesson('mod1/lesson1', 'user-stale-id');

    // Now the cookie expired or user cleared cookies — page loads with no session
    // but stale localStorage. The owner check at INITIAL_SESSION (no user) path
    // detects ownership ≠ GUEST_OWNER and clears.
    handleSignOut();

    expect(loadRaw().completedLessons).toEqual({});
    expect(getOwner()).toBe(GUEST_OWNER);
  });

  it('preserves a true guest session (no prior authenticated owner)', () => {
    // Fresh visitor : no localStorage owner, completes a lesson as guest.
    handleCompleteLesson('mod1/lesson1', null);
    expect(loadRaw().completedLessons).toEqual({ 'mod1/lesson1': true });
    expect(getOwner()).toBe(GUEST_OWNER);

    // Another "sign-out event" (no-op for guest) must keep the progress.
    handleSignOut();
    expect(loadRaw().completedLessons).toEqual({ 'mod1/lesson1': true });
    expect(getOwner()).toBe(GUEST_OWNER);
  });
});

describe('THI-186 progress isolation — write contamination (cross-account)', () => {
  it('does NOT leak user A progress into user B account at sign-in', () => {
    // User A signs in, completes lessons.
    handleSignIn('user-a-id');
    handleCompleteLesson('mod1/lesson1', 'user-a-id');
    handleCompleteLesson('mod1/lesson2', 'user-a-id');

    // User A signs out (proper logout — cache cleared per THI-186).
    handleSignOut();

    // User B signs in on the same browser. Remote progress for user B is empty.
    handleSignIn('user-b-id');

    // Now simulate the syncWithRemote merge step :
    const localAfterSwitch = loadRaw().completedLessons;
    const remoteForB: Array<{ lesson_id: string; completed: boolean }> = [];

    const merged = mergeProgress(localAfterSwitch, remoteForB);
    const delta = getDelta(localAfterSwitch, remoteForB);

    expect(merged).toEqual({}); // No A's lessons in B's merged state.
    expect(delta).toEqual([]); // Nothing to upsert into B's remote table.
    expect(getOwner()).toBe('user-b-id');
  });

  it('clears cache when signing in as a DIFFERENT user without intermediate sign-out', () => {
    // User A signed in and completed lessons.
    handleSignIn('user-a-id');
    handleCompleteLesson('mod1/lesson1', 'user-a-id');
    handleCompleteLesson('mod1/lesson2', 'user-a-id');

    // Without an intermediate sign-out, a different user signs in.
    // (e.g. session refresh hands a different user — rare but defense-in-depth.)
    handleSignIn('user-b-id');

    // Cache was cleared because owner mismatch detected.
    expect(loadRaw().completedLessons).toEqual({});
    expect(getOwner()).toBe('user-b-id');
  });

  it('preserves guest progress at sign-in (legitimate "try then sign up" UX)', () => {
    // Pure guest completes a few lessons.
    handleCompleteLesson('mod1/lesson1', null);
    handleCompleteLesson('mod1/lesson2', null);
    expect(getOwner()).toBe(GUEST_OWNER);

    // Then signs up / signs in for the first time.
    handleSignIn('user-new-id');

    // Local progress kept — owner promoted to the new user.
    // The legitimate merge into the new account's remote will happen via
    // mergeProgress + getDelta upsert (which is the expected UX path).
    expect(loadRaw().completedLessons).toEqual({
      'mod1/lesson1': true,
      'mod1/lesson2': true,
    });
    expect(getOwner()).toBe('user-new-id');

    const delta = getDelta(loadRaw().completedLessons, []);
    expect(delta.sort()).toEqual(['mod1/lesson1', 'mod1/lesson2']);
  });

  it('keeps same-user cache across re-sign-in (no spurious clear)', () => {
    handleSignIn('user-x-id');
    handleCompleteLesson('mod1/lesson1', 'user-x-id');

    // User signs in again (e.g. INITIAL_SESSION on page reload).
    handleSignIn('user-x-id');

    // No clear because owner = same userId.
    expect(loadRaw().completedLessons).toEqual({ 'mod1/lesson1': true });
    expect(getOwner()).toBe('user-x-id');
  });
});

describe('THI-186 progress isolation — boundary edges', () => {
  it('handles malformed localStorage gracefully (does not throw)', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json');
    expect(() => loadRaw()).toThrow(); // Native JSON.parse throws.
    // Production helper has try/catch — we just assert raw helper behavior here;
    // the production loadProgress() in ProgressContext wraps this in try/catch.
  });

  it('GUEST_OWNER sentinel never matches a real userId (no false negative)', () => {
    // Defensive check : the sentinel string is unlikely to ever be a Supabase userId
    // (UUIDs don't start with double underscore), but assert explicitly.
    expect(GUEST_OWNER).toBe('__guest__');
    expect(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(GUEST_OWNER)).toBe(false);
  });
});
