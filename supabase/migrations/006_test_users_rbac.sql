-- ─── 006: RBAC test-user kit (THI-76) ────────────────────────────────────────
-- Creates 5 test users (one per role) + 1 institution + 1 class + enrollments.
-- Idempotent: ON CONFLICT DO NOTHING on all inserts.
--
-- ⚠️  PASSWORD NOTE: pgcrypto bcrypt hashes are NOT accepted by GoTrue's
--     password verification. After applying this migration, reset each user's
--     password via Supabase Dashboard → Authentication → Users → "Send password
--     recovery email" (or use the Admin API). The intended password is:
--     TerminalLearning2026!
--
-- Emails:
--   test.superadmin@terminallearning.dev       → super_admin
--   test.institutionadmin@terminallearning.dev → institution_admin
--   test.teacher@terminallearning.dev          → teacher
--   test.pendingt@terminallearning.dev         → pending_teacher
--   test.student@terminallearning.dev          → student

do $$
declare
  v_pwd  text        := crypt('TerminalLearning2026!', gen_salt('bf', 10));
  v_now  timestamptz := now();

  -- Fixed UUIDs for reproducibility
  u1 uuid := '11111111-1111-1111-1111-111111111101'; -- super_admin
  u2 uuid := '11111111-1111-1111-1111-111111111102'; -- institution_admin
  u3 uuid := '11111111-1111-1111-1111-111111111103'; -- teacher
  u4 uuid := '11111111-1111-1111-1111-111111111104'; -- pending_teacher
  u5 uuid := '11111111-1111-1111-1111-111111111105'; -- student

  inst1  uuid;
  class1 uuid;
begin

  -- ── 1. Auth users ────────────────────────────────────────────────────────────
  -- handle_new_user() trigger auto-creates profiles with role='student'
  insert into auth.users (
    id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) values
    (u1, 'authenticated', 'authenticated',
     'test.superadmin@terminallearning.dev', v_pwd, v_now, v_now, v_now,
     '{"provider":"email","providers":["email"]}',
     '{"display_name":"Test Super Admin"}', false),

    (u2, 'authenticated', 'authenticated',
     'test.institutionadmin@terminallearning.dev', v_pwd, v_now, v_now, v_now,
     '{"provider":"email","providers":["email"]}',
     '{"display_name":"Test Institution Admin"}', false),

    (u3, 'authenticated', 'authenticated',
     'test.teacher@terminallearning.dev', v_pwd, v_now, v_now, v_now,
     '{"provider":"email","providers":["email"]}',
     '{"display_name":"Test Teacher"}', false),

    (u4, 'authenticated', 'authenticated',
     'test.pendingt@terminallearning.dev', v_pwd, v_now, v_now, v_now,
     '{"provider":"email","providers":["email"]}',
     '{"display_name":"Test Pending Teacher"}', false),

    (u5, 'authenticated', 'authenticated',
     'test.student@terminallearning.dev', v_pwd, v_now, v_now, v_now,
     '{"provider":"email","providers":["email"]}',
     '{"display_name":"Test Student"}', false)

  on conflict (id) do nothing;

  -- ── 2. Profiles safety net (in case trigger did not fire) ────────────────────
  insert into public.profiles (id, role)
  values (u1, 'student'), (u2, 'student'), (u3, 'student'),
         (u4, 'student'), (u5, 'student')
  on conflict (id) do nothing;

  -- ── 3. Set display_names ─────────────────────────────────────────────────────
  update public.profiles
  set display_name = case id
    when u1 then 'Test Super Admin'
    when u2 then 'Test Institution Admin'
    when u3 then 'Test Teacher'
    when u4 then 'Test Pending Teacher'
    when u5 then 'Test Student'
  end
  where id in (u1, u2, u3, u4, u5);

  -- ── 4. Disable escalation trigger — migration runs as postgres (no auth.uid) ─
  alter table public.profiles disable trigger prevent_role_escalation_trigger;

  -- ── 5. Assign roles ──────────────────────────────────────────────────────────
  update public.profiles set role = 'super_admin'       where id = u1;
  update public.profiles set role = 'institution_admin' where id = u2;
  update public.profiles set role = 'teacher'           where id = u3;
  update public.profiles set role = 'pending_teacher',
                              role_requested_at = v_now  where id = u4;
  -- u5 stays 'student' (already the default)

  -- ── 6. Re-enable escalation trigger ─────────────────────────────────────────
  alter table public.profiles enable trigger prevent_role_escalation_trigger;

  -- ── 7. Test institution ───────────────────────────────────────────────────────
  insert into public.institutions (name, domain_whitelist, admin_id)
  values ('École de Test', ARRAY['@terminallearning.dev'], u2)
  returning id into inst1;

  -- ── 8. Link institution_admin + teacher to institution ───────────────────────
  update public.profiles
  set institution_id = inst1
  where id in (u2, u3);

  -- ── 9. Test class ─────────────────────────────────────────────────────────────
  insert into public.classes (name, teacher_id, institution_id)
  values ('Terminal 101', u3, inst1)
  returning id into class1;

  -- ── 10. Enroll pending_teacher + student ──────────────────────────────────────
  insert into public.class_enrollments (class_id, student_id)
  values (class1, u4), (class1, u5)
  on conflict do nothing;

end $$;
