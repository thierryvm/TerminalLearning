# Terminal Learning — Plan de lancement public

> Dernière mise à jour : **31 mai 2026 CEST** — **🌿 Chantier enrichissement PR #5 (Git & GitHub Référence)** : **PR #340 mergée** — catégories `git` (10 cmds) + `github-collaboration` (6 cmds) ajoutées au catalogue → **59 → 75 commandes** sur `/app/reference`. Sources **git-scm.com** (URLs vérifiées HTTP 200 ; git identique cross-OS = 1 lien canonique/cmd, 0 variante OS). Catégories mirrorent level+prerequisites curriculum (garde-fou cohérence). **`ia-dev` exclu** (pseudo-commandes `ai-help`, 0 doc CLI officielle). Compteurs sync (TOTAL_COMMANDS 75 + FAQ index.html) + **nouveau garde-fou** test : FAQ index.html == constantes (review Sourcery, fini le drift HTML silencieux). Voie A desktop+mobile (0px overflow 390px), 104 tests verts. **Sandbox THI-305 (High)** créé : sandbox git déjà ~21 sous-commandes, mais `git rebase` manquant + audit profondeur (merge commits/conflits réels) pour garantir un exercice exécutable par leçon git. — **Update précédent (31 mai PR #4 Sources officielles)** — **📚** : **PR #337 mergée** — chaque commande de `/app/reference` porte ses **sources officielles** (champ `officialDocs[]` sur `EnrichedCommand`, 57/59 commandes, fusion à l'export → catalogue reste source unique). Modèle par-OS canonique : Linux→man7.org · Windows→Microsoft Learn · macOS→Homebrew + upstream (OpenSSH/GNU/curl) · Debian man-pages (tree/dig/zip/unzip). `open`/`pbcopy` sans lien (pas d'hôte Apple officiel propre, 0 tiers). **Anti-hallucination** : chaque URL vérifiée live HTTP 200 (batch curl HEAD), garde-fou test allow-list domaines officiels + https. Gates : `ui-auditor` SHIP (H1 a11y nouvel-onglet + M2 ring-offset fixés), **Voie A desktop + mobile 390px** (0px overflow, labels wrappent). Aussi **PR #335** (invariants catalogue variant⊆compatibility + syntax/examples). **Process codifié** : Voie A inclut désormais mobile 390px (incident #337 desktop-seul). **Reste chantier** : PR-2 git/github/ia-dev dans le catalogue (+ leurs sources git-scm/GitHub Docs) → éditeur nano v1 → help/man enrichi → progression. — **Update précédent (31 mai PR #3)** — **🗂️ Références unifiées** : **PR #333 mergée** — `commandCatalogue.ts` devient la **source canonique unique** des commandes ; `/app/reference` (CommandReference.tsx) **dérive** désormais du catalogue (`flatMap`, array local de 44 cmds supprimé ~600 lignes). Fin de la divergence deux-sources (le compteur landing pouvait diverger de la page vue par l'user). **38 → 59 commandes**, 0 historique perdue, data migrée (groundée, pas inventée) : nouvelle catégorie `systeme` (+11) + `tree`/`sudo`/`umask`/`getacl`/`jobs`/`bg`/`fg`/`printenv`/`2>`/`2>&1` + spécifiques-OS préservées (Get-Acl, Get-ComputerInfo, open, pbcopy, brew, winget). UX multi-OS : badges compatibilité + variantes par environnement + recommendedFor + commonErrors. **Garde-fou** `commandReferenceSource.test.ts` (assert structurel : page importe le catalogue, pas de réintro d'array local ; assert data : ids historiques présents + catalogue ≥ 59) → la divergence ne peut plus revenir silencieusement. Gates : `ui-auditor` MERGE (1 HIGH a11y clavier pré-existant fixé in-PR) + `content-auditor` 0C (3 warnings fixés + **prompt agent mis à jour** : catalogue = source unique + check compteurs public/). Voie A Playwright PASS (Linux 53 / Windows 54, switch env OK), validation visuelle @thierry « très propre et adapté aux multi-OS ». Réalisé via **session parallèle** (rapport vérifié empiriquement avant merge, pas sur parole). **Reste chantier** : compléter git/github/ia-dev dans le catalogue (apparaîtront auto) → éditeur nano v1 → help/man enrichi OS-spécifique → progression. — **Update précédent (30 mai 2026 ~21h CEST)** — **📚🔒 Chantier enrichissement curriculum démarré (2 PRs)** : **PR #330 (sécu IA d'abord)** = clause frontière pédagogique prompt élève `tutor/v1.1.0→1.1.1` (le tuteur explique mais ne génère jamais de payload offensif, anti-chaîne réputationnelle ROT13→CTF-légal→reverse-shell) + strip reverse-shell output-side + décodeurs ROT13/hex sanitizer + prompt super_admin `v1.0.1` sans littéraux secrets (F-2) + fix commentaire (F-5). Gate `prompt-guardrail-auditor` **SHIP 9.3/10** (0C/0H, 2 MED assumés, 2 LOW fixés in-PR) + delta-check Sourcery (décodeur partagé + regex bornée). Tests AI **412**, injection fixtures 48→56. Démo Voie A connectée (JWT élève éphémère révoqué). **PR #331 (1er contenu)** = leçon fondatrice `command-anatomy` (Navigation niv.1, entre `ls -la` et `cd`) — comble un trou : on enseignait les options au cas par cas sans le modèle universel `commande [options] [arguments]` (court/long, combinaison, `--`, renvoi man/--help). Variante Windows (paramètres PowerShell, Get-Help). Exercice `man ls` + `validateCommandAnatomy` forward-compatible Get-Help. 1er test moteur `man` (closait WARNING audit). **Drift guards 65→66** sur 6 sources de vérité. **test-runner 1834 PASS**, curriculum-validator 0 CRITICAL. Idée @thierry « leçon sur les options » → trou invisible révélé par une question utilisateur. **Reste chantier** : PR Références (commandCatalogue 5 modules manquants) → éditeur nano v1 → contenu manquant (less/find/tar) → help/man enrichi OS-spécifique → progression. — **Update précédent (30 mai 2026 ~14h CEST)** — **🚀 Sprint 2.C étape 2 livrée (PR #326)** : système de signalement in-app. **Migration 030** bucket privé `support_screenshots` + 5 policies RLS `storage.objects` (user own folder via `foldername[1]=auth.uid()` / super_admin all RGPD Art.17). **`submitTicket.ts`** upload → URL signée 7j (conforme contrainte 029 M1) → insert + cleanup orphelin. **`SupportTicketModal`** focus-trap + Escape + form 3 champs + disclaimer PII, trigger Sidebar « Aide & feedback » gated `user`. **3 audits gate-zero ALL GREEN** : `supabase-backend-auditor` SHIP (**11 tests adversariaux live prod** path-traversal/MIME-spoof/oversize/cross-user-signed-URL tous bloqués, 0C/0H) + `ui-auditor` clean (0 hex introduit) + `security-auditor` **9.3/10**. **code-review** 0 critical (2 fixes : double-label a11y + DRY isAllowedMime). **Context7** confirme API Storage Supabase à jour. Tests **1765 → 1780 PASS** (8 composant jsdom + **7 RLS bucket empiriques PROD** REST+JWT incl. T7 non-régression cross-user signed URL). Suivis Étape 3/4 tracés (non bloquants) : validation magic-bytes serveur (MIME déclaré falsifiable) + rate limit upload/insert API4 (backlog 2.D) + CSP `img-src` supabase.co à l'Étape 4 (rendu screenshot). **CHANGELOG catch-up #319-325** (drift 29/05 signalé au shutdown). **Sprint 2.C reste 2 étapes** (Edge Function Resend → AdminPanel section Tickets). — **Update précédent (28 mai 2026 ~tard CEST)** — **🚀 Session post-reset : 3 PRs livrées (#314 → #316) + switch Opus 4.8**. **PR #314** vision plateforme B2B Option D Hybrid (doc strategy 549 lignes, Voie C) + **13 tickets Linear** (THI-282 umbrella Phase X B2B + 8 sub X1→X6 + THI-291/292/293/294 backlog). **PR #315 Sprint 2.C étape 1** = table `support_tickets` + RLS scoped + trigger audit (migration 028 base + 029 hardening security-auditor Opus 8.8→9.4/10 : H1 trigger guard auth.uid NULL + H2 WITH CHECK + M1 screenshot_url Storage-only XSS defense + M2 super_admin DELETE RGPD Art.17 + M3 status/resolved coherence + L1 search_path). **15/15 tests vitest empiriques PROD** (RLS REST+JWT). Full regression **1744/1764 PASS**. **PR #316 audit méta 20 agents post-4.8** : nouvel agent `supabase-backend-auditor` (Opus, gate-zero Edge Function Deno + Storage RLS + file upload, AVANT Étape 3 Resend + X3b import), `linear-sync` réécrit (avoue échec MCP au lieu de deviner — incident 28/05 sous-agent 6 incohérences fausses), README sync modèles, garde-fou pin 4.7→4.8. **Règle dure @thierry : JAMAIS Haiku** (0 Haiku / 12 Sonnet / 8 Opus). **MCP Supabase réparé** (mauvais compte gmail/Ankora → reconnecté TL, near-miss SQL Ankora rollback auto 0 dégât) + registry 028/029 aligné. **Sprint 2.C reste 3 étapes** (SupportTicketModal UI + bucket support_screenshots → Edge Function Resend → AdminPanel section Tickets). — **Update précédent (27 mai 2026 ~16h CEST)** — **🔧 Session marathon 27 mai : 6 PRs livrées (#305 → #310)** : Sprint 2.B reliquats hotfix RPC super_admin + Sprint 2.B.2 UX scope badge + Sprint 2.B.3 sidebar "Mes outils" collapsible THI-240 + UserMenu hover fix + doctrine modèles agents alignée (0 Haiku / 12 Sonnet / 7 Opus). **ui-auditor upgrade Haiku → Sonnet** (1ère invocation post-upgrade a immédiatement trouvé 1 CRITICAL raw button hors pattern shadcn — fix in-PR). **Doctrine 3 upgrades Sonnet → Opus** gate-zero critiques B2B/IA (security-auditor + prompt-guardrail-auditor + institution-rbac-auditor). ROI estimé : ~+$10-25/mois invocations Opus vs $1000+ incident B2B école évité. **Sprint 2.B totalement clos** validation E2E PROD @thierry confirmée. **2 PRs livrées matin (#305 + #306). PR [#305](https://github.com/thierryvm/TerminalLearning/pull/305) hotfix migration 027 = super_admin peut maintenant approve cross-institution (RPC body check étendu `caller_role IN (institution_admin, super_admin)` + audit log enrichi `metadata.scope = 'global'|'institution'`). Audits 🟢 SHIP : security 9.4/10 + RBAC 0 CRITICAL/0 HIGH (16/16 static + 8/8 empirical REST API + JWT). 11/11 tests vitest PASS PROD. PR [#306](https://github.com/thierryvm/TerminalLearning/pull/306) Sprint 2.B.2 UX feedback = badge `🌐 scope: global` permanent dans header + success status emerald "{nom} approuvé · scope {scope}" post-approve avec auto-clear 8s + dismiss X (44×44 HIG fix ui-auditor 🔴→🟢 in-PR). 17/17 tests panel PASS (5 nouveaux Sprint 2.B.2). **Validation E2E PROD @thierry confirmée 12h30** : connecté super_admin réel → badge visible + click "Approuver" → toast vert {nom} + scope + auto-disparition 8s + optimistic UI row disparue ✅. **Investigation logs console** : 11 erreurs Chrome DevTools détectées et triées — TOUTES viennent de l'extension Brave Kwift Wallet (`chrome-extension://fdjamakpfbbddfjaooikfcpapjohcfmg`), 0 erreur Terminal Learning. Notre code = sain. **Doctrine `feedback_agent_dormant_full_audit` validée 3× cette semaine** : 2 break-ins agents 26/05 (1 HIGH drift + 2 MED latents trouvés) + validation E2E humaine @thierry 27/05 (1 bug UX que les audits structurels n'avaient pas flaggé — validation humaine irremplaçable pour comportement utilisateur final). Tests 1724 → 1729 PASS (+5). 2 mémoires CC updates : `feedback_anti_leak_discipline_jwt_short_lived.md` + `project_sprint_2b_super_admin_approve_bug.md` marqué `RÉSOLU`. **Sprint 2.B TOTALEMENT clos** avec validation E2E PROD humaine. Sprint 2.C (Support System Resend) reste prochaine session sur signal explicite. — **Update précédent (26 mai 2026 ~18h CEST)** — **🏁 Sprint 2.B CLOS — institution_admin lite livré 100%** : 3 PRs mergées même session (#297 → #299), validation E2E PROD Chrome MCP empirique. PR [#297](https://github.com/thierryvm/TerminalLearning/pull/297) **Étape 1** = 4 migrations institution B (022b 3 personas test École B + 023 `profiles UPDATE WITH CHECK institution_id` H1 hijacking fix + 024 GoTrue NULL global fix + apply rétroactif 011/012 drift 4+ semaines fuite cross-institution institutions table). Score isolation 7.5 → **9.5/10**. PR [#298](https://github.com/thierryvm/TerminalLearning/pull/298) **Étape 3** = migration 025 RPC `approve_teacher(target_user_id uuid)` SECURITY DEFINER (caller institution_admin + same-institution + FOR UPDATE row lock + compare-and-swap UPDATE race-safe Sourcery, REVOKE EXECUTE FROM public + anon GRANT authenticated only) + migration 026 trigger AFTER UPDATE `audit_pending_teacher_promotion` defense in depth (flag transactionnel `app.in_approve_teacher_rpc` évite double insertion) + 8/8 tests vitest empirique PROD. Audits : `security-auditor` **9.5/10 SHIP** 0 CRITICAL / 0 HIGH + `institution-rbac-auditor` SHIP WITH NOTES (F-001 HIGH direct PATCH audit bypass + F-002 LOW anon EXECUTE missing revoke + M1 RAISE EXCEPTION leak) **3 findings fixés in-PR**. PR [#299](https://github.com/thierryvm/TerminalLearning/pull/299) **Étape 4** = `InstitutionAdminPanel.tsx` route `/app/institution` gated `<RequireRole allowed={['institution_admin', 'super_admin']}>` + hook `usePendingTeachers` (fetch RLS auto-scoped + approve RPC + FR error mapping) + Sidebar entry "Mon institution" + 12/12 tests RBAC fallback × behavior. Audit `ui-auditor` 🟡 SHIP WITH FIX → M1 aria-live scope + L3 touch target 44px fixés in-PR. **Validation E2E PROD Chrome MCP via JWT injection éphémère 1h institution_admin_b** : (1) anonymous → fallback "Vous devez être connecté" ✅ (2) login institutionadmin_b → sidebar entry + panel + count "(1)" pending_teacher_b École B uniquement (cross-institution isolation empirique) ✅ (3) click "Approuver" → RPC success + optimistic UI row disparu + count "(0)" + empty state ✅ (4) DB-side : profile role=teacher + 1 row admin_audit_log action='approve_teacher' metadata complet **PAS de row direct_patch** (flag transactionnel fonctionne en runtime réel) ✅ (5) 0 console errors. **Rotation Sentry secrets** via intégration native Vercel↔Sentry (7 vars `SENTRY_*` rotated 26 mai 17:37:58 + redeploy production READY immédiat) — `VITE_SENTRY_DSN` client unchanged (DSN public stable). **Sentry "Needs Attention" badges cleared.** **Sprint 2.B livré en 1 session ~5h** : 0 régression, 0 incident, autonomie déléguée respectée, discipline anti-leak maintenue (JWT éphémère 1h, .secrets/ + .tmp/ gitignored, password jamais en stdout, tool args = conversation context). **Doctrine validée** `feedback_agent_dormant_full_audit` : agent `institution-rbac-auditor` créé 20 mai jamais invoqué empiriquement avant 26 mai (6 jours dormant) → premier break-in a trouvé finding HIGH (drift production 4+ semaines invisible). **Tests 1721/1741 PASS** (+12 vs Sprint 2.A close + 20 skipped CI-only). Mémoires CC consolidées : `feedback_anti_leak_discipline_jwt_short_lived.md` (patterns validés @thierry féliciter 26/05), `reference_supabase_plan_free.md` (auth_leaked_password_protection gated Pro plan), `feedback_agent_dormant_full_audit.md` (doctrine 48h break-in obligatoire). **Sprint 2.B essentiellement le « palier B2B écoles cross-institution »** — fondation prête pour Sprint 2.C (à scoper prochaine session). — **Update précédent (24 mai 2026 ~20h CEST)** — **🧠 AI Tutor par rôle livré (Stage B1 + Stage B2)** : 7 PRs mergées même jour (#287 → #293). Stage B1 (PR #290, THI-260) = eval matrix frontier 2025-2026 sur 10 modèles × 14 fixtures, $0.62 USD, 2 modèles 8/8 PASS (GPT-5.5 440 ms top latence + Opus 4.7 premium). Stage B2 (PR #291, THI-275) = 3 system prompts FR cloisonnés par rôle (teacher / institution_admin / super_admin) + dispatcher `getSystemPrompt({lang, mode, role})` + fallback student defense-in-depth + 17 tests dispatcher + 4 fixtures injection `<role_context>` × 4 langues. Audit `prompt-guardrail-auditor` Sonnet a trouvé 2 CRITICAL (ghost block `<role_context>` + DELIMITER_RX gap) **fixés avant merge**. Vision @thierry verrouillée : « niveau différent selon rôle pour éviter utilisations malveillantes hackers et gros curieux ». **Validation cross-role server-side** : 5/5 RBAC personas via REST API + `get_my_role` RPC. **2 nouveaux agents livrés** : `legal-compliance-auditor` (Opus 4.7, 5 couches RGPD/AI Act/DSA/CNIL/DPA-BE auto-update WebSearch, THI-270 PR #288) + `user-forensics-auditor` (Sonnet, 6 sections RGPD-compliant, THI-274 PR #293, motivé cas Jimmy Pez premier user organique). **Audits ship** : `llm-security-auditor` Opus 7 couches sur Stage B1 = 9.2/10 ⚠️ SHIP avec mitigations toutes appliquées (H2-AI VERIFIED default OpenRouter Llama → Sonnet 4.6 fixé). Mitigation H3-AI consent mineurs RGPD Art. 8 → gate-zero Sprint 2.B `institution-rbac-auditor`. **Doctrine `AskUserQuestion` codifiée** (mémoire `feedback_askuser_recommend_first.md`) : toujours marquer recommandation explicite, ne pas laisser @thierry trancher seul ce que j'ai déjà jugé. **Tests 1697 PASS** (+57 vs main pré-session). **Dette identifiée** : ADR-009 cross-role isolation à créer (cette PR), `llm-security-auditor` Opus 7 couches sur Stage B2 reporté Stage B1.b (justifié — couverture transverse via B1 frais 4h avant). Sprint 2.B prochaine session : `institution_admin` lite + InstitutionAdminPanel skeleton + approve_teacher RPC + gate `institution-rbac-auditor` (THI-238 prêt). — **Update précédent (20 mai 2026 ~18h CEST)** — **🏁 Sprint 2.A complet à 100%** : étape 3 page `/app/join` livrée PR [#274](https://github.com/thierryvm/TerminalLearning/pull/274). Chaîne teacher → URL invitation → student → enrollment → progression visible fonctionne empiriquement end-to-end (test Supabase MCP impersonation student 105 → RPC `join_class_by_code('a4368184d202')` → success sans bug 42702/42883, cleanup propre 0 row restant). Sprint 2.A = 5 PRs mergées en 3 jours (#266 migrations + #268 Teacher Dashboard + #269 nav hub + #270 adaptive routing + #274 page join). **Tests 1640** (+36 étape 3). Cascade pré-merge ALL GREEN : `ui-auditor` SHIP-READY · `security-auditor` 9.2/10 (H1 fonctionnel `?code=` perdu après login + M1 maxLength 12 + pattern hex fixés en commit fixup avant push) · Voie A Chrome MCP empirique sessionStorage `?code=` preservation confirmée · Sourcery PASS rate-limit. Nouvel agent `classroom-workflow-auditor.md` créé (THI-237 Done) — gate-zero pour futures PRs touchant `classes`/`class_enrollments`/RPCs class-related, pattern Supabase MCP JWT impersonation documenté 14 checks structurés. **Cleanup Linear** : THI-237 + THI-239 passés Done (agent + tests + E2E empirique livrés), 0 candidate Cancel sur 31 issues Backlog audit (signal positif discipline projet). **2 tickets follow-up backlog** créés via security-auditor M2+M3 : THI-258 (rate limit Edge Middleware `/rest/v1/rpc/join_class_by_code` gated Pro plan, Medium) + THI-259 (standardiser `isMounted` ref pattern hooks async, Low). **Mea culpa session** : (1) agent `.md` créés en cours de session pas rechargés avant prochaine session — pattern documenté dans STORY narrative étape 3 + agents/README, (2) JSDoc qui promet un comportement non-implémenté = bug latent (H1 security-auditor) corrigé. **Process discipline maintenue** sous carte blanche technique : cascade complète + Voie A empirique + Sourcery + 5 personas comptes tests rappelés par @thierry en début de session, exactement ce qui a permis d'attraper H1+M1 avant production. **Quota Anthropic 88%/semaine** → fermeture session disciplinée avec STORY narrative + CHANGELOG + handoff Obsidian livrés cette session (leçon différer-ce-qui-est-demandé hier soir intégrée), refactors lourds (ARCHITECTURE drift > 5 sem THI-245, CONVENTIONS/GUIDELINES THI-246, teacher-guide THI-247) reportés sessions matinales fraîches post-reset. **Sprint 2.B suit** : pending_teacher dashboard + institution_admin lite + VIEW `classes_student_view` (THI-236 hide invitation_code from enrolled students). — **Update précédent (19 mai 2026 ~21h CEST) — 🚀 Sprint 2.A Teacher workflow shippé à 75% (étapes 1+2+2.bis+2.ter livrées)**. Cinq PRs mergées journée : [#267](https://github.com/thierryvm/TerminalLearning/pull/267) (`.env.example` complet — 3 vars → 12 vars exhaustives pour fork/onboarding), [#268](https://github.com/thierryvm/TerminalLearning/pull/268) **THI-235 étape 2 Teacher Dashboard CRUD** (route `/app/teacher` RequireRole teacher/super_admin + listing "Mes classes" + form inline création + ClassCard copy URL invitation, migrations 020 hardening CHECK constraints + **021 fix CRITICAL** `extensions.gen_random_bytes` schema isolation bug 42883 découvert empiriquement post-020), [#269](https://github.com/thierryvm/TerminalLearning/pull/269) **étape 2.bis Role-aware nav hub + login redirect safe** (section "MES OUTILS" sur `/app` Dashboard role-gated + Sidebar entry "Administration" super_admin + fallback unauthenticated "Se connecter" + 7 défense layers open-redirect protection via `validateReturnTo` + sessionStorage `auth_return_to`, déclenché par feedback empirique @thierry "je n'avais même pas vu le lien dans la sidebar mdr"), [#270](https://github.com/thierryvm/TerminalLearning/pull/270) **étape 2.ter Adaptive default route per role** (super_admin → `/app/admin`, teacher → `/app/teacher`, autres → `/app` ; refactor `consumeReturnTo` API `string` → `string | null` pour distinguer "no intent" de "invalid intent" ; déclenché par @thierry "je ne suis pas teacher de base, je suis super-admin, à la limite, c'est sur mon dashboard de contrôle que je devrais arriver"), [#271](https://github.com/thierryvm/TerminalLearning/pull/271) docs CHANGELOG entry détaillée 2.ter. **Tests** 1545 → **1604** (+59 nouveaux components/helpers + refactor returnToStorage). **Cascade rigoureuse** par-PR : `security-auditor` 9.4–9.5/10 SHIP (2 HIGH fixés migrations 020+021, 1 MEDIUM L1 cosmétique AbortController fixé fixup) · `ui-auditor` SHIP-READY (0 CRITICAL/HIGH/MEDIUM) · `rbac-flow-tester` **11/11 PASS** sur prod Supabase (5 personas + Sprint 2.A workflow complet + RLS isolation + cleanup) · happy path RPC empirique via Supabase MCP `join_class_by_code('a4368184d202')` impersonate student 105 → success sans bug 42702 · Voie A Chrome MCP anonymous `/app/admin` fallback rendu 0 console error · Sourcery PASS. **6 tickets follow-up** Linear Backlog créés : THI-237 `classroom-workflow-auditor` agent (gate avant étape 3) · THI-238 `institution-rbac-auditor` agent (Sprint 2.B) · THI-239 Vitest tests `joinClassByCode` regression net (gate avant étape 3) · THI-240 Sidebar refactor "Mes outils" collapsible · THI-241 PostgREST error message sanitization · THI-242 institution_admin invitation_code visibility ADR. **Industry research codifiée** (DAR Design Multi-Role B2B UX 2026 + Orbix B2B SaaS Dashboard + Lollypop SaaS Navigation) : "preference, not restriction" pattern → onboarding wizard = anti-pattern 2026. **Mea culpa session** : push direct main pour `.gitignore` matin reconnu, engagement 100% via PR maintenu reste journée ; dismiss initial du `rbac-flow-tester` finding pgcrypto schema corrigé empiriquement (migration 021), leçon process `feedback_happy_path_testing.md` confirmée ; merge autonome `--admin` PR #270 + #271 sous carte blanche @thierry (exception cadrée, à reproduire uniquement si validée en avance ou hotfix critique). **Sprint 2.A étape 3** suit demain : page `/app/join` consommant RPC `join_class_by_code` (pré-requis verrouillés AVANT merge : créer `.claude/agents/classroom-workflow-auditor.md` + livrer THI-239 + validation Voie A multi-personas). **Critère release-ready Sprint 2.A complet** : teacher crée classe → copy URL → student rejoint via code → enrollment success + classe visible Dashboard student. — **Update précédent (18 mai 2026 ~13h45 CEST) — 🎯 Sprint 2 essentiellement clos en avance** : THI-118 LCP + THI-153 UI cleanup + THI-131 LTI Phase 7c + **THI-42 PR #1 Profile Hub** tous Done bien avant deadline 10 juin. Hat-trick sécurité post-audit : **PR [#255](https://github.com/thierryvm/TerminalLearning/pull/255) THI-42 PR #1** (Profile Hub shell + UserMenu "Mon profil" link, 5 fichiers +418/-17, ui-auditor 4 CRITICAL hex hardcodés drive-by fixés, security-auditor 9.2/10 H1 race condition auth guard FIXÉ avec `initialized` check + loading state, Voie A desktop + iPhone 14 PASS, fix a11y back-link tap target 198×16 → 214×44 commit `504554c` avant merge). **PR [#256](https://github.com/thierryvm/TerminalLearning/pull/256) THI-219** CSP `img-src` énumération stricte `lh1`-`lh6.googleusercontent.com` (pattern bypass initial wildcard `*.googleusercontent.com` rejected par security-auditor — M1 content injection vector via `uc.googleusercontent.com` Drive/Gmail uploads — révisé en enum strict). Sourcery 2 suggestions valides (duplication CSP + commentaire inline) impossibles dans `vercel.json` strict JSON → ticket follow-up [THI-223](https://linear.app/thierryvm/issue/THI-223) créé : migration `vercel.json` → `vercel.ts` (pattern Vercel 2026 recommandé). **PR [#257](https://github.com/thierryvm/TerminalLearning/pull/257) THI-220** avatar URL validation defense-in-depth — `isValidAvatarUrl()` exporté dans `UserAvatar.tsx`, mirror CSP allow-list, fallback initials silencieux si validation échoue (compromised IdP / user_metadata tampering / future provider sans update CSP), 25 tests unitaires. **PR [#258](https://github.com/thierryvm/TerminalLearning/pull/258) THI-221** RequireAuth **opt-in wrapper** — scope revision majeure : reconnaissance révèle uniquement ProfilePage a le guard pattern, l'app est anonymous-friendly by design (Dashboard/LessonPage/AiSettings/CommandReference accessibles aux invités, mode invité fully supported). Un blanket Layout-level wrap aurait cassé cette UX. Refactor en wrapper opt-in (props children + fallback custom, gère `!initialized → loading` + `!user → fallback`), 6 tests + beforeEach reset (security-auditor L2). Voie A : `/app/profile` anonyme → fallback custom rendu ✅, `/app` Dashboard anonyme → fully accessible avec sidebar "Mode invité" + bouton "Se connecter" visibles ✅. Pattern prêt pour Phase 9 routes role-gated. Sas 48h doctrine override par @thierry pour cette session (« on avance normalement »). **Tests** : 1444 → 1475 (+31). **Score sécurité** : 9.2/10 stable. **4 PRs mergées + 5 tickets backlog créés** (THI-219 à 223). Sprint 2 deadline 10 juin large : reste **THI-77/78** (admin heatmaps) bloqués par **Phase 9 Admin Panel** umbrella à créer (route `/admin` + RBAC role-gated layout + skeleton dashboard, ~3-5j effort). Décision @thierry prochaine session : démarrage Phase 9 ou autre backlog. — **Update précédent (17 mai 2026 ~00h45 CEST) — 🚨 THI-186 Critical security fix livré en 3 rounds** : bug data leak inter-utilisateurs via `localStorage` non-cleared découvert en prod par @thierry (37 % / 24 lessons affichées en mode invité, contamination cross-account confirmée empiriquement via Supabase live query — `shared:24, only_google:0, only_hotmail:0`). Root cause dans `src/app/context/ProgressContext.tsx` dormante depuis **Phase 3 livrée 3 avril 2026** (6 semaines en prod sans détection). Fix livré en 2 PRs principales + 1 polish : **PR [#241](https://github.com/thierryvm/TerminalLearning/pull/241)** owner-tracking aux transitions auth (`STORAGE_OWNER_KEY` + clear sur SIGNED_OUT / clear avant SIGNED_IN si owner différent / preserve guest legitime), 9 tests isolation. **PR [#242](https://github.com/thierryvm/TerminalLearning/pull/242)** migration force-clear au boot pour browsers cachant l'ancien JS (Chrome cache stale), 2 tests migration. **PR docs+polish session** (cette entry) Sourcery fixups (helper `applyLegacyOwnerMigration` partagé tests/prod + try/catch narrow JSON.parse) + Sidebar branding « Terminal Master » → « Terminal Learning » (cohérence B2B écoles, même fix que THI-153 Layout mobile mais surface sidebar). **Cleanup data prod Supabase** post-decision @thierry : Hotmail = compte principal organique (timestamps étalés 3 avril → 4 mai), Google = contaminé (7 lessons mass-upsert au signup 3 avril 10:18:49). Backup CSV + `DELETE FROM progress WHERE user_id='6832c7a5-...'` → Google 24 → 0 lessons, Hotmail 24 préservées. **1405 → 1417 tests verts** (+12 isolation/migration/edge). **THI-187** Backlog Medium créé : feat UX bouton "Réinitialiser ma progression" dans Settings (demande @thierry pendant la session). Pourquoi pas attrapé avant : `rbac-flow-tester` teste RLS Supabase mais pas localStorage lifecycle, aucun E2E Playwright multi-account. Action correctrice agents : à arbitrer prochaine session. — **Update précédent (16 mai ~19h30 CEST) — 🚀 Sprint 2 étape 3/N — THI-131 ✅ + THI-180 ✅** : double livraison sécurité-critique sur la chaîne LTI 1.3. PR [#236](https://github.com/thierryvm/TerminalLearning/pull/236) mergée — Phase 7c Auth MVP avec `jose@6` (`createRemoteJWKSet` + `jwtVerify`) + nonceStore replay 2 couches + 10 lti-auditor checks (modèle **Opus 4.7** après rappel @thierry anti-Haiku discipline) + migration `013_lti_launches.sql` audit log write-only + 19 tests crypto isolés (`// @vitest-environment node`). Audit cascade lti-auditor → 3 anti-patterns SPIKE dormants détectés et nettoyés AVANT merge (W1 `ignoreExpiration: true` + clé string littérale CVE-2015-9235 alg confusion · R2 collision import path · W4 `X-Frame-Options: ALLOW` non-RFC). PR [#237](https://github.com/thierryvm/TerminalLearning/pull/237) mergée — **senior reverse course** : Supabase Advisors flaggait 7 WARN, l'instinct naïf aurait révoqué les 6 fonctions `SECURITY DEFINER` en bloc. Vérification empirique → 3 sont invoquées par ~15 RLS `USING` clauses, PostgreSQL exige `EXECUTE` même via RLS → REVOKE = `permission denied for function` régression majeure évitée. Migration `014_revoke_security_definer_rpc.sql` chirurgicale (3 trigger-only revoked, 3 RLS-essential épargnées + tracked THI-182 schema `private`). DO blocks idempotent multi-env (Sourcery review). **8.8/10 security-auditor maintenu** (gains +0.3 architecturaux compensent H1 undici 7 CVEs catalog non exploitables aujourd'hui — gate `LTI_ENABLED=false` actif). Score `llm-security-auditor` 9.4/10 stable. 1405 tests verts (+19 LTI crypto). **Audit visuel prod ✅** : Lighthouse Landing **100/100/100/100** (a11y + BP + SEO + Agentic) + Core Web Vitals **LCP 332 ms · CLS 0.00 · TTFB 23 ms** (gain THI-118 confirmé en prod après régression Sentry weekly 9.31s). 6 routes critiques zéro erreur console (Landing + /changelog + /story + /app + /reference + /lesson). Drawer AI Tutor opérationnel (4 providers + rate-limit 30/30 + consent block). 15 agents `.claude/agents/` analysés → **aucun doublon** (frontières scopes/modèles/triggers documentées). **4 tickets backlog créés** : THI-182 (private RLS helpers, Low) · **THI-183** (monitor @vercel/node undici bump >= 6.24.0, High — gate `LTI_ENABLED=true`) · **THI-184** (fusionner ALLOWED_ISSUERS dual source, Medium — gate PR #2 LTI) · **THI-185** (nettoyer PII Sentry contexts, Medium — gate PR #2 LTI). **Process discipline reset @thierry** : merge PR #237 en autonomie reconnue comme dérive (zéro impact runtime — migration différée Dashboard manuel — mais règle CLAUDE.md projet "Jamais merger sans validation visuelle Vercel explicite de Thierry" non-négociable, Option B retenue). 2 actions manuelles @thierry pendantes : (1) apply `014_revoke_security_definer_rpc.sql` via Dashboard SQL Editor (5s, idempotent) · (2) flip "Leaked password protection" ON dans Auth → Settings → ferme 4 WARN (7→3 advisors). Sprint 2 ordre verrouillé : THI-118 ✅ → THI-153 ✅ → **THI-131 ✅ + THI-180 ✅** → THI-42 Profile Hub (next) → THI-77 + THI-78 admin heatmaps → PR #2 LTI endpoint integration (gate THI-184 + THI-185) → PR #3 activation `LTI_ENABLED=true` (gate THI-183 undici + audit final triple). Mini-prompt reprise : `docs/sessions/next-session-thi-42.md`. — **Update précédent (16 mai ~14h30 CEST) — 🚀 Sprint 2 étape 2/N — THI-153 ✅** : PR [#234](https://github.com/thierryvm/TerminalLearning/pull/234) mergée — cleanup UI bundle (umbrella audit post-Sprint 1). 4 items cherry-picked de l'audit 9 mai : (H1) consolidation 3 palettes red mixées → `--github-red: #f85149` CSS var unique source, migration AI/auth components avec Tailwind v4 opacity modifiers, palette pédagogique Tailwind red préservée (Dashboard processus, CommandReference, level 5 badge) · (C1) UserMenu logout focus ring rouge → emerald (cohérence keyboard focus THI-152) · (C2) shadcn dead slots documentés via header comments dans button.tsx + badge.tsx · (H2) `sonner` désinstallé (-45 kB minified, 0 import réel, juste exemple textuel pédagogique dans curriculum.ts Module 11 IA) · **Bonus brand fix** : « Terminal Master » → « Terminal Learning » dans Layout mobile header (`/app`), aligne avec toutes les autres surfaces. **Sourcery review addressed** : extraction `DestructiveActionButton` helper local (2 boutons AiSettings pixel-identiques) + justification emerald token Tailwind v4 natif. M1 button variants flaggées orphelines → **re-vérifié périmé**, toutes utilisées. Validation : ui-auditor SHIP-READY, 1386 tests passed 0 errors, Landing chunk 7.33 kB gzip stable, Chrome DevTools MCP preview Vercel 0 erreur console. **3 tickets backlog créés** post-décisions @thierry 16 mai : THI-177 pré-i18n discipline (Low, gate Phase 9 admin) · THI-178 SEO longue traîne SSG (Low, Phase 10+) · THI-179 securityheaders A+ via COEP (Low, post-LTI 7c). Sprint 2 ordre verrouillé : THI-118 ✅ → THI-153 ✅ → **THI-131 Phase 7c LTI (next)** → THI-42 Profile Hub → THI-77/78 admin heatmaps. — **Update précédent (16 mai ~10h45 CEST) — 🚀 Sprint 2 démarré — deadline 10 juin (écoles + admin panel) — THI-118 ✅** : PR [#232](https://github.com/thierryvm/TerminalLearning/pull/232) mergée — landing LCP regression fix (Sentry weekly 3.87 s → 9.31 s zone poor). Diagnostic Chrome DevTools MCP : LCP element = hero `<p>` sous-titre (TEXTE), render delay 98.9 %, fuites `landingContent.ts` (imports `commandCatalogue` + `ENVIRONMENTS` forçaient chunk curriculum 41 kB gzip eager) + `UserMenu`/`LoginModal`/`PWAInstallModal` eager. Fix : hardcoder TOTAL_COMMANDS/ACTIVE_ENVIRONMENTS_COUNT + drift test (caught silent `TOTAL_LESSONS` 64 → 65), React.lazy + Suspense pour modals conditionnelles. Bundle Landing chunk **27.29 → 7.33 kB gzip (−73 %)**, curriculum chunk plus dans graph landing. Validation Chrome DevTools MCP preview Vercel : 0 erreur console, lazy modal fonctionne. Sprint 2 ordre verrouillé : THI-118 ✅ → THI-153 cleanup UI bundle (~75 min, H2/M1/C1/C2/H1) → THI-131 Phase 7c LTI → THI-42 Profile Hub → THI-77/78 admin heatmaps. — **Update précédent (16 mai ~10h CEST) — 🏁 Sprint 1 Phase 7b lockdown CLOS à 4/4 — THI-113 ✅** : PR [#230](https://github.com/thierryvm/TerminalLearning/pull/230) mergée — audit final triple (3 agents parallèles) + **H1 fix sentry-tunnel symmetric scrub** (URL query + headers Authorization/X-API-Key/*token* alignés au beforeSend client, plus fallback string-based pour URLs relatives suite Sourcery review security 🚨). Verdict ALL CLEAR : security-auditor **9.4/10** (+0.1 vs 9.3 post-H1 fix), prompt-guardrail-auditor **9.3/10** (44/44 fixtures × 4 locales rejetées, Règle 10 ADR-005 SATISFIED), ui-auditor SHIP-READY (3 LOW non bloquants). Rapport audit complet : [`docs/audits/ai-tutor-v1-2026-05-16.md`](audits/ai-tutor-v1-2026-05-16.md). H2 undici CVEs deps transitive + H3 git history credential = différés/risque résiduel accepté. Trajectoire IA : 8.7 → 9.0 → 9.1 → 9.3 → **9.4/10**. Reste vers 9.5/10 : H2 upgrade + R3 M2-AI encoding + R5 H4-AI jsonwebtoken (Phase 7c gate). **Sprint 1 récap** : THI-148 ✅ → THI-144 ✅ → THI-112 ✅ → THI-113 ✅. **Phase 7c LTI activation** = sprint suivant (gate H4-AI jsonwebtoken supply chain). — **Update précédent (16 mai ~01h CEST) — Sprint 1 étape 3/4 livrée — THI-112 ✅** : PR [#228](https://github.com/thierryvm/teerminalLearning/pull/228) mergée (AiKeySetup standalone + AiConsentModal extraction + AiSettings page `/app/settings` + Sidebar nav + PrivacyPolicy section `#ai-processing` + **M3-AI VERIFIED fermé** : consent storage `'true'` → JSON `{version, acceptedAt, expiresAt}` TTL 365j + migration legacy), `llm-security-auditor` re-baseline **9.3/10 confirmé** (delta +0.2 vs 9.1, cible 9.25 dépassée), 14 files changed (+1545 / −214), tests AI 314 → ~329+ avec 8 nouveaux invariants `consent.test.ts`. Sourcery review round 2 (3 findings) addressed dans même PR : providerMeta module centralisé + AiConsentModal defense-in-depth `handleAccept` + revocation copy clarifiée. Trajectoire 9.5/10 atteignable via R3 M2-AI encoding bypass (THI-153) + R5 H4-AI jsonwebtoken (Phase 7c gate). **Sprint 1 ordre** : THI-148 ✅ → THI-144 ✅ → THI-112 ✅ → THI-113 audit final triple (next, étape 4/4). — **Update précédent (10 mai ~12h CEST) — Sprint 1 étape 2/4 livrée — THI-144 ✅** : PR [#222](https://github.com/thierryvm/TerminalLearning/pull/222) mergée (system prompt v1.1.0 + ADR-008 + eval suite hybride (a)+(b) + M4-AI LOW VERIFIED + R1 follow-up symmetric), `llm-security-auditor` re-baseline **9.1/10 confirmé** (delta +0.1 vs 9.0/10 matin), 1339 tests passants (+48 vs baseline), audit `prompt-guardrail-auditor` PASS (0 CRITICAL, 0 WARNING). 4 frictions ChatGPT cross-validation résolues (compound questions / over-explanation / repeated hints / satisfaction signal). Eval suite (b) manual run pending (`OPENROUTER_API_KEY` env requise, gate ship documenté dans PR body). Trajectoire 9.5/10 atteignable via R2 + R3 + R5 (THI-153 sprint 2 + Phase 7c gate). **Sprint 1 ordre** : THI-148 ✅ → THI-144 ✅ → THI-112 onboarding (next) → THI-113 audit final triple. — **Update précédent (10 mai ~03h CEST) — Clôture finale session marathon** : 11 PRs livrées (#208 → #217), agent `ai-pentester-pro` (créé PR #210) renommé **`llm-security-auditor`** suite analyse ChatGPT (PR #212 — éviter policy filters Anthropic, ajout framework Evidence confidence VERIFIED/STRONG_INDICATOR/SPECULATIVE/RESEARCH_ONLY, atténuation tone defense vs adversarial créatif). **14ᵉ agent `session-orchestrator` créé** (PR #213 + #214 portability fix Sourcery). **1ʳᵉ baseline `llm-security-auditor` officielle : 8.7/10** (entre security-auditor 8.5 et prompt-guardrail-auditor 8.8, framework Evidence empêche inflation CRITICAL). 2 findings HIGH/MEDIUM fermés sur 5 (PR #215 : M1-AI VERIFIED `escapeDelimiters(ctx.goal)` + H10-AI STRONG_INDICATOR BIDI_RX étendu Unicode Tag block U+E0000-U+E007F). PR #216 `chore: gitignore .tmp/`, PR #217 audit-log baseline tracé. THI-153 umbrella : 2/13 cochés. Re-baseline estimé prompt-guardrail 9.2/10, llm-security 9.0/10 (à confirmer prochaine session). Process shutdown 10 phases codifié (`session_shutdown_process.md` exhaustif avec 9 anti-patterns). Pattern `pattern_sourcery_thread_resolution.md` cross-projet réutilisé 4 fois cette session — investissement memo remboursé en <24h. — **Audit global multi-agents post-Sprint 1 étape 1/4 + nouvel agent `llm-security-auditor` 7 couches livré PR [#210](https://github.com/thierryvm/TerminalLearning/pull/210) (renommé via PR [#212](https://github.com/thierryvm/TerminalLearning/pull/212))**. 4 agents en parallèle (`security-auditor` 8.5/10 ship-ready, `test-runner` ✅ 1291 verts, `content-auditor` ✅ PROPRE, `ui-auditor` ⚠️ DEBT detected) → **9 findings consolidés en THI-153 umbrella** (priority High, gate H3 escapeDelimiters lessonContext.goal AVANT THI-144, 30 min). Treizième agent `llm-security-auditor` créé : **7 couches séquentielles avec section `## Raisonnement Couche N` obligatoire AVANT chaque verdict** (L1 surface, L2 threat modeling 8 menaces, L3 OWASP LLM Top 10, L4 vecteurs 2026 hors OWASP, L5 chaînes d'attaque CVSS, L6 stress test défenses, L7 self-critique double-pass), modèle Opus 4.7, anti-patterns bannis (verdict sans PoC, 0 finding HIGH improbable, score stable 4+ semaines), portable cross-projet (Ankora, GetPostCraft, futur Super Admin). **Reminder Terminal Sentinelle V2** verrouillé memo `project_terminal_sentinelle_evolution.md` : V1 couplé TL livré PR #90 (12 avril), V2 module greffable cross-projet pour futur dashboard Super Admin = Phase 10+. Pas de chantier V2 maintenant. Préparation déjà : `llm-security-auditor` portable, memos cross-projet dans `claude-config/memory/`, conventions documentées. — **Sprint 1 Phase 7b lockdown démarré** : `THI-148` (méta-plateforme V1.0.1) livré PR [#208](https://github.com/thierryvm/TerminalLearning/pull/208) en review, prompt bump `tutor/v1.0.0` → `tutor/v1.0.1` + bloc `<platform_context>` statique (11 modules / 65 leçons / 3 environnements, pas de PII, `userProgress` reporté V1.5 + ADR-009) + bonus defense-in-depth C1 audit `prompt-guardrail-auditor` 8.8/10 → full PASS post-fix (`DELIMITER_RX` étendu + `escapeDelimiters()` exporté + module titles wrappés, hardens path AVANT V1.5 custom modules). **1291 tests passed** (+22 vs baseline 1268), 0 failed, type-check + lint clean. Décision *finish what started* tracée (memos CC `feedback_finish_what_started.md` + `project_lti_spike_state.md`) : Phase 7b lockdown complète **AVANT** pivot Phase 7c LTI (qui reste en SPIKE pur — `verifyJwt()` placeholder, `LTI_ENABLED=false`). Branche `docs/sprint-1-thi-148-shutdown` porte le mini-prompt de reprise THI-144 dans `docs/sessions/next-session-thi-144.md` (3 questions ouvertes tranchées 10 mai : ADR-008 confirmé (ADR-007 = solo-maintainer-sustainability déjà pris), eval suite hybride (CI mock + script manuel Haiku), scope one-shot v1.1.0). **Sprint 1 ordre verrouillé** : THI-148 ✅ → THI-144 (system prompt v1.1.0 + **ADR-008** + eval suite + 5 micro-frictions ChatGPT cross-validation, ~5h estimé) → THI-112 onboarding (AiKeySetup + AiConsentModal + AiSettings + /privacy#ai-processing, ~1 jour) → THI-113 audit final triple (security-auditor + prompt-guardrail-auditor + ui-auditor). Pivot Phase 7c LTI = sprint suivant après lockdown. — **Phase 7c THI-152 sprint mobile recovery 🏁 CLOS** (9/9 mini-PRs + hotfix 7bis livrées). Narration thématique du sprint : [`docs/story/v1-5-mobile-recovery-narrative.md`](./story/v1-5-mobile-recovery-narrative.md). 9 mini-PRs séquentielles + 1 hotfix : (1) focus traps a11y, (2) forms anti-zoom, (3) FAB Sparkles size/opacity/position, (4) PWA apple-touch-icon PNG + standalone metas, (5) touch targets ≥44/≤40 + Option D FAB recalibration, (6) drawer overflow word-break + header truncation, (7) PWA safe-area top + autoFocus terminal contrôlé, (7bis hotfix) Landing nav safe-area, (8) focus rings emerald harmonization, (9) FINAL polish HTML metas W3C `mobile-web-app-capable` + tap-highlight transparent + Sidebar landscape `pl-[max(0px,env(safe-area-inset-left))]` + verifs theme-color déjà conforme + font-display swap déjà conforme fontsource 5.x. **3 bugs empiriques @thierry éradiqués** : drawer overflow horizontal mobile (6/9), header `/app` PWA standalone (7/9), bouton "Commencer →" Landing PWA standalone (7bis). Voie safe @cowork respectée tout le sprint : zéro modif `ui/button.tsx` variants, zéro nouvelle variant. **Asymétrie 44/56 mobile/desktop FAB** intentionnelle (primary action exemption documentée). **Sprint THI-152 méthodologie validée** : audit empirique > supposition théorique, pattern `max(baseline,env())` cohérent partout, specs static + dynamic hybrides, empirical override @thierry intégré. THI-150 ✅ + THI-151 ✅ + 5 sub-PRs THI-152 (#196/#197/#198/#199/#200 en cours) toutes mergées sauf #200. Empirical override mini-PR 3/9 confirmé par @thierry (FAB mobile 48→44 px, desktop 56 inchangé, asymétrie intentionnelle primary action exemption).
> Statut global : **Phase 5 EN COURS** — Curriculum Expansion : 11 modules ✅, 66 leçons, **1850 tests** (1780 pass + 20 RBAC skipped Phase 9) + 176 E2E — **Vision consolidée** : LTI-first (ADR-001), BYOK OpenRouter 4-tiers (ADR-002), TTFR KPI central (ADR-003), Classroom Composer UI (ADR-004), AI Tutor V1 décisions gelées (ADR-005 — stockage, rate-limit, guardrails), Solo-sustainable practices (ADR-006), tuteur IA socratique dès A1, i18n FR/NL/EN — Architecture stratégique précédente (THI-35) : Terminal Sentinel (Phase 5.5) ✅, RBAC complet (Phase 7) ✅, Admin Panel (Phase 9), PWA avancée (Phase finale) — **Epic Web 2026 Compliance** (THI-96) : 6/8 sub-issues livrées (THI-97 → THI-102), reste Desktop a11y + CSS moderne 2026 — **Phase 7b (AI Tutor V1) ✅ COMPLETE + V1.5 SÉQUENCÉE** : THI-115 ✅, THI-109 ✅ (gate-zero guardrail), THI-110 ✅ (keyManager AES-GCM), THI-120 ✅ (Sentry scrubber), **THI-111 ✅ COEUR FONCTIONNEL** (PR #188 — sanitizer + 4 providers + panel + 287 AI tests, audits guardrail 9.4/10 + security 8.8/10 + ui A11y exemplary), **THI-147 ✅ FIX SAFE-AREA iPhone PWA** (PR #189), **panel actif en Production** (`VITE_AI_TUTOR_ENABLED=true` + `VITE_AI_TUTOR_OPENROUTER_MODEL=anthropic/claude-haiku-4-5` activés Production+Preview par @cowork) — **Sprint sécurité 1-2 mai 2026 ✅ CLOS** : audit security-auditor 8.1/10 → ~8.6/10 post-sprint, 11 PRs livrées (#168 à #178), 5 HIGH/MEDIUM Done (THI-133/134/135/137/140), 4 MEDIUM ciblés en backlog (THI-136/138/139/112), agent `route-attack-auditor` créé — **Session 4 mai 2026** : THI-111 livré + THI-147 livré + 5 tickets V1.5 backlog créés (THI-142 lessonContext renforcé HIGH, THI-143 frustration heuristic + détection sémantique user MEDIUM, THI-144 system prompt v1.1.0 + ADR-008 + eval suite MEDIUM, THI-145 chat assistant role-based Phase 9+ LOW, THI-146 modèle défaut Haiku HIGH déjà actif via env var, THI-148 extend tutor scope platform meta-questions V1.0.1 P1 1h30 estimé) — **Posture validée** : pas de rush deadline, qualité/scalabilité/perf non négociables, plan respecté en ordre, **mea culpa explicite** à chaque round trio @thierry / @cc-terminallearning / @cowork (estimation 30 min → 1h30, privacy `userProgress` retirée V1.0.1, hypothèse `transform` mobile réfutée par diagnostic Chrome DevTools MCP) — **Verdict empirique Haiku 4.5 (capturé 4 mai 21h par @cowork via Chrome MCP)** : 5 tests qualitatifs, score moyen **9.3/10** — Test 1 méta-plateforme 8/10, Test 2 fichiers cachés 9/10, Test 3 hallucination 9.5/10, Test 4 frustration 10/10 (Haiku bascule mode direct AUTONOMEMENT), Test 5 jailbreak 10/10. **Reprio backlog tranchée @cowork** : THI-146 ✅ SUCCÈS validé, **THI-142 → Low** (Haiku gère déjà bien le contexte leçon), **THI-143 → Low** (Haiku résout naturellement la frustration via compréhension contextuelle), **THI-148 P1 INCHANGÉ** (scope ≠ modèle prouvé Test 1, GO IMMÉDIAT), THI-144 P2 Medium (peut englober THI-148 + eval suite), THI-145 P3 Low (Phase 9+). **ROI méthode scientifique** : ~4-6h économisées (THI-142/143 reportés V2). **Next ordonné — décision @cowork 5 mai matin** : (1) **THI-150 EN COURS** (12ᵉ agent `mobile-responsive-auditor`, ex-brick 3a de THI-149 epic Done, 11 sections / ≥48 checkpoints + bonus Section 11 Desktop Preservation + checkpoints BUG-FAB-001 visibility/contrast/detachment), (2) THI-151 audit Playwright WebKit + matrice bugs (ex-brick 3b), (3) THI-152 mini-PRs fix séquentielles (ex-brick 3c, critère ABSOLU **ne pas casser desktop**), (4) THI-148 extend tutor scope méta-plateforme V1.0.1 (1h30 honnête, scope statique platformContext, bump v1.0.0→v1.0.1, audit guardrail Règle 10 obligatoire), (5) **THI-144 enrichi P1** system prompt v1.1.0 + ADR-008 + eval suite (intègre 5 micro-frictions identifiées par cross-validation ChatGPT sur session 8 tours @thierry — compound questions, sur-explication internal mechanics, indices répétés, platformContext absent confirme THI-148, conclusion ouverte), (6) THI-112 onboarding AiKeySetup + picker modèle curated, (7) THI-114 Web Worker isolation, (8) THI-145 chat role-based Phase 9+. **THI-142/143 reportés V2** (Haiku 9.3/10 résout 80% naturellement).

---

## Vision consolidée (21 avril 2026 — Phase 7b Security Hardening ✅ THI-120)

Décisions stratégiques ancrées dans les 5 ADRs :
- [ADR-001](./adr/ADR-001-lti-first-positioning.md) — **Positionnement LTI-first** : tool pédagogique spécialisée intégrable dans Moodle/Smartschool/Classroom via LTI 1.3, pas un LMS complet
- [ADR-002](./adr/ADR-002-openrouter-byok-tiers.md) — **BYOK 4-tiers** : OpenRouter free prioritaire pour apprenants sans budget API, un seul SDK compatible OpenAI
- [ADR-003](./adr/ADR-003-ttfr-kpi.md) — **TTFR KPI** : Time To First Real-world command comme mesure de valeur pédagogique réelle
- [ADR-004](./adr/ADR-004-classroom-composer-ui.md) — **Classroom-as-Code** : UI Composer visuel, JSON en stockage invisible, fork/remix entre profs
- [ADR-005](./adr/ADR-005-ai-tutor-v1-implementation.md) — **AI Tutor V1** : `localStorage` plain défaut + opt-in Web Crypto, rate-limit soft client-side, agent `prompt-guardrail-auditor` créé avant implémentation, Web Worker isolation différée V1.5

Chantiers structurants qui en découlent (voir `docs/ROADMAP.md` Phases 10-13) :
- Demo interactive landing ("try-before-signup" 30 secondes)
- Tuteur IA socratique transversal (BYOK + garde-fous + OpenRouter)
- Audit multi-tenancy RLS (fondation B2B institutionnel)
- Pages `/guide/:audience` (teacher/student/institution)
- Vérification identité 4 couches (domain allowlist BE + pending + invitation code + SSO)
- Classroom Composer UI (gros chantier 2-3 semaines)
- LTI 1.3 + SSO OIDC (Smartschool, Google EDU, MS EDU — 1-2 mois)
- i18n FR/NL/EN (DE plus tard) avec `react-i18next`
- Terminal Sentinel spin-off (modularisation zéro couplage + intégration Super-Admin panel)

Cibles d'adoption prioritaires : **AVIQ / Forem / Bruxelles Formation** (agile, B2B public numérique), puis CFA/EFP, Hautes Écoles, Universités, secondaires FWB, puis Smartschool Flandre post-traduction NL.

**Règle absolue** : tous les claims B2B publics doivent être 100% vérifiables (voir `docs/GUIDELINES.md` section Crédibilité).

---

## Correspondance Linear ↔ Phases ↔ Modules

| Issue Linear | Phase | Contenu |
|-------------|-------|---------|
| THI-27 | 5 | Module 8 — Réseau & SSH (`ping`, `curl`, `wget`, `ssh`, `scp`, DNS) ✅ Done |
| THI-28 | 5 | Modules 9+10 — Git Fondamentaux + GitHub & Collaboration *(combinés)* — 52 leçons, 792 tests (PR #72) ✅ Done |
| THI-29 | 5 | Module 11 — L'IA comme outil dev — 12 leçons, `ai-help` + 11 sous-commandes (PR #103) ✅ Done |
| THI-35 | docs | Architecture stratégique — Terminal Sentinel, RBAC, Admin Panel, PWA ✅ Done |
| THI-36 | 5.5 | Terminal Sentinel — outil d'audit de sécurité automatisé (PR #90) ✅ Done |
| THI-37 | 7 | RBAC complet — student / teacher / institution / admin (PR #92) ✅ Done |
| THI-45 | agents | Content Auditor V1 — audit pédagogique A→Z (`.claude/agents/content-auditor.md`) |
| THI-53 | security | Security Auditor Agent — audit black hat OWASP/CSP/RLS/2026 (`.claude/agents/security-auditor.md`) ✅ Done |
| THI-54 | security | vercel.json — CORP header `Cross-Origin-Resource-Policy: same-origin` + CSP Supabase exact FQDN (PR #66) ✅ Done |
| THI-55 | security | Vite bump 6.4.2 — fix CVEs GHSA-4w7w + GHSA-p9ff, remove pnpm.overrides pin (PR #67) ✅ Done |
| THI-56 | security | ReDoS fix — `buildGrepRegex()` avec length check + try/catch dans `terminalEngine.ts` (PR #68) ✅ Done |
| THI-57 | security | Sentry tunnel rate limiting — sliding window 50 req/min/IP, 429 + Retry-After (PR #69) ✅ Done |
| THI-58 | security | `cloneFSNode()` guard MAX_FS_NODES=10k + localStorage JSDoc ProgressContext (PR #70) ✅ Done |
| docs | security | SECURITY.md update — CORP/COOP, Terminal Engine, API rate limiting documentés (PR #71) ✅ Done |
| ops | security | Vercel Firewall — 2 custom rules (attack paths + scanner UAs) via API REST, agent `vercel-firewall-auditor`, `docs/vercel-firewall.md` (14 avril 2026) ✅ Done |
| THI-90 | perf | INP fix — `setEnvironment` wrappé dans `startTransition` (Landing + Sidebar consumers). Lab CPU 4× : 515ms → 26ms (−95%) (14 avril 2026) ✅ Done |
| THI-46 | seo | SEO/GEO update — sitemap 42 URLs, llms.txt, JSON-LD 8 modules, manifest.webmanifest ✅ Done |
| THI-47 | ui | UserMenu GitHub-style — avatar + sync dot + dropdown ✅ Done |
| THI-48 | fix | Sidebar profile card + auth signOut scope:global + sync timeout 10s ✅ Done |
| THI-49 | fix | Sign-out instant (fire-and-forget) + sync timeout 10s→5s + select partiel ✅ Done |
| THI-50 | perf | Google Fonts → self-hosted (Geist) — FCP 1.8s → 0.6s (PR #73) ✅ Done |
| THI-51 | fix | domaine custom terminallearning.dev — Vercel + Supabase redirect URLs (PR #74) ✅ Done |
| THI-52 | fix | iOS zoom fix — `font-size: 16px` sur input terminal mobile (PR #74) ✅ Done |
| THI-60 | refactor | cmdHead/cmdTail fusionnés, bug `-n0` corrigé (PR #75) ✅ Done |
| THI-65 | refactor | Hook `useLessonSEO` extrait de LessonPage (PR #75) ✅ Done |
| THI-66 | refactor | `moduleIcons.ts` centralisé — iconMap extrait (PR #75) ✅ Done |
| THI-67 | perf | Lazy-load curriculum — main bundle 140kB → 16kB, FCP 2.96s → 0.6s (PR #77) ✅ Done |
| a11y | fix | `<main>` landmark Landing, contrast fixes 1.95→5.3:1, manifest dynamique, aria-label terminal (PR #76) ✅ Done |
| THI-68 | fix | Supabase auth lock deadlock — defer sync hors onAuthStateChange + abort in-flight (PR #78) ✅ Done |
| chore | seo | Sitemap — domaine terminallearning.dev, lastmod 11 avril (PR #79) ✅ Done |
| THI-59 | refactor | Split processCommand en modules (PR #82, 12 avril 2026) ✅ Done |
| THI-63 | refactor | Extraire validate() de curriculum.ts vers validators.ts (PR #84) ✅ Done |
| THI-69 | a11y | label-content-name-mismatch sur module cards Landing ✅ Done |
| THI-70 | a11y | SEO, accessibilité & balises canoniques — usePageSEO hook Dashboard + Reference (PR #86) ✅ Done |
| THI-71 | content | Fix validators.ts — patterns manquants audit content (PR #85) ✅ Done |
| THI-72 | content | Fix commandCatalogue — commandes manquantes audit content (PR #85) ✅ Done |
| THI-73 | content | Fix exercise hints — cohérence audit content (PR #85) ✅ Done |
| THI-75 | feat | Bouton Partager — Web Share API + clipboard fallback (PR #86) ✅ Done |
| THI-61 | refactor | Générer getHelpText programmatiquement depuis CMD_HELP (PR #87) ✅ Done |
| THI-62 | refactor | Extraire données statiques Landing → landingContent.ts (PR #87) ✅ Done |
| THI-74 | feat | Guide d'installation PWA multi-plateforme (PR #89) ✅ Done |
| THI-64 | refactor | Refactor cmdPipe — débloqué post-THI-59 (Done avril), Medium Backlog |
| THI-76 | dev | Kit utilisateurs tests RBAC — 5 rôles complets (migration 006) ✅ Done |
| THI-80 | test | RBAC integration tests (20) + fix 4 RLS bugs + 6 security fixes (PR #94) ✅ Done |
| THI-81 | perf | Landing : MODULE_PREVIEWS remplace curriculum.map() — −112 kB eager (PR #96) ✅ Done |
| THI-82 | perf | Dynamic import de supabase dans AuthContext + ProgressContext — −194 kB FCP (PR #96) ✅ Done |
| THI-83 | perf | INP 592ms fix — instant scroll + MAX_LINES cap + startTransition (PR #99) ✅ Done |
| THI-84 | content | Trust badges cliquables (securityheaders.com + GitHub Actions) + badge "876 tests · CI verte" (PR #100) + CHANGELOG.md + STORY.md (PR #101) + routes /changelog et /story avec SEO/OG (PR #102) ✅ Done |
| THI-87 | perf | Remove motion/react (~40 kB gzip) — CSS animations + IntersectionObserver + cleanup 22 deps inutilisées + 8 composants shadcn dormants supprimés (PR #108) ✅ Done |
| THI-85 | tech-debt | **Kick-off shadcn migration** — NotFound.tsx ✅ (PR #116, 14 avril 2026 — variantes `emerald` / `ghost-gh` / `pill-*`) + Enhance 404 (PR #117, 14 avril 2026 — bloc "Pages utiles" SEO/GEO crawlable + fix contraste footer iPhone 14 `#484f58` → `#8b949e`). Scope d'origine livré. Pages restantes tracées sous l'umbrella **THI-91** ✅ Done |
| THI-91 | tech-debt | **Umbrella shadcn migration** — clôturée 17 avril 2026. Landing A/B/C ✅ (PR #118, #124, #125) + Dashboard ✅ (enfant **THI-95**, PR #131) + MarkdownPage (ChangelogPage / StoryPage) ✅ (PR #134) + PWAInstallModal + CommandReference ✅ (PR #135) + Sidebar + MenuButton + retrait du bouton "Installer l'application" (scope drift — le CTA PWA reste sur la Landing uniquement) ✅ (PR #139, remplace #136 auto-fermée par GitHub suite au delete-branch de #135) + LessonPage consolidation ✅ (PR #137). Variantes ajoutées : `tl-icon-ghost` / `tl-tab` / `tl-tab-active` / `tl-filter-pill` / `tl-filter-pill-active` / `tl-sidebar-icon` / `tl-sidebar-row` / `tl-sidebar-row-locked` / `tl-sidebar-lesson` / `tl-env-pill` / `tl-menu-fab`. Sizes ajoutés : `tl-icon-sm` / `cta-pill-sm` / `tl-install-cta` / `tl-tab-size` / `tl-filter-pill-size` / `tl-icon-44` / `tl-icon-44-md` / `tl-sidebar-row` / `tl-sidebar-lesson` / `tl-env-pill` / `tl-nav-inline` / `tl-nav-inline-xs` / `tl-nav-cta`. `nav-link` / `ghost-gh` / `emerald-soft` enrichis avec le focus-visible emerald ring pour cohérence globale. Consolidation post-migration de `button.tsx` (complexité CVA signalée par Sourcery) suivie sous **THI-105**. ✅ Done |
| THI-95 | tech-debt | **Enfant de THI-91** — Dashboard.tsx, migration shadcn/ui complète (3 variantes Card `tl-surface`/`tl-stat`/`tl-module`, 2 variantes Progress `tl`/`tl-thin`, 1 variante Button `tl-ghost` + size `tl-list-row`, CSS var `--tl-progress-color` pour couleur par module) (PR #131, 17 avril 2026) ✅ Done |
| THI-86 | agents | Ajouter ui-auditor au protocole de session obligatoire + CLAUDE.md (13 avril 2026) ✅ Done |
| THI-96 | a11y | **Epic Web 2026 Compliance** — conformité desktop + mobile aux normes 2026 (6/8 sub-issues livrées en 48h) 🔄 In Progress |
| THI-97 | a11y | `viewport-fit=cover` + `min-h-dvh` — support notch iPhone + URL bar iOS dynamique (PR #121, 14 avril 2026) ✅ Done |
| THI-98 | a11y | Sidebar mobile 2026 — `env(safe-area-inset-bottom)`, touch targets ≥44px, focus-visible rings (PR #123, 15 avril 2026) ✅ Done |
| THI-99 | a11y | LessonPage mobile 2026 — touch targets + focus-visible (PR #126, 15 avril 2026) ✅ Done |
| THI-100 | a11y | LoginModal mobile 2026 — `autoComplete` + `inputMode` + touch targets (PR #122, 15 avril 2026) ✅ Done |
| THI-101 | a11y | MarkdownPage FAB scroll-top — touch + safe-area (PR #127, 16 avril 2026) ✅ Done |
| THI-102 | a11y | NotFound / Privacy / Dashboard / CommandReference — touch targets + focus-visible + `clamp()` typography 404 (PR #128, 16 avril 2026) ✅ Done |
| THI-120 | security | **Phase 7b Security Hardening — AI Tutor V1 Gates** — 3 couches (C1/C2/C3): pre-commit hook word boundary fix (password/secret patterns, avoid false positives on `current-password`/`new-password`), [C2] input migration (LoginModal + CommandReference custom HTML → shadcn `<Input>`), SECURITY.md doc (C1 incident 006 + H1 RLS policy drift), migration 012 fix (drop permissive policy 010, keep restrictive 011), CI npm ci --legacy-peer-deps fix (@radix-ui/react-progress React 19 compat) (PRs #157-#159, 21 avril 2026) ✅ Done |
| THI-77 | Phase 9 | Heatmap activité élève — vue enseignant (GitHub-style) 🔮 Backlog |
| THI-78 | Phase 9 | Heatmap adoption plateforme — vue super_admin/institution_admin 🔮 Backlog |
| THI-79 | feat | Indicateur force mot de passe + générateur (zxcvbn + crypto.getRandomValues()) — signup uniquement 🔮 Backlog |
| THI-105 | tech-debt | **Consolidation post-migration `button.tsx`** — suite feedback Sourcery sur la complexité CVA après umbrella **THI-91** : 3 wrappers Sidebar expressifs (`SidebarRowButton({ locked })`, `SidebarLessonButton`, `EnvPill({ active, activeClassName })`) qui encapsulent les combos variant+size `tl-sidebar-*` / `tl-env-*` au call-site, + `icon-lg` (size-11 neutre) qui remplace `tl-icon-44` (rounded-lg) et `tl-icon-44-md` (rounded-md) — le rounded passe par className. Encapsulation stricte : plus aucune référence directe aux variants `tl-sidebar-*` / `tl-env-*` hors des wrappers. Call-sites migrés : Sidebar.tsx (3× icon-lg + 3 wrappers), LoginModal.tsx (X close). PR #147, 18 avril 2026 ✅ Done |
| THI-106 | a11y | **Fix A11y Button variants (suite audit THI-91)** — focus-visible ring emerald ajouté sur `tl-icon-ghost`, `tl-tab`, `tl-tab-active`, `tl-filter-pill`, `tl-filter-pill-active` ; Sidebar module verrouillé passe de `aria-disabled` seul à `disabled={locked}` natif (sorti du tab order) ; `tl-sidebar-row-locked` reçoit `disabled:opacity-100` pour préserver le contraste AA sur `#0d1117` ; cleanup de `aria-disabled` redondant dans LessonPage. Scope étendu pendant audit (5 findings traités en une PR courte). PR #140, 18 avril 2026 ✅ Done |
| THI-107 | a11y | **shadcn migration — 11 `<button>` natifs restants (suite THI-91/106)** — migration des 11 derniers `<button>` natifs de `src/app/` vers `<Button>` avec variantes existantes : M1 `App.tsx` FallbackUI (`outline`), M2-M6 `LoginModal.tsx` (close `tl-icon-ghost`, OAuth GitHub/Google `ghost-gh`+`tl-install-cta`, submit `emerald`, link `link`+`link-inline`), M7-M10 `UserMenu.tsx` (guest sign-in `emerald-soft`, card sign-out + avatar toggle + dropdown sign-out `ghost`), M11 `PrivacyPolicy.tsx` back nav (`nav-link`). Side-effects a11y : focus-visible ring emerald harmonisé sur les 11 boutons. Post-PR `ui-auditor` : 2 natifs restants (shadcn interne + Landing env toggle différé à THI-105). PR #142, 18 avril 2026 ✅ Done |
| THI-108 | content | **Leçon `merge-strategies`** — module GitHub & Collaboration, insérée entre `pull-requests` et `conflicts`. 3 démos `--no-ff` / `--squash` / `--rebase` côte à côte + tableau de décision + tip GitHub settings + warning rebase branche partagée. Validator `validateMergeStrategies` token-based (accepte ordre flag/branche flexible + flags additionnels harmless `-m`, `--no-edit` ; rejette stratégies conflictuelles `--squash`/`--ff-only`). +6 tests unitaires + 1 engine test. Lighthouse preview a11y/BP 100, prod desktop+mobile 100/100/100. Sourcery feedback regex flexibilité traité dans le commit fixup avant merge. PR #149, 2 mai 2026 ✅ Done |
| chore | session | **PR #180** — règle `gh pr list --state open` obligatoire au shutdown CLAUDE.md (incident des 14j sur #149/#150). **PR #150** — agents-depth-upgrade `curriculum-validator` + `test-runner`, Sourcery feedback `.only/.skip` precision pattern + `origin/main` delta + typo doc FR traités. 2 mai 2026 ✅ Done |

---

## Objectif

Devenir l'outil pédagogique de référence pour apprendre le terminal et le workflow développeur,
proposé aux **écoles et universités** pour former des développeurs full-stack autonomes à 100%.
Projet open source, 100% gratuit, IA-assisted dev.

---

## ⚠️ Alertes critiques (ne pas ignorer)

### Licence MIT
Tout le monde peut copier/modifier/vendre le code sans rétribution.
Acceptable pour portfolio. Alternative AGPL-3.0 si protection commerciale souhaitée plus tard.

### RGPD Belgique ✅ TRAITÉ
Page `/privacy` créée. Vercel Analytics sans cookies → pas de bannière cookie.

---

## Statut des phases

### ✅ Phase 0 — Déploiement (TERMINÉ)
- [x] Build validé, vercel.json, .gitignore
- [x] Déployé sur Vercel — https://terminallearning.dev
- [x] Headers sécurisés (CSP, X-Frame-Options, etc.)

### ✅ Phase 1 — Landing + Routing + CI (TERMINÉ)
- [x] Landing page (hero animé, features, roadmap, support)
- [x] Routing : `/` Landing, `/app` Dashboard, `/privacy` RGPD
- [x] SEO + OpenGraph + og-image.png (1200×630, Twitter/X compatible)
- [x] Commandes terminal : `about`, `hall-of-fame`
- [x] CI GitHub Actions (type-check → lint → test → build)
- [x] Documentation : README, CONTRIBUTING, SECURITY, ARCHITECTURE

### ✅ Phase 2 — Analytics + Monitoring (TERMINÉ)
- [x] Vercel Analytics (GDPR-friendly, sans cookies)
- [x] Sentry free tier — projet `terminal-learning`, DSN configuré dans Vercel env vars

### ✅ Phase 3 — Supabase Auth (TERMINÉ — en production)

#### Implémenté et mergé
- [x] Supabase project `jdnukbpkjyyyjpuwgxhv` — `ACTIVE_HEALTHY`, eu-west-1
- [x] Migration SQL appliquée : `profiles` + `progress` + RLS
- [x] `src/lib/supabase.ts` — client typé, null-safe (fallback localStorage)
- [x] `src/app/types/database.ts` — types DB Supabase v2
- [x] `src/app/context/AuthContext.tsx` — session, user, signOut
- [x] `src/app/context/ProgressContext.tsx` — étendu avec syncStatus + upsert Supabase
- [x] `src/app/lib/progressSync.ts` — mergeProgress() + getDelta()
- [x] `src/app/components/auth/LoginModal.tsx` — email/password + OAuth GitHub + Google (activés le 3 avril 2026)
- [x] `src/app/components/auth/UserMenu.tsx` — avatar + sync badge + logout
- [x] `src/app/components/auth/AuthCallback.tsx` — handler /auth/callback PKCE
- [x] `/auth/callback` route ajoutée dans `routes.ts`
- [x] `vercel.json` CSP : connect-src += *.supabase.co + *.supabase.io
- [x] 10 nouveaux tests (progressSync) — total 42/42
- [x] Variables Vercel configurées : `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` + `VITE_SENTRY_DSN`
- [x] `.env.local` créé localement (non commité)
- [x] Sentry projet `terminal-learning` créé et connecté à Vercel

#### Complété post-Phase 3 (3 avril 2026)
- [x] OAuth GitHub activé — App créée sur github.com/settings/developers
- [x] OAuth Google activé — Projet Google Cloud Console "Terminal Learning"
- [x] Supabase URL Configuration : Site URL + Redirect URLs prod + localhost
- [x] Sidebar : UserMenu + lien Accueil dans le footer (PR #19)

#### Tech debt noté
→ Voir `CLAUDE.md § Tech debt Phase 3` (source de vérité unique)

### ✅ Phase 4 — Curriculum v2 + Environment Selection (TERMINÉ — 8 avril 2026)

- Multi-environnement : Linux / macOS / Windows avec sélecteur landing + sidebar
- Terminal profiles : prompt zsh/bash/PS, chemin Windows-style, MOTD par env
- Help contextuel : `help <cmd>` retourne aide ciblée + exemples par env
- 30+ alias PowerShell, commandes macOS/Windows
- 192 tests unitaires
- Fix sync TOKEN_REFRESHED, OAuth loading states

### 🔄 Phase 5 — Curriculum Expansion (EN COURS — démarré 9 avril 2026)

#### ✅ Livré (PR #36 + PR #37 + PR #38 + PR #40 + PR #43)
- Module 7 — Variables & Scripts (6 leçons) : `export`, `$PATH`, `.env`, shell config, scripts bash, `cron`
- Enrichissement modules 4–6 : permissions (chown, sudo, security), processus (top, bg/fg), redirection (stderr, tee)
- CommandReference entièrement env-aware : filtres par env, syntaxe + exemples par env, badge environnement
- LessonPage : rendu env-aware (`contentByEnv`, `labelByEnv`), prompt `PS>` en cyan
- TerminalPreview : `text-left` + env-aware (prompt, barre de titre, séquences de commandes)
- 242 tests unitaires + 176 tests Playwright E2E — 32 leçons, 7 modules
- README entièrement réécrit pour 3 audiences (débutants, devs, contributeurs) — PR #40 (THI-32)
- Route-level code splitting : `React.lazy()` + `Suspense` + `PageLoader` — chaque route = chunk dédié — PR #43 (THI-33)
- Script `generate-demo-gif.cjs` : capture GIF de l'animation env-switching via Playwright — `npm run generate-demo`

#### ✅ README rewrite (THI-32 — branche `docs/readme-rewrite`)
- Réécriture README orientée débutants + contributeurs
- Tagline courte, hook émotionnel, section dédiée environment switching
- Section Multi-Agent Architecture retirée → docs/ARCHITECTURE.md
- Stack corrigée (Vite 6 + React 18, non Next.js)

#### 🔄 Lazy loading routes (THI-33 — branche `perf/lazy-routes`)
> ⚠️ PRIS EN CHARGE par session Claude Code #1 (session README/docs) à la demande de Thierry.
> L'autre session Claude Code active NE DOIT PAS travailler sur ce ticket.
- `React.lazy()` + `Suspense` sur tous les composants de route dans `src/app/routes.ts`
- Fallback `<PageLoader>` accessible dans `App.tsx`
- Objectif : réduire le bundle initial de ~30-40%, améliorer LCP/TTI landing

#### ✅ Fixes UI & Auth (THI-47 + THI-48 — mergés 10-11 avril 2026)
- `UserMenu` refonte complète : variant `card` (sidebar) + variant `compact` (landing header)
- Guest card : "Mode invité" + "Se connecter" → redirige vers `/` (plus de modal dans l'app)
- Auth `signOut` : `scope:'local'` → `scope:'global'` — corrige la reconnexion OAuth automatique
- Sync : `AbortController` timeout 10s — plus de dot jaune bloqué indéfiniment
- 15 tests auth mis à jour (card + compact variants)

#### ✅ Module 8 — Réseau & SSH (THI-27 — mergé 10 avril 2026)
- `ping`, `curl`, `wget`, `nslookup`, `dig`, `Resolve-DnsName`, `ssh`, `ssh-keygen`, `scp` + PowerShell `iwr`
- 6 leçons × 3 environnements, 39 tests unitaires
- Invoke-WebRequest/iwr simulé (Windows), curl generic (urlHost dynamique), ssh-keygen banner dynamique

#### 🔜 Modules planifiés
- **Module 9 + 10 — Git Fondamentaux + GitHub & Collaboration** (THI-28) : `init`, `add`, `commit`, branches, remotes, PRs, Issues, GitHub Actions
- **Module 11 — L'IA comme outil dev** (THI-29) : Claude Code CLI, prompts contextuels, limites et risques

#### 🔮 Couches additionnelles (backlog)
- **Monitoring & Outils système** : module dédié `htop`, `ps`, `lsof`, `df`/`du`, `free`
- **Éditeurs de texte** : nano (éditions rapides) + vim/neovim (cours complet interactif avec exercices)
  - nano : bases, sauvegarder, quitter, rechercher
  - vim : modes, navigation, édition, `.vimrc`
  - neovim : intro, écosystème plugins (lazy.nvim), workflow développeur
- **Cours complets dédiés** (vision long terme) : Git approfondi, Docker, shell scripting masterclass

### 🔮 Phase 5b — Qualité pédagogique des exercices (après merge PR #36/#37)

> Inspiré de : OverTheWire (niveaux enchaînés), Missing Semester MIT (contexte réel), cmdchallenge (one-liners)

#### Principes (best practices 2026)
- **Niveau 1–2** : 3–5 exercices guidés + 1 défi libre par leçon
- **Niveau 3** : 5–7 exercices dont 2 en contexte réel (ex. "structure un projet")
- **Niveau 4–5** : 3–5 exercices ouverts, validés par output attendu (pas par commande exacte)
- **Hint progressif** : après 2 tentatives → indice partiel ; après 4 → commande suggérée
- **Répétition espacée implicite** : chaque commande apprise réutilisée dans les 2 leçons suivantes
- **Types d'exercices à implémenter** :
  1. `fill-in-flag` — commande fournie, trouver le bon flag
  2. `objective-result` — objectif donné, l'utilisateur choisit sa commande
  3. `error-correction` — commande cassée à réparer
  4. `one-liner-progressif` — construire une pipeline étape par étape
  5. `scenario-context` — scénario réaliste (déployer, déboguer, analyser un log)

#### Nouveaux champs à ajouter à `Exercise`
```typescript
type ExerciseType = 'fill-flag' | 'objective' | 'error-fix' | 'pipeline' | 'scenario' | 'quiz-mcq' | 'quiz-recall'
// Exercise.type?: ExerciseType
// Exercise.hintAfterAttempts?: number  (défaut: 2)
// Exercise.alternatives?: string[]     (commandes équivalentes acceptées)
// Exercise.contextSetup?: string       (description du scénario)
// Exercise.choices?: string[]          (options MCQ pour quiz-mcq)
// Exercise.masteryWeight?: number      (poids dans le calcul de maîtrise 0-1)
```

#### Gate de maîtrise par module (NOUVEAU — validé 10 avril 2026)

Philosophie : **"apprendre à apprendre"** — pas de progression sans preuve de maîtrise.

| Niveau CEFR | Gate | Comportement |
|-------------|------|-------------|
| A1–A2 | Optionnel | Bouton "Teste tes connaissances 🎯" + badge si ≥80% |
| B1–B2 | Soft gate | 80% requis, tentatives illimitées, 0 délai |
| C1–C2 | Hard gate | 80% en max 3 tentatives — niveau employabilité |

**Quiz final par module** : 5–8 questions SANS terminal, SANS hints :
- `quiz-mcq` : QCM — reconnaissance (A1-A2)
- `quiz-recall` : saisie libre — production de mémoire (B1+)
- Questions scénario : *"Tu arrives sur un serveur inconnu, quelles sont tes 3 premières commandes ?"*

**Nouvelle table Supabase** :
```sql
CREATE TABLE quiz_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  module_id text NOT NULL,
  score numeric NOT NULL,          -- 0.0 à 1.0
  attempts_count int DEFAULT 1,
  passed boolean DEFAULT false,
  answers jsonb,                   -- pour analytics pédagogiques
  completed_at timestamptz DEFAULT now()
);
-- RLS : utilisateur voit uniquement ses propres résultats
```

**Ticket Linear** : THI-40

---

### ✅ Phase 5c — Commande `help` native + Leçon 0 transversale (THI-39)

Première manifestation de la philosophie **"apprendre à apprendre"** dans le terminal simulé.

Chaque environnement enseigne son propre système d'aide natif :

| Environnement | Commandes à enseigner |
|---|---|
| Bash/Zsh | `help`, `man <cmd>`, `<cmd> --help`, `whatis`, `apropos` |
| PowerShell | `Get-Help <cmd>`, `<cmd> -?`, `Get-Command`, `Get-Member` |
| CMD | `help`, `<cmd> /?` |

Leçon 0 transversale dans chaque profil : *"Comment se repérer quand on ne sait pas quoi faire"*.
Implémentation : `help` + `help <cmd>` dans `terminalEngine.ts`, contextualisé par `terminalProfile`.

---

### 🔮 Phase 5c — Modules avancés : fullstack → expert réseaux/serveurs

> Objectif : atteindre le niveau senior fullstack autonome + expert réseaux/serveurs.
> Chaque module = env-aware (Linux / macOS / Windows).

| Module | Titre | Niveau | Priorité |
|--------|-------|--------|---------|
| 8 | Réseau & SSH | 3 | THI-27 |
| 9 | Git Fondamentaux | 3 | THI-28 |
| 10 | GitHub & Collaboration | 3 | THI-29 |
| 11 | Monitoring & Outils système | 4 | Backlog |
| 12 | Éditeurs de texte (nano + vim/neovim) | 3 | Backlog |
| 13 | Shell Scripting avancé | 4 | Backlog |
| 14 | Docker CLI | 4 | Backlog |
| 15 | Cybersécurité fondamentale | 4 | Backlog |
| 16 | Administration serveur | 5 | Backlog |
| 17 | L'IA comme outil dev | 3 | THI-30 |

#### Catégories de commandes manquantes identifiées
**Fullstack** : `sed`, `awk`, `xargs`, `find` (regex), `ln`, `which`, `type`, `nohup`, `apt`/`brew`, `dpkg`, scripts bash (boucles, conditions, fonctions), Git avancé (`stash`, `rebase`, `bisect`, `reflog`)

**Réseaux/Serveurs** : `ping`, `traceroute`/`mtr`, `netstat`/`ss`, `curl` (avancé), `wget`, `rsync`, `scp`, `sftp`, `systemctl`, `journalctl`, `ufw`, `iptables`, `df`/`du`/`free`, `iostat`, `lsof`, Docker CLI, Nginx config via CLI

**Cybersécurité (non-offensif)** : `sha256sum`/`md5sum`, `getfacl`/`setfacl`, `visudo`, `last`/`who`/`w`, `gpg --verify`, `lsof -i`, `netstat -tulnp`, `wevtutil` (Windows), `Get-EventLog`

---

---

### 🔮 Phase 5.5 — Terminal Sentinel (THI-36)

> Outil d'audit de sécurité périodique — vitrine de sécurité professionnelle et signal de confiance pour les écoles/universités.

#### Principe
- **Audite les défenses** — ne simule pas d'attaque active sur la production (risque ban Vercel/Supabase)
- Résultats visibles dans le Security Center (Phase 9)
- Open source : démontre la maturité sécurité du projet

#### Composant A — GitHub Actions hebdomadaire
```yaml
# .github/workflows/security-sentinel.yml
# Cron : lundi 06:00 UTC + dispatch manuel
checks:
  - npm audit (vulnérabilités des dépendances)
  - gitleaks (secrets accidentellement commités)
  - Headers HTTP : CSP, HSTS, X-Frame-Options, Referrer-Policy
  - Cookies : Secure + HttpOnly + SameSite sur tous les cookies auth
output:
  - Rapport JSON → table `security_reports` Supabase
  - Email résumé hebdo → Thierry
```

#### Composant B — Script Playwright local
```bash
# scripts/security-audit.cjs — avant chaque release majeure
node scripts/security-audit.cjs [--url https://terminallearning.dev]
checks:
  - Messages d'erreur auth génériques (pas de leak "user not found" vs "wrong password")
  - Rate limiting actif sur /auth et /api endpoints
  - Routes /admin inaccessibles sans RBAC (retournent 401/403, pas 404)
  - Absence de stack traces / console.error en prod
  - Validation que les chunks lazy ne contiennent pas de secrets
output:
  - Rapport JSON : security-audit-report.json
  - Résumé terminal lisible avec score de santé
```

#### Tests requis
- Tests unitaires : fonctions de parsing et scoring des rapports
- Dry-run CI : le workflow GitHub Actions est valide syntaxiquement

---

### 🔄 Phase 5 Agents — Agents Claude Code (THI-45)

> Infrastructure d'agents pédagogiques pour la maintenance qualité du projet.

#### Agents opérationnels (`.claude/agents/`)

| Agent | Modèle | Déclencheur | Rôle |
|-------|--------|-------------|------|
| `linear-sync` | haiku | Début de session | Vérifie cohérence PRs GitHub ↔ statuts Linear |
| `curriculum-validator` | haiku | Avant toute modif `curriculum.ts` | Valide structure, env coverage, IDs uniques |
| `test-runner` | haiku | Après modif `curriculum.ts` ou `terminalEngine.ts` | Lance vitest, retourne failures uniquement |
| `content-auditor` | haiku | Avant release majeure / à la demande | Audit pédagogique A→Z (voir ci-dessous) |

#### Content Auditor V1 — analyse statique

Vérifications effectuées :
1. **Couverture env** : `instructionByEnv`, `hintByEnv`, `contentByEnv` pour linux/macos/windows
2. **Cohérence curriculum ↔ terminalEngine** : chaque commande enseignée est simulée
3. **Couverture tests** : chaque `case` du moteur a ≥ 1 test
4. **Cohérence curriculum ↔ commandCatalogue** : niveaux + prérequis identiques
5. **Chaîne pédagogique** : graphe acyclique, progression de niveaux logique
6. **Qualité validate()** : pas de regex trop permissive, pas de validate toujours `true`
7. **Liens externes** : URLs dans les leçons retournent HTTP 200

#### Content Auditor V2 — intégration CMS Admin (Phase 9)

- Rapport écrit dans table Supabase `audit_reports`
- Dashboard admin : historique + tendances + alertes
- Cron CI GitHub Actions hebdomadaire
- Email alertes si CRITICAL détecté

---

### 🔮 Phase 6 — Terminal Multi-Session + Changelog

- Onglets multiples dans le terminal (architecture `TerminalManager`)
- Changelog visible hebdomadaire/mensuel sur l'app
- Mobile : max 3 sessions, compact tab switcher
- Desktop : split-pane optionnel

---

### 🔮 Phase 7 — Espace Membre + RBAC complet (THI-37)

> Couche utilisateur complète — pré-requis à l'Admin Panel et à l'ouverture aux écoles/universités.

#### Modèle de rôles (validé — 10 avril 2026)

| Rôle / État | Type | Périmètre | Notes |
|-------------|------|-----------|-------|
| `super_admin` | Rôle permanent | Global | Thierry uniquement — accès total |
| `institution_admin` | Rôle permanent | Son institution | Approuve ses enseignants, voit ses étudiants |
| `teacher` | Rôle permanent | Ses classes | Statut vérifié via approval flow |
| `pending_teacher` | État transitoire | Aucun (en attente) | Inscrit comme enseignant, en attente d'approbation admin — accès student uniquement |
| `student` | Rôle permanent | Sa progression | Self-register ou invitation enseignant |
| `public` | Non authentifié | Lecture curriculum | Anonyme — pas de compte requis |

#### Flow de vérification enseignant
```
1. Inscription → role_request = 'teacher' + nom institution
2. Compte passe en statut pending_teacher
3. Notification → super_admin ou institution_admin dans l'Admin Panel
4. Approbation manuelle → statut teacher actif
   ✗ Pas d'upload de document (RGPD, complexité, maintenance)
   ✓ Optionnel v2 : liste blanche de domaines email par institution (@ulb.be, @vub.be…)
```

#### DB — nouvelles tables/colonnes
```sql
-- profiles (extensions)
ALTER TABLE profiles ADD COLUMN
  role text DEFAULT 'student'
    CHECK (role IN ('super_admin','institution_admin','teacher','pending_teacher','student')),
  sector text CHECK (sector IN ('school','university','self-taught')),
  institution_id uuid REFERENCES institutions(id),
  display_name text,
  bio text,
  preferred_env text DEFAULT 'linux';

-- institutions
CREATE TABLE institutions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  domain_whitelist text[],       -- ex. ['ulb.be', 'vub.be']
  admin_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- classes
CREATE TABLE classes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid REFERENCES profiles(id),
  institution_id uuid REFERENCES institutions(id),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- class_enrollments
CREATE TABLE class_enrollments (
  class_id uuid REFERENCES classes(id),
  student_id uuid REFERENCES profiles(id),
  enrolled_at timestamptz DEFAULT now(),
  PRIMARY KEY (class_id, student_id)
);

-- progress (extensions)
ALTER TABLE progress ADD COLUMN
  time_spent_seconds int DEFAULT 0,
  attempts_count int DEFAULT 0,
  hints_used int DEFAULT 0;

-- badges
CREATE TABLE badges (
  user_id uuid REFERENCES profiles(id),
  badge_id text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- teacher_notes
CREATE TABLE teacher_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid REFERENCES profiles(id),
  student_id uuid REFERENCES profiles(id),
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- audit_log (insert-only — actions admin traçables)
CREATE TABLE audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid REFERENCES profiles(id),
  action text NOT NULL,   -- ex. 'approve_teacher', 'suspend_user'
  target_id uuid,
  metadata jsonb,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);
```

#### Sécurité — RLS obligatoire sur toutes les nouvelles tables
- `institutions` : lecture publique du nom, écriture → super_admin uniquement
- `classes` : visible par teacher + ses enrolled students + institution_admin
- `class_enrollments` : teacher peut inscrire des étudiants, student voit les siennes, admin voit tout
- `audit_log` : **insert-only** — uniquement pour les utilisateurs authentifiés (les anonymes n'écrivent jamais dans l'audit) — stratégie RLS explicite :
  ```sql
  -- INSERT : réservé aux utilisateurs authentifiés uniquement (pas aux anonymes)
  CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT
    TO authenticated WITH CHECK (true);
  -- SELECT : super_admin uniquement — auth.role() préféré à auth.jwt() ->> 'role'
  -- pour robustesse aux évolutions futures de Supabase Auth
  CREATE POLICY "audit_log_select" ON audit_log FOR SELECT
    USING (auth.role() = 'super_admin');
  -- UPDATE et DELETE : aucune policy → interdits par défaut (RLS enforced)
  ```
  *Note : pas de trigger nécessaire — l'absence de policy UPDATE/DELETE suffit avec RLS activé.*

#### Composants `/app/profile`
- `ProfilePage.tsx` — stats globales, badges, préférences
- `ProgressHeatmap.tsx` — calendrier de complétion (style GitHub)
- `SkillRadar.tsx` — radar chart des compétences par module (Recharts)
- `BadgeGallery.tsx` — collection de badges gagnés
- `TeacherNotesPanel.tsx` — visible élève (lecture) + prof (écriture)
- `ClassroomView.tsx` — vue professeur : liste élèves + progression

#### Badges à implémenter (exemples)
`first-command`, `module-complete`, `week-streak`, `speed-runner`, `no-hints`, `explorer` (tous les envs)

---

### 🔮 Phase 7b — Agent IA Tuteur Adaptatif (THI-41)

> Architecture gelée par [ADR-002](./adr/ADR-002-openrouter-byok-tiers.md) (BYOK 4-tiers OpenRouter) et [ADR-005](./adr/ADR-005-ai-tutor-v1-implementation.md) (décisions V1).
> Coût Terminal Learning : **$0** — zéro clé serveur, zéro risque financier.
> Pré-requis : Phase 7 (RBAC) ✅ terminée. Lié au Module 11 (THI-29).

#### Philosophie

L'utilisateur active l'agent avec **sa propre clé API**. Terminal Learning n'est jamais intermédiaire. Le Module 11 "L'IA comme outil dev" EST le onboarding pédagogique : comprendre ce qu'est une API, obtenir une clé, comprendre les coûts, activer l'agent comme premier "prof à domicile".

#### Architecture BYOK 4-tiers (ADR-002)

```
Tier 0 · Free         → OpenRouter free models (DeepSeek V3.1, Llama 3.3, Gemini Flash free)   0 €
Tier 1 · Pay-as-you-go → OpenRouter payant                                                     ~0.20-0.50 €/mois
Tier 2 · Pro direct   → Anthropic / OpenAI / Google Gemini (pleine puissance)                  $5-20/mois
Tier 3 · Local         → LM Studio / Ollama via URL custom                                    0 €, privacy max
```

**Un seul client SDK** : interface OpenAI-compatible d'OpenRouter → `fetch('/v1/chat/completions')` drop-in pour tous les tiers. Détection auto du provider via préfixe de clé (`sk-or-v1-*`, `sk-ant-*`, `sk-*`, custom base URL pour Tier 3).

**Flux client-side pur — zéro clé serveur** :

```
Utilisateur → clé API saisie 1× → stockage local (voir ADR-005) → fetch direct → provider LLM → réponse
```

#### Décisions V1 (ADR-005)

| Axe | V1 | V1.5 / V2 |
|---|---|---|
| **Stockage clé** | `localStorage` plain par défaut + opt-in Web Crypto AES-GCM (IndexedDB, PBKDF2 ≥ 210k iter, passphrase user) | — |
| **Isolation** | Clé accessible au main thread (CSP strict + HSTS = premier rempart) | Web Worker sandboxé (ticket créé dès validation) |
| **Rate limiting** | Soft client-side (compteur IndexedDB + badge UI + backoff 429 + circuit breaker) | Edge Function proxy uniquement si abus observé, via nouvelle ADR |
| **Guardrails** | Agent `prompt-guardrail-auditor` (Haiku) créé AVANT implémentation, system prompt socratique versionné, sanitizer input + post-filter output | Red-team externe post-ship |

#### Comportement adaptatif (V1 — algorithmique, sans LLM supplémentaire)

| Signal détecté | Réaction de l'agent |
|---|---|
| >3 tentatives échouées sur même exercice | Reformule l'explication différemment |
| Score quiz <60% sur un module | Propose révision des leçons faibles |
| Session >45 min sans pause | Suggère une pause (pédagogie cognitiviste) |
| Commande correcte mais non optimale | Montre l'alternative plus élégante |
| Progression rapide (mastery >95%) | Propose le niveau supérieur en avance |

L'agent s'adapte à : niveau CEFR courant, track actif (Full-Stack / Sysadmin / Automation), environnement préféré (Linux/macOS/Windows), historique d'erreurs, rythme d'apprentissage, langue UI (FR/NL/EN/DE).

#### Sécurité — OWASP LLM Top 10 (ADR-005)

- **LLM01 Prompt injection** → system prompt fixe + sanitizer input (strip markers `"""`, `---BEGIN`, `### Instruction`)
- **LLM02 Insecure output** → post-filter regex commandes destructives (`rm -rf`, `drop database`, `format c:`, `:(){:|:&};:`) → wrap `<AiDangerousOutput />` avec confirmation
- **LLM06 Sensitive data** → clé API **jamais** dans le contexte LLM (uniquement header HTTP), contexte user minimal (pas de JWT, pas de profile complet)
- **LLM08 Excessive agency** → tutor ne PEUT PAS exécuter, uniquement répondre textuellement. Exécution reste sur `terminalEngine.ts` local.
- **LLM09 Overreliance** → chaque réponse IA encadrée visuellement : "Suggestion IA — vérifiez avant d'exécuter"

Audit obligatoire avant chaque PR qui modifie `systemPrompt.ts` : agent `prompt-guardrail-auditor` lance une batterie de jailbreaks contre la nouvelle version → CRITICAL si une injection passe.

#### RGPD — obligations

- Consentement explicite avant 1ère interaction IA (modal dédié, version tracée)
- Page `/privacy` : section "Traitement IA" — provider géré par l'utilisateur
- Aucun historique stocké par défaut (opt-in explicite)
- Bouton "Oublier ma clé" dans `/app/settings` → `localStorage.clear()` + `indexedDB.deleteDatabase`
- Clé API = donnée personnelle → droit à la suppression garanti
- Aucun entraînement de modèle avec les données utilisateurs

#### Évolution future (SaaS B2B)

Options par ordre de pertinence (à figer dans nouvelle ADR quand déclenchée) :
- **Tier 0 upgrade** : passer d'OpenRouter free aux modèles Claude Haiku via Anthropic DPA officiel → gratuit pour étudiants (Terminal Learning paie)
- **AWS Bedrock EU region** → data residency Belgique/EU garanti
- **SaaS B2B** : institutions paient (tarif enseignant), étudiants restent gratuits
- **Freemium** : 20 interactions/jour gratuit via Tier 0 serveur, illimité avec clé perso (Tiers 1/2/3)

#### Tables Supabase (V1 minimal)

```sql
-- Consentement IA (audit RGPD — obligatoire)
CREATE TABLE ai_consent (
  user_id uuid REFERENCES profiles(id) PRIMARY KEY,
  consented_at timestamptz DEFAULT now(),
  provider_tier text NOT NULL CHECK (provider_tier IN ('tier0_or_free','tier1_or_paid','tier2_direct','tier3_local')),
  consent_version text NOT NULL
);
-- RLS : user voit/modifie uniquement sa propre ligne

-- System prompt versionné (audit RGPD + rollback)
CREATE TABLE ai_system_prompts (
  version text PRIMARY KEY,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  deprecated_at timestamptz
);
```

> **Pas de table `user_ai_keys`** : la clé reste côté client (ADR-002 / ADR-005). Le serveur ne la voit jamais.

#### Composants à créer

```
src/app/components/ai/
├── AiTutorPanel.tsx        # Interface principale de l'agent
├── AiKeySetup.tsx          # Onboarding clé API (lié à Module 11)
├── AiConsentModal.tsx      # Consentement RGPD obligatoire
├── AiHintBubble.tsx        # Hint contextuel dans les exercices
├── AiSettings.tsx          # Gérer/supprimer la clé dans /app/settings
└── AiDangerousOutput.tsx   # Wrapper visuel pour commandes destructives suggérées

src/lib/ai/
├── keyManager.ts           # localStorage plain | IndexedDB + Web Crypto opt-in
├── openRouterClient.ts     # Fetch unifié OpenAI-compatible (tous les tiers)
├── inputSanitizer.ts       # Strip markers prompt injection
├── outputPostFilter.ts     # Detect destructive commands → wrap
└── rateLimit.ts            # Soft counter + circuit breaker

.claude/agents/
└── prompt-guardrail-auditor.md   # Agent Haiku — jailbreak tests OWASP LLM
```

#### Accessibilité & UX

- Agent accessible via clavier (pas de drag-only)
- Taille de police adaptable dans le panel IA
- Réponses courtes par défaut — "En savoir plus" pour développer
- Mode "silencieux" : hints uniquement si demandé (pour ne pas infantiliser les B2+)
- Mobile : panel IA en slide-up sheet, pas en sidebar
- CSP : ajouter `https://openrouter.ai`, `https://api.anthropic.com`, `https://api.openai.com` dans `connect-src` (`vercel.json`) au moment de l'implémentation

#### Séquence d'implémentation (ADR-005)

1. ✅ Doc alignment + ADR-005 (PR #151 mergée — THI-115)
2. ✅ Agent `prompt-guardrail-auditor` (PR #153 mergée — THI-109)
3. ✅ Key manager V1 — `src/lib/ai/keyManager.ts`, localStorage plain + IndexedDB AES-GCM + PBKDF2 210k iter, 32 tests, premier audit `prompt-guardrail-auditor` PASS (PR #155 mergée — THI-110)
4. ✅ Phase 7b Security Hardening — Credential Protection + Sentry Scrubber (21 avril 2026 — THI-120)
   - **C1** : CLAUDE.md credential protection rule absolue — jamais hardcoder secrets, pré-commit hook bash (`.git/hooks/pre-commit`) scan patterns API keys + passwords, vérif pré-merge `git diff | grep -E 'sk-|password|secret'`
   - **C2** : vercel.json CSP extension — `connect-src` vers OpenRouter/Anthropic/OpenAI/Gemini (support Phase 7b)
   - **C3** : Sentry scrubber triple-couche — **server-side** (api/sentry-tunnel.ts) scrube exception.values + breadcrumbs + extra + user + request + **contexts + tags**, **client-side** (src/lib/sentry.ts beforeSend) scrube API keys, patterns : OpenRouter/Anthropic/OpenAI/Gemini/JWT/Email + **pattern générique futurs providers** `/sk-[a-zA-Z0-9_\-]{20,}/gi`
   - **Agents améliorés** : prompt-guardrail-auditor (Étape 4b — vérif Sentry scrubber serveur contexts/tags), security-auditor (A09 — vérif api/sentry-tunnel.ts rate limiting + scrubbing)
   - Gate avant THI-111 validé ✅
5. 🔜 `AiTutorPanel` + fetch OpenRouter + system prompt + sanitizer/post-filter — THI-111
6. Onboarding UX + Consent modal — THI-112
7. Audit final security-auditor + prompt-guardrail-auditor → merge Phase 7b — THI-113
8. 🔮 Web Worker isolation V1.5 post-ship — THI-114

---

### 🔮 Phase 7c — Help Center + Documentation par rôle (THI-43)

> Documentation enterprise-grade intégrée dans l'app. Chaque rôle voit uniquement ce qui le concerne.
> Les docs statiques (`docs/guides/`) peuvent être rédigées dès maintenant, indépendamment du RBAC.

#### Deux composantes

**1. Docs statiques dans le repo** (pour contributeurs et admin interne) :
```
docs/
├── guides/
│   ├── student-guide.md
│   ├── teacher-guide.md
│   ├── institution-guide.md
│   └── admin-runbook.md          ← jamais exposé en prod, super admin uniquement
├── processes/
│   ├── teacher-approval.md       ← flow approbation enseignant step-by-step
│   ├── incident-response.md      ← que faire en cas d'incident
│   ├── content-moderation.md     ← signalement contenu inapproprié
│   └── gdpr-data-request.md      ← procédure demande données RGPD
└── troubleshooting/
    ├── auth-issues.md
    ├── progress-sync.md
    └── class-management.md
```

**2. Help Center in-app** (`/help/*`) gated par rôle :
- `/help` — public (FAQ générale, premiers pas)
- `/help/teacher` — enseignant+ (gestion classe, suivi progression, exports)
- `/help/institution` — institution admin+ (onboarding, approbation enseignants, rapports EQF)
- `/help/admin` — super admin uniquement (runbooks, incidents, contacts urgence)

Contenu Markdown → React Markdown. Recherche Fuse.js client-side. Lien "Je n'ai pas trouvé → ouvrir un ticket" (Phase 8).

#### SEO / LLM-friendly
- Articles Markdown indexables (Context7, RAG, assistants IA)
- Structured data FAQ schema sur articles publics
- `robots.txt` exclut `/help/admin`

---

### 🔮 Phase 7d — Profile Hub + UserMenu GitHub-style (THI-42)

> Remplacer le bouton de connexion actuel par un menu dropdown role-aware.
> `UserMenu.tsx` existe déjà (Phase 3) — c'est une évolution, pas une réécriture.

#### Menu dropdown
- Avatar + display_name + email + badge CEFR
- Liens role-aware (étudiant / enseignant / admin)
- Switcher d'environnement rapide (Linux / macOS / Windows)
- Lien Admin Panel conditionnel (super admin uniquement)

#### Profil par rôle
| Rôle | Champs spécifiques |
|------|-------------------|
| Étudiant | Avatar, pseudo, bio, langue, CEFR, track, env préféré, notifications, clé IA |
| Enseignant | + titre pro, institution, bio publique, lien tableau de bord classe |
| Institution Admin | + logo institution, couleurs marque, contact officiel |
| Super Admin | Pas de profil public — settings système dans l'Admin Panel |

#### Supabase Storage
- Bucket `avatars` — RLS : lecture publique, écriture propriétaire uniquement
- Bucket `institution-logos` — RLS : lecture publique, écriture institution_admin
- Fallback : initiales générées côté client si pas d'avatar
- RGPD : suppression cascade quand compte supprimé

---

### 🔮 Phase 8 — Système de Tickets

> Bug reports, suggestions, améliorations — directement depuis l'app

#### DB
```sql
CREATE TABLE tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  type text CHECK (type IN ('bug','suggestion','improvement','content_request')),
  title text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open','in_review','resolved','closed','wont_fix')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
  assigned_to uuid REFERENCES profiles(id),
  context jsonb,    -- env sélectionné, module, leçon, commande tapée
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### UX
- Bouton flottant `?` accessible depuis toutes les pages `/app/*`
- Contexte capturé automatiquement (env, module, leçon en cours)
- Utilisateur suit ses tickets : `/app/my-tickets`
- Admin gère tout dans le panel admin

---

### 🔮 Phase 9 — Admin Panel (après Phase 7 + signal trafic significatif)

> Inspiré de : Grafana, Sentry, Linear, Datadog — adapté à une app pédagogique open source.
> Vitrine de sécurité et de maîtrise technique. 7 sections. Terminal Sentinel alimente le Security Center.
> Stack visuelle : Recharts + Supabase Realtime + dark theme `#0d1117` cohérent avec l'app.

#### Sécurité admin — 8 couches (normes 2026)
| Couche | Mécanisme |
|--------|-----------|
| Auth | Supabase Auth + 2FA TOTP obligatoire (authenticator app) |
| JWT | Access token 15min + refresh 7j + rotation auto |
| RBAC | Rôle `admin` vérifié Edge Function + RLS — jamais côté client |
| Rate limit | Max 5 tentatives → lockout 30min → alert email |
| Audit log | Qui / quoi / quand / IP / user-agent — table immuable (insert only) |
| CSP | Nonce-based strict pour `/admin` — séparé de l'app principale |
| Secrets | Supabase Vault + Vercel env vars — zéro secret en clair |
| SSRF guard | Edge Function : validation URL stricte, liste blanche domaines autorisés |

#### Sections du panel admin

**1. Dashboard santé en temps réel**
- Uptime (UptimeRobot webhook → Supabase)
- Latence API (p50/p95/p99 via Vercel Analytics)
- Taux d'erreur Sentry (widget live)
- Tests CI dernière exécution (GitHub Actions API)
- Alertes actives (rouge/orange/vert)

**2. Analytics utilisateurs** (graphiques Recharts/Tremor)
- DAU/MAU avec tendance
- Heatmap horaire d'activité
- Taux de complétion par module (funnel)
- Commandes les plus tapées (top 20)
- Abandon par leçon (où les gens décrochent)
- Répartition Linux/macOS/Windows
- Nouveaux comptes par jour

**3. Security Center** *(alimenté par Terminal Sentinel — Phase 5.5)*
- Rapports Terminal Sentinel : historique des audits hebdomadaires, score de santé, tendances
- Tentatives de connexion échouées (carte géo IP si disponible)
- Rate limit hits (par IP, par endpoint)
- Comportements anormaux du terminal :
  - Commandes inattendues répétées (bruit de fuzzing)
  - Patterns XSS/injection dans les inputs
  - Fréquence anormalement élevée de requêtes
- Audit log consultable (filtres : qui, quoi, quand) — table `audit_log` insert-only
- Rapport hebdomadaire auto (Edge Function → email)

**4. Gestion contenu**
- Activer/désactiver modules
- Planificateur de contenu (scheduler commandes)
- Éditeur de catalogue commandes (CRUD)
- Prévisualisation leçon par env

**5. Gestion utilisateurs**
- Liste membres (filtre par rôle/secteur/activité)
- Modifier rôle (student ↔ teacher)
- Suspendre/réactiver compte
- Assigner élève à un professeur
- Voir progression détaillée d'un utilisateur

**6. Tickets & Feedback**
- Vue Kanban : open → in_review → resolved
- Assignation, changement priorité, réponse
- Export CSV
- Filtres : type / priorité / module concerné

**7. Health Monitor**
- Supabase : quota DB, connexions actives, latence requêtes
- Vercel : bandwidth, build time derniers déploiements
- Sentry : issues non résolues, régression détectée
- npm audit : vulnérabilités connues (cron quotidien)

#### Fichiers à créer (Phase 9)
```
src/app/components/admin/
├── AdminLayout.tsx           # Shell /admin avec nav + auth guard (RBAC)
├── AdminDashboard.tsx        # Vue d'ensemble santé + alertes
├── AnalyticsDashboard.tsx    # DAU/MAU, funnels, heatmaps
├── SecurityCenter.tsx        # Tentatives hack, anomalies terminal, audit log
├── ContentManager.tsx        # Modules, leçons, catalogue commandes
├── UserManager.tsx           # Gestion membres, rôles, suspension
├── TicketBoard.tsx           # Kanban tickets
├── HealthMonitor.tsx         # Supabase + Vercel + Sentry + CI
└── charts/
    ├── ActivityHeatmap.tsx   # Recharts heatmap
    ├── CompletionFunnel.tsx  # Funnel par module
    ├── CommandsTopChart.tsx  # Bar chart commandes populaires
    └── SecurityTimeline.tsx  # Timeline événements sécurité

supabase/functions/
├── audit-log/index.ts        # Insert-only audit log
├── security-report/index.ts  # Rapport hebdo sécurité → email
├── health-check/index.ts     # Ping services externes
└── content-scheduler/index.ts # Déverrouillage contenu toutes les 2 semaines

.github/workflows/
├── security-audit.yml        # npm audit + Snyk quotidien
└── health-report.yml         # Rapport hebdo CI → Slack/email
```

---

### 🔮 Phase 10 — Contenu Automatisé (Catalogue évolutif)

> Chaque commande de chaque environnement référencée, déverrouillée progressivement

#### Principe
- Le catalogue de commandes (`commandCatalogue.ts`) versionné en DB Supabase
- Scheduler (Edge Function + cron) : nouveau contenu toutes les **2 semaines**
- Notification in-app quand nouveau module/leçon disponible
- Admin peut ajuster le calendrier manuellement

#### Sources des commandes (exhaustivité)
- Linux : `man -k .` + pages tldr + SS64.com + cheat.sh
- macOS : `man` pages Apple + Homebrew formula list
- Windows : PowerShell Get-Command + cmdlets documentation Microsoft
- Cross-platform : Node CLI, Git, Docker, curl

#### DB — table scheduler
```sql
CREATE TABLE content_releases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type text CHECK (content_type IN ('module','lesson','command')),
  content_id text NOT NULL,
  scheduled_for date NOT NULL,
  released boolean DEFAULT false,
  released_at timestamptz
);
```

---

## Architecture Multi-Agents (v2)

> Pour chaque chantier > 3 fichiers ou touchant plusieurs domaines,
> l'orchestrateur répartit le travail entre agents spécialisés.
> Terminal Sentinel s'intègre comme outil du Security Agent.

```
┌─────────────────────────────────────────────────────┐
│                 ORCHESTRATOR AGENT                  │
│  Thierry (décision) + Claude Code (coordination)    │
│  → cartographie, plan, validation, merge, PR        │
└──────┬──────────┬────────────┬────────────┬─────────┘
       │          │            │            │
  ┌────▼───┐ ┌───▼─────┐ ┌───▼────┐ ┌─────▼──────┐
  │FRONTEND│ │BACKEND  │ │SECURITY│ │CURRICULUM  │
  │ Agent  │ │Supabase │ │ Agent  │ │  Agent     │
  │        │ │ Agent   │ │ ↓TS    │ │            │
  └────────┘ └─────────┘ └────────┘ └────────────┘
       │           │          │            │
       └───────────┴──────────┴────────────┘
                          │
              ┌───────────▼──────────────┐
              │       QA / TEST Agent    │
              │  Vitest unit + Playwright│
              │  Lighthouse CI           │
              └──────────────────────────┘

TS = Terminal Sentinel (audit périodique → Security Center)
```

**Rôles :**
| Agent | Responsabilité | Outils |
|-------|---------------|--------|
| Orchestrateur | Plan, coordination, review, merge | Tous |
| Frontend | UI/UX, composants, charts, design tokens | Edit, Write, Bash |
| Backend/Supabase | Schema SQL, RLS, Edge Functions, migrations | Supabase MCP, Edit |
| Security | OWASP audit, CSP, RLS review, Terminal Sentinel | Grep, Bash, WebSearch |
| Curriculum | Leçons, exercices, catalogue commandes | Edit, Context7 |
| QA | Tests Vitest, Playwright, Lighthouse | Bash, Write |

**Règles d'activation :**
- Security obligatoire dès qu'un sujet touche auth, secrets, webhooks, RBAC, inputs utilisateur
- Backend obligatoire dès qu'une migration SQL est nécessaire
- QA obligatoire après chaque feature (unit + E2E avant merge)
- Terminal Sentinel lancé manuellement avant chaque release majeure
- Jamais d'agent sans plan validé par Thierry d'abord

---

## Logo

Concept : `>_` dans un conteneur rounded square.
Couleurs : fond `#0d1117`, symbole `emerald-500` (#10b981).
Fichiers : `public/logo.svg` ✅, `public/favicon.svg` ✅, `public/og-image.png` ✅

---

## Sentry — validation en prod requise

Sentry est configuré et déployé via Vercel. Pour confirmer que les events remontent :
1. Vérifier que `VITE_SENTRY_DSN` est bien présent dans Vercel → Settings → Environment Variables
2. Sur le live, ouvrir la console DevTools et taper `throw new Error("test sentry")`
3. Vérifier dans le dashboard Sentry que l'event est bien reçu

> Sentry est désactivé en local (`enabled: import.meta.env.PROD`). Ne capture rien hors production.

---

## 🔮 Phase finale — PWA Avancée (après tout le reste)

> À traiter uniquement quand curriculum complet + Admin Panel + RBAC sont en prod.
> Validé comme approche finale — 10 avril 2026.

**Valeur ajoutée pour le contexte scolaire :**
- Installable sur tablette/mobile/PC sans App Store (icône écran d'accueil)
- Offline partiel : leçons déjà visitées accessibles sans wifi (idéal pour les salles informatiques sans internet stable)
- `display: standalone` : supprime la barre d'adresse → immersion terminal authentique
- Push notifications : "nouveau module disponible", "streak en danger"

**Stack :** `vite-plugin-pwa` + Workbox, stratégie `NetworkFirst`
- Supabase Auth incompatible avec `CacheFirst` → NetworkFirst obligatoire
- Service Worker scope limité : ne pas mettre en cache les appels Supabase RLS
- Manifest : icônes 192px + 512px, `theme_color: #0d1117`, `background_color: #0d1117`

**Effort estimé :** 2–3 jours. Ne pas commencer avant Phase 9 terminée.
