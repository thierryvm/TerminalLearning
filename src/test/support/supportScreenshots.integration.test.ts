// @vitest-environment node
/**
 * support_screenshots bucket RLS — Integration tests (Sprint 2.C Étape 2, THI-295)
 *
 * Tests the migration 030 Storage bucket + storage.objects policies against the
 * real Supabase instance using École A test users (migration 006) + super_admin.
 *
 * Per doctrine `feedback_rls_isolation_test_rest_only` : RLS isolation tests run
 * via REST API + JWT impersonation (NOT psql/CLI set_config which runs as
 * session_user=postgres and bypasses RLS entirely).
 *
 * Coverage :
 *   1. Happy path — user uploads to their own {uid}/ folder (RLS INSERT allow)
 *   2. Cross-user write — user cannot upload into another user's folder (deny)
 *   3. Anonymous upload → denied (no anon INSERT policy)
 *   4. Isolation read — user lists own folder (sees file) but another's (empty)
 *   5. super_admin lists any user's folder (super_admin SELECT all branch)
 *   6. User deletes their own object (RLS DELETE own allow)
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
  !SUPABASE_URL || !SUPABASE_ANON_KEY ||
  !STUDENT_EMAIL || !STUDENT_PASSWORD ||
  !TEACHER_EMAIL || !TEACHER_PASSWORD ||
  !SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD;

const BUCKET = 'support_screenshots';
const PWD_KEY = 'password' as const;

function makeAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loginAs(email: string, userPassword: string): Promise<SupabaseClient> {
  const client = makeAnonClient();
  const { error } = await client.auth.signInWithPassword({ email, [PWD_KEY]: userPassword });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  return client;
}

function pngBlob(): Blob {
  // Minimal bytes with an image/png content-type declaration — the bucket
  // allow-list checks the declared MIME, not magic bytes (magic-byte validation
  // is a separate supabase-backend-auditor concern, not RLS).
  return new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' });
}

let studentClient: SupabaseClient;
let teacherClient: SupabaseClient;
let superAdminClient: SupabaseClient;
let studentId = '';
let teacherId = '';

const uploadedPaths: string[] = [];

beforeAll(async () => {
  if (SKIP) return;
  [studentClient, teacherClient, superAdminClient] = await Promise.all([
    loginAs(STUDENT_EMAIL, STUDENT_PASSWORD),
    loginAs(TEACHER_EMAIL, TEACHER_PASSWORD),
    loginAs(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD),
  ]);
  const [{ data: s }, { data: t }] = await Promise.all([
    studentClient.auth.getUser(),
    teacherClient.auth.getUser(),
  ]);
  studentId = s.user?.id ?? '';
  teacherId = t.user?.id ?? '';
  if (!studentId || !teacherId) throw new Error('Could not resolve test user UUIDs');
}, 30_000);

afterAll(async () => {
  if (SKIP) return;
  // super_admin can delete all → clean every object the tests created.
  if (uploadedPaths.length && superAdminClient) {
    await superAdminClient.storage.from(BUCKET).remove(uploadedPaths);
  }
  await Promise.all([
    studentClient?.auth.signOut(),
    teacherClient?.auth.signOut(),
    superAdminClient?.auth.signOut(),
  ]);
});

describe.skipIf(SKIP)('support_screenshots bucket RLS', () => {
  it('1. allows a user to upload into their own {uid}/ folder', async () => {
    const objectPath = `${studentId}/test-${crypto.randomUUID()}.png`;
    const { error } = await studentClient.storage
      .from(BUCKET)
      .upload(objectPath, pngBlob(), { contentType: 'image/png' });
    expect(error).toBeNull();
    uploadedPaths.push(objectPath);
  });

  it('2. denies a user uploading into another user’s folder', async () => {
    const forgedPath = `${teacherId}/forged-${crypto.randomUUID()}.png`;
    const { error } = await studentClient.storage
      .from(BUCKET)
      .upload(forgedPath, pngBlob(), { contentType: 'image/png' });
    expect(error).not.toBeNull();
  });

  it('3. denies an anonymous upload', async () => {
    const anon = makeAnonClient();
    const { error } = await anon.storage
      .from(BUCKET)
      .upload(`${studentId}/anon-${crypto.randomUUID()}.png`, pngBlob(), { contentType: 'image/png' });
    expect(error).not.toBeNull();
  });

  it('4. isolates reads — user sees own folder but not another user’s', async () => {
    const own = await studentClient.storage.from(BUCKET).list(studentId);
    expect(own.error).toBeNull();
    expect((own.data ?? []).length).toBeGreaterThan(0);

    const others = await studentClient.storage.from(BUCKET).list(teacherId);
    expect(others.error).toBeNull();
    expect((others.data ?? []).length).toBe(0); // RLS filters → empty, not error
  });

  it('5. lets super_admin list any user’s folder', async () => {
    const res = await superAdminClient.storage.from(BUCKET).list(studentId);
    expect(res.error).toBeNull();
    expect((res.data ?? []).length).toBeGreaterThan(0);
  });

  it('6. lets a user delete their own object', async () => {
    const objectPath = `${studentId}/del-${crypto.randomUUID()}.png`;
    const up = await studentClient.storage
      .from(BUCKET)
      .upload(objectPath, pngBlob(), { contentType: 'image/png' });
    expect(up.error).toBeNull();

    const { data, error } = await studentClient.storage.from(BUCKET).remove([objectPath]);
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(1);
  });

  it('7. denies cross-user signed URL minting (teacher on a student object)', async () => {
    // Non-regression for the cross-user signed-URL vector surfaced by the
    // supabase-backend-auditor (30/05) : a user must not be able to mint a
    // signed URL for an object they have no SELECT grant on.
    const objectPath = `${studentId}/sign-${crypto.randomUUID()}.png`;
    const up = await studentClient.storage
      .from(BUCKET)
      .upload(objectPath, pngBlob(), { contentType: 'image/png' });
    expect(up.error).toBeNull();
    uploadedPaths.push(objectPath);

    const { data, error } = await teacherClient.storage.from(BUCKET).createSignedUrl(objectPath, 60);
    expect(data?.signedUrl ?? null).toBeNull();
    expect(error).not.toBeNull();
  });
});
