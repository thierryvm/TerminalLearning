-- ─── 024: GoTrue NULL strings — preventive global fix ────────────────────────
-- Sprint 2.B (THI-280) — Sourcery review PR #297 (26/05/2026, commentaire général 1)
--
-- ## Issue
--
-- Les migrations 006 et 022b ont fixé NULL → empty strings sur leurs propres
-- users seulement (WHERE id IN (specific UUIDs)). Tout user EXISTANT en prod
-- (organique ou créé par un futur signup pré-fix) peut encore avoir des champs
-- string NULL et déclencher une erreur 500 GoTrue "Database error loading
-- user" sur un futur `PUT /auth/v1/admin/users/{uuid}`.
--
-- ## Reproduit en pratique
--
-- 22 mai 2026 — création des 3 users École B (migration 022b) : crash 500
-- sur `PUT /admin/users/{uuid}` au premier reset password (confirmation_token
-- + recovery_token NULL). Si même un seul user organique tombe sur un workflow
-- Admin API (reset password forcé par @thierry, suppression de compte, etc.),
-- même crash.
--
-- ## Fix preventif global
--
-- COALESCE sur tous les champs string nullable connus de l'API GoTrue. Si
-- une colonne n'a pas de NULL → UPDATE est no-op (idempotent). Si une
-- colonne a des NULL → empty string. Pas de risque de modifier la valeur
-- d'un champ non-NULL (COALESCE preserve les valeurs existantes).
--
-- ## Champs couverts (extraits de GoTrue v2.x Go scanner constraints)
--
-- - instance_id (UUID, default '00000000-...')
-- - email_change, email_change_token_new, email_change_token_current
-- - phone_change
-- - confirmation_token, recovery_token (ajoutés post-022b)
-- - reauthentication_token (préventif vs alerte security-auditor M3)
--
-- ## Note de sécurité
--
-- Cette migration tourne sous role postgres (superuser, bypass RLS). Elle
-- ne touche QUE les champs string nullable de auth.users — pas de mutation
-- de role, pas de mutation de email, pas de mutation de encrypted_password.
-- Audit security-auditor : safe — pas de vecteur d'escalation introduit.

update auth.users
set
  instance_id                = coalesce(instance_id, '00000000-0000-0000-0000-000000000000'),
  email_change               = coalesce(email_change, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change               = coalesce(phone_change, ''),
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '');

-- Verification : count des rows encore problématiques (devrait être 0)
do $$
declare
  remaining_null int;
begin
  select count(*) into remaining_null
  from auth.users
  where instance_id is null
     or email_change is null
     or email_change_token_new is null
     or email_change_token_current is null
     or phone_change is null
     or confirmation_token is null
     or recovery_token is null
     or reauthentication_token is null;
  if remaining_null > 0 then
    raise warning 'GoTrue NULL strings : % users restants avec NULL après UPDATE. Investigation requise.', remaining_null;
  end if;
end $$;
