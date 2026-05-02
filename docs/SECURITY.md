# Security — Audit Report & Internal Roadmap

> **Internal working doc** — fresh audit findings (`security-auditor` agent), feature-flag inventory, and remediation tracking with Linear issue refs (THI-XXX).
> For the **public-facing security policy** (vulnerability disclosure process, supported versions, full threat model, public Incident Log including Incidents 006 + 007), see [`SECURITY.md`](../SECURITY.md) at the repo root.
>
> **Last Updated:** 2026-05-02
> **Audited By:** `security-auditor` agent (OWASP Top 10 2021 + API Security Top 10 2023)

---

## Current Score: 8.1/10

> Score updated 2026-05-01 after PR #168 (post-Haiku cleanup) and fresh `security-auditor` run.
> 0 CRITICAL · 3 HIGH · 6 MEDIUM · 7 LOW.

### Critical Issues (Blocking)
1. **[C1] Git History Credential Exposure**
   - **Commits:** 051b25a (feat: RBAC test kit), 5ff9377 (fix: migration 006)
   - **Exposed:** Test user password `TerminalLearning2026!`
   - **Status:** ✅ Credentials rotated via Supabase Admin API (5 test users)
   - **Residual Risk:** Git history is permanent; attacker with repo access can retrieve exposed credentials from old commits. Mitigation: repository is public but GitHub Secrets validation prevents credential use. Consider `git filter-repo` if additional exposure occurs.
   - **Action:** Monitor for unauthorized login attempts on rotated test accounts. Document in INCIDENT-006.md.

---

### High Issues — Active

1. **[H1] LTI launch endpoint accepts forged JWTs in prod** — ✅ Mitigated 2026-05-01 via `LTI_ENABLED` feature flag (THI-133, PR #169). Phase 7c will add the actual RS256 JWK validation and lift the gate.
2. **[H2] LTI launch endpoint has no rate limiting** — 🔄 Backlog (extract sliding window from `api/sentry-tunnel.ts` to shared `api/_lib/rateLimit.ts`, apply to both endpoints).
3. **[H3] Git history credential exposure** (`TerminalLearning2026!`) — 🔄 Accepted residual risk; `git filter-repo` requires force-push validation. Test users rotated via Supabase Admin API. See Incident-006 in [`/SECURITY.md`](../SECURITY.md).

### High Issues — Resolved

- **[H-RLS] RLS Policy Drift on `institutions` SELECT** — ✅ Resolved by migration 012 (drop permissive policy 010, keep restrictive 011). Verified on production.

---

### Medium Issues — Active (security-auditor 2026-05-01 findings)

Each finding has a dedicated Linear issue for tracking; click the issue ID to follow remediation status, attached PRs, and acceptance criteria.

| # | Finding | Tracking issue |
|---|---------|----------------|
| M1 | CSP `script-src` may need SHA-256 hashes for Vite inline scripts | [THI-136](https://linear.app/thierryvm/issue/THI-136) |
| M2 | `vercel.live` in CSP applies to prod (preview-only intended) | [THI-137](https://linear.app/thierryvm/issue/THI-137) |
| M3 | CORS LTI launch fixed to `terminallearning.dev` — verify against real LTI 1.3 flow | [THI-138](https://linear.app/thierryvm/issue/THI-138) |
| M4 | `keyManager.ts` defaults to plain localStorage (`encrypt: false`) | [THI-112](https://linear.app/thierryvm/issue/THI-112) (BYOK AiKeySetup) |
| M5 | Migration 010 `institutions: select by role` — drift risk if 010→011→012 not applied in order | [THI-139](https://linear.app/thierryvm/issue/THI-139) |
| M6 | Sentry scrubber only covers `type === 'event'` — `transaction`/`profile`/`check_in` ignored | [THI-140](https://linear.app/thierryvm/issue/THI-140) |

> **Where the raw audit report lives:** the full `security-auditor` raw output is appended to [`docs/security-audit-log.md`](security-audit-log.md) with its run date, the score, and the per-finding details (file:line, severity, recommendation). That file is the persistent location — re-run the `security-auditor` agent before any release and append the new section there. Each Linear issue above also embeds the relevant slice of the raw report in its description for self-contained tracking.

---

## Incident Log

Public incident log lives in [`/SECURITY.md`](../SECURITY.md#incident-log). Two incidents are recorded there with their canonical labels:

- **Incident 006 — Hardcoded password in SQL migration** (21 April 2026)
- **Incident 007 — Wrong-model session catastrophe** (24-25 April 2026)

No duplication here to avoid drift; this section only points to the canonical entries.

---

## Environment Variables / Feature Flags

Sensitive endpoints can be gated via Vercel environment variables. They default to **disabled** to minimize attack surface.

| Variable | Default | Endpoint | Effect when not set / != value |
|----------|---------|----------|---------------------------------|
| `LTI_ENABLED` | `(unset)` | `/api/lti/launch` | Returns **503 Service Unavailable**. Required: `LTI_ENABLED=true` (Phase 7c, after RS256 JWK validation). Until then the placeholder JWT verifier (`TODO_PHASE7C_PUBLIC_KEY` + `ignoreExpiration:true`) cannot be exploited for forged-token Sentry pollution or role spoofing. — THI-133 |

**To enable a flag in production**: Vercel project → Settings → Environment Variables → add the variable scoped to `Production`. Trigger a redeploy. **Never** commit these values to `.env*` files.

---

## Roadmap

| Phase | Item | Status |
|-------|------|--------|
| THI-133 | [H1] LTI forged-JWT gate (`LTI_ENABLED` feature flag) | ✅ 2026-05-01 (PR #169) |
| THI-134 | LTI handler 500 cold-start fix (unblocks the 503 from the flag) | 🔄 In Progress (PR #170) |
| Phase 7c | [H1 follow-up] RS256 JWK validation in `verifyJwt()` then enable `LTI_ENABLED` | 🔜 |
| Backlog H2 | LTI launch endpoint rate limiting (shared module) | 🔜 |
| Backlog H3 | Git history credential `git filter-repo` (force-push, accepted residual risk for now) | 🔜 |
| Backlog M1-M6 | 6 medium findings (see table above) | 🔜 |
| THI-112 | Key manager default encryption (`encrypt: true`) for AiKeySetup | 🔜 |
| Phase 9 | Branch protection + code owner review + signed commits | 🔜 |
| THI-120 | Sentry scrubber double-layer (server + client) | ✅ Phase 7b |

---

**See also:**
- `.claude/agents/agent-resilience.md` — 6-vector LLM attack resilience guide
- `.husky/pre-commit` — credential detection patterns (word boundary enforcement)
