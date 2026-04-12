-- ─── 007: Fix infinite recursion in RLS policies ──────────────────────────────
-- Root cause (THI-80): The institution_admin SELECT policy on public.profiles
-- contained a direct subquery on public.profiles:
--
--   institution_id = (select institution_id from public.profiles where id = auth.uid())
--
-- PostgreSQL evaluates ALL SELECT policies for every row query, so this
-- subquery caused a recursive policy evaluation → error 42P17.
-- The same pattern existed in classes policies but was masked by the profiles
-- recursion being hit first.
--
-- Fix: replace the recursive subquery with a SECURITY DEFINER function
-- public.get_my_institution_id() that bypasses RLS when querying profiles.
-- This mirrors the existing public.get_my_role() pattern (migration 005).

-- ── 1. New helper: get_my_institution_id() ───────────────────────────────────
create or replace function public.get_my_institution_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select institution_id from public.profiles where id = (select auth.uid())
$$;

-- ── 2. Fix: profiles — institution_admin SELECT policy ───────────────────────
drop policy if exists "profiles: institution_admin select own institution" on public.profiles;

create policy "profiles: institution_admin select own institution"
  on public.profiles for select
  using (
    public.get_my_role() = 'institution_admin'
    and institution_id = public.get_my_institution_id()
  );

-- ── 3. Fix: classes — institution_admin SELECT policy ────────────────────────
drop policy if exists "classes: institution_admin select own institution" on public.classes;

create policy "classes: institution_admin select own institution"
  on public.classes for select
  using (
    public.get_my_role() = 'institution_admin'
    and institution_id = public.get_my_institution_id()
  );

-- ── 4. Fix: classes — teacher or admin DELETE policy ────────────────────────
drop policy if exists "classes: teacher or admin delete" on public.classes;

create policy "classes: teacher or admin delete"
  on public.classes for delete
  using (
    teacher_id = (select auth.uid())
    or public.get_my_role() = 'super_admin'
    or (
      public.get_my_role() = 'institution_admin'
      and institution_id = public.get_my_institution_id()
    )
  );
