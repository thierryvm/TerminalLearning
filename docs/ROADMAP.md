# Roadmap — Terminal Learning

> Last updated: 12 April 2026 — Phase 5 modules 8/9/10 done, 10 modules / 52 lessons / 579 tests — perf: main bundle 16kB (was 140kB), FCP 0.6s — auth deadlock fix live

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

## Phase 5 — Curriculum Expansion 🔄 In progress
Full-stack developer path — 10 modules ✅ (52 lessons, 579 unit tests) + Module 11 in progress

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

### Module 11 — L'IA comme outil dev 🔄 THI-29 (next)
- [ ] Contextual prompting, validating AI output
- [ ] Claude Code CLI, known limits and risks
- [ ] AI-assisted debugging and code review

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
| 17 | AI as a Dev Tool | 3 |

## Phase 5.5 — Terminal Sentinel 🔮 THI-36
> Automated security audit tool — professional security showcase for schools and universities.

- [ ] **Component A — GitHub Actions weekly** (`.github/workflows/security-sentinel.yml`)
  - npm audit, gitleaks (secret scanning), HTTP headers (CSP/HSTS/X-Frame), cookie flags
  - Output: JSON report → `security_reports` Supabase table + email summary
- [ ] **Component B — Playwright local script** (`scripts/security-audit.cjs`)
  - Generic auth error messages, rate limiting active, `/admin` routes return 401 without RBAC, no stack traces in prod
  - Output: JSON report + readable terminal summary with health score
- Scope: **audits defenses only** — no active attack simulation on production
- Results feed into Admin Panel Security Center (Phase 9)
- DB: `security_reports` table — see canonical schema in Phase 7

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

## Phase 7 — Member Space + Full RBAC + Pedagogical Platform 🔮 THI-37
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

- [ ] **New tables:**
  - `institutions (id, name, domain_whitelist[], admin_id)`
  - `classes (id, teacher_id, institution_id, name)`
  - `class_enrollments (class_id, student_id)` — composite PK
  - `tracks (id, title, module_ids[], cefr_target, description)`
  - `badges (id, user_id, badge_type, earned_at, evidence_url, ob3_metadata jsonb)` — OB3-compatible
  - `teacher_notes (id, teacher_id, student_id, note, created_at)`
  - `audit_log (id, actor_id, action, target_id, metadata jsonb, ip_address, created_at)` — insert-only
- [ ] **Extended tables:**
  - `profiles` + `role`, `institution_id`, `display_name`, `preferred_env`, `active_track_id`
  - `progress` + `time_spent_seconds`, `attempts_count`, `hints_used` *(score column already exists)*
- [ ] RLS on all new tables — principle of least privilege
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
- [ ] **Classroom View** — per-institution stats, teacher notes, student progress
- [ ] Weekly security report (Edge Function → email)

## Phase 10 — Automated Content Updates 🔮
- [ ] Command catalogue versioned in Supabase DB
- [ ] Content scheduler: unlock new commands/lessons every 2 weeks (Edge Function + cron)
- [ ] In-app notification when new content available
- [ ] Source: exhaustive command lists (Linux `man -k`, macOS man pages, PowerShell Get-Command, tldr, SS64)
- [ ] Admin can manually adjust release schedule

## Phase 11 — Changelog & Community 🔮
- [ ] Visible weekly/monthly changelog on the app
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
