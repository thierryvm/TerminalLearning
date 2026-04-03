# Roadmap — Terminal Learning

> Last updated: 3 April 2026

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
- [x] Supabase project provisioned (jdnukbpkjyyyjpuwgxhv, eu-west-1)
- [x] DB schema + RLS (profiles + progress tables, policies optimisées)
- [x] AuthContext + LoginModal (email/password live, OAuth code ready)
- [x] Progress sync: localStorage + Supabase hybrid (never downgrades)
- [x] Env vars Vercel configurées (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SENTRY_DSN)
- [x] Security hardening: HSTS, CSP renforcé, dépendances auditées
- [ ] OAuth GitHub + Google — à activer dans Supabase dashboard quand prêt

## Phase 3.5 — Landing upgrade (en cours, PR #18)
- [x] Terminal animé dans le hero (Version B — above the fold)
- [x] Section support split 2 colonnes (Ko-fi + GitHub Sponsors coming-soon)
- [x] Fix déconnexion UserMenu
- [x] 66 tests unitaires (auth, landing, terminal, progress, sync)

## Phase 4 — Admin Panel 🔮
- [ ] /admin route — protected (RBAC + 2FA TOTP)
- [ ] Analytics dashboard, health monitor, security center
- [ ] Hall of Fame (opt-in supporter list)

## Non-Goals
- No hosted videos, no advertising, no paywall on core content
