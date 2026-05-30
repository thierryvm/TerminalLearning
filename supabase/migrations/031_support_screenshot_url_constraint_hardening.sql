-- Migration 031 — Sprint 2.C Étape 2 hardening (THI-295)
-- security-auditor 2nd pass (30/05) finding H1 : the migration 029 M1 CHECK on
-- screenshot_url was anchored at START only and left everything after the prefix
-- unconstrained, so an attribute-breakout payload such as
--   https://<ref>.supabase.co/storage/v1/object/sign/support_screenshots/x.png"><img src=x onerror=...>
-- was ACCEPTED (proven empirically). The advertised "XSS defense" was in reality
-- only a prefix filter. This re-anchors the constraint end-to-end and restricts
-- the value to a real Storage object path + optional signed token, so no HTML
-- quote/angle-bracket/space/fragment can survive in the column.
-- Validated empirically: a real createSignedUrl() output matches (ACCEPTED);
-- attribute-breakout and space-injection payloads are rejected (23514).

alter table public.support_tickets
  drop constraint if exists support_tickets_screenshot_url_supabase_storage_only;

alter table public.support_tickets
  add constraint support_tickets_screenshot_url_supabase_storage_only
  check (
    screenshot_url is null
    or screenshot_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/(public|sign)/support_screenshots/[A-Za-z0-9/_.-]+(\?token=[A-Za-z0-9._-]+)?$'
  );

comment on column public.support_tickets.screenshot_url is
  'Signed URL (TTL <= 1h, migration 031) to Storage bucket support_screenshots. Nullable. CHECK end-anchored + char-restricted (security-auditor H1) = structural integrity only, NOT a substitute for JSX-only <img> rendering at the admin panel (Etape 4 gate). super_admin re-mints a fresh signed URL at read time.';
