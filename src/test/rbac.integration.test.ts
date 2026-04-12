// @vitest-environment node
/**
 * RBAC Integration Tests — THI-80
 *
 * Tests RLS policies and role behavior against the real Supabase instance.
 * Uses the 5 test users created in migration 006_test_users_rbac.sql.
 *
 * Prerequisites:
 *   - .env.test with TEST_USER_PASSWORD + TEST_EMAIL_* + TEST_UUID_* vars
 *   - Migration 006 applied
 *   - Passwords reset via Admin API (GoTrue compat — see project_gotrue_compat.md)
 *
 * Coverage (10 checks):
 *   1.  Login OK for all 5 roles
 *   2.  get_my_role() returns correct role per user
 *   3.  RLS: student sees only own profile
 *   4.  RLS: super_admin sees all profiles (≥ 5)
 *   5.  RLS: institution_admin sees only own institution profiles
 *   6.  RLS: student cannot insert a class (blocked)
 *   7.  RLS: student cannot escalate to super_admin (exception)
 *   8.  RLS: student can self-request pending_teacher
 *   9.  RLS: institution_admin cannot see profiles from another institution
 *   10. RLS: student sees only own progress rows
 */

import { config as loadEnv } from 'dotenv';
import path from 'path';

// Load .env.test explicitly — Vitest only auto-exposes VITE_* vars via process.env;
// non-prefixed TEST_* vars require manual dotenv load in node environment.
loadEnv({ path: path.resolve(process.cwd(), '.env.test') });

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Environment ──────────────────────────────────────────────────────────────

const SUPABASE_URL      = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';
const PASSWORD          = process.env.TEST_USER_PASSWORD ?? '';

const EMAILS = {
  super_admin:       process.env.TEST_EMAIL_SUPERADMIN       ?? '',
  institution_admin: process.env.TEST_EMAIL_INST_ADMIN       ?? '',
  teacher:           process.env.TEST_EMAIL_TEACHER          ?? '',
  pending_teacher:   process.env.TEST_EMAIL_PENDING          ?? '',
  student:           process.env.TEST_EMAIL_STUDENT          ?? '',
} as const;

const UUIDS = {
  super_admin:       process.env.TEST_UUID_SUPERADMIN        ?? '',
  institution_admin: process.env.TEST_UUID_INST_ADMIN        ?? '',
  teacher:           process.env.TEST_UUID_TEACHER           ?? '',
  pending_teacher:   process.env.TEST_UUID_PENDING           ?? '',
  student:           process.env.TEST_UUID_STUDENT           ?? '',
} as const;

type Role = keyof typeof EMAILS;
const ALL_ROLES: Role[] = [
  'super_admin', 'institution_admin', 'teacher', 'pending_teacher', 'student',
];

// Skip all tests if env is not configured (CI without .env.test)
const SKIP = !SUPABASE_URL || !PASSWORD || !EMAILS.student;

// ── Client factory ────────────────────────────────────────────────────────────

function makeAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loginAs(role: Role): Promise<SupabaseClient> {
  const client = makeAnonClient();
  const { error } = await client.auth.signInWithPassword({
    email:    EMAILS[role],
    password: PASSWORD,
  });
  if (error) throw new Error(`Login failed for ${role}: ${error.message}`);
  return client;
}

// ── Shared clients (created once, reused across describes) ───────────────────

const clients: Partial<Record<Role, SupabaseClient>> = {};

beforeAll(async () => {
  if (SKIP) return;
  // Login all roles in parallel
  await Promise.all(
    ALL_ROLES.map(async (role) => {
      clients[role] = await loginAs(role);
    }),
  );
  // Idempotent cleanup: restore student role in case a previous run left it as pending_teacher
  const sa = clients.super_admin;
  if (sa) {
    await sa
      .from('profiles')
      .update({ role: 'student', role_requested_at: null })
      .eq('id', UUIDS.student);
  }
}, 30_000);

