-- Migration 028 — Sprint 2.C Étape 1 (THI-295 umbrella Sprint 2.C Support System)
-- Table support_tickets : users submit bugs/suggestions/questions, super_admin triages.
-- RLS scoped : users see own only, super_admin sees + modifies all.
-- Audit trail : status transitions logged via trigger to admin_audit_log.

create table public.support_tickets (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  type                text        not null check (type in ('bug', 'suggestion', 'question')),
  description         text        not null check (length(description) between 10 and 5000),
  screenshot_url      text,
  status              text        not null default 'open'
                                   check (status in ('open', 'in_progress', 'resolved', 'closed')),
  ai_triage_summary   text,  -- Sprint 2.D scope (AI triage), nullable v1
  created_at          timestamptz not null default now(),
  resolved_at         timestamptz,
  resolved_by         uuid references public.profiles(id) on delete set null
);

alter table public.support_tickets enable row level security;

-- ─── RLS policies ──────────────────────────────────────────────────────────
-- Authenticated users SELECT their own tickets.
create policy "support_tickets: user select own"
  on public.support_tickets
  for select
  to authenticated
  using (user_id = auth.uid());

-- Authenticated users INSERT only as themselves.
--   WITH CHECK guarantees user_id matches caller; defense against forged INSERTs.
create policy "support_tickets: user insert own"
  on public.support_tickets
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- super_admin SELECT all tickets (triage dashboard).
create policy "support_tickets: super_admin select all"
  on public.support_tickets
  for select
  to authenticated
  using (public.get_my_role() = 'super_admin');

-- super_admin UPDATE all tickets (status transitions, ai_triage_summary).
--   WITH CHECK same predicate prevents super_admin from escalating an UPDATE
--   into a row they no longer match (e.g., status flip during transaction).
create policy "support_tickets: super_admin update all"
  on public.support_tickets
  for update
  to authenticated
  using (public.get_my_role() = 'super_admin')
  with check (public.get_my_role() = 'super_admin');

-- ─── Indexes ───────────────────────────────────────────────────────────────
create index support_tickets_user_id_idx     on public.support_tickets(user_id);
create index support_tickets_status_idx      on public.support_tickets(status);
create index support_tickets_created_at_idx  on public.support_tickets(created_at desc);

-- ─── Grants (defense in depth — explicit revoke from anon) ─────────────────
-- Per migration 025 F-002 (institution-rbac-auditor): PostgREST exposes table
-- access to `anon` independently of PUBLIC. Revoke explicitly so anonymous
-- callers are refused at the GRANT layer (42501) before RLS evaluation.
revoke all on public.support_tickets from public;
revoke all on public.support_tickets from anon;
grant select, insert, update on public.support_tickets to authenticated;

-- ─── Audit trigger : log status transitions to admin_audit_log ─────────────
-- Fires on UPDATE when status changes. Captures actor (super_admin who
-- resolved), target ticket id, old → new status. Insert-only audit, no path
-- to mutation. SECURITY DEFINER required because admin_audit_log RLS is
-- write-restricted; the trigger runs in the table owner's context.
create or replace function public.log_support_ticket_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if OLD.status is distinct from NEW.status then
    insert into public.admin_audit_log (actor_id, action, target_type, target_id, metadata)
    values (
      auth.uid(),
      'support_ticket_status_change',
      'support_ticket',
      NEW.id,
      jsonb_build_object(
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'ticket_type', NEW.type
      )
    );
  end if;
  return NEW;
end;
$$;

create trigger support_tickets_status_change_audit
  after update on public.support_tickets
  for each row
  execute function public.log_support_ticket_status_change();

-- ─── Documentation ─────────────────────────────────────────────────────────
comment on table public.support_tickets is
  'Sprint 2.C (THI-295). User-submitted support tickets (bug/suggestion/question). RLS scoped: user sees own, super_admin sees + triages all. Status transitions logged to admin_audit_log via trigger.';

comment on column public.support_tickets.ai_triage_summary is
  'Sprint 2.D scope. Nullable v1, populated by AI triage Edge Function in later sprint.';

comment on column public.support_tickets.screenshot_url is
  'Public URL or signed URL (TTL 7d) to Supabase Storage bucket support_screenshots. Nullable.';
