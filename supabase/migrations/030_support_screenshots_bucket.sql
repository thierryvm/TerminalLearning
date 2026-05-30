-- Migration 030 — Sprint 2.C Étape 2 (THI-295) : bucket Storage support_screenshots
-- Private bucket for user-attached screenshots on support tickets (migration 028/029).
-- RLS on storage.objects scoped : user manages own folder {auth.uid()}/..., super_admin
-- reads + deletes all (triage + RGPD Art. 17 erasure). Bucket name is load-bearing :
-- migration 029 M1 CHECK constrains support_tickets.screenshot_url to
--   ^https://<ref>.supabase.co/storage/v1/object/(public|sign)/support_screenshots/
-- so the bucket id MUST stay 'support_screenshots' or signed URLs are rejected at INSERT.

-- ─── Bucket : private, 5 MB cap, image MIME allow-list ──────────────────────
--   public=false → access only via signed URLs (TTL 7d, cf. column comment 028).
--   file_size_limit + allowed_mime_types enforce server-side BEFORE the object
--   lands, independent of any client-side validation (defense in depth vs
--   oversized / MIME-spoofed uploads).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support_screenshots',
  'support_screenshots',
  false,
  5242880,  -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- storage.objects already has RLS enabled by Supabase. Policies below are
-- additive and scoped to bucket_id = 'support_screenshots' so they never widen
-- access to other buckets.

-- ─── INSERT : user uploads only inside their own {auth.uid()} folder ────────
--   Path convention enforced by the client : {user.id}/{uuid}.{ext}. The first
--   path segment must equal the caller uid — blocks a user writing into another
--   user's folder (forged path). auth.uid() IS NOT NULL guards corrupt-JWT edge
--   cases (mirrors migration 029 H2 hardening on support_tickets INSERT).
create policy "support_screenshots: user insert own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'support_screenshots'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── SELECT : user reads own folder (own screenshots) ──────────────────────
create policy "support_screenshots: user select own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'support_screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── SELECT : super_admin reads all (triage dashboard, Étape 4) ────────────
create policy "support_screenshots: super_admin select all"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'support_screenshots'
    and public.get_my_role() = 'super_admin'
  );

-- ─── DELETE : user erases own screenshot (RGPD Art. 17 self-service) ───────
--   A user can remove a screenshot they attached (e.g. it contains their face).
--   The parent support_tickets row keeps screenshot_url dangling until super_admin
--   triage; acceptable v1 (signed URL just 404s). Full coherence (null the column
--   on object delete) is Sprint 2.D scope.
create policy "support_screenshots: user delete own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'support_screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── DELETE : super_admin erases any screenshot (RGPD Art. 17 + moderation) ─
--   Mirrors migration 029 M2 (super_admin DELETE on support_tickets). Lets an
--   admin purge an abusive / sensitive image independently of the ticket row.
create policy "support_screenshots: super_admin delete all"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'support_screenshots'
    and public.get_my_role() = 'super_admin'
  );