afterAll(async () => {
  if (SKIP) return;
  // Restore student role if the escalation test changed it
  // super_admin has unrestricted UPDATE on profiles
  const sa = clients.super_admin;
  if (sa) {
    await sa
      .from('profiles')
      .update({ role: 'student', role_requested_at: null })
      .eq('id', UUIDS.student);
  }
  // Sign out all sessions
  await Promise.all(ALL_ROLES.map((r) => clients[r]?.auth.signOut()));
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. Login
// ═══════════════════════════════════════════════════════════════════════════

describe('Login — all 5 roles', () => {
  it.skipIf(SKIP).each(ALL_ROLES)('%s: obtains a session', async (role) => {
    const { data } = await clients[role]!.auth.getSession();
    expect(data.session).not.toBeNull();
    expect(data.session!.user.id).toBe(UUIDS[role]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. get_my_role() RPC
// ═══════════════════════════════════════════════════════════════════════════

describe('get_my_role() RPC', () => {
  const expectations: [Role, string][] = [
    ['super_admin',       'super_admin'],
    ['institution_admin', 'institution_admin'],
    ['teacher',           'teacher'],
    ['pending_teacher',   'pending_teacher'],
    ['student',           'student'],
  ];

  it.skipIf(SKIP).each(expectations)('%s → "%s"', async (role, expected) => {
    const { data, error } = await clients[role]!.rpc('get_my_role');
    expect(error).toBeNull();
    expect(data).toBe(expected);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. RLS: profiles — visibility per role
// ═══════════════════════════════════════════════════════════════════════════

describe('RLS: profiles — select visibility', () => {
  it.skipIf(SKIP)('student sees only their own profile (1 row)', async () => {
    const { data, error } = await clients.student!
      .from('profiles')
      .select('id');
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(UUIDS.student);
  });

  it.skipIf(SKIP)('super_admin sees all profiles (≥ 5)', async () => {
    const { data, error } = await clients.super_admin!
      .from('profiles')
      .select('id');
    expect(error).toBeNull();
    // At minimum the 5 test users
    expect(data!.length).toBeGreaterThanOrEqual(5);
  });

  it.skipIf(SKIP)('institution_admin sees only profiles in their institution', async () => {
    const { data: instAdminProfile, error: e1 } = await clients.institution_admin!
      .from('profiles')
      .select('institution_id')
      .eq('id', UUIDS.institution_admin)
      .single();
    expect(e1).toBeNull();
    const instId = instAdminProfile!.institution_id;

    const { data, error } = await clients.institution_admin!
      .from('profiles')
      .select('id, institution_id');
    expect(error).toBeNull();
    // Every visible profile must belong to the same institution or be the admin themselves
    const uuids = new Set([UUIDS.institution_admin, UUIDS.teacher]);
    data!.forEach((p) => {
      const isOwnInstitution = p.institution_id === instId;
      const isSelf = uuids.has(p.id as string);
      expect(isOwnInstitution || isSelf).toBe(true);
    });
  });

  it.skipIf(SKIP)('institution_admin cannot see student from outside their institution', async () => {
    // student is enrolled in the institution's class but has no institution_id set
    // → they should not appear in institution_admin's SELECT by institution_id match
    const { data } = await clients.institution_admin!
      .from('profiles')
      .select('id')
      .eq('id', UUIDS.student);
    // student has no institution_id → invisible to institution_admin RLS policy
    expect(data).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. RLS: classes — student cannot insert
// ═══════════════════════════════════════════════════════════════════════════

describe('RLS: classes — insert blocked for student', () => {
  it.skipIf(SKIP)('student insert is rejected by RLS', async () => {
    const { error } = await clients.student!
      .from('classes')
      .insert({ name: 'FORBIDDEN CLASS', teacher_id: UUIDS.student });
    // PostgREST returns a 42501 (RLS violation) or similar error
    expect(error).not.toBeNull();
    expect(error!.code).toMatch(/42501|PGRST301|permission denied/i);
  });

  it.skipIf(SKIP)('teacher can insert a class (then clean up)', async () => {
    const { data, error } = await clients.teacher!
      .from('classes')
      .insert({ name: '__TEST_CLASS_THI80__', teacher_id: UUIDS.teacher })
      .select('id')
      .single();
    expect(error).toBeNull();
    expect(data).not.toBeNull();

    // Clean up
    if (data?.id) {
      await clients.teacher!.from('classes').delete().eq('id', data.id);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. RLS: role escalation prevention
// ═══════════════════════════════════════════════════════════════════════════

describe('RLS: role escalation — prevent_role_escalation trigger', () => {
  it.skipIf(SKIP)('student → super_admin is blocked (exception)', async () => {
    const { error } = await clients.student!
      .from('profiles')
      .update({ role: 'super_admin' })
      .eq('id', UUIDS.student);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/unauthorized role change/i);
  });

  it.skipIf(SKIP)('student → pending_teacher (self-request) is allowed', async () => {
    const { error } = await clients.student!
      .from('profiles')
      .update({ role: 'pending_teacher' })
      .eq('id', UUIDS.student);
    // afterAll restores student role via super_admin
    expect(error).toBeNull();
  });

  it.skipIf(SKIP)('pending_teacher cannot escalate to teacher themselves', async () => {
    const { error } = await clients.pending_teacher!
      .from('profiles')
      .update({ role: 'teacher' })
      .eq('id', UUIDS.pending_teacher);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/unauthorized role change/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. RLS: progress — student sees only own rows
// ═══════════════════════════════════════════════════════════════════════════

describe('RLS: progress — student isolation', () => {
  it.skipIf(SKIP)('student only sees their own progress rows', async () => {
    const { data, error } = await clients.student!
      .from('progress')
      .select('user_id');
    expect(error).toBeNull();
    // All returned rows must belong to the student
    data!.forEach((row) => {
      expect(row.user_id).toBe(UUIDS.student);
    });
  });
});
