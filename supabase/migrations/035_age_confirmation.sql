-- ─── 035: Age confirmation at account creation (RGPD Art. 8) — THI-340 ───────
--
-- ## Why
--
-- RGPD Art. 8 governs information society services offered directly to a child.
-- Belgium set the digital consent age at **13** (the Regulation allows 13–16;
-- Belgium picked the floor). `/privacy` has stated that rule since PR #379, but
-- NOTHING in the product enforced it — the page promised a protection the code
-- did not apply. This migration is the server half of closing that gap.
--
-- Product decision (@thierry, 19/08/2026): under 13 we do **not** create an
-- account at all. The entire curriculum already works anonymously, so a child
-- loses nothing pedagogically, and we collect zero children's data — no legal
-- basis to justify, no parental-consent flow to build, no parent email to
-- store. A parental-consent path stays in the backlog for the day schools with
-- under-13 pupils actually arrive (bottom-up teacher strategy).
--
-- ## What is stored — and what deliberately is NOT
--
-- Exactly one timestamp per account: "this account passed the age screen on
-- that date". The date of birth entered on the screen is evaluated in the
-- browser and **never transmitted** (see src/lib/auth/ageGate.ts). That
-- satisfies the Art. 5(2) accountability duty — we can show the check happened
-- — while adding zero personal data at rest. Storing a birth date would be a
-- data-minimisation regression for a check whose only output is a boolean.
--
-- NULL is a legitimate, meaningful value:
--   • accounts created BEFORE this migration — deliberately NOT retro-gated.
--     Re-gating existing users would be hostile, and Art. 8 binds at collection
--     time, which has passed for them. NULL honestly means "never asked".
--   • accounts whose stamping request failed (offline, storage disabled). The
--     client retries on the next authenticated load; a missing stamp never
--     blocks the user.
--
-- ## Two write paths, one invariant
--
-- 1. **Email signup** — supabase.auth.signUp() carries `age_confirmed: true` in
--    user metadata; handle_new_user() converts it to a server-side now() at
--    profile creation. Needed because email signup returns NO session (email
--    confirmation is on), so the client cannot stamp the row afterwards.
-- 2. **OAuth (GitHub / Google)** — no metadata passthrough exists on
--    signInWithOAuth, so the client stamps the row after the callback via a
--    plain RLS-scoped UPDATE.
--
-- Both funnel through the same invariant, enforced by the trigger below:
-- **write-once, server-chosen timestamp**. The client may ask for the stamp; it
-- can neither choose its value, backdate it, nor clear it later.
--
-- ## Why a trigger and not a SECURITY DEFINER RPC
--
-- An RPC would have been a third SECURITY DEFINER function exposed on
-- /rest/v1/rpc/*, i.e. a fresh advisor 0028/0029 hit and more surface for the
-- THI-182 private-schema cleanup to carry. The column is already self-scoped by
-- the existing `profiles: update own` RLS policy (migration 023), so the only
-- missing property was value integrity — which a BEFORE UPDATE trigger gives
-- with no privilege elevation at all (SECURITY INVOKER, the default).
--
-- Threat model, stated honestly: this is a **self-declaration**. A visitor who
-- lies to the screen gets an account, and no server-side control can detect it.
-- The trigger does not pretend to stop that. What it does guarantee is that the
-- stored record is a faithful account of what the server observed: a real
-- timestamp, chosen by the server, that cannot be rewritten after the fact.
--
-- Trigger ordering: BEFORE triggers on `profiles` fire alphabetically. This one
-- and `prevent_role_escalation_trigger` (migration 010) touch disjoint columns
-- (`age_confirmed_at` vs `role`), so their relative order is irrelevant.
--
-- Idempotent: `add column if not exists`, `create or replace`, and
-- `drop trigger if exists` make the file safe to re-run on any environment.
--
-- Refs: migration 001 (profiles + handle_new_user), 005 (role column, current
-- handle_new_user body), 014 + 015 (handle_new_user EXECUTE revokes),
-- 023 (`profiles: update own` WITH CHECK), PR #379 (/privacy minors box).

-- ── 1. The column ────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists age_confirmed_at timestamptz;

comment on column public.profiles.age_confirmed_at is
  'THI-340 (RGPD Art. 8, Belgium = 13). Server-chosen timestamp meaning "this account passed the neutral age screen". The date of birth itself is evaluated client-side and never transmitted (data minimisation). Write-once: pinned by pin_age_confirmed_at(). NULL = account predates migration 035 (not retro-gated) or the stamping request has not succeeded yet.';

-- ── 2. Write-once + server-chosen value ──────────────────────────────────────
-- BEFORE UPDATE only. INSERT is covered by handle_new_user() below, which is
-- SECURITY DEFINER and already picks now() itself.

create or replace function public.pin_age_confirmed_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.age_confirmed_at is not null then
    -- Already stamped: immutable. Silently restoring the old value (rather than
    -- raising) keeps unrelated profile edits — display_name, preferred_env —
    -- working normally instead of failing on a column they never meant to touch.
    new.age_confirmed_at := old.age_confirmed_at;
  elsif new.age_confirmed_at is not null then
    -- First stamp: the SERVER decides when "now" is. Whatever timestamp the
    -- client sent is discarded, so a backdated or future-dated claim is
    -- impossible.
    new.age_confirmed_at := now();
  end if;
  return new;
end;
$$;

comment on function public.pin_age_confirmed_at() is
  'TRIGGER on profiles BEFORE UPDATE (migration 035, THI-340) — makes age_confirmed_at write-once and server-timestamped: an existing stamp is restored, a first stamp is forced to now(). SECURITY INVOKER (no elevation needed — the row is already scoped by the "profiles: update own" RLS policy). Never invoked as RPC.';

drop trigger if exists pin_age_confirmed_at_trigger on public.profiles;
create trigger pin_age_confirmed_at_trigger
  before update on public.profiles
  for each row execute function public.pin_age_confirmed_at();

-- EXECUTE revoke, same treatment as every other trigger-only function
-- (migrations 014/015/034). PostgreSQL fires a trigger without consulting the
-- EXECUTE grant, so this closes the PostgREST surface with zero functional
-- impact. SECURITY INVOKER already makes it harmless, but leaving a
-- trigger-only function callable on /rest/v1/rpc/* is noise the advisors flag.
revoke execute on function public.pin_age_confirmed_at() from public, anon, authenticated;

-- ── 3. Email-signup path: carry the declaration through user metadata ────────
-- Body is migration 005's, verified against the live database on 19/08/2026,
-- plus the age_confirmed_at column. CREATE OR REPLACE preserves the existing
-- ACL, and the revokes from 014/015 are re-stated below so a fresh environment
-- ends in the same state as production.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, role, age_confirmed_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'name'),
    'student',
    -- Declared on the signup screen. now() — never a client-supplied value.
    -- Absent for OAuth (signInWithOAuth carries no metadata) → NULL, and the
    -- client stamps it after the callback instead.
    case
      when new.raw_user_meta_data->>'age_confirmed' = 'true' then now()
      else null
    end
  );
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'TRIGGER on auth.users INSERT (migration 001, role added 005, age_confirmed_at added 035). Creates the profile row with role=student and stamps age_confirmed_at when the email-signup metadata carries age_confirmed=true (THI-340). SECURITY DEFINER to write across RLS. EXECUTE retained by postgres (owner) only; revoked from public/anon/authenticated (migrations 014 + 015) — invoked by trigger, never RPC.';

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ── 4. Guard rails ───────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'age_confirmed_at'
  ) then
    raise exception 'profiles.age_confirmed_at must exist after migration 035';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'pin_age_confirmed_at_trigger'
      and tgrelid = 'public.profiles'::regclass
      and not tgisinternal
  ) then
    raise exception 'pin_age_confirmed_at_trigger must exist on public.profiles after migration 035';
  end if;
end $$;
