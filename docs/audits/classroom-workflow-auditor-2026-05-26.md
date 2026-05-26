---
agent: classroom-workflow-auditor
run_date: 2026-05-26
session: Sprint 2.B closure (post PR #298 + #299 merge)
verdict: SHIP WITH NOTES
mission_pass: 14/14
bonus_pass: 5/5 (cross-institution Sprint 2.B)
dormancy_before_run: 6 days (created 2026-05-20, first empirical break-in 2026-05-26)
doctrine_validated: feedback_agent_dormant_full_audit
---

# classroom-workflow-auditor — premier break-in (26 mai 2026)

## Contexte

L'agent `classroom-workflow-auditor` a été créé le 20 mai 2026 (Sprint 2.A étape 3 PR #274) comme **gate-zero** pour toute PR future touchant `classes`/`class_enrollments`/RPCs class-related. Il documente 14 checks structurés autour du workflow teacher↔student.

**Problème** : il n'a **jamais été invoqué empiriquement** entre sa création (20 mai) et le 26 mai (6 jours dormant). C'est exactement le scénario que la doctrine `feedback_agent_dormant_full_audit.md` codifie comme "agent qui rouille" : un agent dormant accumule silencieusement de la dette de couverture.

Premier break-in déclenché le 26 mai post-Sprint 2.B closure (la doctrine 48h-max était violée + Sprint 2.B avait ajouté une seconde institution permettant maintenant de tester l'isolation cross-institution sur les classes elles-mêmes, pas seulement les profiles).

## Verdict

**⚠ SHIP WITH NOTES — 14/14 mission checks PASS + 5/5 cross-institution bonus PASS, 0 CRITICAL, 0 HIGH.**

| # | Check | Verdict | Method |
|---|---|---|---|
| 1 | teacher_a creates class → invitation_code 12-hex generated | ✅ PASS | CLI INSERT RETURNING |
| 2 | student cannot create class (RLS INSERT denied) | ✅ PASS | REST API 403 |
| 3 | student joins via RPC → success + already_enrolled=false | ✅ PASS | CLI RPC + REST API RPC |
| 4 | already_enrolled returns true on retry, joined_at identical, 1 row only | ✅ PASS | CLI RPC |
| 5 | anon cannot call join_class_by_code (REVOKE PUBLIC) | ✅ PASS | CLI 42501 + REST API 42501 |
| 6 | student cannot create class (role check) | ✅ PASS | REST API 403 |
| 7 | teacher_a sees student enrollment after join | ✅ PASS | CLI policy simulation |
| 8 | invitation_code is UNIQUE (constraint + index) | ✅ PASS | DB constraint verification |
| 9 | already_enrolled flag in RPC response | ✅ PASS | CLI RPC retry |
| 10 | error mapping: invalid code → 02000, empty → 22023, non-authed → 42501 | ✅ PASS | CLI 3 error tests |
| 11 | CASCADE delete: class deletion cleans enrollments | ✅ PASS | FK constraint verification |
| 12 | trim normalization: padded code trims + no match → 02000 | ✅ PASS | CLI RPC |
| 13 | bug 42702 absence: RETURNS TABLE column ambiguity ne ressurgit pas | ✅ PASS | Migration 019 in place |
| 14 | happy path complete: teacher creates → URL code → student enrolls via REST API | ✅ PASS | Full REST API E2E |

### Bonus cross-institution isolation Sprint 2.B

| Check | Verdict | Method |
|---|---|---|
| teacher_b sees 0 classes of teacher_a | ✅ PASS | REST API 0 rows |
| institution_admin_b sees 0 classes of École A | ✅ PASS | REST API 0 rows |
| institution_admin_b cannot delete Terminal 101 (cross-institution) | ✅ PASS | REST API 204 + 0 rows deleted, target intact |
| student sees only enrolled classes (not all classes) | ✅ PASS | REST API 1 row (enrolled only) |
| super_admin sees all classes | ✅ PASS | REST API 7 rows |

## Findings sub-tickets follow-up

Linear free plan quota dépassé au 26 mai 18h30 → impossible de créer des tickets séparés. Les 3 findings sont documentés ici jusqu'à upgrade Linear ou cleanup de tickets fermés.

### F-A — MEDIUM : Migration 027 progress teacher visibility RLS policy (gate TeacherDashboard v2)

**Problème (latent, pas un bug runtime actuel)** :

La table `progress` n'a aucune RLS policy permettant à un `teacher` de SELECT les rows de progression de ses élèves enrollés. Actuel `pg_policies` montre uniquement `user_id = auth.uid()` pour les 4 ops (SELECT/INSERT/UPDATE/DELETE).

Le TeacherDashboard V1 actuel ne query PAS `progress` (zéro view de progression élève), donc ce n'est pas une régression visible aujourd'hui. **Mais** :
1. L'UI dit déjà « suis leurs progressions » (TeacherDashboard description)
2. Le prochain sprint qui ajoute une vue progression élève dans le dashboard teacher devra query `progress JOIN class_enrollments WHERE teacher_id = auth.uid()`
3. Sans cette policy, ce query retournera **0 rows silencieusement** (no error, no data) → bug latent qui surface dès que la view est implémentée

**Fix** — Migration 027 :

```sql
create policy "progress: teacher select enrolled student"
  on public.progress for select
  using (
    exists (
      select 1 from public.class_enrollments ce
        join public.classes c on c.id = ce.class_id
       where ce.student_id = progress.user_id
         and c.teacher_id = auth.uid()
    )
  );
```

**Gate** : avant TeacherDashboard v2 avec progression élève visible (ou toute UI qui affiche progression cross-user).

**Tests à ajouter** :
- Vitest integration : teacher A → SELECT progress WHERE student_id IN (enrollments) → retourne rows ✅
- Vitest integration : teacher A → SELECT progress WHERE student_id = non-enrolled student → retourne 0 ✅
- Vitest integration : teacher B (cross-teacher intra-institution) → SELECT progress des students de teacher A → retourne 0 ✅

### F-B — MEDIUM : Codifier pattern E2E test cleanup dans tous les agents

**Problème (constat)** :

Au début du run `classroom-workflow-auditor`, 4 classes test orphelines existaient en DB des runs précédents d'agents (probablement `institution-rbac-auditor` 1er break-in 26 mai matin) :
- `E2E_TEST_1779210965`
- `E2E_DEBUG`
- `E2E_DEBUG_TEST`
- `E2E_DEBUG_1779211233`

Toutes avec `institution_id = NULL`, polluant la DB de test fixtures non-cleanées. Le cleanup a eu lieu pendant ce run.

**Fix — pattern à codifier cross-agent** :

1. **Naming convention** : préfixe `E2E_` obligatoire pour toute donnée de test créée par un agent
2. **Cleanup startup** : début de chaque run, `DELETE FROM <table> WHERE name LIKE 'E2E_%'` AVANT de créer les fixtures (idempotent re-run safe)
3. **Cleanup teardown** : fin de chaque run, même `DELETE` pour ne pas laisser de traces
4. **Crash safety** : utiliser `BEGIN ... EXCEPTION ... ROLLBACK` ou guard `DELETE` au startup même si crash mid-run

**Files à update** :
- `.claude/agents/institution-rbac-auditor.md` — ajouter section "E2E cleanup pattern"
- `.claude/agents/classroom-workflow-auditor.md` — déjà documente le pattern (à promouvoir comme standard cross-agent)
- `.claude/agents/rbac-flow-tester.md` — ajouter section
- `.claude/agents/README.md` — codifier dans la section "Conventions cross-agent"

### F-C — LOW : Doctrine cross-agent — RLS isolation tests via REST API obligatoire

**Problème (faux positif test pattern)** :

Le pattern Supabase CLI `set_config('role', 'authenticated', true)` documenté dans le frontmatter de `classroom-workflow-auditor` produit `current_user = authenticated` mais `session_user` reste `postgres`. PostgreSQL `relforcerowsecurity = false` (default) signifie que le **session owner** (postgres) peut bypass RLS selon l'ordre de résolution des privilèges.

**Symptôme empirique** :
- Via CLI impersonation : `institution_admin_b` retourne 7 classes (faux positif — semble voir cross-institution)
- Via REST API + real JWT : `institution_admin_b` retourne 0 classes (correct — isolation respectée)

**Ground truth = REST API**.

**Impact** : Le pattern CLI fonctionne bien pour tester les **RPC functions** (qui ont des `auth.uid()` explicites dans leur body, comme `join_class_by_code` ou `approve_teacher`), mais **n'est pas fiable** pour tester les **RLS SELECT isolation** purs.

**Fix — codifier dans les agents** :

1. **Pour tester RLS SELECT isolation** : OBLIGATOIRE utiliser REST API avec JWT real obtenu via `/auth/v1/token?grant_type=password`
2. **Pour tester RPC functions** : CLI impersonation reste OK (les fonctions checkent `auth.uid()` indépendamment)
3. **Anti-leak discipline** : JWT en variable shell, jamais dumpé en stdout (cf. mémoire `feedback_anti_leak_discipline_jwt_short_lived.md`)

**Files à update** :
- `.claude/agents/classroom-workflow-auditor.md` — ajouter caveat dans section impersonation pattern
- `.claude/agents/institution-rbac-auditor.md` — ajouter caveat (ce pattern a possiblement aussi des faux positifs dans son scope)
- `.claude/agents/rbac-flow-tester.md` — vérifier que le pattern utilise déjà REST API
- Mémoire CC : `feedback_rls_isolation_test_rest_only.md`

### F-D — INFO : Classe `Bash 101` manuelle de @thierry

Une classe `Bash 101` existe avec `teacher_id = a0c4a8cd-fb77-403a-bbaa-b2fc7094e84b` (super_admin sans display_name), `institution_id = NULL`. Pas une fixture migration, créée manuellement.

**Impact** : aucun. Institution_admins ne la voient pas (no matching institution_id). Students seulement si enrolled. Super_admin voit correctement.

**Action** : laissée en place intentionnellement.

## Doctrine validée

L'agent `classroom-workflow-auditor` dormant 6 jours a généré **2 findings MEDIUM + 1 LOW** au premier break-in. Sans break-in, ces findings auraient été découverts :
- F-A : seulement quand TeacherDashboard v2 ajouterait progression view → bug latent silencieux (0 rows retournés sans erreur)
- F-B : seulement quand pollution DB tests s'accumulerait jusqu'à interférer avec un test
- F-C : seulement quand un test isolation aurait un faux positif inquiétant

C'est la 2ème validation empirique cross-session de la doctrine `feedback_agent_dormant_full_audit.md` (la 1ère étant `institution-rbac-auditor` qui avait trouvé 1 HIGH drift au premier break-in le 26 mai matin).

**Renforcement de la doctrine** : tout nouvel agent créé doit être invoqué empiriquement dans les 48h max post-création, ET les agents existants doivent être audités de façon récurrente (trimestriel ou par cycle Sprint).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
