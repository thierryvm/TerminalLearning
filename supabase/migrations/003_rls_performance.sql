-- ─── RLS performance : éviter la ré-évaluation de auth.uid() par ligne ────────
-- Remplace auth.uid() par (select auth.uid()) dans toutes les policies.
-- Source : Supabase advisor auth_rls_initplan
-- Docs : https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan

-- profiles
drop policy if exists "profiles: select own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;

create policy "profiles: select own" on public.profiles
  for select using ((select auth.uid()) = id);

create policy "profiles: update own" on public.profiles
  for update using ((select auth.uid()) = id);

-- progress
drop policy if exists "progress: select own" on public.progress;
drop policy if exists "progress: insert own" on public.progress;
drop policy if exists "progress: update own" on public.progress;
drop policy if exists "progress: delete own" on public.progress;

create policy "progress: select own" on public.progress
  for select using ((select auth.uid()) = user_id);

create policy "progress: insert own" on public.progress
  for insert with check ((select auth.uid()) = user_id);

create policy "progress: update own" on public.progress
  for update using ((select auth.uid()) = user_id);

create policy "progress: delete own" on public.progress
  for delete using ((select auth.uid()) = user_id);
