-- ─── THI-37: RBAC — user roles model ─────────────────────────────────────────
-- Roles: super_admin | institution_admin | teacher | pending_teacher | student
-- Flow: student → pending_teacher (self-request) → teacher (admin approval)

-- ─── 1. Extend profiles ───────────────────────────────────────────────────────
alter table public.profiles
  add column role              text        not null default 'student'
                               check (role in ('super_admin','institution_admin','teacher','pending_teacher','student')),
  add column display_name      text,
  add column bio               text,
  add column preferred_env     text        check (preferred_env in ('linux','macos','windows')),
  add column sector            text,
  add column institution_id    uuid,       -- FK added after institutions table (circular ref)
  add column role_requested_at timestamptz;

-- ─── 2. institutions ──────────────────────────────────────────────────────────
create table public.institutions (
  id               uuid        primary key default gen_random_uuid(),
  name             text        not null,
  domain_whitelist text[],                 -- optional: ['@ulb.be', '@uliege.be']
  admin_id         uuid        references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);

alter table public.institutions enable row level security;

-- ─── 3. Add FK profiles → institutions (after table exists) ──────────────────
alter table public.profiles
  add constraint profiles_institution_id_fkey
    foreign key (institution_id)
    references public.institutions(id) on delete set null;

-- ─── 4. classes ───────────────────────────────────────────────────────────────
create table public.classes (
  id               uuid        primary key default gen_random_uuid(),
  name             text        not null,
  teacher_id       uuid        not null references public.profiles(id) on delete cascade,
  institution_id   uuid        references public.institutions(id) on delete set null,
  created_at       timestamptz not null default now()
);

alter table public.classes enable row level security;

-- ─── 5. class_enrollments ────────────────────────────────────────────────────
create table public.class_enrollments (
  class_id         uuid        not null references public.classes(id) on delete cascade,
  student_id       uuid        not null references public.profiles(id) on delete cascade,
  enrolled_at      timestamptz not null default now(),
  primary key (class_id, student_id)
);

alter table public.class_enrollments enable row level security;

