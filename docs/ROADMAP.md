# Roadmap — Terminal Learning

> Last updated: 2 April 2026

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
- [x] Sentry error tracking (frontend)

## Phase 3 — User Accounts 🔜
- [x] Supabase project provisioned (jdnukbpkjyyyjpuwgxhv, eu-west-1)
- [x] DB schema + RLS (profiles + progress tables)
- [x] AuthContext + LoginModal (email + GitHub OAuth + Google OAuth)
- [x] Progress sync: localStorage + Supabase hybrid (never downgrades)
- [ ] Configure OAuth providers in Supabase dashboard
- [ ] Set env vars in Vercel (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)

## Phase 4 — Admin Panel 🔮
- [ ] /admin route — protected (RBAC + 2FA TOTP)
- [ ] Analytics dashboard, health monitor, security center
- [ ] Hall of Fame (opt-in supporter list)

## Non-Goals
- No hosted videos, no advertising, no paywall on core content
