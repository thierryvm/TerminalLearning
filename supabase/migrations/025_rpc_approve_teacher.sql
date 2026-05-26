-- Migration 025 — Sprint 2.B Étape 3 (THI-280)
-- RPC approve_teacher : institution_admin promeut pending_teacher → teacher
-- même institution uniquement. SECURITY DEFINER pour bypass RLS sur profiles,
-- mais trigger prevent_role_escalation continue d'enforcer le caller context
-- (auth.uid() préservé dans le scope du RPC).

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
  -- 1. Caller doit être institution_admin
  caller_role := public.get_my_role();
  if caller_role is null or caller_role <> 'institution_admin' then
    raise exception 'PERMISSION_DENIED: institution_admin role required';
  end if;

  -- 2. Caller doit avoir un institution_id (pas null)
  caller_institution_id := public.get_my_institution_id();
  if caller_institution_id is null then
    raise exception 'PERMISSION_DENIED: caller has no institution';
  end if;

  -- 3. Target doit exister + appartenir à la même institution
  select role, institution_id
    into target_role, target_institution_id
    from public.profiles
   where id = target_user_id;

  if not found then
    raise exception 'NOT_FOUND: target user does not exist';
  end if;

  if target_institution_id is null or target_institution_id <> caller_institution_id then
    raise exception 'PERMISSION_DENIED: cross-institution approval blocked';
  end if;

  -- 4. Target doit être en pending_teacher
  --    [M1 security-auditor] On retourne uniquement le code opaque,
  --    sans interpoler target_role dans le message — évite la disclosure
  --    d'un label de state machine interne dans le payload PostgREST.
  if target_role <> 'pending_teacher' then
    raise exception 'INVALID_STATE: target not in pending_teacher state';
  end if;

  -- 5. Promote pending_teacher → teacher
  --    Le trigger prevent_role_escalation lit auth.uid() via get_my_role(),
  --    qui reste celui du caller (SECURITY DEFINER ne change pas auth.uid()).
  --    Branche institution_admin → role IN (teacher, pending_teacher, student)
  --    avec même institution_id est autorisée par migration 010.
  --
  --    [F-001 institution-rbac-auditor] On positionne un flag transactionnel
  --    pour signaler au trigger audit_pending_teacher_promotion (migration 026)
  --    que l'audit row sera inséré ici par la suite — évite la double insertion.
  perform set_config('app.in_approve_teacher_rpc', 'true', true);

  update public.profiles
     set role = 'teacher'
   where id = target_user_id;

  -- 6. Audit log
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    'approve_teacher',
    'user',
    target_user_id,
    jsonb_build_object(
      'caller_institution_id', caller_institution_id,
      'previous_role', 'pending_teacher',
      'new_role', 'teacher'
    )
  );
end;
$$;

-- Hardening : reserve EXECUTE to authenticated only.
--   [F-002 institution-rbac-auditor] PostgREST exposes EXECUTE to the `anon`
--   role independently of PUBLIC. Revoke from both explicitly so an
--   anonymous caller is refused at the GRANT layer (42501) before the
--   function body runs — defense in depth and consistent with migration 015.
revoke execute on function public.approve_teacher(uuid) from public;
revoke execute on function public.approve_teacher(uuid) from anon;
grant execute on function public.approve_teacher(uuid) to authenticated;

comment on function public.approve_teacher(uuid) is
  'Sprint 2.B Étape 3 (THI-280). Promotes pending_teacher → teacher within caller institution. SECURITY DEFINER bypasses RLS on profiles but trigger prevent_role_escalation still enforces caller context (auth.uid preserved). Inserts admin_audit_log row.';
