-- Migration 033 — support_tickets DELETE policies
-- THI-347 volet 3 (super_admin purge) + fix THI-334 root cause (test teardown).
--
-- Migration 028 created the table; migration 029 (security hardening) already added
-- the `super_admin delete all` DELETE policy + `grant delete to authenticated`. What
-- was STILL missing: a `user delete own` DELETE policy — the ONLY genuinely new policy
-- this migration adds. Two consequences of its absence:
--   1. THI-347 volet 3 : super_admin could already delete via REST (029) but the
--      triage UI had no delete button — this PR adds the button (backend was ready).
--   2. THI-334 root cause : the support integration tests' afterAll teardown
--      (`client.from('support_tickets').delete().in('id', createdIds)`, run as the
--      test student) silently failed — no `user delete own` policy → test rows piled
--      up in prod and fired a super_admin email on each `vitest` run.
--
-- This migration adds `user delete own` and re-states (drop+recreate, idempotent)
-- `super_admin delete all` from 029 so the file is self-contained on a fresh env.
-- RLS OR-combines DELETE policies → a row is deletable if owned OR caller super_admin.
--   - user delete own       → unblocks the test teardown (student deletes its own
--     rows) AND gives users the RGPD Art.17 right to erase their own reports.
--   - super_admin delete all → triage purge (THI-347 volet 3) — origin: migration 029.
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
