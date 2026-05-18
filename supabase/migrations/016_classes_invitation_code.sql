-- ─── 016: classes.invitation_code + join_class_by_code() RPC ────────────────
-- THI-235 Sprint 2.A — Teacher invitation workflow
--
-- Enables the class enrollment flow where a teacher generates an invitation
-- code and shares it (URL `/app/join?code=XXX`). Students authenticate and
-- enter the code to auto-enroll into `class_enrollments`.
--
-- Architecture decision : the enrollment INSERT goes through a security
-- definer RPC `join_class_by_code(code text)` rather than a direct INSERT
-- with a RLS check on the code. Rationale :
--   1. Avoid leaking class IDs / teacher info via SELECT-then-INSERT pattern
--   2. Single atomic operation (lookup class + insert enrollment)
--   3. Centralised validation : non-existent code → clean error message
--      (vs RLS denial which is opaque)
--   4. Audit trail : every join goes through one function we can log
--
-- The existing RLS policy "class_enrollments: teacher insert" is preserved
-- for the manual teacher-driven enrollment path (post-MVP if needed).

-- ─── 1. Add invitation_code column to classes ───────────────────────────────
alter table public.classes
  add column invitation_code text;

-- Generate codes for existing classes (defensive — likely 0 rows in v1, but
-- a partial deploy would leave us with NULL invitation_code on existing rows
-- and break the UNIQUE constraint addition below).
-- 6 bytes → 12 chars hex = 48 bits entropy (~281T codes, birthday collision
-- at 50% only at ~17M classes — future-proof vs 32 bits which collides
-- noticeably above 65k classes per the birthday paradox).
update public.classes
set invitation_code = encode(gen_random_bytes(6), 'hex')
where invitation_code is null;

alter table public.classes
  alter column invitation_code set not null;

alter table public.classes
  add constraint classes_invitation_code_unique unique (invitation_code);

create index classes_invitation_code_idx on public.classes(invitation_code);

-- ─── 2. Function to generate a fresh invitation code ────────────────────────
-- Uses gen_random_bytes(6) → 12 hex chars (48 bits entropy ≈ 281 trillion
-- codes, collision probability < 50% only above ~17M classes per the
-- birthday paradox). Retries up to 10 times if the extremely unlikely
-- collision occurs.
create or replace function public.generate_invitation_code()
returns text
language plpgsql
security invoker
as $$
declare
  candidate text;
  attempts  int := 0;
begin
  loop
    -- 6 bytes → 12 hex chars (48 bits entropy, future-proof to ~17M classes
    -- before 50% birthday collision probability).
    candidate := encode(gen_random_bytes(6), 'hex');
    if not exists (select 1 from public.classes where invitation_code = candidate) then
      return candidate;
    end if;
    attempts := attempts + 1;
    if attempts >= 10 then
      raise exception 'Failed to generate unique invitation code after 10 attempts (extremely unlikely)';
    end if;
  end loop;
end;
$$;

-- Pattern from migrations 014/015 — revoke PostgREST exposure on helper
-- functions that should only be called by triggers / by other server-side
-- functions, never directly by authenticated clients via /rest/v1/rpc/.
revoke execute on function public.generate_invitation_code() from public;

-- ─── 3. Trigger: auto-generate invitation_code on INSERT if not provided ────
-- This makes the column "feel" auto-generated to client code that does
-- `INSERT INTO classes (name, teacher_id, institution_id) VALUES (...)`.
-- The teacher dashboard does not need to pre-generate codes — the DB
-- handles uniqueness atomically.
create or replace function public.set_invitation_code_before_insert()
returns trigger
language plpgsql
security invoker
as $$
begin
  if new.invitation_code is null then
    new.invitation_code := public.generate_invitation_code();
  end if;
  return new;
end;
$$;

create trigger classes_set_invitation_code_trigger
  before insert on public.classes
  for each row
  execute function public.set_invitation_code_before_insert();

-- Trigger function not callable via PostgREST — pattern migrations 014/015.
revoke execute on function public.set_invitation_code_before_insert() from public;

