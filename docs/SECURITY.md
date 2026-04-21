# Security — Audit Report & Incident Log

> **Last Updated:** 2026-04-21  
> **Audited By:** `security-auditor` agent (OWASP Top 10 2021 + API Security Top 10 2023)

---

## Current Score: 7.8/10

### Critical Issues (Blocking)
1. **[C1] Git History Credential Exposure**
   - **Commits:** 051b25a (feat: RBAC test kit), 5ff9377 (fix: migration 006)
   - **Exposed:** Test user password `TerminalLearning2026!`
   - **Status:** ✅ Credentials rotated via Supabase Admin API (5 test users)
   - **Residual Risk:** Git history is permanent; attacker with repo access can retrieve exposed credentials from old commits. Mitigation: repository is public but GitHub Secrets validation prevents credential use. Consider `git filter-repo` if additional exposure occurs.
   - **Action:** Monitor for unauthorized login attempts on rotated test accounts. Document in INCIDENT-006.md.

---

### High Issues (Phase 9 Gates)
1. **[H1] RLS Policy Drift**
   - **Root Cause:** Migrations 010 and 011 both modify `institutions` SELECT policy
   - **Migration 010:** `authenticated to select any institution`
   - **Migration 011:** `role-based filtering (super_admin sees all, others see own)`
   - **Issue:** If both policies coexist, 010 takes precedence (permissive), defeating 011's security
   - **Resolution:** Query `pg_policies` on production to confirm current state; create migration 012 if both policies present
   - **Phase:** Phase 9 (multi-tenancy hardening)

2. **[H2-H6]** Other high-severity findings documented in security-auditor raw report

---

### Medium Issues (Phase 9 Backlog)
- Key manager default encryption mode (use encrypted by default for THI-112)
- CSP `connect-src` coverage for Sentry tunnel rate limiting
- Session token storage validation
- SSRF prevention on Sentry tunnel (already mitigated in THI-120)

---

## Incident-006: Password Exposure in RBAC Test Kit

**Date:** 2026-04-21  
**Discovered By:** security-auditor agent  
**Impact:** Test users only (no production data)  
**Response:**
1. ✅ Rotated 5 test user passwords via Supabase Admin API
2. ✅ Pre-commit hook strengthened (word boundary regex for password/secret patterns)
3. 🔜 Git filter-repo (low priority — repo is public, exposure was test credentials)

---

## Roadmap

| Phase | Item | Owner | Status |
|-------|------|-------|--------|
| Phase 9 | [H1] Verify RLS policy state + create migration 012 if needed | Backend | 🔜 |
| Phase 9 | [H1] Branch protection + code owner review (Vector 1) | Infra | 🔜 |
| Phase 9 | [H1] Signed commits enforcement (Vector 2) | Infra | 🔜 |
| THI-112 | [H2] Key manager encryption default (BYOK AiKeySetup) | AI | 🔜 |
| THI-120 | [H5] Rate limiting test + Vercel KV migration | Infra | ✅ Phase 7b |

---

**See also:**
- `.claude/agents/agent-resilience.md` — 6-vector LLM attack resilience guide
- `.husky/pre-commit` — credential detection patterns (word boundary enforcement)
