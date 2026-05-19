/**
 * Tests for defaultRouteForRole — THI-235 Sprint 2.A étape 2.ter.
 *
 * Covers the role → default landing route mapping used post-login when
 * no explicit returnTo was stored. Sprint 2.B will extend the institution_admin
 * + pending_teacher mappings to /app/institution + /app/teacher/pending
 * once those routes ship; today both fallback to /app (safe).
 */
import { describe, it, expect } from 'vitest';

import { defaultRouteForRole } from '../lib/auth/defaultRouteForRole';

describe('defaultRouteForRole — staff roles get role-specific landing', () => {
  it('super_admin → /app/admin (supervision panel)', () => {
    expect(defaultRouteForRole('super_admin')).toBe('/app/admin');
  });

  it('teacher → /app/teacher (Mes classes)', () => {
    expect(defaultRouteForRole('teacher')).toBe('/app/teacher');
  });
});

describe('defaultRouteForRole — Sprint 2.B placeholder roles fallback to /app', () => {
  it('institution_admin → /app (until Sprint 2.B ships /app/institution)', () => {
    expect(defaultRouteForRole('institution_admin')).toBe('/app');
  });

  it('pending_teacher → /app (until Sprint 2.B ships /app/teacher/pending)', () => {
    expect(defaultRouteForRole('pending_teacher')).toBe('/app');
  });
});

describe('defaultRouteForRole — student + missing role get safe fallback', () => {
  it('student → /app (standard Dashboard)', () => {
    expect(defaultRouteForRole('student')).toBe('/app');
  });

  it('null role (RPC failed, defensive) → /app', () => {
    expect(defaultRouteForRole(null)).toBe('/app');
  });

  it('undefined role → /app', () => {
    expect(defaultRouteForRole(undefined)).toBe('/app');
  });
});

describe('defaultRouteForRole — defensive against future role additions', () => {
  it('unknown role (TypeScript bypass) → /app fallback, never throws', () => {
    // @ts-expect-error - deliberately passing an unknown role to test the defensive fallback
    expect(defaultRouteForRole('future_role_not_yet_defined')).toBe('/app');
  });

  it('empty string role → /app fallback', () => {
    // @ts-expect-error - empty string is not a valid UserRole
    expect(defaultRouteForRole('')).toBe('/app');
  });
});
