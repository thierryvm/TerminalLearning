-- Migration 011: Fix RLS institutions SELECT leak
-- Issue: [H3] Teachers could list ALL institutions (org data leak)
-- Fix: Restrict SELECT to super_admin (all) or own institution (others)

-- ─── Context ──────────────────────────────────────────────────────────────────
-- Current policy: "authenticated select" allows ANY authenticated user to list ALL institutions
-- This is organizational data leak: teachers shouldn't see rival schools/institutions
--
-- Roles:
--   - super_admin: should see ALL institutions (for analytics, management)
--   - institution_admin: should see ONLY their institution
--   - teacher: should see ONLY their institution (for onboarding, coordination)
--   - pending_teacher: should see ONLY their institution
--   - student: should see ONLY their institution (or not at all, but we restrict to own)
--
-- Note: (b) Performance optimization (subselect efficiency) deferred to Phase 5.5 backlog
--       Current subselect `id = (select institution_id from profiles where id = auth.uid())`
--       could be optimized via indexed views or materialized institution_members table.
--       This fix addresses RLS security ONLY; perf audit separate ticket.

-- Drop old overly-permissive policy
drop policy if exists "institutions: authenticated select" on public.institutions;

-- Create restrictive policy: super_admin sees all, others see own institution
create policy "institutions: users see own institution"
  on public.institutions for select
  using (
    -- Super admin sees ALL institutions
    (select role from public.profiles where id = auth.uid()) = 'super_admin'
    OR
    -- Everyone else sees ONLY their own institution
    id = (select institution_id from public.profiles where id = auth.uid())
  );

-- Ensure profiles.role column exists (it was added in migration 005)
-- This assertion verifies the prerequisite table structure
assert exists (
  select 1 from information_schema.columns
  where table_name = 'profiles' and column_name = 'role'
), 'profiles.role column must exist (added in migration 005)';

-- Verification: Test policy on known roles
-- These are NOT actual test data, just SQL comments showing expected behavior:
--
-- SELECT * FROM institutions WHERE id = (SELECT institution_id FROM profiles WHERE id = '<teacher-id>');
-- -- Returns: 1 row (teacher sees only their institution)
--
-- SELECT * FROM institutions WHERE id != (SELECT institution_id FROM profiles WHERE id = '<teacher-id>');
-- -- Returns: 0 rows (teacher cannot see other institutions)
--
-- SELECT * FROM institutions; -- as super_admin
-- -- Returns: all rows (super_admin sees all)
