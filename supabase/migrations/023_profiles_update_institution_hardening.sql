-- ─── 023: Profiles UPDATE WITH CHECK — block institution_id hijacking ─────────
-- Sprint 2.B (THI-280) — fix HIGH [H1] from security-auditor 2026-05-26
--
-- ## Issue
--
-- Policy `"profiles: update own"` (migration 003) was created with USING only,
-- no WITH CHECK clause :
--
--   create policy "profiles: update own" on public.profiles
--     for update using ((select auth.uid()) = id);
--
-- This allows ANY authenticated user to `UPDATE profiles SET institution_id =
-- '<arbitrary-uuid>' WHERE id = auth.uid()`. The `prevent_role_escalation`
-- trigger (migration 010) only checks the `role` column — it leaves
-- `institution_id` modifications unchecked.
--
-- ## Why it matters NOW
--
-- Standalone : low impact. An attacker who self-assigns institution_id of
-- "Ecole B" doesn't gain SELECT access (they need `role = institution_admin`
-- or `teacher` already, neither of which they can grant themselves due to
-- the role escalation trigger).
--
-- Combined with Sprint 2.B Etape 3 (RPC `approve_teacher`) : CRITICAL.
-- The approve_teacher RPC will gate on `caller.institution_id =
-- target.institution_id`. If institution_id is self-injectable, the gate
-- is trivially bypassable by an institution_admin from Ecole A who first
-- changes their own institution_id to Ecole B, then approves a pending
-- teacher in Ecole B.
--
-- ## Fix
--
-- Add WITH CHECK clause that enforces TWO invariants on UPDATE :
--
-- 1. `auth.uid() = id` (own row only — same as USING)
-- 2. `institution_id IS NOT DISTINCT FROM <current value>` — institution_id
--    cannot change via this policy
--
-- The legitimate institution_id mutation paths remain :
-- - `"profiles: institution_admin update own institution"` (migration 009) :
--   institution_admin can update profiles in their own institution
-- - `"profiles: super_admin update all"` (migration 009) : super_admin bypass
-- - Future `approve_teacher` RPC (Etape 3) : SECURITY DEFINER, controlled
--
-- ## Verification
--
-- After apply, empirical test :
--   - student/teacher/institution_admin tries `UPDATE profiles SET
--     institution_id = '<other_inst_uuid>' WHERE id = auth.uid()` → must
--     return 0 rows affected (RLS deny silent) or RAISE based on Postgres
--     behaviour
--   - student tries `UPDATE profiles SET display_name = 'new' WHERE
--     id = auth.uid()` → must succeed (legitimate use case)

drop policy if exists "profiles: update own" on public.profiles;

-- Note d'implémentation (apprentissage empirique 26/05/2026) :
-- La première version utilisait un sub-SELECT direct sur public.profiles dans
-- WITH CHECK, ce qui déclenchait "infinite recursion detected in policy for
-- relation profiles" (code 42P17) — la policy s'évaluait récursivement.
-- Fix : utiliser get_my_institution_id() qui est SECURITY DEFINER (bypass RLS)
-- et STABLE (cached intra-query). Pattern documenté migration 007.
create policy "profiles: update own"
  on public.profiles
  for update
  using ((select auth.uid()) = id)
  with check (
    (select auth.uid()) = id
    -- Block institution_id hijacking via self-update.
    -- IS NOT DISTINCT FROM handles NULL correctly :
    --   NULL = NULL is NULL (not TRUE), but NULL IS NOT DISTINCT FROM NULL is TRUE
    --   Useful for pending_teacher whose institution_id may be NULL initially
    and institution_id is not distinct from get_my_institution_id()
  );

-- Verify the policy was created
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles'
      and policyname = 'profiles: update own'
      and cmd = 'UPDATE'
      and with_check is not null
  ) then
    raise exception 'Policy "profiles: update own" must exist with WITH CHECK clause';
  end if;
end $$;
