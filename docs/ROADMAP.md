# Roadmap — Terminal Learning

> **Last updated:** 6 June 2026 CEST — 🔍 **Full pre-pause audit (subscription → 10 June, maintenance freeze)**: 5 parallel angles + Chrome e2e. `security-auditor` **9.4/10, 0 CRITICAL** (all 8 PRs from 4 June confirmed safe); `route-attack` 7.5/10 — the "H1 SSRF" finding is a **verified false positive** (the upstream `fetch()` URL is hardcoded; the client-supplied DSN never reaches it) → **`api/*` left untouched** (changing already-safe code right before a freeze adds risk for zero gain); `content-auditor` (2 **non-blocking** engine UX defects: `./script.sh` and `2>` not simulated — validation runs on the typed string, the lesson still completes); `mobile-responsive` (**THI-342**); prod Sentry **clean**; core e2e OK (terminal executes). **PR #375 THI-342**: textarea 16px on mobile (kills the iOS auto-zoom that caused the overflow) + 44px UserMenu tap-target (ui-auditor + code-reviewer + CI green + preview smoke 5/5). **Deferred to post-reactivation**: THI-345 (irreversible GDPR Art.17 account deletion) + THI-347 CRUD parts. Vercel posture: stored `.secrets` token **invalid** (leak-safe) → manual dashboard action (orphan tokens). — **Previous update (4 June 2026 CEST)** — 🗂️ **8-PR day (#368→#374)**: THI-234 admin analytics widgets (migration 032, role-gated `SECURITY DEFINER` RPCs) + THI-341 trimmed sidebar + GitHub-style avatar menu (CSP-safe) + THI-344 editable display_name + THI-346 dropdown scroll fix + THI-347 part 3 delete tickets (migration 033 = **THI-334 root-cause fix**). THI-234/339/341/344/346/334 Done; THI-347 umbrella In Progress (parts 1/2/4 remain). — **Previous update (2 June 2026 CEST)** — 🗂️ **Sprint 2.C step 4 shipped — super_admin ticket triage (THI-320, PR #364)**: "Signalements" section in `/app/admin` (list + status filter + description + screenshot re-signed at read + status change logged to `admin_audit_log`). **Support system complete** (form → encrypted storage → maintainer email → triage). Status dropdown: Radix Select **rejected** (injects inline styles → would break the strict `style-src` CSP, THI-120 hardening) in favour of a native `<select>` with `[color-scheme:dark]` — CSP fully intact, 0 dependency. Gates: security-auditor 9.5/10 · supabase-backend (inline) · ui-auditor SHIP · mobile-responsive · code-reviewer · **Voie A e2e super_admin "both directions"** (submit-with-screenshot → triage → status round-trip → audit confirmed → image loaded with no CSP violation, desktop + mobile). Next: user visibility on their own tickets (THI-325). — **Previous update (1 June 2026 CEST)** — 📧 **Sprint 2.C step 3 shipped — super_admin email notification on support ticket (THI-319, PR #360)**: implemented as a **Vercel Edge route** (`api/support/notify.ts`, not a Supabase Edge Function — code-verify showed the Resend key already lives in Vercel env + `api/*` already hosts serverless routes → 0 new platform/dependency/secret). **Authorization delegated to RLS** (user JWT forwarded to PostgREST; row returned only if owner/super_admin, no `service_role`). Anti-replay freshness 60s + rate-limit 10/min/IP + HTML-escaped description + `Cache-Control: no-store` + best-effort (failed email ≠ lost ticket). **3 gates 0C/0H** (security-auditor 9.2/10 · route-attack-auditor ship · code-reviewer clean) + **real email received** (Gmail MCP verified) + prod smoke 200. Resend free tier (3000/mo). **THI-319 Done — Sprint 2.C: step 4 remaining** (AdminPanel tickets section, THI-320). Also 1 June (reliability + coherence): reliable signOut + async-import hardening + mobile lesson nav (THI-310/315/313, PRs #353-355), catalogue validator coherence closing THI-293 (THI-316, PR #357), Sentry crawler/bot filter (THI-317, PR #358). — **Previous update (30 May 2026 ~14h CEST)** — 🚀 **Sprint 2.C step 2 shipped (PR #326)**: in-app support reporting. Migration 030 private `support_screenshots` bucket + 5 `storage.objects` RLS policies (user own folder via `foldername[1]=auth.uid()` / super_admin all GDPR Art.17). `submitTicket.ts` (upload → 7d signed URL conforming to the 029 M1 DB constraint → insert + best-effort orphan cleanup). `SupportTicketModal` (focus-trap + Escape, 3-field form, PII disclaimer, Sidebar "Aide & feedback" trigger gated by `user`). **3 gate-zero audits ALL GREEN**: `supabase-backend-auditor` SHIP (**11 adversarial live-prod tests** — path traversal/MIME spoof/oversize/cross-user signed URL all blocked, 0C/0H) + `ui-auditor` clean + `security-auditor` **9.3/10**. **code-review** 0 critical (2 fixes: double-label a11y + DRY). Context7-verified Storage API current. Tests **1765 → 1780 PASS** (8 component + **7 empirical PROD RLS bucket** REST+JWT incl. T7 cross-user signed URL non-regression). Step 3/4 follow-ups tracked (non-blocking): server-side magic-bytes validation + upload/insert rate limiting (API4, 2.D backlog) + CSP `img-src` supabase.co at step 4 (screenshot render). **CHANGELOG catch-up #319-325** (29/05 drift flagged at shutdown). **Sprint 2.C: 2 steps remaining** (Resend Edge Function → AdminPanel tickets section). — **Previous update (28 May 2026 ~late CEST)** — 🚀 **Post-reset session: 3 PRs shipped (#314 → #316) + Opus 4.8 switch**. **PR #314** B2B platform vision Option D Hybrid (549-line strategy doc, Voie C) + **13 Linear tickets** (THI-282 Phase X umbrella + 8 sub X1→X6 + THI-291/292/293/294 backlog). **PR #315 Sprint 2.C step 1** = `support_tickets` table + scoped RLS + audit trigger (migration 028 base + 029 hardening, security-auditor Opus 8.8→9.4/10: H1 trigger guard + H2 WITH CHECK + M1 screenshot_url Storage-only XSS defense + M2 super_admin DELETE GDPR Art.17 + M3 status/resolved coherence). **15/15 empirical PROD vitest** (RLS REST+JWT). Full regression **1744/1764 PASS**. **PR #316 meta-audit 20 agents post-4.8**: new `supabase-backend-auditor` (Opus, gate-zero Edge Function Deno + Storage RLS + file upload, BEFORE step 3 Resend + X3b import), `linear-sync` rewritten (admits MCP failure instead of guessing), README model sync, anti-downgrade pin 4.7→4.8. **Hard rule @thierry: NEVER Haiku** (0 Haiku / 12 Sonnet / 8 Opus). **MCP Supabase fixed** (wrong gmail/Ankora account → reconnected TL, Ankora SQL near-miss auto-rollback 0 damage). **Sprint 2.C: 3 steps remaining** (SupportTicketModal UI + support_screenshots bucket → Resend Edge Function → AdminPanel tickets section). — **Previous update (27 May 2026 ~16h CEST)** — 🔧 **Marathon 27 May session : 6 PRs shipped (#305 → #310)** : Sprint 2.B reliquats hotfix super_admin RPC + Sprint 2.B.2 UX scope badge + Sprint 2.B.3 sidebar "Mes outils" collapsible THI-240 + UserMenu hover fix + agent doctrine aligned (0 Haiku / 12 Sonnet / 7 Opus). **ui-auditor Haiku → Sonnet upgrade** (1st post-upgrade invocation immediately found 1 CRITICAL raw button outside shadcn pattern — fixed in-PR). **Doctrine 3 Sonnet → Opus upgrades** for gate-zero B2B/AI critical (security-auditor + prompt-guardrail-auditor + institution-rbac-auditor). ROI : ~+$10-25/month Opus invocations vs $1000+ B2B school incident avoided. **Sprint 2.B fully closed** with E2E PROD validation @thierry confirmed. **2 PRs shipped morning (#305 + #306). PR [#305](https://github.com/thierryvm/TerminalLearning/pull/305) = migration 027 hotfix super_admin can now approve cross-institution (RPC body check extended to `caller_role IN (institution_admin, super_admin)` + audit log enriched with `metadata.scope = 'global'|'institution'`). Audits 🟢 SHIP : security 9.4/10 + RBAC 0 CRITICAL/0 HIGH (16/16 static + 8/8 empirical REST API + JWT). 11/11 vitest PASS PROD. PR [#306](https://github.com/thierryvm/TerminalLearning/pull/306) = Sprint 2.B.2 UX feedback : permanent `🌐 scope: global` badge in header + emerald success status "{name} approved · scope {scope}" post-approve with 8s auto-clear + dismiss X (44×44 HIG fix ui-auditor 🔴→🟢 in-PR). 17/17 panel tests PASS (5 new). **E2E PROD validation @thierry confirmed 12h30** : connected as real super_admin → badge visible + click "Approuver" → green toast {name} + scope + 8s auto-disappear + optimistic UI row removed ✅. **Console logs investigation** : 11 Chrome DevTools errors detected and triaged — ALL from Brave Kwift Wallet extension (`chrome-extension://fdjamakpfbbddfjaooikfcpapjohcfmg`), 0 Terminal Learning errors. Our code = clean. **Doctrine `feedback_agent_dormant_full_audit` validated 3× this week** : 2 agent break-ins 26/05 (1 HIGH drift + 2 MED latents found) + E2E human validation @thierry 27/05 (1 UX bug structural audits had not flagged — human validation irreplaceable for end-user behavior). Tests 1724 → 1729 PASS (+5). **Sprint 2.B TOTALLY closed** with human E2E PROD validation. Sprint 2.C (Support System Resend) remains next session on explicit @thierry signal. — **Previous update (26 May 2026 ~18h CEST)** — 🏁 **Sprint 2.B CLOSED — institution_admin lite shipped 100%**: 3 PRs merged same session (#297 → #299), empirical E2E PROD validation via Chrome MCP. Migration 022b (3 École B test personas + institution) + 023 (`profiles UPDATE WITH CHECK institution_id`, [H1] hijacking fix) + 024 (GoTrue NULL global fix) + retroactive apply 011/012 (4+ week drift cross-institution leak on `institutions` table). PR [#298](https://github.com/thierryvm/TerminalLearning/pull/298) = migration 025 `approve_teacher(target_user_id uuid)` SECURITY DEFINER (caller institution_admin + same-institution + `SELECT ... FOR UPDATE` row lock + compare-and-swap `UPDATE` race-safe Sourcery, REVOKE EXECUTE FROM `public` + `anon` GRANT `authenticated` only) + migration 026 trigger AFTER UPDATE `audit_pending_teacher_promotion` defense in depth (transactional flag `app.in_approve_teacher_rpc` avoids double insertion when promotion goes through RPC) + 8 vitest empirical PROD tests. PR [#299](https://github.com/thierryvm/TerminalLearning/pull/299) = `InstitutionAdminPanel.tsx` route `/app/institution` gated `<RequireRole allowed={['institution_admin', 'super_admin']}>` + `usePendingTeachers` hook (fetch RLS auto-scoped + approve RPC + FR error mapping) + Sidebar "Mon institution" entry + 12 RBAC × behavior tests. **Audits cascade**: `security-auditor` **9.5/10 🟢 SHIP** 0 CRITICAL / 0 HIGH + `institution-rbac-auditor` ⚠ SHIP WITH NOTES (F-001 HIGH direct PATCH audit bypass + F-002 LOW anon EXECUTE + M1 leak interpolation) **all 3 findings fixed in-PR** + `ui-auditor` 🟡 SHIP WITH FIX (M1 aria-live scope + L3 touch target 44px fixed in-PR). **E2E PROD validation Chrome MCP via ephemeral 1h JWT injection institutionadmin_b**: (1) anonymous → "Vous devez être connecté" fallback ✅ (2) institutionadmin_b login → sidebar entry visible + panel render + count "(1)" only École B pending teacher (cross-institution RLS isolation empirically validated) ✅ (3) click "Approuver" → RPC success + optimistic UI row removed + count "(0)" + empty state ✅ (4) DB-side: profile role=teacher + 1 admin_audit_log row `action='approve_teacher'` complete metadata, **NO `direct_patch` row** (transactional flag works in real runtime) ✅ (5) 0 console errors. **Sentry secrets rotation**: 7 `SENTRY_*` integration-managed vars rotated 17:37:58 via Vercel↔Sentry native integration + production redeploy READY. `VITE_SENTRY_DSN` (client bundle) unchanged (Sentry doesn't rotate public DSNs). Badges "Needs Attention" cleared. **Cross-institution isolation score**: 7.5 → **9.5/10**. **Sprint 2.B shipped in 1 session ~5h, 0 regression, 0 incident, delegated autonomy honored, anti-leak discipline maintained** (1h-ephemeral JWT, .secrets/ + .tmp/ gitignored, passwords never in stdout, tool args = conversation context). **Doctrine validated** `feedback_agent_dormant_full_audit`: `institution-rbac-auditor` agent created 20 May, never empirically invoked until 26 May (6 days dormant) → first break-in found HIGH finding (4+ week production drift invisible). **Tests 1721/1741 PASS** (+12 vs Sprint 2.A close + 20 CI-only skipped). Three new CC memories consolidated: `feedback_anti_leak_discipline_jwt_short_lived.md` (patterns @thierry congratulated 26/05), `reference_supabase_plan_free.md` (auth_leaked_password_protection gated Pro plan), `feedback_agent_dormant_full_audit.md` (48h break-in mandatory doctrine). **Sprint 2.B = B2B schools cross-institution foundation layer ready for Sprint 2.C** (to scope next session). — **Previous update (24 May 2026 ~20h CEST)** — 🧠 **AI Tutor per-role shipped (Stage B1 + Stage B2)**: 7 PRs merged same day (#287 → #293). Stage B1 (PR #290, THI-260) = eval matrix frontier 2025-2026 on 10 models × 14 fixtures, $0.62 USD spent, two models 8/8 PASS (GPT-5.5 440 ms top latency + Opus 4.7 premium reasoning). Stage B2 (PR #291, THI-275) = three FR system prompts isolated per role (teacher / institution_admin / super_admin) + `getSystemPrompt({lang, mode, role})` dispatcher + student fallback defense-in-depth + 17 dispatcher tests + 4 `<role_context>` injection fixtures × 4 locales. `prompt-guardrail-auditor` Sonnet found 2 CRITICAL (ghost `<role_context>` block + DELIMITER_RX gap) **fixed before merge**. Cross-role server-side validation: 5/5 RBAC personas via REST API + `get_my_role` RPC. Two new agents shipped: `legal-compliance-auditor` (Opus 4.7, 5-layer GDPR/AI Act/DSA/CNIL/DPA-BE auto-update WebSearch, THI-270 PR #288) + `user-forensics-auditor` (Sonnet, 6-section GDPR-compliant, THI-274 PR #293, motivated by first organic user Jimmy Pez). `llm-security-auditor` Opus 7-layer on Stage B1 = 9.2/10 ⚠️ SHIP with mitigations all applied (H2-AI VERIFIED default OpenRouter Llama → Sonnet 4.6 fixed). H3-AI minor user consent (GDPR Art. 8) → Sprint 2.B gate-zero `institution-rbac-auditor`. Tests 1697 PASS (+57 vs pre-session). Sprint 2.B next: `institution_admin` lite + InstitutionAdminPanel skeleton + approve_teacher RPC + `institution-rbac-auditor` gate (THI-238 ready). — **Previous update (20 May 2026)** — 🏁 **Sprint 2.A 100% shipped** (5 PRs in 3 days). Step 3 = page `/app/join` consuming `join_class_by_code` RPC, PR [#274](https://github.com/thierryvm/TerminalLearning/pull/274) merged today. Empirical happy path validated via Supabase MCP (student 105 impersonation → RPC success, no bug 42702/42883, cleanup clean). Cascade ALL GREEN : `ui-auditor` SHIP-READY · `security-auditor` 9.2/10 (H1 fonctionnel `?code=` perdu après login + M1 maxLength fixés en PR) · Voie A Chrome MCP empirical `?code=` preservation confirmed · Sourcery skipping rate-limit. New agent `classroom-workflow-auditor.md` created (THI-237 Done) for gate-zero on future class workflow PRs. Test suite 1604 → 1640 (+36). 2 backlog tickets created : THI-258 rate limit Edge Middleware (Medium) + THI-259 isMounted ref pattern standardization (Low). Sprint 2.B next: pending_teacher dashboard + institution_admin lite + VIEW classes_student_view (THI-236).
>
> **Previous update (19 May 2026)** : 🚀 Sprint 2.A Teacher workflow 75% shipped (steps 1+2+2.bis+2.ter live in main). Five PRs merged today: [#267](https://github.com/thierryvm/TerminalLearning/pull/267) `.env.example` exhaustive + [#268](https://github.com/thierryvm/TerminalLearning/pull/268) Teacher Dashboard CRUD (route `/app/teacher`, RequireRole, list + create class + copy invitation URL, migrations 020 CHECK constraints + 021 `extensions.gen_random_bytes` fix CRITICAL) + [#269](https://github.com/thierryvm/TerminalLearning/pull/269) Role-aware nav hub + login redirect safe (cards "MES OUTILS" + Sidebar Administration super_admin + 7-layer open-redirect protection) + [#270](https://github.com/thierryvm/TerminalLearning/pull/270) Adaptive default route per role (super_admin → `/app/admin`, teacher → `/app/teacher`) + [#271](https://github.com/thierryvm/TerminalLearning/pull/271) docs CHANGELOG. Test suite **1545 → 1604** (+59). Cascade ALL GREEN: `security-auditor` 9.4-9.5/10 · `ui-auditor` SHIP-READY · `rbac-flow-tester` 11/11 E2E PASS · happy path RPC empirical via Supabase MCP (no bug 42702) · Voie A Chrome MCP anonymous fallback rendered · Sourcery PASS. Next: Sprint 2.A step 3 = `/app/join` page consuming `join_class_by_code` RPC.
>
> **Sprint 2.A backlog** : THI-237 `classroom-workflow-auditor` agent (gate before step 3) · THI-238 `institution-rbac-auditor` (Sprint 2.B) · THI-239 Vitest tests `joinClassByCode` regression net (gate before step 3) · THI-240 Sidebar refactor "Mes outils" collapsible · THI-241 PostgREST error sanitization · THI-242 institution_admin invitation_code ADR.
>
> **Previous update (17 May 2026)** : 🚨 THI-186 Critical security fix shipped in 3 rounds (progress data leak via `localStorage` not cleared at signout, dormant since Phase 3, 6 weeks undetected). PRs #241/#242/#243. Test suite 1405 → 1417 (+12). THI-187 backlog (reset progression UX). Full chronological history → [Recent Updates Archive](#recent-updates-archive) (bottom of file).
>
> **Current scores (19 May 2026)** : `security-auditor` 9.4-9.5/10 · `llm-security-auditor` 9.4/10 · `lti-auditor` 9.5/10 · `mobile-responsive-auditor` 8.1/10 · `sustain-auditor` 5.5/10 (RED — sas 48h doctrine RETIRED by @thierry 18 May).

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
- [x] a11y: `<main>` landmark, contrast fixes, manifest dynamic injection, aria-label terminal (PR #76)
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
>
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

Full-stack developer path — 11 modules ✅ (66 lessons, 1035 unit tests)

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
>
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
>
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
>
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
>
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
>
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
- [ ] School/university partnership program

## Phase 11b — Career Branches + Open Credentials 🔮
>
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
>
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

---

## Recent Updates Archive

> Chronological inverse list of project milestones. Full narrative in [CHANGELOG.md](../CHANGELOG.md).
> **Convention** : 1 paragraph = 1 dated update. Never stack into a single block.

- **17 May 2026** — 🚨 **THI-186 Critical security fix** shipped in 3 rounds (PRs [#241](https://github.com/thierryvm/TerminalLearning/pull/241) + [#242](https://github.com/thierryvm/TerminalLearning/pull/242) + [#243](https://github.com/thierryvm/TerminalLearning/pull/243)) : progress data leak between users via `localStorage` not cleared at signout, dormant since Phase 3 (6 weeks undetected). Prod Supabase data cleanup (Google contaminated rows DELETE, Hotmail preserved). 1405 → **1417 tests**. THI-187 backlog (UX reset progression). PR [#245](https://github.com/thierryvm/TerminalLearning/pull/245) codifies 17 May doctrine : Voie A/B/C visual validation, token bypass input/output, STOP graduation, sequential PR↔branch discipline.

- **16 May 2026 ~19h30 CEST** — Sprint 2 step 3/N — **THI-131 + THI-180** : PR [#236](https://github.com/thierryvm/TerminalLearning/pull/236) LTI 1.3 Phase 7c Auth MVP (jose@6 verifyJwt + nonce store + new `lti-auditor` agent MVP 10 checks) + PR [#237](https://github.com/thierryvm/TerminalLearning/pull/237) chirurgical REVOKE EXECUTE on 3 trigger-only SECURITY DEFINER (senior reverse course après vérification empirique). Score `security-auditor` 8.8/10 maintained, `llm-security-auditor` stable 9.4/10. Lighthouse prod Landing 100/100/100/100 (LCP 332ms, CLS 0.00, TTFB 23ms). 4 backlog tickets : THI-182, THI-183, THI-184, THI-185. Sprint 2 locked order : THI-118 ✅ → THI-153 ✅ → THI-131 ✅ → THI-42 (next) → THI-77/78.

- **16 May 2026 ~14h30 CEST** — Sprint 2 step 2/N — **THI-153** : PR [#234](https://github.com/thierryvm/TerminalLearning/pull/234) UI bundle cleanup (umbrella audit post-Sprint 1). 4 cherry-picked items : 3 red palettes consolidated into `--github-red`, UserMenu logout focus ring → emerald, shadcn dead slots documented, `sonner` uninstalled (-45 kB). Brand fix "Terminal Master" → "Terminal Learning" in `/app` mobile Layout header. 3 backlog tickets : THI-177, THI-178, THI-179.

- **16 May 2026 ~10h45 CEST** — Sprint 2 started (deadline 10 June, schools + admin panel) — **THI-118** : PR [#232](https://github.com/thierryvm/TerminalLearning/pull/232) landing LCP regression fix (Sentry weekly 3.87s → 9.31s poor zone resolved). Chrome DevTools MCP diagnosis : LCP element = hero `<p>` sub-heading TEXT, 98.9% render delay, leaks landingContent.ts + UserMenu/LoginModal/PWAInstallModal eager. Fix : hardcode counts + drift guard test + `React.lazy` modals. Landing chunk **27.29 → 7.33 kB gzip (−73%)**.

- **16 May 2026 ~10h CEST** — Sprint 1 Phase 7b lockdown CLOSED at 4/4 — **THI-113** : PR [#230](https://github.com/thierryvm/TerminalLearning/pull/230) triple final audit (3 agents in parallel) + H1 fix sentry-tunnel symmetric scrub (URL query + Authorization/X-API-Key/*token* headers aligned with client `beforeSend`, plus string-based fallback for relative URLs after Sourcery security review). Verdict ALL CLEAR : `security-auditor` 9.4/10, `prompt-guardrail-auditor` 9.3/10, `ui-auditor` SHIP-READY. Full report : [`docs/audits/ai-tutor-v1-2026-05-16.md`](audits/ai-tutor-v1-2026-05-16.md). AI score trajectory : 8.7 → 9.0 → 9.1 → 9.3 → **9.4/10**.

- **16 May 2026 ~01h CEST** — Sprint 1 step 3/4 — **THI-112** : PR [#228](https://github.com/thierryvm/TerminalLearning/pull/228) AiKeySetup standalone + AiConsentModal extraction + AiSettings page `/app/settings` + PrivacyPolicy `#ai-processing` section + M3-AI VERIFIED closed (consent storage `'true'` → JSON `{version, acceptedAt, expiresAt}` TTL 365d). `llm-security-auditor` re-baseline 9.3/10. Sourcery round 2 : provider meta module + `handleAccept` defense-in-depth + revocation copy.

- **10 May 2026 ~12h CEST** — Sprint 1 step 2/4 — **THI-144** : PR [#222](https://github.com/thierryvm/TerminalLearning/pull/222) system prompt v1.1.0 + ADR-008 + hybrid eval suite (a)+(b) + M4-AI LOW VERIFIED fix + R1 symmetric follow-up. `llm-security-auditor` re-baseline 9.1/10. 4 ChatGPT cross-validation frictions resolved (compound questions / over-explanation / repeated hints / satisfaction signal).

- **10 May 2026 ~03h CEST** — Session marathon closed : 11 PRs livrées #208 → #217. Agent `ai-pentester-pro` renamed to **`llm-security-auditor`** (PR [#212](https://github.com/thierryvm/TerminalLearning/pull/212), Evidence confidence framework VERIFIED/STRONG_INDICATOR/SPECULATIVE/RESEARCH_ONLY). 14ᵉ agent **`session-orchestrator`** créé. 1ʳᵉ baseline `llm-security-auditor` 8.7/10.

- **9 May 2026** — Audit global multi-agents post-Sprint 1 étape 1/4 + nouvel agent `llm-security-auditor` (7 couches séquentielles, Opus 4.7, portable cross-projet). 9 findings consolidés en THI-153 umbrella. Reminder Terminal Sentinelle V2 capturé.

- **~9 May 2026** — Sprint 1 Phase 7b lockdown started — **THI-148** PR [#208](https://github.com/thierryvm/TerminalLearning/pull/208) : tutor prompt bump v1.0.0 → v1.0.1 + nouveau bloc `<platform_context>` statique + defense-in-depth C1 fix (DELIMITER_RX étendu, escapeDelimiters exporté, module titles wrappés). Décision *finish what started* : Phase 7b lockdown complète AVANT pivot Phase 7c LTI (qui reste en SPIKE pur).

- **5 May 2026** — **Phase 7c THI-152 sprint mobile recovery COMPLETE** : 9 mini-PRs + 1 hotfix livrés sur 1 journée (#196 → #205). 3 bugs empiriques @thierry éradiqués (drawer overflow, header /app PWA, Landing nav PWA). FAB Sparkles size/opacity/position recalibrated. PWA apple-touch-icon PNG + standalone metas. Touch targets ≥44/≤40. Tap-highlight transparent universel. 12ᵉ agent `mobile-responsive-auditor` créé.

- **24 April 2026** — **Phase 7b AI Tutor V1 COMPLETE** : THI-111 cœur fonctionnel BYOK livré (PR #188 — sanitizer + 4 providers OpenRouter/Anthropic/OpenAI/Gemini + panel + 287 AI tests, audits guardrail 9.4/10 + security 8.8/10 + ui A11y exemplary). THI-147 fix safe-area iPhone PWA standalone livré (PR #189). Panel actif en Production avec env vars BYOK + Haiku 4.5 par défaut. 6 tickets V1.5 backlog créés.

- **1-2 May 2026** — **Sprint sécurité CLOSED** : audit `security-auditor` frais 8.1/10 → ~8.6/10 post-sprint, 11 PRs livrées #168 → #178, 5 issues Done (THI-133/134/135/137/140). Agent `route-attack-auditor` créé pour combler la zone HTTP-level (status fingerprinting, verb tampering, cache poisoning, slowloris, CORS).

- **Strategic milestones (Apr 2026)** — **Phase 7b Security Hardening** complete THI-120 (CLAUDE.md credential protection + CSP extension + Sentry scrubber double-layer). **Strategic vision** consolidée (ADRs 001-005 : LTI-first, OpenRouter BYOK 4-tiers, TTFR KPI, Classroom Composer, AI Tutor V1). **Epic THI-96 Web 2026 Compliance** 6/8 sub-issues shipped. **shadcn/ui migration ✅** (THI-91 umbrella). **INP fix THI-90** lab 515ms → 26ms (−95%). **Phase 4c Bundle Optimization ✅**.
