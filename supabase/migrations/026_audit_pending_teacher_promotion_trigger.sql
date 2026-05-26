-- Migration 026 — Sprint 2.B Étape 3 (THI-280) — defense in depth
--
-- F-001 fix from institution-rbac-auditor : direct REST PATCH on profiles
-- (pending_teacher → teacher) was previously authorized by RLS policy
-- "profiles: institution_admin update own institution" (migration 009) but
-- left ZERO audit_log row. Result : an institution_admin could bypass the
-- approve_teacher RPC, promote a teacher silently, no forensic trace.
--
-- Authorization itself was still enforced by the prevent_role_escalation
-- trigger (migration 010), so this never was an authorization bypass — only
-- an audit bypass. This migration closes the audit gap.
--
-- Approach : AFTER UPDATE trigger on profiles, fires ONLY on
-- pending_teacher → teacher transitions, inserts a complete audit row.
-- A transaction-local flag `app.in_approve_teacher_rpc` (set by the RPC
-- at migration 025) lets us skip insertion when the transition was
-- already audited by the RPC body — avoids double insertion.

create or replace function public.audit_pending_teacher_promotion()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  in_rpc text;
begin
  -- Only fire on pending_teacher → teacher promotions.
  if old.role <> 'pending_teacher' or new.role <> 'teacher' then
    return new;
  end if;

  -- Skip if the RPC already inserted an audit row for this transition.
  in_rpc := current_setting('app.in_approve_teacher_rpc', true);
  if in_rpc = 'true' then
    return new;
  end if;

  -- Direct PATCH path (or any other non-RPC promotion) — insert audit row.
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    'approve_teacher_direct_patch',
    'user',
    new.id,
    jsonb_build_object(
      'caller_institution_id', public.get_my_institution_id(),
      'previous_role', old.role,
      'new_role', new.role,
      'path', 'direct_patch'
    )
  );

  return new;
end;
$$;

drop trigger if exists audit_pending_teacher_promotion_trigger on public.profiles;
create trigger audit_pending_teacher_promotion_trigger
  after update on public.profiles
  for each row
  when (old.role is distinct from new.role)
  execute function public.audit_pending_teacher_promotion();

comment on function public.audit_pending_teacher_promotion() is
  'Sprint 2.B Étape 3 (THI-280) defense in depth. Closes F-001 (institution-rbac-auditor) — pending_teacher → teacher promotions via direct REST PATCH no longer bypass the audit log. RPC path is detected via transaction-local flag set by approve_teacher() to avoid double insertion.';
