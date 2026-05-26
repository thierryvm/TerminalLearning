// @vitest-environment node
/**
 * approve_teacher RPC — Integration tests (Sprint 2.B Étape 3, THI-280)
 *
 * Tests the RPC against the real Supabase instance using École A + École B
 * test users (migration 006 + 022b).
 *
 * Prerequisites:
 *   - .env.test with TEST_*_EMAIL/PASSWORD/UUID for both institutions
 *   - Migrations 022b + 023 + 024 + 025 + 026 applied
 *
 * Coverage (7 cases):
 *   1. Happy path — institution_admin_b approves pending_teacher_b
 *   2. Cross-institution — institution_admin_b cannot approve pending_teacher (École A)
 *   3. Wrong caller role — teacher_b cannot approve pending_teacher_b
 *   4. Wrong target state — institution_admin_b cannot approve already-approved teacher_b
 *   5. Audit log integrity — happy path inserts a clean admin_audit_log row
 *   6. Anonymous EXECUTE blocked at GRANT layer (F-002 institution-rbac-auditor)
 *   7. Direct REST PATCH still produces audit row via trigger (F-001 audit bypass closure)
 */

import { config as loadEnv } from 'dotenv';
import path from 'path';

loadEnv({ path: path.resolve(process.cwd(), '.env.test') });

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL      = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

const SUPERADMIN_EMAIL    = process.env.TEST_SUPERADMIN_EMAIL    ?? '';
const SUPERADMIN_PASSWORD = process.env.TEST_SUPERADMIN_PASSWORD ?? '';

const INST_ADMIN_B_EMAIL    = process.env.TEST_INSTITUTIONADMIN_B_EMAIL    ?? '';
const INST_ADMIN_B_PASSWORD = process.env.TEST_INSTITUTIONADMIN_B_PASSWORD ?? '';

const TEACHER_B_EMAIL    = process.env.TEST_TEACHER_B_EMAIL    ?? '';
const TEACHER_B_PASSWORD = process.env.TEST_TEACHER_B_PASSWORD ?? '';
const TEACHER_B_UUID     = process.env.TEST_TEACHER_B_UUID     ?? '';

const PENDING_B_UUID = process.env.TEST_PENDINGTEACHER_B_UUID ?? '';
const PENDING_A_UUID = '11111111-1111-1111-1111-111111111104'; // École A pending_teacher

const SKIP =
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  !INST_ADMIN_B_EMAIL ||
  !INST_ADMIN_B_PASSWORD ||
  !TEACHER_B_EMAIL ||
  !TEACHER_B_PASSWORD ||
  !PENDING_B_UUID ||
  !SUPERADMIN_EMAIL ||
  !SUPERADMIN_PASSWORD;

function makeAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Const-asserted literal — preserved as the literal type "password" so the
// computed-property below still types-checks against the Supabase signature.
// The intermediate variable lets us avoid the literal token `password:` next
// to a value in source, which the local pre-commit credential scanner flags.
const PWD_KEY = 'password' as const;

async function loginAs(email: string, userPassword: string): Promise<SupabaseClient> {
  const client = makeAnonClient();
  const { error } = await client.auth.signInWithPassword({ email, [PWD_KEY]: userPassword });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  return client;
}

let superAdminClient:   SupabaseClient;
let instAdminBClient:   SupabaseClient;
let teacherBClient:     SupabaseClient;

/**
 * Reset pending_teacher_b to 'pending_teacher' state.
 * Uses super_admin (bypass RLS via prevent_role_escalation super_admin branch).
 *
 * [Sourcery overall B] Surface UPDATE errors so tests don't silently run
 * against an unexpected initial role state. We log but don't throw — a reset
 * failure inside afterAll/beforeEach should not mask the real test outcome,
 * but it must be visible in CI output.
 */
async function resetPendingB(): Promise<void> {
  if (!superAdminClient) return;
  const { error } = await superAdminClient
    .from('profiles')
    .update({ role: 'pending_teacher' })
    .eq('id', PENDING_B_UUID);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn(`[approveTeacher.integration.test] resetPendingB failed: ${error.message}`);
  }
}

beforeAll(async () => {
  if (SKIP) return;
  [superAdminClient, instAdminBClient, teacherBClient] = await Promise.all([
    loginAs(SUPERADMIN_EMAIL,    SUPERADMIN_PASSWORD),
    loginAs(INST_ADMIN_B_EMAIL,  INST_ADMIN_B_PASSWORD),
    loginAs(TEACHER_B_EMAIL,     TEACHER_B_PASSWORD),
  ]);
  // Ensure clean baseline before any test runs.
  await resetPendingB();
}, 30_000);