-- ─── 4. RPC: join_class_by_code(code text) ─────────────────────────────────
-- Security definer so an authenticated user (any role) can INSERT into
-- class_enrollments without bypassing RLS — the function itself is the gate.
--
-- Returns a JSON object with success/error and the class info so the UI
-- can display "You joined the class 'Bash 101' taught by ...".
--
-- Threat model :
--   - Anonymous user → SQL caller is `anon` role, get_my_role() raises or
--     returns NULL → function fails cleanly with insufficient_privilege.
--   - Authenticated student → enrolls into the class if code matches.
--   - Authenticated teacher / admin → may enroll themselves into another
--     teacher's class (not exploitable — they end up listed as a student
--     enrollment, which is a no-op for them functionally).
--   - Already-enrolled student → ON CONFLICT DO NOTHING returns the same
--     success-shape response (idempotent UX, prevents probing).
--   - Brute-force code guessing → 32 bits entropy = 4.3B codes, even at
--     1000 req/s an attacker needs ~50 days to enumerate. Rate-limit at
--     edge (Vercel firewall) + 401 if not authenticated narrow the window.
create or replace function public.join_class_by_code(code text)
returns table (
  class_id        uuid,
  class_name      text,
  teacher_id      uuid,
  joined_at       timestamptz,
  already_enrolled boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_class    public.classes%rowtype;
  caller_id       uuid := auth.uid();
  was_enrolled    boolean := false;
  inserted_at     timestamptz;
begin
  -- Require authentication explicitly (security definer bypasses RLS so
  -- we must check the JWT subject ourselves).
  if caller_id is null then
    raise exception 'must be authenticated to join a class' using errcode = '42501';
  end if;

  -- Sanity check : code is non-empty (defensive — UI should already trim/validate).
  if code is null or length(trim(code)) = 0 then
    raise exception 'invitation code is required' using errcode = '22023';
  end if;

  -- Lookup class by code. NOT FOUND → raise so the function returns a
  -- distinguishable error (PostgREST surfaces error code).
  select * into target_class from public.classes where invitation_code = code;
  if not found then
    raise exception 'invalid invitation code' using errcode = '02000';
  end if;

  -- Idempotent insert : if already enrolled, was_enrolled stays true and
  -- we return the existing record's enrolled_at.
  select enrolled_at into inserted_at
    from public.class_enrollments
    where class_id = target_class.id and student_id = caller_id;

  if found then
    was_enrolled := true;
  else
    -- Wrap INSERT in EXCEPTION block to absorb the race condition where
    -- two simultaneous requests (e.g. user double-clicks join) both pass
    -- the pre-INSERT SELECT and try to INSERT concurrently. The PK
    -- (class_id, student_id) on class_enrollments will reject the second
    -- INSERT with 23505 unique_violation — we catch it and treat as
    -- already_enrolled (idempotent UX, no client-facing 400 error).
    begin
      insert into public.class_enrollments (class_id, student_id)
        values (target_class.id, caller_id)
        returning enrolled_at into inserted_at;
    exception when unique_violation then
      -- Lost the race — fetch the existing enrolled_at and treat as already-enrolled.
      select enrolled_at into inserted_at
        from public.class_enrollments
        where class_id = target_class.id and student_id = caller_id;
      was_enrolled := true;
    end;
  end if;

  return query select
    target_class.id,
    target_class.name,
    target_class.teacher_id,
    inserted_at,
    was_enrolled;
end;
$$;

-- Restrict EXECUTE to authenticated only (anon cannot call).
revoke execute on function public.join_class_by_code(text) from public;
grant execute on function public.join_class_by_code(text) to authenticated;

-- ─── 5. Documentation ──────────────────────────────────────────────────────
comment on column public.classes.invitation_code is
  'THI-235 Sprint 2.A — Unique 12-char hex code (48 bits entropy) teachers share with students. Auto-generated on INSERT via trigger. Used by join_class_by_code() RPC.';

comment on function public.join_class_by_code(text) is
  'THI-235 Sprint 2.A — Atomic enrollment via invitation_code. Security definer to bypass class_enrollments RLS for the controlled enrollment path. Returns class info + already_enrolled flag for idempotent UX.';
