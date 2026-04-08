# Roadmap — Terminal Learning

> Last updated: 8 April 2026

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

## Phase 5 — Curriculum Expansion 🔜
Full-stack developer path — 11 modules total:

### Existing modules (6) — minor enrichment
- [ ] Navigation: add `find`, `tree`
- [ ] Files: add `ln` (symlinks)
- [ ] Read & Search: add `sed`, `sort`, `uniq`
- [ ] Permissions: add `chown`, user/group management
- [ ] Processes: add `bg/fg`, `&`, `top`

### New modules (5)
- [ ] **Module 7 — Variables & Scripts**: `export`, `$PATH`, `.env`, `.bashrc`, bash scripts, `cron`
- [ ] **Module 8 — Network & SSH**: `ping`, `curl`, `wget`, SSH keys, `scp`, DNS basics
- [ ] **Module 9 — Git Fundamentals**: `init`, `add`, `commit`, `log`, `diff`, `.gitignore`, branches
- [ ] **Module 10 — GitHub & Collaboration**: remotes, PRs, Issues, forks, conflict resolution, GitHub Actions, Linear workflow
- [ ] **Module 11 — AI as a Dev Tool**: contextual prompts, validating AI output, known limits, Claude Code CLI

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
