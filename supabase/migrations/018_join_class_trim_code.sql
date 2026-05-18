-- ─── 018: Normalize invitation code input in join_class_by_code() ──────────
-- THI-235 Sprint 2.A — Sourcery review fix (PR #266)
--
-- Bug risk identified by Sourcery on migration 016 line 147 :
--   `if code is null or length(trim(code)) = 0 then`
-- The empty-check trims the code, but the SELECT later uses the UNTRIMMED
-- value. A user submitting `' abc123 '` (with surrounding whitespace) passes
-- the non-empty validation but the lookup `WHERE invitation_code = code`
-- fails to match the stored value `abc123`. User sees "invalid invitation
-- code" while their code is technically correct → confusing UX.
--
-- Fix : normalize the input once at function entry (`code := trim(code)`)
-- before validation, so all downstream usage operates on the trimmed value.
--
-- Also updates the COMMENT on the column + RPC to reflect 12-char hex code
-- (was outdated as 8-char from initial draft).
--
-- Migration 016 + 017 already applied to prod ; this migration replaces the
-- RPC body and updates documentation comments. No data migration needed.

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

  -- Normalize input once : strip surrounding whitespace. All downstream
  -- usage (length check + classes lookup) operates on the trimmed value
  -- — fixes Sourcery PR #266 bug_risk where ` abc123 ` passed non-empty
  -- validation but failed the SELECT match against stored `abc123`.
  code := trim(code);

  if code is null or length(code) = 0 then
    raise exception 'invitation code is required' using errcode = '22023';
  end if;

  select * into target_class from public.classes where invitation_code = code;
  if not found then
    raise exception 'invalid invitation code' using errcode = '02000';
  end if;

  select enrolled_at into inserted_at
    from public.class_enrollments
    where class_id = target_class.id and student_id = caller_id;

  if found then
    was_enrolled := true;
  else
    begin
      insert into public.class_enrollments (class_id, student_id)
        values (target_class.id, caller_id)
        returning enrolled_at into inserted_at;
    exception when unique_violation then
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

-- Re-apply GRANT after CREATE OR REPLACE (REVOKE/GRANT are dropped by CREATE OR REPLACE in some PG versions; idempotent here).
revoke execute on function public.join_class_by_code(text) from public;
revoke execute on function public.join_class_by_code(text) from anon;
grant execute on function public.join_class_by_code(text) to authenticated;

-- Update column + function comments to reflect the 12-char hex code (was
-- outdated as 8-char in migration 016 v1).
comment on column public.classes.invitation_code is
  'THI-235 Sprint 2.A — Unique 12-char hex code (48 bits entropy) teachers share with students. Auto-generated on INSERT via trigger. Used by join_class_by_code() RPC. Input is trim()-normalized on RPC entry.';

comment on function public.join_class_by_code(text) is
  'THI-235 Sprint 2.A — Atomic enrollment via invitation_code. Security definer to bypass class_enrollments RLS for the controlled enrollment path. Returns class info + already_enrolled flag for idempotent UX. Input code is trim()-normalized to absorb leading/trailing whitespace (Sourcery fix migration 018).';