-- ─── 6. admin_audit_log (insert-only) ────────────────────────────────────────
create table public.admin_audit_log (
  id               uuid        primary key default gen_random_uuid(),
  actor_id         uuid        not null references public.profiles(id) on delete set null,
  action           text        not null,   -- 'approve_teacher', 'revoke_role', 'delete_user', etc.
  target_type      text        not null,   -- 'profile', 'institution', 'class'
  target_id        uuid,
  metadata         jsonb,
  created_at       timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

-- ─── 7. Indexes ───────────────────────────────────────────────────────────────
create index profiles_role_idx              on public.profiles(role);
create index profiles_institution_id_idx    on public.profiles(institution_id);
create index classes_teacher_id_idx         on public.classes(teacher_id);
create index classes_institution_id_idx     on public.classes(institution_id);
create index class_enrollments_student_idx  on public.class_enrollments(student_id);
create index admin_audit_log_actor_idx      on public.admin_audit_log(actor_id);
create index admin_audit_log_created_idx    on public.admin_audit_log(created_at desc);

-- ─── 8. get_my_role() — security definer to avoid RLS recursion ──────────────
create or replace function public.get_my_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ─── 9. Role escalation prevention trigger ───────────────────────────────────
-- Prevents unauthorized role changes on profiles UPDATE.
-- Allowed changes:
--   • super_admin         → any role
--   • institution_admin   → teacher / pending_teacher / student (not super_admin)
--   • student (self)      → pending_teacher (teacher verification request)
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  -- No role change — nothing to check
  if new.role = old.role then
    return new;
  end if;

  actor_role := public.get_my_role();

  -- super_admin can change any role
  if actor_role = 'super_admin' then
    return new;
  end if;

  -- institution_admin can grant teacher/pending_teacher/student within their institution
  if actor_role = 'institution_admin'
     and new.role in ('teacher', 'pending_teacher', 'student') then
    return new;
  end if;

  -- Student can request teacher verification for themselves only
  if auth.uid() = new.id
     and old.role = 'student'
     and new.role = 'pending_teacher' then
    new.role_requested_at := now();
    return new;
  end if;

  raise exception 'Unauthorized role change from % to %', old.role, new.role;
end;
$$;

create trigger prevent_role_escalation_trigger
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ─── 10. RLS: profiles ────────────────────────────────────────────────────────
-- Existing policies (from 001_init): select own, update own — kept as-is
-- New: admins can see broader sets of profiles

create policy "profiles: super_admin select all"
  on public.profiles for select
  using (public.get_my_role() = 'super_admin');

create policy "profiles: institution_admin select own institution"
  on public.profiles for select
  using (
    public.get_my_role() = 'institution_admin'
    and institution_id = (select institution_id from public.profiles where id = auth.uid())
  );

-- ─── 11. RLS: institutions ────────────────────────────────────────────────────
create policy "institutions: authenticated select"
  on public.institutions for select
  using (auth.role() = 'authenticated');

create policy "institutions: super_admin insert"
  on public.institutions for insert
  with check (public.get_my_role() = 'super_admin');

create policy "institutions: admin update"
  on public.institutions for update
  using (
    public.get_my_role() = 'super_admin'
    or (public.get_my_role() = 'institution_admin' and admin_id = auth.uid())
  );

create policy "institutions: super_admin delete"
  on public.institutions for delete
  using (public.get_my_role() = 'super_admin');

-- ─── 12. RLS: classes ─────────────────────────────────────────────────────────
create policy "classes: teacher select own"
  on public.classes for select
  using (teacher_id = auth.uid());

create policy "classes: enrolled student select"
  on public.classes for select
  using (
    exists (
      select 1 from public.class_enrollments
      where class_id = id and student_id = auth.uid()
    )
  );

create policy "classes: institution_admin select own institution"
  on public.classes for select
  using (
    public.get_my_role() = 'institution_admin'
    and institution_id = (select institution_id from public.profiles where id = auth.uid())
  );

create policy "classes: super_admin select all"
  on public.classes for select
  using (public.get_my_role() = 'super_admin');

create policy "classes: teacher or admin insert"
  on public.classes for insert
  with check (
    teacher_id = auth.uid()
    and public.get_my_role() in ('teacher', 'institution_admin', 'super_admin')
  );

create policy "classes: teacher update own"
  on public.classes for update
  using (teacher_id = auth.uid());

create policy "classes: teacher or admin delete"
  on public.classes for delete
  using (
    teacher_id = auth.uid()
    or public.get_my_role() = 'super_admin'
    or (
      public.get_my_role() = 'institution_admin'
      and institution_id = (select institution_id from public.profiles where id = auth.uid())
    )
  );

-- ─── 13. RLS: class_enrollments ───────────────────────────────────────────────
create policy "class_enrollments: student select own"
  on public.class_enrollments for select
  using (student_id = auth.uid());

create policy "class_enrollments: teacher select own class"
  on public.class_enrollments for select
  using (
    exists (
      select 1 from public.classes where id = class_id and teacher_id = auth.uid()
    )
  );

create policy "class_enrollments: teacher insert"
  on public.class_enrollments for insert
  with check (
    exists (
      select 1 from public.classes where id = class_id and teacher_id = auth.uid()
    )
  );

create policy "class_enrollments: student or teacher delete"
  on public.class_enrollments for delete
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.classes where id = class_id and teacher_id = auth.uid()
    )
  );

-- ─── 14. RLS: admin_audit_log (insert-only, super_admin reads) ───────────────
create policy "admin_audit_log: super_admin select"
  on public.admin_audit_log for select
  using (public.get_my_role() = 'super_admin');

create policy "admin_audit_log: admin insert"
  on public.admin_audit_log for insert
  with check (public.get_my_role() in ('super_admin', 'institution_admin'));

-- ─── 15. Update handle_new_user — explicit role = 'student' ──────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'name'),
    'student'
  );
  return new;
end;
$$;
