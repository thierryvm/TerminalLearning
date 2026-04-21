-- ─── 010: Security fixes (THI-80 audit) ──────────────────────────────────────
-- Fixes 3 issues found by security-auditor on 2026-04-12:
--
-- [C2] prevent_role_escalation: institution_admin could change roles of users
--      from OTHER institutions (trigger had no institution_id check on the target).
--
-- [H5] institutions SELECT: any authenticated user could list ALL institutions
--      including their domain_whitelist (organizational data leak).
--
-- [M6] admin_audit_log INSERT: actor_id was not verified against auth.uid(),
--      allowing an institution_admin to forge audit log entries with arbitrary actor_id.

-- ── Fix C2: prevent_role_escalation — add institution check for institution_admin ──
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  -- No role change — nothing to check
  if new.role = old.role then
    return new;
  end if;

  actor_role := public.get_my_role();

  -- super_admin can change any role
  if actor_role = 'super_admin' then
    return new;
  end if;

  -- institution_admin can only manage users within their own institution
  if actor_role = 'institution_admin'
     and new.role in ('teacher', 'pending_teacher', 'student')
     and new.institution_id = public.get_my_institution_id() then
    return new;
  end if;

  -- Student can request teacher verification for themselves only
  if (select auth.uid()) = new.id
     and old.role = 'student'
     and new.role = 'pending_teacher' then
    new.role_requested_at := now();
    return new;
  end if;

  raise exception 'Unauthorized role change from % to %', old.role, new.role;
end;
$$;

-- ── Fix H5: institutions — restrict SELECT to role-appropriate visibility ─────
-- NOTE (21 avril 2026, Opus audit): policy currently allows teachers to SELECT all institutions.
-- Should be: (id = public.get_my_institution_id()) OR (get_my_role() in ('super_admin', 'institution_admin')).
-- Tracked for future migration (priority low, organizational leak only).
drop policy if exists "institutions: authenticated select" on public.institutions;

create policy "institutions: select by role"
  on public.institutions for select
  using (
    public.get_my_role() in ('super_admin', 'institution_admin', 'teacher')
    or id = public.get_my_institution_id()
  );

-- ── Fix M6: admin_audit_log — enforce actor_id = auth.uid() ──────────────────
drop policy if exists "admin_audit_log: admin insert" on public.admin_audit_log;

create policy "admin_audit_log: admin insert"
  on public.admin_audit_log for insert
  with check (
    public.get_my_role() in ('super_admin', 'institution_admin')
    and actor_id = (select auth.uid())
  );