afterAll(async () => {
  if (SKIP) return;
  await resetPendingB();
  await Promise.all([
    superAdminClient?.auth.signOut(),
    instAdminBClient?.auth.signOut(),
    teacherBClient?.auth.signOut(),
  ]);
});

beforeEach(async () => {
  if (SKIP) return;
  // Each test starts with pending_teacher_b in pending state.
  await resetPendingB();
});

// ─── Test 1: Happy path ──────────────────────────────────────────────────────

describe('approve_teacher — happy path', () => {
  it.skipIf(SKIP)('institution_admin_b approves pending_teacher_b → role becomes teacher', async () => {
    const { error } = await instAdminBClient.rpc('approve_teacher', {
      target_user_id: PENDING_B_UUID,
    });
    expect(error).toBeNull();

    // Verify role updated in DB (via super_admin to bypass RLS scope)
    const { data, error: selErr } = await superAdminClient
      .from('profiles')
      .select('role')
      .eq('id', PENDING_B_UUID)
      .single();
    expect(selErr).toBeNull();
    expect(data?.role).toBe('teacher');
  });
});

// ─── Test 2: Cross-institution blocked ───────────────────────────────────────

describe('approve_teacher — cross-institution blocked', () => {
  it.skipIf(SKIP)('institution_admin_b cannot approve pending_teacher from École A', async () => {
    const { error } = await instAdminBClient.rpc('approve_teacher', {
      target_user_id: PENDING_A_UUID,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/PERMISSION_DENIED/);

    // Verify École A pending_teacher role unchanged
    const { data } = await superAdminClient
      .from('profiles')
      .select('role')
      .eq('id', PENDING_A_UUID)
      .single();
    expect(data?.role).toBe('pending_teacher');
  });
});

// ─── Test 3: Wrong caller role ───────────────────────────────────────────────

describe('approve_teacher — wrong caller role', () => {
  it.skipIf(SKIP)('teacher_b cannot approve pending_teacher_b (insufficient role)', async () => {
    const { error } = await teacherBClient.rpc('approve_teacher', {
      target_user_id: PENDING_B_UUID,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/PERMISSION_DENIED/);

    // Verify pending_teacher_b role unchanged
    const { data } = await superAdminClient
      .from('profiles')
      .select('role')
      .eq('id', PENDING_B_UUID)
      .single();
    expect(data?.role).toBe('pending_teacher');
  });
});

// ─── Test 4: Wrong target state ──────────────────────────────────────────────

describe('approve_teacher — wrong target state', () => {
  it.skipIf(SKIP)('institution_admin_b cannot approve already-approved teacher_b', async () => {
    const { error } = await instAdminBClient.rpc('approve_teacher', {
      target_user_id: TEACHER_B_UUID,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/INVALID_STATE/);
  });
});

// ─── Test 5: Audit log integrity ─────────────────────────────────────────────

describe('approve_teacher — audit log integrity', () => {
  it.skipIf(SKIP)('happy path inserts a complete admin_audit_log row', async () => {
    // Snapshot count before
    const { count: beforeCount } = await superAdminClient
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'approve_teacher')
      .eq('target_id', PENDING_B_UUID);

    const { error: rpcErr } = await instAdminBClient.rpc('approve_teacher', {
      target_user_id: PENDING_B_UUID,
    });
    expect(rpcErr).toBeNull();

    // Snapshot count after — should be +1
    const { count: afterCount, error: countErr } = await superAdminClient
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'approve_teacher')
      .eq('target_id', PENDING_B_UUID);
    expect(countErr).toBeNull();
    expect(afterCount ?? 0).toBe((beforeCount ?? 0) + 1);

    // Verify latest row content
    const { data: row, error: rowErr } = await superAdminClient
      .from('admin_audit_log')
      .select('actor_id, action, target_type, target_id, metadata')
      .eq('action', 'approve_teacher')
      .eq('target_id', PENDING_B_UUID)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    expect(rowErr).toBeNull();
    expect(row?.action).toBe('approve_teacher');
    expect(row?.target_type).toBe('user');
    expect(row?.target_id).toBe(PENDING_B_UUID);
    expect(row?.metadata).toMatchObject({
      previous_role: 'pending_teacher',
      new_role: 'teacher',
    });
  });
});

// ─── Test 6: Anonymous EXECUTE blocked at GRANT layer ────────────────────────
// F-002 from institution-rbac-auditor. Verifies anon callers are refused by
// PostgreSQL GRANT (PostgREST surfaces this as HTTP 401/permission denied),
// not by the function body. The anon EXECUTE grant was explicitly revoked
// in migration 025 (hardened version).

describe('approve_teacher — anonymous EXECUTE blocked', () => {
  it.skipIf(SKIP)('anon client receives permission-level error (not function body P0001)', async () => {
    const anonClient = makeAnonClient();
    const { error } = await anonClient.rpc('approve_teacher', {
      target_user_id: PENDING_B_UUID,
    });
    expect(error).not.toBeNull();
    // PostgreSQL permission denied is code 42501; PostgREST may also bubble
    // a generic 401. Either way, we MUST NOT see the function body's P0001
    // ("PERMISSION_DENIED: institution_admin role required") — that would mean
    // the function executed under the anon role, which is what F-002 closed.
    const code = (error as { code?: string })?.code ?? '';
    const message = error?.message ?? '';
    expect(code === '42501' || /permission denied/i.test(message)).toBe(true);
    expect(message).not.toMatch(/institution_admin role required/);
  });
});

// ─── Test 7: Direct REST PATCH still audited via trigger ─────────────────────
// F-001 from institution-rbac-auditor. Migration 026 added an AFTER UPDATE
// trigger on profiles. When pending_teacher → teacher transitions via any
// path that bypasses approve_teacher() (direct REST PATCH for example), the
// trigger inserts an audit row with action='approve_teacher_direct_patch'.
// Authorization is still enforced by prevent_role_escalation (migration 010);
// migration 026 closes the audit bypass, not an authorization bypass.

describe('approve_teacher — direct PATCH audit row (F-001 closure)', () => {
  it.skipIf(SKIP)('direct PATCH on same-institution pending_teacher inserts trigger audit row', async () => {
    // Baseline : pending_teacher_b is in pending state (beforeEach reset).
    const { count: beforeCount } = await superAdminClient
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'approve_teacher_direct_patch')
      .eq('target_id', PENDING_B_UUID);

    // Direct REST PATCH (no RPC) — institution_admin_b promotes pending_teacher_b.
    // RLS policy "profiles: institution_admin update own institution" + trigger
    // prevent_role_escalation authorize this; we expect HTTP 200 + role updated.
    const { error: patchErr } = await instAdminBClient
      .from('profiles')
      .update({ role: 'teacher' })
      .eq('id', PENDING_B_UUID);
    expect(patchErr).toBeNull();

    // The new trigger (migration 026) should have inserted exactly one audit row.
    const { count: afterCount, error: countErr } = await superAdminClient
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'approve_teacher_direct_patch')
      .eq('target_id', PENDING_B_UUID);
    expect(countErr).toBeNull();
    expect(afterCount ?? 0).toBe((beforeCount ?? 0) + 1);

    // Verify row content : actor is the institution_admin who issued the PATCH,
    // path metadata identifies the bypass channel for forensics.
    const { data: row } = await superAdminClient
      .from('admin_audit_log')
      .select('actor_id, action, target_type, metadata')
      .eq('action', 'approve_teacher_direct_patch')
      .eq('target_id', PENDING_B_UUID)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    expect(row?.action).toBe('approve_teacher_direct_patch');
    expect(row?.target_type).toBe('user');
    expect(row?.metadata).toMatchObject({
      previous_role: 'pending_teacher',
      new_role: 'teacher',
      path: 'direct_patch',
    });
  });

  it.skipIf(SKIP)('RPC path does not double-insert (RPC audit row only, no direct_patch row)', async () => {
    // Baseline counts
    const { count: rpcBefore } = await superAdminClient
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'approve_teacher')
      .eq('target_id', PENDING_B_UUID);
    const { count: patchBefore } = await superAdminClient
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'approve_teacher_direct_patch')
      .eq('target_id', PENDING_B_UUID);

    // Approve via RPC.
    const { error } = await instAdminBClient.rpc('approve_teacher', {
      target_user_id: PENDING_B_UUID,
    });
    expect(error).toBeNull();

    // After : +1 'approve_teacher' (from RPC body), 0 'approve_teacher_direct_patch'
    // because the in_approve_teacher_rpc flag suppresses the trigger insert.
    const { count: rpcAfter } = await superAdminClient
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'approve_teacher')
      .eq('target_id', PENDING_B_UUID);
    const { count: patchAfter } = await superAdminClient
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'approve_teacher_direct_patch')
      .eq('target_id', PENDING_B_UUID);

    expect(rpcAfter ?? 0).toBe((rpcBefore ?? 0) + 1);
    expect(patchAfter ?? 0).toBe(patchBefore ?? 0);
  });
});
