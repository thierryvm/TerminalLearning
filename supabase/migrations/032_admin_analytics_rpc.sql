-- Migration 032 — THI-234 Phase 9 Admin Panel : RPC analytics (widgets data-driven)
--
-- Contexte : l'AdminPanel (/app/admin, super_admin only) affichait 4 widgets
-- placeholder skeleton (THI-225). Cette migration livre les agrégats RÉELS pour
-- 2 des widgets (Santé Supabase + Heatmap activité élèves), budget 0€, sans
-- table dédiée (agrégats live depuis `progress` + `profiles`).
--
-- Pourquoi des RPC SECURITY DEFINER :
--   Les agrégats sont CROSS-USER (compter tous les users / toutes les leçons).
--   La RLS `progress: select own` / `profiles: select own` (migration 001) limite
--   chaque caller à SES propres lignes → un SELECT côté client ne verrait que
--   l'utilisateur courant. Une RPC SECURITY DEFINER contourne la RLS pour agréger,
--   MAIS pose un gate `super_admin` interne (mirror du pattern approve_teacher,
--   migration 027) pour que seul un super_admin obtienne les chiffres.
--
-- Sécurité (pattern 027 + 015) :
--   - SECURITY DEFINER + `set search_path = public` (anti search_path hijack)
--   - Gate interne `get_my_role() = 'super_admin'` → raise PERMISSION_DENIED sinon
--     (un student/teacher authentifié appelle mais ne reçoit JAMAIS de données)
--   - REVOKE EXECUTE FROM public, anon (PostgreSQL grant PUBLIC par défaut, cf. 015)
--   - GRANT EXECUTE TO authenticated only (le gate role fait le tri à l'intérieur)
--   - `stable` (lecture seule, pas d'écriture) → planification optimisable
--   - Aucune PII individuelle exposée : seulement des agrégats (counts) + lesson_id
--     (identifiant de contenu, pas de donnée personnelle)

-- ─── 1. Statistiques plateforme (widget « Santé Supabase ») ───────────────────
create or replace function public.admin_platform_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller_role text;
  result json;
begin
  caller_role := public.get_my_role();
  if caller_role is null or caller_role <> 'super_admin' then
    raise exception 'PERMISSION_DENIED: super_admin role required';
  end if;

  select json_build_object(
    'total_users', (select count(*) from public.profiles),
    'active_users_7d', (
      select count(distinct user_id)
      from public.progress
      where completed_at >= now() - interval '7 days'
    ),
    'lessons_completed_30d', (
      select count(*)
      from public.progress
      where completed = true and completed_at >= now() - interval '30 days'
    ),
    'lessons_completed_total', (
      select count(*) from public.progress where completed = true
    ),
    'top_lessons', (
      select coalesce(json_agg(t), '[]'::json)
      from (
        select lesson_id, count(*) as completions
        from public.progress
        where completed = true
        group by lesson_id
        order by count(*) desc, lesson_id asc
        limit 5
      ) t
    )
  ) into result;

  return result;
end;
$$;

revoke execute on function public.admin_platform_stats() from public;
revoke execute on function public.admin_platform_stats() from anon;
grant execute on function public.admin_platform_stats() to authenticated;

comment on function public.admin_platform_stats() is
  'THI-234 Phase 9. Agrégats plateforme cross-user (total users, actifs 7j, leçons complétées 30j/total, top 5 leçons) pour le widget Santé Supabase. SECURITY DEFINER + gate super_admin interne (raise PERMISSION_DENIED sinon) + REVOKE public/anon. Aucune PII individuelle (counts only).';

-- ─── 2. Heatmap activité élèves (widget THI-77, GitHub-style 365j) ────────────
create or replace function public.admin_activity_heatmap()
returns table(day date, completions bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  caller_role := public.get_my_role();
  if caller_role is null or caller_role <> 'super_admin' then
    raise exception 'PERMISSION_DENIED: super_admin role required';
  end if;

  -- group/order par position (1) pour éviter toute ambiguïté avec les colonnes
  -- OUT `day`/`completions` (piège 42702 RETURNS TABLE, cf. feedback_happy_path_testing).
  return query
    select (date_trunc('day', p.completed_at))::date as day, count(*)::bigint as completions
    from public.progress p
    where p.completed = true
      and p.completed_at >= now() - interval '365 days'
    group by 1
    order by 1;
end;
$$;

revoke execute on function public.admin_activity_heatmap() from public;
revoke execute on function public.admin_activity_heatmap() from anon;
grant execute on function public.admin_activity_heatmap() to authenticated;

comment on function public.admin_activity_heatmap() is
  'THI-234 Phase 9. Agrégat progress par jour sur 365j (leçons complétées) pour le widget Heatmap activité élèves (THI-77). SECURITY DEFINER + gate super_admin interne + REVOKE public/anon. Counts journaliers only, aucune PII.';
