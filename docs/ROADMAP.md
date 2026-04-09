# Roadmap — Terminal Learning

> Last updated: 9 April 2026

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

## Phase 5 — Curriculum Expansion 🔄 In progress
Full-stack developer path — 11 modules total (7 active, 4 planned):

### Existing modules (6) — enriched ✅ PR #37
- [x] Permissions: `chown`, `chgrp`, `sudo`, security / principle of least privilege
- [x] Processes: `top`/`htop`, `bg`/`fg`/`jobs`, background job management
- [x] Redirection: `stderr` (`2>`, `2>&1`), `/dev/null`, `tee`/`Tee-Object`
- [x] CommandReference: fully env-aware (Linux/macOS/Windows filters, per-env syntax + examples)
- [x] LessonPage: env-aware content blocks (`contentByEnv`, `labelByEnv`), `PS>` prompt rendering
- [x] 32 lessons total (up from 19)

### Module 7 — Variables & Scripts ✅ PR #36
- [x] Environment variables: `export`, `$PATH`, `$env:VAR`, variable interpolation
- [x] PATH variable: read, extend, persist across sessions
- [x] Shell config: `.bashrc`, `.zshrc`, `$PROFILE` (PowerShell)
- [x] `.env` files: dotenv format, `source`/`.` command, security practices
- [x] Bash scripts: shebang, `chmod +x`, executing scripts
- [x] Cron & task scheduling: `crontab -e`, `crontab -l`, Windows Task Scheduler
- [x] 238 unit tests total

### Module 8 — Network & SSH 🔜 THI-27
- [ ] `ping`, `traceroute`/`tracert`, `nslookup`, `dig`
- [ ] `curl` (HTTP requests, headers, REST APIs), `wget`
- [ ] SSH: key generation (`ssh-keygen`), `ssh`, `scp`, `rsync`
- [ ] Firewall basics: `ufw`, `iptables`, Windows Defender Firewall
- [ ] Per-environment: `ip`/`ifconfig`/`ipconfig`, `netstat`/`ss`

### Module 9 — Git Fundamentals 🔜 THI-28
- [ ] `init`, `add`, `commit`, `log`, `diff`, `status`
- [ ] `.gitignore`, branches (`branch`, `checkout`, `merge`)
- [ ] Conflict resolution, stash

### Module 10 — GitHub & Collaboration 🔜 THI-29
- [ ] Remotes, push/pull, PRs, Issues, forks
- [ ] GitHub Actions CI basics
- [ ] Linear workflow integration

### Module 11 — AI as a Dev Tool 🔮
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

## Phase 5b — Exercise Quality Uplift 🔮
- [ ] 3–5 exercises per lesson (currently 1)
- [ ] New exercise types: `fill-flag`, `objective-result`, `error-fix`, `pipeline`, `scenario`
- [ ] Progressive hint system: after 2 attempts → partial hint, after 4 → suggested command
- [ ] Spaced repetition: commands from lesson N reused in N+1 and N+2
- [ ] Alternatives validation: accept equivalent commands (`rm` / `Remove-Item` / `del`)

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

## Phase 6 — Terminal Multi-Session 🔮
- [ ] Tab system: multiple independent terminal sessions
- [ ] Each session has its own isolated TerminalState
- [ ] Mobile: max 3 sessions, full-screen with compact tab switcher
- [ ] Desktop: optional split-pane view

## Phase 7 — Member Space 🔮
- [ ] `/app/profile` — progress stats, badges, preferences, preferred env
- [ ] Role system: `student` / `teacher` / `admin` + sector: school / university / self-taught
- [ ] Progress heatmap (GitHub-style calendar)
- [ ] Skill radar chart (per module)
- [ ] Badge system (first-command, module-complete, streak, speed-runner, no-hints)
- [ ] Classroom view for teachers: student list + progress
- [ ] Teacher notes per student (private)
- [ ] DB: extend `profiles` (role, sector), `progress` (time_spent, attempts, hints_used), add `badges`, `teacher_notes`

## Phase 8 — Ticket System 🔮
- [ ] Floating feedback button (accessible from all `/app/*` pages)
- [ ] Types: bug / suggestion / improvement / content_request
- [ ] Auto-captured context: selected env, current module/lesson, last command
- [ ] Status workflow: open → in_review → resolved / closed / wont_fix
- [ ] Users can track their own tickets at `/app/my-tickets`
- [ ] DB: `tickets` table with priority, assignment, context (jsonb)

## Phase 9 — Admin Panel 🔮
> After meaningful traffic signal. Inspired by Grafana, Sentry, Linear.

- [ ] `/admin` route — 8-layer security (RBAC + 2FA TOTP + audit log + CSP nonce)
- [ ] Real-time health dashboard (uptime, API latency, error rate, CI status)
- [ ] Analytics: DAU/MAU, completion funnels, command heatmap, env distribution
- [ ] Security Center: failed logins, rate-limit hits, terminal anomalies, audit log
- [ ] Content Manager: module activation, lesson editor, command catalogue CRUD
- [ ] User Manager: roles, suspension, teacher-student assignment
- [ ] Ticket Board: Kanban (open → in_review → resolved)
- [ ] Health Monitor: Supabase quotas, Vercel bandwidth, Sentry issues, npm audit
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

## Non-Goals
- No hosted videos, no advertising, no paywall on core content
- No desktop app (web-first, mobile-compatible)
- No offensive security tools or CTF-style hacking challenges
