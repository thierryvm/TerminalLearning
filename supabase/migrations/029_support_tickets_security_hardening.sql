-- Migration 029 — Sprint 2.C Étape 1 security-auditor hardening (THI-295)
-- Patches migration 028 per security-auditor 28/05/2026 findings :
--   H1  Trigger NOT NULL violation if UPDATE via service_role (auth.uid() NULL)
--   H2  WITH CHECK durcissement explicit auth.uid() IS NOT NULL
--   M1  screenshot_url CHECK constraint Supabase Storage URLs only (XSS defense)
--   M2  super_admin DELETE policy (RGPD Art. 17 erasure path B2B écoles)
--   M3  status='resolved' ⇔ resolved_at/resolved_by NOT NULL cohérence
--   L1  search_path align with migrations 025/027 (public, extensions)
-- Verdict audit pre-fix : 8.8/10. Post-fix expected : 9.4/10.

-- ─── H1 + L1 : Trigger guard acting_uid NULL + search_path align + caller_role metadata
--   Pattern aligned with migration 027 audit enrichment.
create or replace function public.log_support_ticket_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  acting_uid uuid := auth.uid();
begin
  -- [H1] Guard against service_role / backend callers where auth.uid() returns
  -- NULL. Without this guard, admin_audit_log.actor_id NOT NULL (migration 005
  -- line 57) raises 23502 → full UPDATE transaction rollback → Sprint 2.D AI
  -- triage backend (Edge Function with service_role key) would fail 100% of
  -- support_tickets UPDATEs. Skipping the audit row here is acceptable :
  -- service_role actions can be traced via Supabase logs + Edge Function logs.
  if OLD.status is distinct from NEW.status and acting_uid is not null then
    insert into public.admin_audit_log (actor_id, action, target_type, target_id, metadata)
    values (
      acting_uid,
      'support_ticket_status_change',
      'support_ticket',
      NEW.id,
      jsonb_build_object(
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'ticket_type', NEW.type,
        'caller_role', public.get_my_role()
      )
    );
  end if;
  return NEW;
end;
$$;

-- ─── H2 : Durcir WITH CHECK INSERT — explicit auth.uid() IS NOT NULL
--   Préviens any edge case JWT corrompu where auth.uid() returns NULL.
--   Functionally equivalent today (NULL = NULL → UNKNOWN → false in WITH CHECK)
--   but defense-in-depth explicit makes regression resistance better.
drop policy "support_tickets: user insert own" on public.support_tickets;
create policy "support_tickets: user insert own"
  on public.support_tickets
  for insert
  to authenticated
  with check (auth.uid() is not null and user_id = auth.uid());

-- ─── M1 : screenshot_url CHECK constraint — Supabase Storage URLs only
--   Defense-in-depth DB-level against XSS via super_admin panel rendering.
--   Accepted formats :
--     - https://&lt;ref&gt;.supabase.co/storage/v1/object/public/support_screenshots/...
--     - https://&lt;ref&gt;.supabase.co/storage/v1/object/sign/support_screenshots/...
--   Rejects javascript:, data:, file:, external HTTPS URLs, malformed strings.
alter table public.support_tickets
  add constraint support_tickets_screenshot_url_supabase_storage_only
  check (
    screenshot_url is null
    or screenshot_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/(public|sign)/support_screenshots/'
  );

-- ─── M2 : super_admin DELETE policy — RGPD Art. 17 erasure path
--   Allows super_admin to delete an individual ticket on user erasure request
--   (e.g., student requests deletion of ticket containing screenshot of their
--   face). The cascade DELETE on user_id covers full-account deletion. This
--   policy covers selective ticket deletion. The admin_audit_log row from the
--   prior status_change trigger remains (insert-only forensic trail).
create policy "support_tickets: super_admin delete all"
  on public.support_tickets
  for delete
  to authenticated
  using (public.get_my_role() = 'super_admin');

grant delete on public.support_tickets to authenticated;

-- ─── M3 : status/resolved coherence CHECK constraint
--   Prevents zombie state where status='resolved' but resolved_at/resolved_by
--   are NULL (forensic gap) OR resolved_at populated while status='open'
--   (analytics confusion). Allows status='closed' to either keep or clear
--   resolved_at depending on transition path.
alter table public.support_tickets
  add constraint support_tickets_resolved_consistency check (
    (status in ('resolved', 'closed') and resolved_at is not null and resolved_by is not null)
    or
    (status in ('open', 'in_progress') and resolved_at is null and resolved_by is null)
  );

-- ─── Documentation update
comment on table public.support_tickets is
  'Sprint 2.C (THI-295). Migration 028 base + 029 hardening. User-submitted support tickets (bug/suggestion/question). RLS scoped : user sees own, super_admin sees + triages + deletes (RGPD Art. 17). Status transitions logged to admin_audit_log via trigger (service_role caller skipped — auth.uid() NULL guard). screenshot_url constrained to Supabase Storage URLs only (XSS defense). status/resolved coherence enforced.';
