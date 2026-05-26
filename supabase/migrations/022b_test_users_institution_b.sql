-- ─── 022b: Sprint 2.B — 3 test users in École B (THI-280) ─────────────────────
-- Adds a second institution ("École B Test") + 3 staff personas to enable
-- empirical cross-institution RBAC isolation testing.
--
-- Pourquoi : Migration 006 a créé 5 personas dans "École de Test" (École A).
-- Sprint 2.B (institution_admin lite + approve_teacher RPC) requires a SECOND
-- institution to prove cross-institution isolation empirically — without a
-- 2nd institution, "no one leaks across" can only be asserted in theory.
--
-- Scope intentionnellement réduit (3 personas, pas 5) :
--   - institution_admin_b — approve workflow target (will approve pending_teacher_b)
--   - teacher_b           — verified teacher of École B (cross-teacher isolation A↔B)
--   - pending_teacher_b   — pending approval (target of approve_teacher RPC tests)
-- Pas de student_b ni super_admin_b : student isolation déjà testée via École A
-- enrollments ; super_admin reste unique global (Thierry uniquement, prod réelle).
--
-- ⚠️  PASSWORD NOTE: same as migration 006 — pgcrypto bcrypt ≠ GoTrue bcrypt.
--     After applying this migration, reset passwords via the Admin API:
--
--       SERVICE_KEY=$(supabase projects api-keys --project-ref jdnukbpkjyyyjpuwgxhv --output json \
--         | jq -r '.[] | select(.name=="service_role") | .api_key')
--       for UUID in 22222222-2222-2222-2222-222222222202 \
--                   22222222-2222-2222-2222-222222222203 \
--                   22222222-2222-2222-2222-222222222204; do
--         curl -s -X PUT "https://jdnukbpkjyyyjpuwgxhv.supabase.co/auth/v1/admin/users/$UUID" \
--           -H "Authorization: Bearer $SERVICE_KEY" -H "apikey: $SERVICE_KEY" \
--           -H "Content-Type: application/json" \
--           -d '{"password":"<random-32-chars — see .env.test>"}'
--       done
--
-- ⚠️  GOTRUE COMPAT: mêmes contraintes que 006 — instance_id + empty strings
--     pour email_change, email_change_token_new, email_change_token_current, phone_change.
--
-- Emails :
--   test.institutionadmin.b@terminallearning.dev → institution_admin (École B)
--   test.teacher.b@terminallearning.dev          → teacher (École B)
--   test.pendingt.b@terminallearning.dev         → pending_teacher (École B)

do $$
declare
  -- Password placeholder — actual password set via Admin API after migration (GoTrue compat).
  v_pwd  text        := crypt('PLACEHOLDER_RESET_VIA_ADMIN_API', gen_salt('bf', 10));
  v_now  timestamptz := now();

  -- Fixed UUIDs for École B — préfixe 222... pour distinguer 111... (École A)
  u2_b uuid := '22222222-2222-2222-2222-222222222202'; -- institution_admin_b
  u3_b uuid := '22222222-2222-2222-2222-222222222203'; -- teacher_b
  u4_b uuid := '22222222-2222-2222-2222-222222222204'; -- pending_teacher_b

  inst2 uuid;
begin

  -- ── 1. Auth users ────────────────────────────────────────────────────────────
  -- handle_new_user() trigger auto-creates profiles with role='student'
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    email_change, email_change_token_new, email_change_token_current, phone_change,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) values
    (u2_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'test.institutionadmin.b@terminallearning.dev', v_pwd, v_now, v_now, v_now,
     '', '', '', '',
     '{"provider":"email","providers":["email"]}',
     '{"display_name":"Test Institution Admin École B"}', false),

    (u3_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'test.teacher.b@terminallearning.dev', v_pwd, v_now, v_now, v_now,
     '', '', '', '',
     '{"provider":"email","providers":["email"]}',
     '{"display_name":"Test Teacher École B"}', false),

    (u4_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'test.pendingt.b@terminallearning.dev', v_pwd, v_now, v_now, v_now,
     '', '', '', '',
     '{"provider":"email","providers":["email"]}',
     '{"display_name":"Test Pending Teacher École B"}', false)

  on conflict (id) do nothing;

  -- ── 1b. GoTrue compat fix — NULL→string crash on UPDATE (idempotent) ─────────
  -- IMPORTANT : migration 006 documente instance_id + email_change + email_change_token_new
  -- + email_change_token_current + phone_change. Mais la migration 022b a révélé
  -- empiriquement (Sprint 2.B THI-280) que confirmation_token + recovery_token
  -- sont AUSSI sujets au crash GoTrue PUT /admin/users/{uuid} ("Database error
  -- loading user", code 500). Inclure ces 2 champs supplémentaires ici.
  update auth.users set
    instance_id                = coalesce(instance_id, '00000000-0000-0000-0000-000000000000'),
    email_change               = coalesce(email_change, ''),
    email_change_token_new     = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change               = coalesce(phone_change, ''),
    confirmation_token         = coalesce(confirmation_token, ''),
    recovery_token             = coalesce(recovery_token, '')
  where id in (u2_b, u3_b, u4_b);

  -- ── 2. Profiles safety net (in case trigger did not fire) ────────────────────
  insert into public.profiles (id, role)
  values (u2_b, 'student'), (u3_b, 'student'), (u4_b, 'student')
  on conflict (id) do nothing;

  -- ── 3. Set display_names ─────────────────────────────────────────────────────
  update public.profiles
  set display_name = case id
    when u2_b then 'Test Institution Admin École B'
    when u3_b then 'Test Teacher École B'
    when u4_b then 'Test Pending Teacher École B'
  end
  where id in (u2_b, u3_b, u4_b);

  -- ── 4. Disable escalation trigger — migration runs as postgres (no auth.uid) ─
  alter table public.profiles disable trigger prevent_role_escalation_trigger;

  -- ── 5. Assign roles ──────────────────────────────────────────────────────────
  update public.profiles set role = 'institution_admin' where id = u2_b;
  update public.profiles set role = 'teacher'           where id = u3_b;
  update public.profiles set role = 'pending_teacher',
                              role_requested_at = v_now  where id = u4_b;

  -- ── 6. Re-enable escalation trigger ─────────────────────────────────────────
  alter table public.profiles enable trigger prevent_role_escalation_trigger;

  -- ── 7. Test institution B ────────────────────────────────────────────────────
  -- Idempotent : ON CONFLICT sur (name, admin_id) via name lookup first.
  select id into inst2 from public.institutions
    where name = 'École B Test' and admin_id = u2_b;
  if inst2 is null then
    insert into public.institutions (name, domain_whitelist, admin_id)
    values ('École B Test', ARRAY['@terminallearning.dev'], u2_b)
    returning id into inst2;
  end if;

  -- ── 8. Link institution_admin_b + teacher_b + pending_teacher_b to École B ──
  -- Note : pending_teacher_b est aussi linké à inst2 — c'est volontaire,
  -- son institution_id reflète l'institution d'origine de la demande.
  -- approve_teacher RPC (Étape 3 Sprint 2.B) validera que caller et target
  -- ont le même institution_id avant promotion.
  update public.profiles
  set institution_id = inst2
  where id in (u2_b, u3_b, u4_b);

end $$;
