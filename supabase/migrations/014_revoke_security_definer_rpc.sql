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

-- ── Trigger-only functions: SAFE to revoke (no callers via REST or RLS) ─────

-- 1. handle_new_user() — fires on INSERT into auth.users (defined 001_init.sql:44).
--    Never called as RPC; never referenced in RLS policies.
revoke execute on function public.handle_new_user() from anon, authenticated;

-- 2. prevent_role_escalation() — fires on UPDATE OF role ON profiles
--    (defined 005_rbac_roles.sql:128). Trigger only.
revoke execute on function public.prevent_role_escalation() from anon, authenticated;

-- 3. rls_auto_enable() — admin helper, manual invocation only (no RLS user)
revoke execute on function public.rls_auto_enable() from anon, authenticated;

-- ── Documentation comments ──────────────────────────────────────────────────

comment on function public.handle_new_user() is
  'TRIGGER on auth.users INSERT — auto-creates profile row with role=student. '
  'SECURITY DEFINER for cross-schema write (auth → public). '
  'EXECUTE revoked from anon/authenticated (THI-180) — invoked by trigger only.';

comment on function public.prevent_role_escalation() is
  'TRIGGER on profiles UPDATE — blocks unauthorized role escalation. '
  'SECURITY DEFINER to read parent profile institution_id without RLS recursion. '
  'EXECUTE revoked from anon/authenticated (THI-180) — invoked by trigger only.';

comment on function public.rls_auto_enable() is
  'Admin helper to enable RLS on new tables. '
  'SECURITY DEFINER for ALTER TABLE permission. '
  'EXECUTE revoked from anon/authenticated (THI-180) — admin manual invocation only.';

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
