-- Migration 027 — Hotfix Sprint 2.B reliquat — super_admin can approve teachers
--
-- Bug UX trouvé empiriquement 26/05/2026 par @thierry post-Sprint 2.B Étape 4 :
--   * super_admin connecté voit /app/institution + 2 pending teachers (RLS allow
--     cross-institution = intentional pour super_admin)
--   * Click "Approuver" → erreur "Vous n'avez pas la permission d'approuver ce profil"
--   * Root cause : RPC approve_teacher body check `caller_role = 'institution_admin'`
--     strict, rejette super_admin
--   * RequireRole UI permissif (institution_admin + super_admin) → divergence UX
--
-- Doc : memory/project_sprint_2b_super_admin_approve_bug.md (Option A recommandée).
--
-- Cette migration étend `approve_teacher` :
--   1. Accept 2 rôles : institution_admin OR super_admin
--   2. Pour institution_admin : check same-institution (logic actuelle préservée)
--   3. Pour super_admin : skip institution check (cross-institution allowed)
--   4. Audit log enrichi : caller_role + target_institution_id pour forensic traceability
--
-- Patterns préservés (migration 025 hardening + Sourcery review PR #298) :
--   - FOR UPDATE row lock (race-safe)
--   - Compare-and-swap WHERE role + IF NOT FOUND (belt + suspenders)
--   - Flag transactionnel app.in_approve_teacher_rpc (évite double insertion trigger 026)
--   - REVOKE FROM PUBLIC + anon, GRANT TO authenticated only

create or replace function public.approve_teacher(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  caller_role text;
  caller_institution_id uuid;
  target_institution_id uuid;
  target_role text;
begin
  -- 1. Caller doit être institution_admin OU super_admin
  caller_role := public.get_my_role();
  if caller_role is null or caller_role not in ('institution_admin', 'super_admin') then
    raise exception 'PERMISSION_DENIED: institution_admin or super_admin role required';
  end if;

  -- 2. Pour institution_admin : caller doit avoir un institution_id non-null
  --    Pour super_admin : skip (peut être null par design — global scope)
  if caller_role = 'institution_admin' then
    caller_institution_id := public.get_my_institution_id();
    if caller_institution_id is null then
      raise exception 'PERMISSION_DENIED: caller has no institution';
    end if;
  end if;

  -- 3. Target doit exister + (institution_admin only) appartenir à la même institution
  --    FOR UPDATE pose row-level lock (race-safe sérialisation des approvals concurrents)
  select role, institution_id
    into target_role, target_institution_id
    from public.profiles
   where id = target_user_id
   for update;

  if not found then
    raise exception 'NOT_FOUND: target user does not exist';
  end if;

  -- 4. Institution check appliqué SEULEMENT pour institution_admin
  --    super_admin peut approuver n'importe quelle institution (par design — supervision)
  if caller_role = 'institution_admin' then
    if target_institution_id is null or target_institution_id <> caller_institution_id then
      raise exception 'PERMISSION_DENIED: cross-institution approval blocked';
    end if;
  end if;

  -- 5. Target doit être en pending_teacher (même check pour les 2 rôles)
  if target_role <> 'pending_teacher' then
    raise exception 'INVALID_STATE: target not in pending_teacher state';
  end if;

  -- 6. Flag transactionnel pour éviter double insertion via trigger audit 026
  perform set_config('app.in_approve_teacher_rpc', 'true', true);

  -- 7. Compare-and-swap UPDATE (Sourcery review PR #298 — belt + suspenders)
  update public.profiles
     set role = 'teacher'
   where id = target_user_id
     and role = 'pending_teacher';

  if not found then
    raise exception 'INVALID_STATE: target not in pending_teacher state';
  end if;

  -- 8. Audit log enrichi
  --    - caller_role : différencie super_admin vs institution_admin path
  --    - scope : 'institution' pour institution_admin (caller_institution_id non-null),
  --              'global' pour super_admin (caller_institution_id intentionnellement null)
  --              Évite ambiguïté forensique entre absence-intentionnelle et bug futur
  --              (security-auditor M1, drive-by fix in-PR).
  --    - caller_institution_id : null pour super_admin, valid pour institution_admin
  --    - target_institution_id : toujours présent (l'institution promue)
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    'approve_teacher',
    'user',
    target_user_id,
    jsonb_build_object(
      'caller_role', caller_role,
      'scope', case when caller_role = 'super_admin' then 'global' else 'institution' end,
      'caller_institution_id', caller_institution_id,
      'target_institution_id', target_institution_id,
      'previous_role', 'pending_teacher',
      'new_role', 'teacher'
    )
  );
end;
$$;

revoke execute on function public.approve_teacher(uuid) from public;
revoke execute on function public.approve_teacher(uuid) from anon;
grant execute on function public.approve_teacher(uuid) to authenticated;

comment on function public.approve_teacher(uuid) is
  'Sprint 2.B Étape 3 hotfix (THI-280 reliquat, migration 027). Promotes pending_teacher → teacher. Accepts institution_admin (same-institution only) OR super_admin (any institution). SECURITY DEFINER + FOR UPDATE row lock + compare-and-swap UPDATE (race-safe). REVOKE PUBLIC + anon. Audit log enriched with caller_role + target_institution_id for forensic traceability.';
