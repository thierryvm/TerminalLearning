-- ─── 034: Revoke EXECUTE on trigger-only SECURITY DEFINER functions (advisor 0028/0029) ───
-- Supabase Database Advisors flag two SECURITY DEFINER functions in the `public`
-- schema as callable via `/rest/v1/rpc/*` by the `anon` and `authenticated` roles:
--
--   • public.audit_pending_teacher_promotion()   (migration 026, THI-280)
--   • public.log_support_ticket_status_change()   (migrations 028 + 029)
--
-- Both are **trigger-only** — attached to AFTER-UPDATE triggers on `profiles`
-- and `support_tickets` respectively, and never invoked as `/rest/v1/rpc/<name>`.
-- A grep of `src/` confirms ZERO `.rpc()` call sites for either (both appear
-- only inside code comments). PostgreSQL fires a TRIGGER without consulting the
-- EXECUTE grant on the trigger function, so revoking EXECUTE from every
-- user-facing role closes the PostgREST exposure surface with ZERO functional
-- impact.
--
-- This is the exact treatment already applied to handle_new_user(),
-- prevent_role_escalation() and rls_auto_enable() in migrations 014 + 015
-- (THI-180). Those three predate 026/029; the two functions here were introduced
-- afterwards and inherited PostgreSQL's default PUBLIC EXECUTE grant (which
-- anon/authenticated inherit) — hence the fresh advisor hit.
--
-- ─── Explicitly NOT touched (deliberate) ────────────────────────────────────
--   • get_my_role(), get_my_institution_id(), is_teacher_of_class(uuid)
--     → RLS helpers invoked inside ~15 USING clauses. PostgreSQL requires the
--       calling role to hold EXECUTE even for a SECURITY DEFINER function used
--       in a policy expression; revoking would break every protected read with
--       `permission denied for function`. The clean fix is to move them to a
--       `private` schema not exposed by PostgREST (Supabase-documented pattern,
--       confirmed via Context7 /supabase/supabase) — tracked THI-182, separate
--       audited PR.
--   • admin_platform_stats(), admin_activity_heatmap(), approve_teacher(uuid),
--     join_class_by_code(text)
--     → legitimate authenticated-facing RPCs called by the frontend
--       (useAdminAnalytics, useJoinClass, usePendingTeachers). They are SECURITY
--       DEFINER by design (cross-user aggregation / privileged writes) and
--       self-guard with an internal `get_my_role()` gate that raises
--       PERMISSION_DENIED for non-privileged callers. The
--       `authenticated_security_definer_function_executable` warning on these is
--       acknowledged and correct — revoking `authenticated` would break the
--       Admin panel, teacher approval and student class-join. Left callable.
--
-- Idempotent: each REVOKE + COMMENT is wrapped in a `DO` block guarded on
-- pg_proc, so a renamed/dropped function makes the block a no-op instead of
-- failing the whole migration. Safe to re-run across environments.
--
-- Refs:
--   - Supabase advisor lints 0028 + 0029
--   - Migrations 014 + 015 (THI-180) — same pattern, prior functions
--   - Migration 026 (audit trigger on profiles) + 028/029 (support-ticket trigger)
--   - https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
--   - THI-182 (backlog) — move RLS helpers to a `private` schema

-- ── 1. audit_pending_teacher_promotion() — AFTER UPDATE trigger on profiles
--    (migration 026). Fires on pending_teacher → teacher promotions. Never RPC.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'audit_pending_teacher_promotion'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute 'revoke execute on function public.audit_pending_teacher_promotion() from public, anon, authenticated';
    execute $cmt$comment on function public.audit_pending_teacher_promotion() is
      'TRIGGER on profiles UPDATE (migration 026, THI-280) — audits pending_teacher → teacher promotions performed via direct REST PATCH (RPC path is de-duplicated via a txn-local flag). SECURITY DEFINER to write admin_audit_log across RLS. EXECUTE retained by postgres (owner) only; revoked from public/anon/authenticated (advisor 0028/0029, migration 034) — invoked by trigger, never RPC.'$cmt$;
  end if;
end$$;

-- ── 2. log_support_ticket_status_change() — AFTER UPDATE trigger on
--    support_tickets (trigger created in migration 028, function hardened in
--    029). Fires on status change. Never RPC.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'log_support_ticket_status_change'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute 'revoke execute on function public.log_support_ticket_status_change() from public, anon, authenticated';
    execute $cmt$comment on function public.log_support_ticket_status_change() is
      'TRIGGER on support_tickets UPDATE (migrations 028 + 029) — logs status changes to admin_audit_log (service_role caller skipped via auth.uid() NULL guard). SECURITY DEFINER for cross-RLS audit write. EXECUTE retained by postgres (owner) only; revoked from public/anon/authenticated (advisor 0028/0029, migration 034) — invoked by trigger, never RPC.'$cmt$;
  end if;
end$$;
