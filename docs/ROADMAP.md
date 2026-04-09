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

## Phase 6 — Terminal Multi-Session 🔮
- [ ] Tab system: multiple independent terminal sessions
- [ ] Each session has its own isolated TerminalState
- [ ] Mobile: max 3 sessions, full-screen with compact tab switcher
- [ ] Desktop: optional split-pane view

## Phase 7 — Changelog & Community 🔮
- [ ] Visible weekly/monthly changelog on the app
- [ ] Hall of Fame (opt-in contributors list)
- [ ] GitHub Sponsors + Ko-fi (pending RIZIV/INAMI authorization)

## Phase 8 — Admin Panel 🔮
- [ ] /admin route — protected (RBAC + 2FA TOTP)
- [ ] Analytics dashboard, health monitor
- [ ] School/university partnership tooling

## Non-Goals
- No hosted videos, no advertising, no paywall on core content
- No desktop app (web-first, mobile-compatible)
