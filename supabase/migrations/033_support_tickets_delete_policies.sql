-- Migration 033 — support_tickets DELETE policies
-- THI-347 volet 3 (super_admin purge) + fix THI-334 root cause (test teardown).
--
-- Migration 028 granted select/insert/update to `authenticated` but NOT delete,
-- and defined no DELETE policy at all. Two consequences:
--   1. THI-347 volet 3 : super_admin cannot delete a ticket from the triage UI
--      (spam / obsolete / test rows) — only raw SQL could remove a row.
--   2. THI-334 root cause : the support integration tests' afterAll teardown
--      (`client.from('support_tickets').delete().in('id', createdIds)`, run as the
--      test student) silently fails (no DELETE grant/policy) → test rows pile up in
--      prod and fire a super_admin email on each `vitest` run.
--
-- Fix : grant delete + two DELETE policies. RLS OR-combines policies of the same
-- command, so a row is deletable if the caller owns it OR is super_admin.
--   - user delete own       → unblocks the test teardown (student deletes its own
--     rows) AND gives users the RGPD Art.17 right to erase their own reports.
--   - super_admin delete all → triage purge (THI-347 volet 3).
--
-- Security : both predicates are self-scoped (auth.uid()) or role-gated
-- (get_my_role()); no cross-user surface. `anon` stays revoked (migration 028
-- line 65 `revoke all ... from anon`). Deleting a row does NOT remove its storage
-- screenshot object — orphan cleanup is deferred (bucket is private + super_admin
-- read-only, so an orphan is inert; tracked for a later storage GC pass).

grant delete on public.support_tickets to authenticated;

-- drop-if-exists keeps this migration re-appliable (idempotent) on a fresh env.
drop policy if exists "support_tickets: user delete own" on public.support_tickets;
create policy "support_tickets: user delete own"
  on public.support_tickets
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "support_tickets: super_admin delete all" on public.support_tickets;
create policy "support_tickets: super_admin delete all"
  on public.support_tickets
  for delete
  to authenticated
  using (public.get_my_role() = 'super_admin');

comment on policy "support_tickets: user delete own" on public.support_tickets is
  'THI-347/THI-334. User erases own report (RGPD Art.17) + unblocks integration-test teardown DELETE.';
comment on policy "support_tickets: super_admin delete all" on public.support_tickets is
  'THI-347 volet 3. super_admin purges any ticket from the triage UI (spam/obsolete/test rows).';
