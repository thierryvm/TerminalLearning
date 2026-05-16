-- ─── 014: Revoke EXECUTE on SECURITY DEFINER trigger functions (THI-180) ────
-- Supabase Database Advisors (16 mai 2026) flagged 6 SECURITY DEFINER
-- functions in the `public` schema as callable via `/rest/v1/rpc/*` by
-- the `anon` and `authenticated` roles.
--
-- ⚠️ **NOT ALL CAN BE REVOKED** — three of them are invoked from inside RLS
-- policies (`get_my_role`, `get_my_institution_id`, `is_teacher_of_class`).
-- PostgreSQL requires the calling role to hold the EXECUTE privilege even
-- when a SECURITY DEFINER function is invoked indirectly via a USING clause,
-- so revoking EXECUTE from `authenticated` would break every RLS-protected
-- read on `profiles`, `institutions`, `classes`, etc.
--
-- The three remaining SECURITY DEFINER functions are **trigger-only** — they
-- are never appropriate to call as `/rest/v1/rpc/<name>` and PostgreSQL fires
-- their TRIGGER definitions without consulting GRANTs. Revoking is therefore
-- safe and closes the relevant PostgREST exposure surface.
--
-- ─── EXECUTE retention policy (per Sourcery review on PR #237) ──────────────
-- After this migration, EXECUTE on each function is held by:
--   • `handle_new_user()`         → `postgres` (owner) only.
--                                   Invoked by the auth.users INSERT trigger,
--                                   which fires under `supabase_auth_admin`
--                                   (cross-schema) without needing EXECUTE.
--   • `prevent_role_escalation()` → `postgres` (owner) only.
--                                   Invoked by the profiles UPDATE trigger
--                                   under the calling user — `postgres` owns
--                                   the trigger and runs it with definer rights.
--   • `rls_auto_enable()`         → `postgres` (owner) + `service_role`.
--                                   Manual admin helper, invoked via
--                                   Supabase service_role key (Dashboard /
--                                   migration runner / admin scripts).
--                                   `service_role` retains EXECUTE because it
--                                   bypasses RLS and inherits all privileges
--                                   on `public` by default — listed here so
--                                   future cleanup migrations preserve it.
--
-- ─── Idempotency (per Sourcery review on PR #237) ───────────────────────────
-- Each REVOKE + COMMENT is wrapped in a `DO` block that checks `pg_proc` first.
-- If a function has been renamed or dropped, the block becomes a no-op instead
-- of failing the whole migration. Safe to re-run across environments.
--
-- Refs:
--   - Supabase advisor lints 0028 + 0029
--   - Detected during THI-131 PR #236 cascade audit
--   - Linear: THI-180 (this migration)
--   - Linear: THI-182 (follow-up — move RLS helpers to a `private` schema
--     not exposed via PostgREST, completes the warning closure)
--   - 005_rbac_roles.sql (original SECURITY DEFINER intent)
--   - https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
--
-- Manual follow-up (NOT in this migration — requires Dashboard click):
--   - Auth → Settings → "Leaked password protection" → ON
--     (closes the auth_leaked_password_protection advisor)

-- ── 1. handle_new_user() — fires on INSERT into auth.users (001_init.sql:44).
--    Never called as RPC; never referenced in RLS policies.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'handle_new_user'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute 'revoke execute on function public.handle_new_user() from anon, authenticated';
    execute $cmt$comment on function public.handle_new_user() is
      'TRIGGER on auth.users INSERT — auto-creates profile row with role=student. '
      'SECURITY DEFINER for cross-schema write (auth → public). '
      'EXECUTE retained by postgres (owner) only. '
      'Revoked from anon/authenticated (THI-180) — invoked by trigger, never RPC.'$cmt$;
  end if;
end$$;

-- ── 2. prevent_role_escalation() — fires on UPDATE OF role ON profiles
--    (005_rbac_roles.sql:128). Trigger only.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'prevent_role_escalation'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute 'revoke execute on function public.prevent_role_escalation() from anon, authenticated';
    execute $cmt$comment on function public.prevent_role_escalation() is
      'TRIGGER on profiles UPDATE — blocks unauthorized role escalation. '
      'SECURITY DEFINER to read parent profile institution_id without RLS recursion. '
      'EXECUTE retained by postgres (owner) only. '
      'Revoked from anon/authenticated (THI-180) — invoked by trigger, never RPC.'$cmt$;
  end if;
end$$;

-- ── 3. rls_auto_enable() — admin helper, manual invocation only (no RLS user).
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from anon, authenticated';
    execute $cmt$comment on function public.rls_auto_enable() is
      'Admin helper to enable RLS on new tables. '
      'SECURITY DEFINER for ALTER TABLE permission. '
      'EXECUTE retained by postgres (owner) AND service_role (admin invocation). '
      'Revoked from anon/authenticated (THI-180) — never user-facing.'$cmt$;
  end if;
end$$;

-- ── NOT revoked (deliberate — would break RLS policies) ─────────────────────
--
-- public.get_my_role()                  → invoked in ~15 RLS USING clauses
-- public.get_my_institution_id()        → invoked in profiles/institutions RLS
-- public.is_teacher_of_class(uuid)      → invoked in classes/enrollments RLS
--
-- These three functions retain their `EXECUTE` grant on authenticated (and
-- anon, where applicable) because the PostgreSQL RLS evaluation runs the
-- USING expression under the calling user's role. Revoking would cause every
-- protected SELECT to fail with `permission denied for function`.
--
-- The advisor warning on these three is **acknowledged** and tracked in
-- THI-182: move them to a `private` schema that PostgREST does not expose,
-- update the ~15 policy references in one bundled migration.
