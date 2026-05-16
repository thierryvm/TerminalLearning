# Mini-prompt de reprise — THI-42 Profile Hub + UserMenu role-aware (Phase 7)

> **Pour la prochaine session CC TL** : copier ce fichier dans le contexte au démarrage, ou pointer ce path. Conçu pour absorber le contexte Sprint 2 sans recharger l'historique de la session 2026-05-16.
>
> Si VS Code a tué la TodoList ou si /compact a dilué le contexte : ce fichier est la source de vérité authoritative pour la reprise.

## État au 16 mai 2026 (clôture session)

- **main HEAD** : `e6adcd5 chore(security): THI-180 — revoke EXECUTE on trigger-only SECURITY DEFINER functions (#237)`
- **PRs ouvertes** : 0 (au moment du shutdown)
- **Branche docs courante** : `docs/post-THI-131-180-updates` (CHANGELOG.md + STORY.md + docs/security-audit-log.md + agents README + ce fichier — PR pendante validation @thierry)
- **Vitest baseline** : 1405 pass / 20 skipped (post-THI-131 + THI-180)
- **Lighthouse prod (Landing)** : 100/100/100/100 + LCP 332ms + CLS 0.00 (gain THI-118 préservé)
- **Score IA security** : 9.4/10 (baseline post-THI-113 ALL CLEAR, stable cette session)
- **Sprint 2 — étape 3/N livrée** : THI-118 ✅ → THI-153 ✅ → THI-131 ✅ (PR #236 Auth MVP 1/N) + THI-180 ✅ (cleanup cascade)

## Actions manuelles @thierry pendantes

Avant d'attaquer THI-42, vérifier que ces 2 actions Supabase Dashboard ont été faites :

1. **Apply migration `014_revoke_security_definer_rpc.sql`** via Supabase Dashboard SQL Editor (5 secondes, idempotent — DO blocks + pg_proc check). Refs : `supabase/migrations/014_revoke_security_definer_rpc.sql` versionné en main.
2. **Flip Leaked Password Protection ON** dans Supabase Dashboard → Authentication → Settings (1 clic, ferme le 4ᵉ Advisor WARN).

Si non fait : pas bloquant pour THI-42 (Profile Hub ne touche pas ces fonctions), mais à compléter avant flip `LTI_ENABLED=true` en PR #3 LTI.

## Scope verrouillé THI-42

| Livrable | Contraintes |
|---|---|
| **Profile Hub** `/app/profile` (nouvelle route) | Role-aware : affichage différencié student/teacher/institution_admin/super_admin. Stack identique au reste : shadcn/ui, Tailwind v4, theme.css var system, framer-motion retiré (CSS animations only). |
| **UserMenu role-aware** | Dropdown GitHub-style existant (THI-47, `src/app/components/UserMenu.tsx`) à enrichir : section "Mon profil" + section "Classes/Institution" si rôle teacher+ + section "Admin Dashboard" si institution_admin+. Pas de duplication, juste extension contextuelle. |
| **RBAC tests** | Cinq scénarios : student / teacher / institution_admin / super_admin / anonymous. Réutiliser le pattern `src/test/rbac.test.ts` (40 tests existants) sans réinventer. |
| **Validation visuelle 5 rôles** | Empirique @thierry sur preview Vercel — pas de merge sans son OK explicite (discipline post-incident PR #237 merge en autonomie, voir STORY.md "Le 16 mai"). |

## Hors scope THI-42 (= mini-PRs futures)

- ❌ Edit du profil (nom, email) — déjà géré par Supabase Auth UI native
- ❌ Avatar custom upload — pas demandé V1, OAuth providers fournissent l'avatar
- ❌ Heatmap activité élève vue enseignant (= THI-77, mini-PR séparée)
- ❌ Heatmap adoption plateforme super_admin (= THI-78, mini-PR séparée)
- ❌ PR #2 LTI endpoint integration (= séparée, gate AVANT `LTI_ENABLED=true`)

## Discipline obligatoire (rappel post-incident merge PR #237 en autonomie)

1. **Validation @thierry obligatoire AVANT merge** — même si CI verte + Sourcery addressed + Vercel preview success. Carte blanche technique ≠ merge en autonomie. (Lesson learnt, voir STORY.md ligne ~688)
2. **Bypass token Vercel JAMAIS via MCP** — règle absolue 24/04. Pour valider une preview protégée : prod publique post-merge fast-forward, OU `curl` bash CLI avec header HTTP (token jamais en URL).
3. **Agent `ui-auditor` obligatoire AVANT PR** — Profile Hub touche `UserMenu.tsx` + nouvelle page. Pas d'exception.
4. **Agent `rbac-flow-tester` obligatoire AVANT merge** — flow auth + 5 rôles. Pattern `src/test/rbac.test.ts`.

## Cascade QA recommandée pour PR THI-42

| Agent | Quand | Bloquant ? |
|---|---|---|
| `ui-auditor` | Avant PR | ✅ CRITICAL |
| `mobile-responsive-auditor` | Avant PR (nouvelle route + UserMenu drawer mobile) | ⚠️ BLOCK si régression |
| `test-runner` | Avant push | ✅ CRITICAL |
| `rbac-flow-tester` | Avant merge | ✅ pass/fail |
| `security-auditor` | Avant merge (touche auth) | ✅ CRITICAL/HIGH |

## Premier audit `lti-auditor` au démarrage

L'agent `lti-auditor` (créé PR #236) est **effective-NEXT-session** après sa propre PR de création — runtime CC ne le voyait pas dans la session de création. Au démarrage de la prochaine session, **invoquer `lti-auditor` une fois** pour la 1ʳᵉ baseline officielle post-merge. Archive le rapport dans `docs/security-audit-log.md`. Pattern THI-109 (prompt-guardrail-auditor avait été testé pareil au premier reboot).

## Plan séquencé Sprint 2 (rappel)

```
✅ THI-118 — Landing LCP regression fix
✅ THI-153 — Unified destructive red + cleanup UI
✅ THI-131 — LTI Phase 7c Auth MVP (PR #236 — 1/N)
✅ THI-180 — Revoke SECURITY DEFINER trigger functions
🔜 THI-42  — Profile Hub + UserMenu role-aware  ← NEXT
🔜 THI-77  — Heatmap activité élève vue teacher
🔜 THI-78  — Heatmap adoption super_admin/institution_admin
🔜 PR #2 LTI — Endpoint integration (api/lti/launch.ts → verifyJwt() chain)
🔜 PR #3 LTI — Mock LMS harness Playwright + activation LTI_ENABLED=true
🔜 Audit final triple (security + lti + ui) avant flip prod
🔜 Démo end-to-end 10 juin (Canvas click → dashboard prof heatmap classe)
```

## Tickets backlog tracked (post-deadline 10 juin)

- **THI-177** — Pré-i18n discipline (Low, gate Phase 9 admin)
- **THI-178** — SEO longue traîne SSG (Low, Phase 10+)
- **THI-179** — securityheaders.com A → A+ via Cross-Origin-Embedder-Policy (Low, post-LTI 7c)
- **THI-182** — Move SECURITY DEFINER RLS helpers (`get_my_role`, `get_my_institution_id`, `is_teacher_of_class`) to private schema (Backlog Low, ~2-3h + RBAC tests, ferme les 3 dernières WARN Supabase Advisor)

## Risques connus à anticiper

- **PR #2 LTI** : `jsonwebtoken` doit être retiré quand `api/lti/launch.ts` migre vers `verifyJwt()` du nouveau code `src/lib/lti/verifyJwt.ts`. Ne PAS laisser les 2 cohabiter (alg confusion latente).
- **undici@5.28.4** transitive via `@vercel/node@5.8.2` : 7 CVEs catalog, 0 exploitable TL (allowlist iss strict + rate-limit + serveur-à-serveur). Monitor `@vercel/node@6.x` upstream pour bump Q3 2026. Documenté `docs/audits/lti-phase7c-deps-risk.md`.
- **Sourcery rate-limit hebdomadaire** : si SKIPPED sur PR Sprint 2, acceptable per CLAUDE.md mais signaler pour traçabilité.

## Reprise immédiate au démarrage

1. **Phase 0** model check : `.claude/settings.local.json` doit avoir `"model": "claude-opus-4-7"` (anti-Haiku discipline post-24/04).
2. **Phase 1** : lire ce fichier + MEMORY.md index + memos critiques (`session_startup_process`, `security_new_session_rules`).
3. **Phase 2** : `git status` + `git log --oneline -5` + `gh pr list --state open` + invoquer `linear-sync` agent.
4. **Phase 3** : invoquer `lti-auditor` pour 1ʳᵉ baseline officielle (effective-NEXT-session post-création).
5. **Phase 4** : brancher `feature/THI-42-profile-hub` + lire `src/app/components/UserMenu.tsx` + `src/test/rbac.test.ts` avant d'écrire la moindre ligne.

— Fin du mini-prompt —
