-- ─── 019: Fix critical bug 42702 in join_class_by_code() ───────────────────
-- THI-235 Sprint 2.A — Discovered by empirical test post-migration 018
--
-- **CRITICAL BUG** : the RETURNS TABLE declaration defines `class_id uuid`
-- as an OUT parameter. Inside the function body, the SELECT against
-- `class_enrollments WHERE class_id = target_class.id AND student_id = caller_id`
-- triggers PostgreSQL error 42702 "column reference class_id is ambiguous"
-- because `class_id` could refer to either the OUT parameter OR the
-- `class_enrollments.class_id` column.
--
-- This bug existed in migration 016 original but was NOT detected because
-- the only tests run prior were :
--   - anonymous → raised 42501 BEFORE reaching the SELECT
--   - authenticated + invalid code → raised 02000 BEFORE reaching the SELECT
-- Only the empirical test with a VALID code reached the ambiguous SELECT and
-- exposed the bug.
--
-- **Fix** : qualify all column references with their table name
-- (`class_enrollments.class_id`, `class_enrollments.student_id`,
-- `class_enrollments.enrolled_at`) so PostgreSQL can disambiguate from the
-- OUT parameters of the RETURNS TABLE clause.
--
-- Reproduced in migration 016 dev → 018 (trim fix) → still broken → 019 fix.

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
  if caller_id is null then
    raise exception 'must be authenticated to join a class' using errcode = '42501';
  end if;

  -- Normalize input (trim leading/trailing whitespace) — Sourcery PR #266
  code := trim(code);

  if code is null or length(code) = 0 then
    raise exception 'invitation code is required' using errcode = '22023';
  end if;

  select * into target_class from public.classes where classes.invitation_code = code;
  if not found then
    raise exception 'invalid invitation code' using errcode = '02000';
  end if;

  -- Pre-check existing enrollment. Qualify columns with `class_enrollments.`
  -- to disambiguate from the RETURNS TABLE OUT parameters (class_id, joined_at)
  -- — fixes 42702 ambiguous column reference, migration 019.
  select class_enrollments.enrolled_at into inserted_at
    from public.class_enrollments
    where class_enrollments.class_id = target_class.id
      and class_enrollments.student_id = caller_id;

  if found then
    was_enrolled := true;
  else
    -- Wrap INSERT in EXCEPTION block to absorb race condition on PK violation.
    begin
      insert into public.class_enrollments (class_id, student_id)
        values (target_class.id, caller_id)
        returning class_enrollments.enrolled_at into inserted_at;
    exception when unique_violation then
      select class_enrollments.enrolled_at into inserted_at
        from public.class_enrollments
        where class_enrollments.class_id = target_class.id
          and class_enrollments.student_id = caller_id;
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

-- Re-assert privileges (idempotent — CREATE OR REPLACE drops them in some PG versions).
revoke execute on function public.join_class_by_code(text) from public;
revoke execute on function public.join_class_by_code(text) from anon;
grant execute on function public.join_class_by_code(text) to authenticated;
