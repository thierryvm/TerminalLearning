# Roadmap — Terminal Learning

> Last updated: **16 May 2026 ~10h45 CEST** — **🚀 Sprint 2 started — deadline 10 June (schools + admin panel) — THI-118 ✅** : PR [#232](https://github.com/thierryvm/TerminalLearning/pull/232) merged — landing LCP regression fix (Sentry weekly 3.87 s → 9.31 s poor zone). Chrome DevTools MCP diagnosis: LCP element = hero `<p>` sub-heading (TEXT), 98.9 % render delay, leaks `landingContent.ts` (imports `commandCatalogue` + `ENVIRONMENTS` forced ~41 kB gzip curriculum chunk eager) + `UserMenu`/`LoginModal`/`PWAInstallModal` eager. Fix: hardcode `TOTAL_LESSONS`/`TOTAL_COMMANDS`/`ACTIVE_ENVIRONMENTS_COUNT` + new drift guard test (caught silent `TOTAL_LESSONS` 64 → 65), `React.lazy` + Suspense for conditional modals. Landing chunk **27.29 → 7.33 kB gzip (−73 %)**, curriculum chunk no longer in landing graph. Chrome DevTools MCP preview validation: 0 console error, lazy modal fetched on click. Sprint 2 locked order: THI-118 ✅ → THI-153 UI bundle cleanup (~75 min, 5 items) → THI-131 Phase 7c LTI → THI-42 Profile Hub → THI-77/78 admin heatmaps. — **Previous update (16 May ~10h CEST) — Sprint 1 Phase 7b lockdown CLOSED at 4/4 — THI-113 ✅** : PR [#230](https://github.com/thierryvm/TerminalLearning/pull/230) merged — triple final audit (3 agents in parallel) + **H1 fix sentry-tunnel symmetric scrub** (URL query + Authorization/X-API-Key/*token* headers aligned with client beforeSend, plus string-based fallback for relative URLs after Sourcery security review 🚨). Verdict ALL CLEAR: security-auditor **9.4/10** (+0.1 vs 9.3 post-H1 fix), prompt-guardrail-auditor **9.3/10** (44/44 fixtures × 4 locales rejected, ADR-005 Rule 10 SATISFIED), ui-auditor SHIP-READY (3 non-blocking LOW). Full audit report: [`docs/audits/ai-tutor-v1-2026-05-16.md`](audits/ai-tutor-v1-2026-05-16.md). H2 undici CVEs transitive deps + H3 git history credential = deferred/accepted residual. AI score trajectory: 8.7 → 9.0 → 9.1 → 9.3 → **9.4/10**. Path to 9.5/10: H2 upgrade + R3 M2-AI encoding + R5 H4-AI jsonwebtoken (Phase 7c gate). **Sprint 1 recap**: THI-148 ✅ → THI-144 ✅ → THI-112 ✅ → THI-113 ✅. **Phase 7c LTI activation** = next sprint (gate H4-AI jsonwebtoken supply chain). — **Previous update (16 May ~01h CEST) — Sprint 1 step 3/4 shipped — THI-112 ✅** : PR [#228](https://github.com/thierryvm/TerminalLearning/pull/228) merged (AiKeySetup standalone + AiConsentModal extraction + AiSettings page `/app/settings` + Sidebar nav + PrivacyPolicy `#ai-processing` section + **M3-AI VERIFIED closed**: consent storage `'true'` → JSON `{version, acceptedAt, expiresAt}` TTL 365d + legacy migration), `llm-security-auditor` re-baseline **9.3/10 confirmed** (delta +0.2 vs 9.1, target 9.25 exceeded), 14 files changed (+1545 / −214), AI tests 314 → ~329+ with 8 new `consent.test.ts` invariants. Sourcery round 2 (3 findings) addressed in same PR: provider meta module + `handleAccept` defense-in-depth + revocation copy. Trajectory 9.5/10 reachable via R3 M2-AI encoding bypass (THI-153) + R5 H4-AI jsonwebtoken (Phase 7c gate). **Sprint 1 order**: THI-148 ✅ → THI-144 ✅ → THI-112 ✅ → THI-113 triple final audit (next, step 4/4). — **Previous update (10 May ~12h CEST) — Sprint 1 step 2/4 shipped — THI-144 ✅** : PR [#222](https://github.com/thierryvm/TerminalLearning/pull/222) merged (system prompt v1.1.0 + ADR-008 + hybrid eval suite (a)+(b) + M4-AI LOW VERIFIED fix + R1 symmetric follow-up), `llm-security-auditor` re-baseline **9.1/10 confirmed** (delta +0.1 vs 9.0/10 morning), 1339 tests passing (+48 vs baseline), `prompt-guardrail-auditor` PASS (0 CRITICAL, 0 WARNING). 4 ChatGPT cross-validation frictions resolved (compound questions / over-explanation / repeated hints / satisfaction signal). Eval suite (b) manual run pending (`OPENROUTER_API_KEY` env required, ship gate documented in PR body). Trajectory 9.5/10 reachable via R2 + R3 + R5 (THI-153 sprint 2 + Phase 7c gate). **Sprint 1 order**: THI-148 ✅ → THI-144 ✅ → THI-112 onboarding (next) → THI-113 triple final audit. — **Previous update (10 May ~03h CEST) — Session marathon clôturée** : 11 PRs livrées #208 → #217. Agent `ai-pentester-pro` (créé PR #210) renommé **`llm-security-auditor`** (PR [#212](https://github.com/thierryvm/TerminalLearning/pull/212), policy filter mitigation + Evidence confidence framework VERIFIED/STRONG_INDICATOR/SPECULATIVE/RESEARCH_ONLY). 14ᵉ agent **`session-orchestrator`** créé ([#213](https://github.com/thierryvm/TerminalLearning/pull/213) + [#214](https://github.com/thierryvm/TerminalLearning/pull/214) Sourcery portability fix). 1ʳᵉ baseline `llm-security-auditor` **8.7/10** (PR [#215](https://github.com/thierryvm/TerminalLearning/pull/215) ferme M1-AI + H10-AI, PR [#217](https://github.com/thierryvm/TerminalLearning/pull/217) audit-log officialisé). PR [#216](https://github.com/thierryvm/TerminalLearning/pull/216) `chore: gitignore .tmp/`. THI-153 umbrella 2/13 cochés. Re-baseline post-fixup estimé prompt-guardrail 9.2/10, llm-security 9.0/10. — **Audit global multi-agents post-Sprint 1 étape 1/4** + nouvel agent `llm-security-auditor` (renommé PR #212, 7 couches séquentielles avec Notes Couche N + Evidence confidence framework, Opus 4.7, posture défensive rigoureuse, portable cross-projet). **9 findings consolidés en THI-153 umbrella** (priority High, gate H3 `escapeDelimiters` sur `lessonContext.goal` AVANT THI-144, 30 min). Treizième agent dans `.claude/agents/`. Reminder **Terminal Sentinelle V2** capturé memo `project_terminal_sentinelle_evolution.md` (module greffable cross-projet pour futur dashboard Super Admin = Phase 10+, pas de chantier V2 maintenant, préparation portable déjà en cours). — **Sprint 1 Phase 7b lockdown démarré** : THI-148 (méta-plateforme V1.0.1) livré PR [#208](https://github.com/thierryvm/TerminalLearning/pull/208) en review, prompt bump `tutor/v1.0.0` → `tutor/v1.0.1` + nouveau bloc `<platform_context>` statique (counts modules/leçons/environnements, pas de PII, pas de `userProgress`) + bonus defense-in-depth C1 (audit `prompt-guardrail-auditor` 8.8/10 → full PASS post-fix : `DELIMITER_RX` étendu pour `<platform_context>` + `escapeDelimiters()` exporté + module titles wrappés). 1291 tests passed (+22 vs baseline 1268). Décision tracée *finish what started* (memos `feedback_finish_what_started.md` + `project_lti_spike_state.md`) : Phase 7b lockdown complète AVANT pivot Phase 7c LTI (qui reste en SPIKE pur — `verifyJwt()` placeholder, `LTI_ENABLED=false`). **Sprint 1 ordre verrouillé** : THI-148 ✅ → THI-144 (system prompt v1.1.0 + **ADR-008** [pas ADR-007, déjà pris par solo-maintainer-sustainability] + eval suite 10-15 Q + 5 micro-frictions ChatGPT cross-validation, mini-prompt de reprise dans `docs/sessions/next-session-thi-144.md`) → THI-112 onboarding (AiKeySetup + AiConsentModal + AiSettings + /privacy#ai-processing) → THI-113 audit final triple. — **Phase 7c THI-152 sprint mobile recovery 🏁 COMPLETE** (mini-PR 1 focus traps a11y ✅ #196, mini-PR 2 forms anti-zoom ✅ #197, mini-PR 3 FAB Sparkles size+opacity+position ✅ #198, mini-PR 4 PWA apple-touch-icon PNG + standalone metas ✅ #199, mini-PR 5 touch targets ≥44/≤40 + Option D FAB recalibration mobile 48→44 px ✅ #200, mini-PR 6 drawer overflow word-break + header truncation ✅ #201, mini-PR 7 PWA safe-area top + autoFocus terminal contrôlé ✅ #202, hotfix 7bis Landing nav safe-area ✅ #203, mini-PR 8 focus rings emerald harmonization ✅ #204, **mini-PR 9/9 FINAL polish HTML metas + tap-highlight + Sidebar landscape** ⏳). **Sprint clos après cette PR** : 9 mini-PRs + 1 hotfix livrés sur 1 journée. **3 bugs empiriques @thierry éradiqués** (drawer overflow 6/9, header /app PWA 7/9, Landing nav PWA 7bis). **Brick 9/9** : 5 polish items finaux — W3C `mobile-web-app-capable` ajouté (élimine warning DevTools deprecated, garde compat iOS Safari legacy), `theme-color` `#0d1117` déjà conforme dark-only, `-webkit-tap-highlight-color: transparent` ajouté theme.css universel (élimine rectangle gris iOS, design TL utilise `:active` brand-coherent), font-display swap déjà conforme fontsource 5.x, Sidebar `pl-[max(0px,env(safe-area-inset-left))]` (notch landscape iPhone). 3 nouveaux specs e2e (`html-metas.webkit.spec.ts`, `tap-highlight.webkit.spec.ts`, extension Sidebar dans `safe-area-pwa.webkit.spec.ts`). Empirical override @thierry intégré : FAB asymétrie mobile/desktop intentionnelle (44/56) — primary action exemption documentée. **Phase 7c V1.5 séquencée @cowork** : THI-149 epic responsive mobile Done auto-ferme par PR #191 hot fix, **3 sub-tickets créés** `parentId=THI-149` → **THI-150 In Progress** (agent `mobile-responsive-auditor` 12ᵉ agent du projet, 11 sections / ≥48 checkpoints, pattern Ankora `mobile-ios-auditor` adapté Vite/React/Tailwind v4 + bonus Section 11 Desktop Preservation TL-critical + checkpoints BUG-FAB-001 visibility/contrast/detachment), THI-151 (audit Playwright WebKit + matrice bugs P0/P1/P2 sur 8 pages publiques + auth, viewports iPhone 14/SE/Pro Max + desktop 1280×800/1920×1080), THI-152 (mini-PRs fix séquentielles, **critère ABSOLU "ne pas casser desktop"**). **Reprio @cowork V1.5** : THI-150/151/152 (responsive mobile P0 BLOQUANT v0.9 publique) → THI-148 extend tutor scope méta-plateforme V1.0.1 → **THI-144 enrichi P1** (system prompt v1.1.0 ADR-008 + eval suite + 5 micro-frictions identifiées par cross-validation ChatGPT sur session 8 tours @thierry — compound questions, sur-explication internal mechanics, indices répétés, platformContext absent confirme THI-148, conclusion ouverte) → THI-142/143 reportés V2. **Phase 7b AI Tutor V1 ✅ COMPLETE** : `THI-111` cœur fonctionnel BYOK livré (PR #188 — sanitizer + 4 providers OpenRouter/Anthropic/OpenAI/Gemini + panel + 287 AI tests, audits guardrail 9.4/10 + security 8.8/10 + ui A11y exemplary), `THI-147` fix safe-area iPhone PWA standalone livré (PR #189), panel **actif en Production** (`terminallearning.dev`) avec env vars `VITE_AI_TUTOR_ENABLED=true` + `VITE_AI_TUTOR_OPENROUTER_MODEL=anthropic/claude-haiku-4-5` configurées par @cowork. **6 tickets V1.5 backlog créés + reprio post-verdict empirique** : `THI-148` extend tutor scope to platform meta-questions V1.0.1 **P1 GO IMMÉDIAT** 1h30 estimé honnête (audit guardrail Règle 10 obligatoire post-bump prompt), `THI-146` modèle défaut Haiku ✅ **SUCCÈS validé empiriquement 9.3/10**, `THI-142` lessonContext renforcé **→ Low** (Haiku gère déjà bien le contexte leçon, Tests 2+3 prouvés), `THI-143` frustration heuristic V1.5 **→ Low** (Haiku résout naturellement Test 4 = 10/10 bascule mode direct sans code), `THI-144` system prompt v1.1.0 + ADR-008 + eval suite 10-15 questions PR dédiée P2 Medium (peut englober THI-148), `THI-145` chat assistant role-based Phase 9+ P3 Low. **Méthode scientifique d'isolation validée empiriquement** : Haiku activé d'abord → retest qualitatif 5 tests Chrome MCP par @cowork → score moyen 9.3/10 → reprio dynamique du backlog. **ROI** : ~4-6h économisées (THI-142/143 reportés V2). THI-148 reste P1 quoi qu'il arrive (Test 1 méta-plateforme = scope bloque indépendamment du modèle, prouvé empiriquement). **Sprint sécurité 1-2 mai 2026 ✅ CLOS** : audit `security-auditor` frais 8.1/10 → ~8.6/10 post-sprint, 11 PRs livrées (#168 à #178), 5 issues Done (THI-133 LTI feature flag, THI-134 LTI cold-start fix, THI-135 rate limiter partagé, THI-137 vercel.live retiré CSP, THI-140 Sentry scrubber étendu aux 4 types d'envelopes), 4 mediums ciblés en backlog (THI-136 hashes Vite, THI-138 CORS LTI flow réel bloqué Phase 7c, THI-139 RLS migration order test, THI-112 keyManager couplé Phase 7b), H3 git history accepté résiduel, **agent `route-attack-auditor` créé** pour combler la zone HTTP-level (status fingerprinting, verb tampering, cache poisoning, slowloris, CORS edge cases). Posture validée par Thierry : **pas de rush deadline**, qualité/scalabilité/perf non négociables, plan respecté en ordre, **mea culpa explicite trio** @thierry / @cc-terminallearning / @cowork à chaque round. **Phase 7b Security Hardening ✅ complete (THI-120)**: CLAUDE.md credential protection rule + CSP extension + Sentry scrubber double-layer — C1/C2/C3 gate validated ✅ — **Strategic vision consolidated (ADRs 001-005)**: LTI-first positioning, OpenRouter BYOK 4-tiers, TTFR KPI, Classroom Composer UI, AI Tutor V1 decisions — **Epic THI-96 Web 2026 Compliance** 6/8 sub-issues shipped — **shadcn/ui migration ✅** (THI-91 umbrella) — INP fix THI-90 ✅, lab 515ms → 26ms (−95%) — Phase 4c Bundle Optimization ✅ — 11 modules / 65 lessons / 1268 tests — **Next ordonné par décision @cowork (5 mai matin)** : (1) **THI-150 EN COURS** (agent `mobile-responsive-auditor` créé), (2) THI-151 audit Playwright WebKit + matrice bugs après merge THI-150, (3) THI-152 mini-PRs fix séquentielles (critère ABSOLU desktop preserve), (4) THI-148 extend tutor scope méta-plateforme V1.0.1 (1h30 honnête), (5) **THI-144 enrichi P1** system prompt v1.1.0 + ADR-008 + eval suite (intègre 5 micro-frictions ChatGPT cross-validation), (6) THI-112 onboarding AiKeySetup + picker modèle curated, (7) THI-114 Web Worker isolation, (8) THI-145 chat role-based Phase 9+, puis Phase 7c LTI activation, puis dashboards par rôle (Phase 9), puis i18n FR/NL/EN/DE. **THI-142/143 reportés V2** (Haiku 9.3/10 résout 80% naturellement).

---

## Vision

An open-source, free, interactive terminal learning platform targeting **schools and universities**
as a pedagogical tool to train autonomous full-stack developers — from absolute beginners to
professionals who leverage AI as a tool, not a replacement.

---

## Phase 0 — Deployment ✅
- [x] Vite + React + TypeScript app deployed on Vercel
- [x] SPA routing + security headers
- [x] GitHub Actions CI (type-check → lint → test → build)

## Phase 1 — Landing + Content ✅
- [x] Landing page + routing (/, /app, /privacy)
- [x] Interactive terminal engine
- [x] Lesson curriculum + progress tracking
- [x] GDPR + SEO + OpenGraph image

## Phase 2 — Observability ✅
- [x] Vercel Analytics (cookieless, GDPR-compliant)
- [x] Sentry error tracking (frontend) — EU endpoint (ingest.de.sentry.io)

## Phase 3 — User Accounts ✅
- [x] Supabase Auth — email/password + OAuth GitHub + Google
- [x] DB schema + RLS (profiles + progress tables)
- [x] Progress sync: localStorage + Supabase hybrid (never downgrades)
- [x] Security hardening: HSTS, CSP, rate limiting

## Phase 3.5 — UX & Auth upgrade ✅
- [x] Animated terminal hero
- [x] Sidebar auth (UserMenu, sync badge)
- [x] OAuth loading states, TOKEN_REFRESHED sync fix
- [x] Auth deadlock fix — defer Supabase sync outside onAuthStateChange lock (PR #78)
- [x] 160+ unit tests
- [ ] **Password strength meter + generator (THI-79):** `<PasswordStrengthBar />` (zxcvbn, score 0–4, labels FR), générateur 16 chars via `crypto.getRandomValues()`, clipboard copy — signup uniquement. Policy : students 8 chars min, teachers/admins 12 chars (Phase 9). Tests dans `passwordStrength.test.ts`.

## Phase 4 — Curriculum v2 + Environment Selection ✅
- [x] Multi-environment support: Linux, macOS, Windows
- [x] Environment selector on landing + sidebar
- [x] Terminal engine: 30+ PowerShell aliases, macOS/Windows commands
- [x] Env-aware exercises: validate/hint/instruction per environment
- [x] Contextual help system: `help <cmd>` returns targeted help per env
- [x] Terminal profiles per env: prompt style, path format, MOTD
  - Linux: `user@hostname:~$` — bash green
  - macOS: `➜ ~` — zsh violet (Oh My Zsh style)
  - Windows: `PS C:\Users\user>` — PowerShell cyan
- [x] 192 unit tests

## Phase 4b — Perf & Quality ✅
- [x] Google Fonts → self-hosted Geist — FCP 1.8s → 0.6s (PR #73)
- [x] Custom domain terminallearning.dev live (PR #74)
- [x] iOS zoom fix on terminal input — `font-size: 16px` mobile (PR #74)
- [x] Quick wins refactor: cmdHead/Tail merged, moduleIcons centralized, useLessonSEO hook (PR #75)
- [x] a11y: `<main>` landmark, Ko-fi contrast 5.3:1, manifest dynamic injection, aria-label terminal (PR #76)
- [x] Lazy-load curriculum — main bundle 140kB → 16kB, FCP 2.96s → 0.6s (PR #77)
- [x] Sitemap — terminallearning.dev domain, 42 URLs (PR #79)

## Phase 4c — Bundle Optimization ✅
- [x] Remove curriculum from Landing critical path — −112 kB (PR #96, THI-81)
- [x] Defer Supabase SDK loading — −194 kB FCP (PR #96, THI-82)
- [x] Fix INP 592ms regression — instant scroll + MAX_LINES cap (PR #99, THI-83)
- [x] Remove motion/react (~40 kB gzip) — CSS animations + IntersectionObserver (PR #108, THI-87)
- [x] Remove 22 unused dependencies (MUI, Emotion, canvas-confetti, react-dnd, recharts, etc.)
- [x] Agent `ui-auditor` — design system compliance guard
- [x] INP fix — `setEnvironment` wrappé dans `startTransition` au context owner, lab CPU 4× : 515ms → 26ms (−95%) sur env switcher (PR #114, THI-90)

## Phase 4d — Design System Compliance ✅ Done (THI-85 / THI-91 / THI-105 / THI-106 / THI-107)
- [x] Migrate custom components to shadcn/ui — NotFound (THI-85), Dashboard (THI-95), LessonPage (THI-91 chunk D), Landing chunk B/C (THI-91 chunks B/C), Sidebar (THI-91 chunk A), LoginModal / UserMenu / PrivacyPolicy / App FallbackUI (THI-107)
- [x] `ui-auditor` agent integrated into mandatory session protocol (THI-86)
- [x] A11y harmonisation on Button CVA variants — focus-visible rings emerald, native `disabled` on Sidebar locked rows (THI-106)
- [x] **THI-105** — `button.tsx` consolidation post-migration (PR #147, 18 April 2026) : 3 Sidebar wrappers (`SidebarRowButton`, `SidebarLessonButton`, `EnvPill`) encapsulent les variantes `tl-sidebar-*` / `tl-env-pill` derrière une API métier ; size `icon-lg` neutre (remplace `tl-icon-44` + `tl-icon-44-md`, la corner shape passe par `className="rounded-lg|rounded-md"` au call-site). Encapsulation stricte vérifiée : les variantes dédiées ne sont jamais réutilisées hors de leur wrapper.
- [x] Zero native `<button>` in src/app/ except 2 intentional exceptions: `src/app/components/ui/sidebar.tsx` (shadcn internal) + `src/app/components/Landing.tsx:153` env toggle — ce dernier reste à migrer dans un follow-up dédié (nécessite une size `tl-env-pill-lg` non incluse dans THI-105)

## Phase 4e — Web 2026 Compliance 🔄 Epic THI-96 (14–16 April 2026)
> Full desktop + mobile conformance to 2026 web standards. 6/8 sub-issues shipped in 48h. Target users: iPhone SE 2016, Chromebook 2019, keyboard-only navigators (motor accessibility), photosensitive users.

- [x] **THI-97** — `viewport-fit=cover` + `min-h-dvh` — iPhone notch + iOS dynamic URL bar (PR #121, 14 April 2026)
- [x] **THI-98** — Sidebar mobile 2026 — `env(safe-area-inset-bottom)` with `max()` fallback, touch targets ≥44px (WCAG 2.2 AAA), focus-visible emerald rings (PR #123, 15 April 2026)
- [x] **THI-99** — LessonPage mobile 2026 — touch targets + focus-visible (PR #126, 15 April 2026)
- [x] **THI-100** — LoginModal mobile 2026 — `autoComplete="email"`, `inputMode="email"`, `type="button"`, touch targets (PR #122, 15 April 2026)
- [x] **THI-101** — MarkdownPage FAB scroll-top — touch + safe-area (PR #127, 16 April 2026)
- [x] **THI-102** — NotFound / Privacy / Dashboard / CommandReference batch — touch targets + focus-visible + `clamp(3rem,10vw,3.75rem)` fluid 404 typography (PR #128, 16 April 2026)
- [ ] **Desktop a11y** — keyboard-only navigation audit on landing + app shell
- [ ] **CSS moderne 2026** — container queries, `@property`, `color-mix()` where it simplifies the codebase

## Phase 5 — Curriculum Expansion 🔄 In progress
Full-stack developer path — 11 modules ✅ (65 lessons, 1035 unit tests)

### Modules 1–7 ✅ (Phases 1–4)
- [x] Navigation, Fichiers & Dossiers, Lecture de fichiers, Permissions, Processus, Redirection & Pipes (Modules 1–6)
- [x] Variables & Scripts (Module 7) — `export`, `$PATH`, `.env`, bash scripts, cron — PR #36
- [x] Multi-environment: Linux / macOS / Windows — env-aware exercises + terminal profiles
- [x] 579 unit tests (12 test files) + 176 E2E tests (Playwright — 3 suites)

### Module 8 — Réseau & SSH ✅ THI-27 (PR #XX)
- [x] `ping`, `traceroute`/`tracert`, `nslookup`, `dig`
- [x] `curl` (HTTP requests, headers, REST APIs), `wget`
- [x] SSH: key generation (`ssh-keygen`), `ssh`, `scp`, `rsync`
- [x] Per-environment: `ip`/`ifconfig`/`ipconfig`, `netstat`/`ss`

### Module 9 — Git Fondamentaux ✅ THI-28 (PR #72)
- [x] `init`, `add`, `commit`, `log`, `diff`, `status`
- [x] `.gitignore`, branches (`branch`, `checkout`, `merge`)
- [x] Conflict resolution, stash, tags

### Module 10 — GitHub & Collaboration ✅ THI-28 (PR #72, combined with Module 9)
- [x] Remotes, push/pull, PRs, Issues, forks
- [x] GitHub Actions CI basics
- [x] Linear workflow integration

### Module 11 — L'IA comme outil dev ✅ THI-29 (PR #103 — 13 April 2026)
- [x] 12 lessons: intro, capabilities, limits, basic prompts, advanced prompts, validation, debugging, security, Claude CLI, career paths, senior posture, complete workflow
- [x] `ai-help` command with 11 subcommands in terminal engine
- [x] 15 unit tests for ai-help command
- [x] Level 5 module — prerequisite: GitHub & Collaboration (Module 10)

### Planned additions (next sprints)
- [ ] **Monitoring & System Tools**: `htop` dedicated module, `ps`, `lsof`, `df`/`du`, `free`
- [ ] **Text Editors**: nano (quick edits) + vim/neovim (full interactive course with exercises)
  - nano: basics, save, exit, search
  - vim: modes, navigation, edit, save, quit, config (`.vimrc`)
  - neovim: intro, plugin ecosystem (lazy.nvim), developer workflow
- [ ] **Full dedicated courses** (long-term vision): Git deep-dive, Docker, shell scripting masterclass

## Phase 5b — Exercise Quality Uplift + CBE Foundation 🔮
- [ ] 3–5 exercises per lesson (currently 1)
- [ ] New exercise types: `fill-flag`, `objective-result`, `error-fix`, `pipeline`, `scenario`
- [ ] Progressive hint system: after 2 attempts → partial hint, after 4 → suggested command
- [ ] Spaced repetition: commands from lesson N reused in N+1 and N+2
- [ ] Alternatives validation: accept equivalent commands (`rm` / `Remove-Item` / `del`)
- [ ] **Bloom's level** per exercise (Remember / Understand / Apply / Analyze / Evaluate / Create)
- [ ] **Mastery threshold** per exercise: 80% global, 95% for security modules (permissions, chmod, sudo)
- [ ] Write `score` + `attempts_count` + `hints_used` to Supabase `progress` table *(fields introduced in canonical DB schema — see Phase 7)*
- [ ] Track-aware lesson content: examples and exercises adapt to the student's active track
  - Full-Stack track → Node.js/web context; Sysadmin track → systemd/server context

## Phase 5c — Advanced Modules (fullstack → expert networks/servers) 🔮
Full module track for senior fullstack + network/server expert + security fundamentals:

| Module | Title | Level |
|--------|-------|-------|
| 8 | Network & SSH | 3 |
| 9 | Git Fundamentals | 3 |
| 10 | GitHub & Collaboration | 3 |
| 11 | Monitoring & System Tools (htop, lsof, df) | 4 |
| 12 | Text Editors (nano + vim/neovim full course) | 3 |
| 13 | Advanced Shell Scripting | 4 |
| 14 | Docker CLI | 4 |
| 15 | Security Fundamentals (non-offensive) | 4 |
| 16 | Server Administration | 5 |
| 17 | AI as a Dev Tool | 3 | *(Note: Module 11 ia-dev already covers this at Level 5 — Phase 5c may refine or replace)* |

## Phase 5.5 — Terminal Sentinel ✅ THI-36 (PR #90 — 12 April 2026)
> Automated security audit tool — professional security showcase for schools and universities.

- [x] **Component A — GitHub Actions weekly** (`.github/workflows/security-sentinel.yml`)
  - npm audit, gitleaks (secret scanning), HTTP headers (CSP/HSTS/X-Frame), cookie flags
  - Cron Monday 06:00 UTC + `workflow_dispatch` — results stored in `security_audit_logs` Supabase table
- [x] **Component B — Playwright local script** (`scripts/security-audit.cjs`)
  - Generic auth error messages, rate limiting active, `/admin` routes blocked, no stack traces in prod
  - Output: JSON report + readable terminal summary
- [x] `src/lib/securityReport.ts` — pure parsing helpers (24 unit tests)
- [x] `supabase/migrations/004_security_audit_logs.sql` — RLS service_role only
- Results feed into Admin Panel Security Center (Phase 9)

## Phase 6 — Terminal Multi-Session 🔮
- [ ] Tab system: multiple independent terminal sessions
- [ ] Each session has its own isolated TerminalState
- [ ] Mobile: max 3 sessions, full-screen with compact tab switcher
- [ ] Desktop: optional split-pane view

## Phase 6b — Embedded IDE + Mobile-First Refactor 🔮
> Required for Full-Stack Developer and Automation tracks. Biggest UX challenge of the project.

### Embedded IDE (sandboxed code editor)
- [ ] Code editor with syntax highlighting — Bash, Python, JS/TS, HTML/CSS, JSON, YAML
  *(current preference: CodeMirror 6 — mobile-native, tree-sitter, lightweight; to be validated at implementation time)*
- [ ] **Sandboxed execution** — 100% client-side, never server-side execution of student code
  - Python: WASM interpreter *(current preference: Pyodide)*
  - JavaScript: WASM sandbox with no DOM access *(current preference: QuickJS)*
  - Bash: existing terminal emulator (already sandboxed)
  - *Final library choices confirmed during IDE Agent analysis in Phase 6b*
- [ ] Output panel: stdout, stderr, exit code, execution time
- [ ] Student file persistence: Supabase Storage per user (project portfolio)
- [ ] IDE exercises: new exercise type `code-project` linked to Bloom "Create" level
- [ ] Integration with track Full-Stack Developer and Automation & Scripting

### Mobile-First Refactor (transversal — affects all components)
- [ ] **Virtual keyboard bar** above native keyboard: Tab, ↑↓, Ctrl+C, `|`, `>`, `"`, `$`
- [ ] **Adaptive layout**: mobile = terminal fullscreen + slide-up lesson panel
- [ ] **Swipe navigation**: lesson ↔ terminal ↔ exercise on mobile
- [ ] **Touch-only interactions**: no hover states, minimum tap target 44px
- [ ] IDE on mobile: simplified toolbar replaces keyboard shortcuts
- [ ] Responsive breakpoints *(current preference: mobile <640px, tablet 640–1024px, desktop >1024px — confirmed at implementation time)*
- [ ] Playwright mobile suite (existing e2e/mobile.spec.ts) extended to cover all new components
- [ ] Dedicated **Mobile UX Agent** validates every PR touching layout components

## Phase 7 — Member Space + Full RBAC + Pedagogical Platform 🔄 THI-37
> DB layer ✅ Done 12 April 2026 (PR #92). UI (teacher pages, student profile, admin panel) = Phase 9.
> Role model validated 10 April 2026. Prerequisite for Admin Panel and school/university rollout.
> Extended 10 April 2026: CEFR levels, tracks, predictive analytics, institutional management pages.

**Role model:**
| Role | Scope | Notes |
|------|-------|-------|
| `super_admin` | Global | Thierry only — full control |
| `institution_admin` | Own institution | Approves teachers, views students |
| `teacher` | Own classes | Verified via approval flow |
| `student` | Own progress | Self-register or teacher invitation |
| `public` | Read-only curriculum | No account required |

**Teacher verification flow:** self-declare → `pending_teacher` → admin approval → `teacher` active *(no document upload — GDPR + complexity; optional v2: email domain whitelist per institution)*

### CEFR Competency Levels (hybrid display)
- [ ] Add `cefrLevel` to each module in `curriculum.ts` (A1–C2)
- [ ] Student-facing label: "B1 · Praticien" — institutional export label: "B1 (CEFR)"
- [ ] EQF alignment: A1-A2 = EQF L3, B1 = EQF L4, B2-C1 = EQF L5
- [ ] Certificate auto-issued on CEFR level-up (stored in `badges` table)

### Learning Tracks
- [ ] New file `src/app/data/tracks.ts` — 3 initial tracks:
  - **Full-Stack Developer**: Navigation → Fichiers → Lecture → Variables → Git → GitHub → Réseau
  - **System Administrator**: Navigation → Permissions → Processus → Redirection → Variables → Réseau → SSH
  - **Automation & Scripting**: Redirection → Variables → Scripts → Cron → Git → CI/CD
- [ ] Track selector in Dashboard — assigns active track to student profile
- [ ] Lesson content adapts to active track (context-relevant examples per track)
- [ ] Teacher can assign a track to the entire class

### Student Pages (`/app/profile`, `/app/my-progress`)
- [ ] CEFR level display + progress to next level
- [ ] Active track + progression in chosen path
- [ ] Progress heatmap (GitHub-style calendar)
- [ ] Skill radar chart (per module, Recharts)
- [ ] Badge collection + LinkedIn/CV share link
- [ ] Exercise attempt history (score, attempts, hints used)

### Teacher Pages (`/app/teacher/class/:classId`)
- [ ] **Class dashboard**: CEFR level per student, real-time
- [ ] **Mastery heatmap**: who is stuck on which module, for how long (color = duration)
- [ ] **Automatic alerts**: students inactive >7 days, score stuck <50% after 3 attempts
- [ ] **Predictive assessment analytics**:
  - Estimated certification date per student (based on current velocity)
  - Success probability for end-of-module assessment
  - Recommendation: "Alice at risk of not finishing track before end of semester"
- [ ] **Rubric view**: % of class that has mastered each competency
- [ ] Private teacher notes per student
- [ ] Export: CSV/PDF of certified competencies (for official school reports)

### Institution Admin Pages (`/app/admin/institution/:id`)
- [ ] All classes of institution + teachers
- [ ] Aggregate metrics: completion rate, average CEFR level, badges distributed
- [ ] Teacher approval queue (pending_teacher flow)
- [ ] EQF export for institutional accreditation

### Badge System
- [ ] Badge types: first-command, module-complete, streak, speed-runner, no-hints, explorer, track-complete, cefr-level-up
- [ ] Internal badges (visual) first — schema is natively compatible with Open Badges 3.0
- [ ] Open Badges 3.0 export: Phase 11 (no data migration needed — schema-ready from day 1)
- [ ] Shareable URL per badge (public verification page)

### DB Schema — Canonical Reference (Phase 7)
> Single source of truth for all new tables and column extensions introduced in Phase 7+.
> Later phases (5b, 11b) reference this section rather than redefining fields.

- [x] **Test kit (migration 006 — applied 12 April 2026):** 5 test users (one per role) + institution "École de Test" + class "Terminal 101" + enrollments — THI-76 ✅
- [x] **New tables (migration 005 — applied 12 April 2026):**
  - `institutions (id, name, domain_whitelist[], admin_id)` ✅
  - `classes (id, teacher_id, institution_id, name)` ✅
  - `class_enrollments (class_id, student_id)` — composite PK ✅
  - `admin_audit_log (id, actor_id, action, target_type, target_id, metadata jsonb, created_at)` — insert-only ✅
- [x] **Extended tables:**
  - `profiles` + `role`, `institution_id`, `display_name`, `preferred_env`, `sector`, `bio`, `role_requested_at` ✅
- [x] RLS on all new tables — principle of least privilege ✅
- [x] `get_my_role()` security definer — prevents RLS recursion ✅
- [x] `prevent_role_escalation` trigger — blocks unauthorized role changes ✅
- [ ] **Remaining (future sprints):**
  - `tracks (id, title, module_ids[], cefr_target, description)`
  - `badges (id, user_id, badge_type, earned_at, evidence_url, ob3_metadata jsonb)` — OB3-compatible
  - `teacher_notes (id, teacher_id, student_id, note, created_at)`
  - `progress` + `time_spent_seconds`, `attempts_count`, `hints_used`
- [ ] `tickets (id, user_id, type, status, priority, context jsonb)` — Phase 8
- [ ] `security_reports (id, run_at, score, findings jsonb, component)` — Phase 5.5/9

## Phase 8 — Ticket System 🔮
- [ ] Floating feedback button (accessible from all `/app/*` pages)
- [ ] Types: bug / suggestion / improvement / content_request
- [ ] Auto-captured context: selected env, current module/lesson, last command
- [ ] Status workflow: open → in_review → resolved / closed / wont_fix
- [ ] Users can track their own tickets at `/app/my-tickets`
- [ ] DB: `tickets` table — see canonical schema in Phase 7

## Phase 9 — Admin Panel 🔮
> After Phase 7 (RBAC) + meaningful traffic signal. Inspired by Grafana, Sentry, Linear.
> Visual stack: Recharts + Supabase Realtime + dark theme `#0d1117`.

- [ ] `/admin` route — 8-layer security (RBAC + 2FA TOTP + audit log + CSP nonce)
- [ ] **Health Dashboard** — uptime, API latency p50/p95, error rate, CI last run, active alerts
- [ ] **Security Center** *(fed by Terminal Sentinel)* — weekly audit reports, failed logins, rate-limit hits, terminal anomalies, `audit_log` viewer
- [ ] **Analytics** — DAU/MAU, completion funnels, command heatmap, env distribution (Linux/macOS/Windows)
- [ ] **User Manager** — teacher approval flow, roles, suspension, teacher-student assignment
- [ ] **Content Manager** — module activation, lesson editor, command catalogue CRUD
- [ ] **Ticket Board** — Kanban (open → in_review → resolved), priority, assignment
- [ ] **Health Monitor** — Supabase quotas, Vercel bandwidth, Sentry issues, npm audit
- [ ] **Activity Heatmaps** (THI-77 + THI-78):
  - THI-77: `<StudentActivityHeatmap />` — GitHub-style grid (week × day), nb leçons/jour, palette emerald, vue classe + individuelle — teacher-facing
  - THI-78: `<TeacherAdoptionHeatmap />` — adoption plateforme par enseignant, métriques d'engagement institution — super_admin/institution_admin-facing
- [ ] **Classroom View** — per-institution stats, teacher notes, student progress
- [ ] Weekly security report (Edge Function → email)

## Phase 10 — Automated Content Updates 🔮
- [ ] Command catalogue versioned in Supabase DB
- [ ] Content scheduler: unlock new commands/lessons every 2 weeks (Edge Function + cron)
- [ ] In-app notification when new content available
- [ ] Source: exhaustive command lists (Linux `man -k`, macOS man pages, PowerShell Get-Command, tldr, SS64)
- [ ] Admin can manually adjust release schedule

## Phase 11 — Changelog & Community 🔄 Partial (THI-84 — 13 avril 2026)
- [x] Public changelog page `/changelog` — structured release notes with metrics (PR #101–102)
- [x] Project story page `/story` — living narrative journal, human+AI collaboration (PR #101–102)
- [x] Trust badges on landing — A+ Security Rating, 876 tests CI green (PR #100)
- [ ] Hall of Fame (opt-in contributors list)
- [ ] GitHub Sponsors + Ko-fi (pending RIZIV/INAMI authorization)
- [ ] School/university partnership program

## Phase 11b — Career Branches + Open Credentials 🔮
> Full professional track system + verifiable credentials for employers and institutions.

**6 Career Branches:**
| Branch | Level | Target Audience |
|--------|-------|----------------|
| 🖥️ Full-Stack Developer | A1→C1 | Web/app students |
| 🔧 System Administrator | A1→C2 | Infrastructure students |
| ⚙️ DevOps / Cloud Engineer | B1→C2 | DevOps juniors |
| 🔒 Security Analyst | B1→C2 | Cybersecurity students |
| 📊 Data Engineer | B1→C1 | Data pipeline specialists |
| 🤖 AI-Assisted Developer | B2→C1 | AI-tooling proficiency |

Each branch = set of tracks + branch certificate + student portfolio (IDE projects) + EQF-aligned export.

- [ ] **Open Badges 3.0** full export (IMS Global standard) — schema already ready from Phase 7
- [ ] **Student portfolio**: exported scripts + terminal transcripts + IDE projects
- [ ] **EQF institutional export**: PDF certificate readable by Belgian/EU school records
- [ ] **LinkedIn integration**: one-click badge publish to LinkedIn profile
- [ ] Branch selector in onboarding flow

## Multi-Agent Architecture (implementation governance)
> Required to manage complexity without drift. Each domain has a dedicated agent with strict scope.

| Agent | Scope | Hard constraints |
|-------|-------|-----------------|
| Curriculum Agent | curriculum.ts, tracks.ts, exercises | No UI changes |
| Frontend Agent | UI components, pages, design tokens | Mobile-first mandatory |
| IDE Agent | CodeMirror, WASM sandbox | Client-side only, no server execution |
| Mobile UX Agent | Layout, touch, virtual keyboard | Playwright mobile on every PR |
| Backend Agent | Supabase schema, RLS, Edge Functions | RLS on all tables |
| Security Agent | OWASP audit, sandbox, RLS review | Gate before auth/data PRs |
| Analytics Agent | Predictive model, metrics, exports | Aggregated data only, GDPR |
| QA Agent | Vitest + Playwright (desktop + mobile) | 80%+ critical coverage |

## Non-Goals
- No hosted videos, no advertising, no paywall on core content
- No desktop app (web-first, mobile-compatible)
- No offensive security tools or CTF-style hacking challenges
- No server-side execution of student code (all sandboxed client-side)
