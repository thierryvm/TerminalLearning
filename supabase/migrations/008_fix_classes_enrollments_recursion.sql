-- ─── 008: Fix mutual recursion between classes ↔ class_enrollments RLS ────────
-- Root cause (THI-80):
--   "classes: enrolled student select" queries class_enrollments:
--     exists (select 1 from class_enrollments where class_id = id and student_id = auth.uid())
--
--   "class_enrollments: teacher select own class" queries classes:
--     exists (select 1 from classes where id = class_id and teacher_id = auth.uid())
--
-- → Mutual recursion: classes → class_enrollments → classes → 42P17
--
-- Fix: add a SECURITY DEFINER helper is_teacher_of_class(uuid) that queries
-- classes without triggering RLS, then use it in the class_enrollments policy.

-- ── 1. New helper: is_teacher_of_class() ─────────────────────────────────────
create or replace function public.is_teacher_of_class(p_class_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classes
    where id = p_class_id
      and teacher_id = (select auth.uid())
  )
$$;

-- ── 2. Fix: class_enrollments — teacher select own class ─────────────────────
drop policy if exists "class_enrollments: teacher select own class" on public.class_enrollments;

create policy "class_enrollments: teacher select own class"
  on public.class_enrollments for select
  using (public.is_teacher_of_class(class_id));

-- ── 3. Fix: class_enrollments — teacher insert ───────────────────────────────
-- Same pattern: exists(select from classes) → mutual recursion
drop policy if exists "class_enrollments: teacher insert" on public.class_enrollments;

create policy "class_enrollments: teacher insert"
  on public.class_enrollments for insert
  with check (public.is_teacher_of_class(class_id));

-- ── 4. Fix: class_enrollments — student or teacher delete ────────────────────
drop policy if exists "class_enrollments: student or teacher delete" on public.class_enrollments;

create policy "class_enrollments: student or teacher delete"
  on public.class_enrollments for delete
  using (
    student_id = (select auth.uid())
    or public.is_teacher_of_class(class_id)
  );
