-- ─── 015: Revoke EXECUTE from PUBLIC on trigger-only functions (THI-180 complete) ───
-- Follow-up complétant la migration 014.
--
-- ⚠️ ROOT CAUSE découvert post-014 :
-- PostgreSQL accorde `EXECUTE` à `PUBLIC` par défaut sur toute nouvelle fonction.
-- Les rôles `anon` et `authenticated` héritent de `PUBLIC`. Donc :
--   REVOKE EXECUTE FROM anon, authenticated  (migration 014)
-- ne ferme PAS la surface d'attaque PostgREST `/rest/v1/rpc/*` — le grant
-- PUBLIC reste actif et anon/authenticated continuent à pouvoir invoquer.
--
-- `has_function_privilege('anon', 'public.<fn>()', 'EXECUTE')` retourne `true`
-- après application de 014, ce qui invalide la promesse de hardening.
--
-- Cette migration corrige en révoquant aussi FROM PUBLIC sur les 3 fonctions
-- trigger-only. PostgreSQL n'a pas besoin du droit EXECUTE pour invoquer un
-- trigger (le trigger s'exécute sous le rôle du propriétaire en SECURITY
-- DEFINER, ou sous le rôle de la transaction en SECURITY INVOKER — les
-- triggers ne consultent pas les GRANT côté EXECUTE).
--
-- ⚠️ NE PAS appliquer à `get_my_role()`, `get_my_institution_id()`,
-- `is_teacher_of_class(uuid)` — ces 3 fonctions sont invoquées depuis ~15
-- clauses USING de policies RLS. PostgreSQL exige EXECUTE pour l'évaluation
-- USING même en SECURITY DEFINER. REVOKE FROM PUBLIC casserait toutes les
-- SELECT protégées avec `permission denied for function`.
--
-- Tracker THI-182 (Backlog Low) : déplacer ces 3 fonctions dans un schéma
-- `private` non-exposé par PostgREST = la solution propre, sans toucher aux
-- grants.
--
-- Refs:
--   - Migration 014 (PR #237) — REVOKE chirurgical FROM anon, authenticated (insuffisant)
--   - Supabase advisor lints 0028 + 0029
--   - PostgreSQL docs : https://www.postgresql.org/docs/current/sql-grant.html
--     "If no privileges are granted to PUBLIC, PUBLIC has no privileges. ..."
--     → comportement par défaut = PUBLIC grant à la création
--   - Découverte empirique post-014 : `has_function_privilege` confirme PUBLIC inheritance
--   - THI-180 (PR #237) — première tentative
--   - THI-182 (Backlog) — RLS helpers vers schema `private`

-- ── Trigger-only functions: revoke from PUBLIC ─────────────────────────────

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'handle_new_user'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute 'revoke execute on function public.handle_new_user() from public';
  end if;
end$$;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'prevent_role_escalation'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute 'revoke execute on function public.prevent_role_escalation() from public';
  end if;
end$$;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from public';
  end if;
end$$;

-- Note : service_role conserve EXECUTE sur rls_auto_enable() via son
-- statut superuser-equivalent (bypass RLS + tous les grants). Pas besoin
-- d'un GRANT explicite à service_role.
