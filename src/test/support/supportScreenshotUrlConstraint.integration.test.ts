// @vitest-environment node
/**
 * support_tickets.screenshot_url CHECK constraint — Integration tests
 * (Sprint 2.C Étape 2, THI-295, migration 031 — security-auditor H1 hardening).
 *
 * The migration 029 M1 CHECK was anchored at START only, so an attribute-breakout
 * payload (`...support_screenshots/x.png"><img src=x onerror=...>`) was ACCEPTED —
 * the advertised "XSS defense" was just a prefix filter. Migration 031 re-anchors
 * end-to-end + restricts characters. These tests lock that fix : a real signed-URL
 * shape inserts; HTML-breakout / space-injection / javascript: are rejected (23514).
 *
 * Per doctrine `feedback_rls_isolation_test_rest_only` : run via REST API + JWT.
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';

loadEnv({ path: path.resolve(process.cwd(), '.env.local') });
loadEnv({ path: path.resolve(process.cwd(), '.env.test') });

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL      = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';
const STUDENT_EMAIL     = process.env.TEST_STUDENT_EMAIL ?? '';
const STUDENT_PASSWORD  = process.env.TEST_STUDENT_PASSWORD ?? '';

const SKIP = !SUPABASE_URL || !SUPABASE_ANON_KEY || !STUDENT_EMAIL || !STUDENT_PASSWORD;
const PWD_KEY = 'password' as const;

let client: SupabaseClient;
let userId = '';
let ref = '';
const createdIds: string[] = [];

beforeAll(async () => {
  if (SKIP) return;
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email: STUDENT_EMAIL, [PWD_KEY]: STUDENT_PASSWORD });
  if (error) throw new Error(`Login failed: ${error.message}`);
  userId = (await client.auth.getUser()).data.user?.id ?? '';
  ref = SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\./)?.[1] ?? '';
  if (!userId || !ref) throw new Error('Could not resolve user id / project ref');
}, 30_000);

afterAll(async () => {
  if (SKIP) return;
  if (createdIds.length) await client.from('support_tickets').delete().in('id', createdIds);
  await client?.auth.signOut();
});

async function insertWithUrl(screenshot_url: string) {
  const r = await client
    .from('support_tickets')
    .insert({ user_id: userId, type: 'bug', description: 'screenshot_url constraint test row.', screenshot_url })
    .select('id')
    .single();
  if (r.data?.id) createdIds.push(r.data.id);
  return r;
}

describe.skipIf(SKIP)('support_tickets.screenshot_url CHECK (migration 031)', () => {
  it('accepts a real Storage signed-URL shape', async () => {
    const url = `https://${ref}.supabase.co/storage/v1/object/sign/support_screenshots/${userId}/x.png?token=abc.def-ghi_jkl`;
    const { error } = await insertWithUrl(url);
    expect(error).toBeNull();
  });

  it('rejects an attribute-breakout payload (H1)', async () => {
    const url = `https://${ref}.supabase.co/storage/v1/object/sign/support_screenshots/${userId}/x.png"><img src=x onerror=alert(1)>`;
    const { error } = await insertWithUrl(url);
    expect(error).not.toBeNull();
    expect(error?.code).toBe('23514'); // check_violation
  });

  it('rejects a space / second-URL injection', async () => {
    const url = `https://${ref}.supabase.co/storage/v1/object/sign/support_screenshots/${userId}/x.png javascript:alert(1)`;
    const { error } = await insertWithUrl(url);
    expect(error).not.toBeNull();
    expect(error?.code).toBe('23514');
  });

  it('rejects a javascript: scheme outright', async () => {
    const { error } = await insertWithUrl('javascript:alert(document.domain)');
    expect(error).not.toBeNull();
    expect(error?.code).toBe('23514');
  });

  it('rejects an external https host (not supabase storage)', async () => {
    const { error } = await insertWithUrl('https://evil.example.com/storage/v1/object/sign/support_screenshots/x.png');
    expect(error).not.toBeNull();
    expect(error?.code).toBe('23514');
  });
});
