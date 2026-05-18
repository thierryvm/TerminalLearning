-- ─── 017: Fix Supabase advisor warnings on migration 016 ────────────────────
-- THI-235 Sprint 2.A — Post-016 advisor cleanup
--
-- Two Supabase database linter warnings raised after applying 016 :
--
-- WARN function_search_path_mutable (linter 0011) :
--   `generate_invitation_code()` and `set_invitation_code_before_insert()`
--   have no `SET search_path` directive. A malicious schema in the user's
--   `search_path` could in theory shadow the `public.classes` reference.
--   Fix : ALTER FUNCTION ... SET search_path = public on both.
--
-- WARN anon_security_definer_function_executable (linter 0028) :
--   `join_class_by_code()` is callable by `anon` role via
--   /rest/v1/rpc/join_class_by_code. The function already raises 42501 if
--   auth.uid() is null, so the exploit path is closed in-function. But the
--   advisor wants an explicit REVOKE FROM anon at the SQL level for
--   defense-in-depth (PostgREST won't even route the call).
--   Fix : REVOKE EXECUTE FROM anon. The existing GRANT TO authenticated
--   remains, so the function works exactly as designed for signed-in users.
--
-- Score impact : closes 2 WARN advisors from migration 016 → expected
-- security-auditor +0.1 vs current 9.2/10.

-- ─── 1. Fix function_search_path_mutable on helpers ─────────────────────────
alter function public.generate_invitation_code() set search_path = public;

alter function public.set_invitation_code_before_insert() set search_path = public;

-- ─── 2. Fix anon_security_definer_function_executable on join RPC ───────────
revoke execute on function public.join_class_by_code(text) from anon;

-- Note : authenticated GRANT remains (set in migration 016). Verified via
-- pg_proc.proacl AFTER this migration — only `authenticated=X/postgres` and
-- `postgres=X/postgres` should remain in the ACL.
