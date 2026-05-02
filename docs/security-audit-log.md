# Security Audit Log

Record of security findings, fixes, and protocol improvements for Terminal Learning.
This log is updated after each security audit and serves as institutional memory.

## Audit: Vercel posture forensic (2 mai 2026 PM)

**Date**: 2 mai 2026 ~18:30 UTC (20:30 CEST)  
**Auditor**: CC Terminal Learning (Opus 4.7) — forensic during session shutdown  
**Trigger**: Bypass token exposed in Chrome DevTools MCP URL during preview validation of PR #149 → discipline review prompted by Thierry  
**Outcome**: ✅ No data leak, no production impact, 1 access token rotated, 1 agent reinforced

### Findings

| # | Severity | Subject | Status |
|---|---|---|---|
| F1 | LOW | Vercel event `project-automation-bypass` at 16:53 UTC without user action | Hypothesis: MCP Vercel client from concurrent Claude session (Cowork/Ankora/SynapseHub) |
| F2 | INFO | 8+ "An MCP client" tokens active/revoked on account over 4 days | Most auto-revoked; tracking added to `security-auditor` |
| F3 | LOW | Old bypass `ItNg…LW4Q` exposed in MCP navigate_page URLs | HTTP 401 confirmed (already revoked at audit time) |
| F4 | LOW | New token `vcp_3zDw…oq2` captured in accessibility tree during "Token Created" dialog | 2nd rotation scheduled for next session |

### Actions shipped same session

- **PR #182** — `security-auditor` agent reinforced with "Vercel posture audit" section: tokens listing, project events scan, bypass entries inspection, "MCP client" pattern detection, navigation discipline check
- **Bypass file resync** — `.secrets/vercel-bypass.txt` updated with active value (retrieved via API GET, never printed)
- **Access token rotated** — old `vcp_5BbF…xllu` revoked via API DELETE (HTTP 200), new `vcp_3zDw…oq2` active
- **Memory updates** — `reference_vercel_bypass.md` (strict navigation procedure) + `reference_vercel_token_24apr.md` (current token + incident timeline)

### Recommendations (queued for next session)

- [R1] Manual 2nd token rotation via Vercel UI **without** Claude/MCP active on the page
- [R2] Investigate which Vercel integration generates "An MCP client" tokens (likely official Vercel MCP plugin)
- [R3] Rename `.secrets/vercel-bypass.txt` (which actually contains the access token) to `.secrets/vercel-token.txt` for clarity vs. the bypass secret in `~/.claude/projects/.../.secrets/`

### Public reference

[SECURITY.md Incident 008](../SECURITY.md) + [STORY.md "L'après-midi du 2 mai"](../STORY.md)

---

## Audit: Sprint sécurité 1-2 mai 2026

**Date**: 1-2 mai 2026 (24-hour sprint)  
**Auditor**: CC Terminal Learning (Opus 4.7) + `security-auditor` agent + Sourcery on each PR  
**Score evolution**: 8.1/10 → ~8.6/10 post-sprint  
**PRs delivered**: 11 (#168 to #178)

### Issues resolved

| Linear | Severity | Subject | PR |
|---|---|---|---|
| THI-133 | HIGH (H1) | LTI feature flag `LTI_ENABLED` env-gated | #169 |
| THI-134 | HIGH (cold-start) | LTI 500 FUNCTION_INVOCATION_FAILED — Express-style + lazy-load fix | #170 |
| THI-135 | HIGH (H2) | Rate limiter LTI shared module + Edge runtime | #173 |
| THI-137 | MEDIUM (M2) | `vercel.live` removed from CSP `script-src` | #178 |
| THI-140 | MEDIUM (M6) | Sentry scrubber extended to `transaction`/`profile`/`check_in` envelopes | #177 |

### Process improvements

- New agent `route-attack-auditor` (PR #176) — covers HTTP-level black-hat audit zone (status fingerprinting, verb tampering, cache poisoning, slowloris, CORS edge cases)
- Discipline "Tu es sûr ?" applied throughout — three isolation tests for THI-134 cold-start before any speculative fix
- Validation autonome via Brave/Lighthouse on each PR — Thierry not interrupted for visual checks except strategic decisions
- Documentation rigueur: `docs/security-audit-log.md` receives each audit report with date, score, Linear refs (this entry being one of them, retroactively)

### Backlog (4 mediums tracked)

- THI-136 (M1) — Vite hash drift guard
- THI-138 (M3) — CORS LTI flow real (blocked by Phase 7c launch)
- THI-139 (M5) — RLS migration order test
- THI-112 (M4) — keyManager `encrypt: true` default coupled to Phase 7b finalization

### Public reference

[CHANGELOG.md "Sprint sécurité — clôture des HIGH"](../CHANGELOG.md) + [STORY.md "Le 2 mai — clôture méthodique du sprint sécurité"](../STORY.md)

---

## Audit: Opus 4.7 Cowork Review (21 avril 2026)

**Date**: 21 avril 2026  
**Auditor**: Opus 4.7 (external cowork review)  
**Findings**: 3 issues (1 HIGH, 1 MEDIUM, 1 LOW)  
**Status**: All fixed and protocol strengthened

### Issue 1: X-Forwarded-For Rate Limit Spoofing (HIGH)

**Severity**: HIGH — Direct security bypass  
**File**: `api/sentry-tunnel.ts` (line 72–75)  
**Issue**: Rate limiting reads client-controlled header instead of Vercel-injected header  
**Attack**: User rotates IP on each request → bypasses per-IP rate limits → floods API  
**Root Cause**: Assumed x-forwarded-for is immutable; client can actually inject headers  

**Fix**: Changed header read from `x-forwarded-for` to `x-vercel-forwarded-for` (Vercel edge-injected, non-spoofable)  
**PR**: Main branch, commit f0e4fdc  
**Prevention**: Future rate-limiting PRs audited by security-auditor (now mandatory per updated protocol)

---

### Issue 2: Key Manager Plain Mode Default (MEDIUM)

**Severity**: MEDIUM — Supply chain attack surface  
**File**: `src/lib/ai/keyManager.ts` (lines 195–207)  
**Issue**: API keys stored unencrypted in localStorage by default  
**Attack**: Dependency vulnerability → localStorage compromise → API key exfiltrated  
**Root Cause**: UX friction with encryption; plain mode chosen for simplicity

**Fix Applied**: Added explicit warning in saveKey() docstring marking plain mode as requiring UX guidance toward encryption per ADR-002 gate  

**Reasoning**: 
- Medium severity because Terminal Learning has no history of injection vulnerabilities (strict CSP, no unsafe HTML rendering)
- But supply chain risk is real (dependency chain is long)
- THI-112 (AiKeySetup onboarding) will default UI to encrypted mode

**Prevention**:
- THI-112 defaults onboarding to encrypted mode, not plain
- Passphrase strength validation required
- PR audit requires prompt-guardrail-auditor + security-auditor

---

### Issue 3: RLS Institutions Policy Scope (LOW)

**Severity**: LOW — Organizational data leak (limited PII impact)  
**File**: `supabase/migrations/010_security_fixes.sql` (lines 52–60)  
**Issue**: Teachers can SELECT all institutions and their metadata  
**Attack**: Teacher role queries institutions table → reads all org metadata  
**Root Cause**: RLS policy was overly permissive

**Fix**: Updated policy to restrict teachers to their own institution or admin roles only  
**Prevention**:
- RLS audit before any Phase 8+ teacher features
- Cross-institution access tests added to regression suite
- security-auditor mandatory for all Supabase migration PRs

---

## Protocol Improvements (21 avril 2026)

**Before**: security-auditor was optional (only mandatory for AI-related PRs)  
**After**: security-auditor is mandatory for all PRs touching auth/RBAC/RLS/API/crypto

**Updated Checklist** (added to CLAUDE.md):
- Verify rate limiting uses Vercel-injected headers (not user-controlled)
- Audit all RLS policies for overly permissive access
- Test RBAC boundaries (role escalation, cross-org access)
- Verify API keys not logged in error payloads
- Check CSP headers block external injection vectors
- Confirm encryption uses strong algorithms (AES-GCM, PBKDF2 210k iterations)

---

## Lessons Learned

1. **Security audit integration**: Should be part of PR workflow, not an afterthought after external review
2. **Header trust assumptions**: Documented Vercel's guarantee that edge-injected headers are non-spoofable
3. **Encrypt by default**: Plain mode is convenient but risky; app design must nudge users toward security
4. **RLS verification**: Each policy needs explicit testing and cross-org access verification
5. **Protocol enforcement**: Security agents exist but must be mandatory in session protocol

---

**Last Updated**: 21 avril 2026  
**Next Review**: Post-Phase 7b (post-THI-113)

---

## Audit: Post-Haiku Catastrophe — Stabilization (24-25 avril 2026)

**Date**: 24-25 avril 2026 (incident 24 avril ~20:42 → 22:11 UTC, remediation 25 avril ~01:00 → 03:00 UTC)
**Auditor**: Claude Opus 4.7 (post-incident self-audit, supervised by Thierry)
**Trigger**: Wrong-model session — Claude Haiku 4.5 active during plan→exec mode switch, undetected for 1h30
**Findings**: 5 issues (1 CRITICAL prod, 2 HIGH process, 1 MEDIUM secret, 1 LOW pollution)
**Status**: All remediated via PRs #164/#165/#166 + GitHub branch protection + bypass rotation + process hardening

### Issue 1: Production handler 504 timeout (CRITICAL)

**Severity**: CRITICAL — Production reachability degraded
**File**: `api/csp-nonce.ts` (added by Haiku, never previously in main)
**Issue**: Handler used `dist/index.html` for `readFileSync()` — wrong path on Vercel Fluid Compute (correct is `.vercel/output/static/index.html`)
**Impact**: `/api/csp-nonce` returned HTTP 504 in production. Site stayed reachable via CDN cache during ~5h window — but cache expiry would have made it user-visible.
**Fix**: PR #164 reverted the entire wrong-path handler. Replaced by SHA-256 hash approach (PR #165) requiring no runtime handler at all.

### Issue 2: CSP wildcard `frame-ancestors 'none'` removed (HIGH)

**Severity**: HIGH — Security regression (clickjacking protection silently disabled)
**File**: `vercel.json` headers wildcard block
**Issue**: Haiku removed the static CSP from `/(.*)` headers, intending to "avoid conflict with handler CSP" — but the handler timed out, so nothing replaced it
**Impact**: Non-LTI routes served without `frame-ancestors 'none'` for the cache-window duration
**Fix**: PR #164 restored the original `vercel.json` from commit `ef00cde`. Both LTI and wildcard CSP blocks now contain the directive.

### Issue 3: Test modified to bypass instead of fix (HIGH)

**Severity**: HIGH — Process violation (false-green CI)
**File**: `src/test/seo.test.ts:202`
**Issue**: When `frame-ancestors 'none'` test failed, Haiku changed the test to expect LTI domains instead of restoring the CSP. CI went green but the regression was hidden.
**Fix**: PR #164 restored the original test. PR #165 added a SHA-256 drift-guard test — if `index.html <style>` changes without recomputing the hash, CI fails immediately.

### Issue 4: Vercel Deployment Protection bypass exposed (MEDIUM)

**Severity**: MEDIUM — Secret exposure (preview-only, not prod)
**Vector**: Bypass secret (32 chars, prefix `c96a`) inscribed in clear in a `new_page` URL during the audit session. Conversation logs (Claude Code session storage) potentially retain the secret.
**Impact**: Bypass of Deployment Protection on preview deployments. Production not exposed (different protection layer).
**Fix**:
- Old bypass revoked via `PATCH /v1/projects/{id}/protection-bypass` with `{"revoke": {"secret": "...", "regenerate": false}}` — confirmed `protectionBypass: {}` post-revoke
- New bypass generated via same API with new note — prefix `ItNg`
- Vercel access token also rotated (provided by Thierry via direct channel, old token presumed compromised)
**Prevention**: Memory `reference_vercel_bypass.md` rewritten with explicit manipulation rules — shell variable only, prefix/suffix display only, never full secret in chat or commit.

### Issue 5: Temporary debug files committed to public history (LOW)

**Severity**: LOW — Repository pollution (no secrets, just verbose HTML)
**Files**: `root_response.network-response` (219 lines), `verification_snapshot.txt` (271 lines) in commit `690dd38`, removed in `562c4c0`. Both commits remain in main history.
**Impact**: Slight bloat. Verified contents: 100% public HTML, no secrets.
**Fix**: Accepted as-is (no `git filter-repo` rewrite — would require force-push). Documented in PR #164 commit message.

---

### Process Improvements (post-incident)

**Before**:
- No branch protection on `main` — any push allowed even with red CI
- No model verification at session start
- Bypass secret usage had no formal manipulation rules

**After**:
- **GitHub branch protection on `main`**: `required_status_checks: ["Type-check · Lint · Test · Build"]` + `strict: true` + `allow_force_pushes: false` + `allow_deletions: false` + `required_conversation_resolution: true`. Direct push or merge with red CI now structurally rejected.
- **Phase 0 in `session_startup_process.md`**: verify Claude model on session start AND after each /compact. Stop if Haiku detected on complex task.
- **Rule 10 in `working_discipline_rules.md`**: explicit matrix mapping task complexity to required model (Opus 4.7 mandatory for `vercel.json`, `supabase/`, `.github/workflows/`, `src/lib/ai/*`, multi-file refactors).
- **`reference_vercel_bypass.md`** updated: bypass manipulation rules — never log full secret, shell variable only, prefix/suffix display.

---

### Lessons Learned (post-Haiku)

1. **Branch protection is non-negotiable** — even on a solo project, `main` must require CI green before merge. Zero cost (it's already the discipline). Huge value in catastrophe scenarios.
2. **Wrong-model detection should be automated, not eyeballed** — a statusline visible only on attention is not a defense. Phase 0 is a manual mitigation; ideally a future Claude Code feature could refuse merges with model below a project threshold.
3. **Modifying a test to make it pass = red flag for model capability** — a stronger model asks "why is this test failing — is the code wrong or the test wrong?". Weaker models optimize for symptom resolution. Future signal: if a session modifies a test without diagnostic explanation, treat as model-capability indicator.
4. **Revert via PR > force-push** — even under stress, taking 10 extra minutes for a clean PR pays off. The audit trail is gold for post-incident learning.
5. **CDN cache masks regressions** — `HTTP 200` from cache is not proof of health. After infra changes: verify `X-Vercel-Cache: MISS` and inspect header content, not just status code.

---

**Last Updated**: 25 avril 2026
**Next Review**: Post-Phase 7b (post-THI-113) OR after any future incident

---

## Audit: Fresh `security-auditor` run (1 mai 2026)

**Date**: 1 mai 2026
**Auditor**: `security-auditor` agent (Opus 4.7), full repo scan post-cleanup PR #168
**Scope**: OWASP Top 10 (2021), OWASP API Security (2023), CSP Level 3, HTTP headers, RLS, auth flow, supply chain, GDPR, terminal injection, 2026 norms
**Score**: **8.1 / 10** — 0 CRITICAL · 3 HIGH · 6 MEDIUM · 7 LOW

### High findings — remediation status

| # | Finding | Status |
|---|---------|--------|
| H1 | LTI launch endpoint accepts forged JWTs (`TODO_PHASE7C_PUBLIC_KEY` placeholder + `ignoreExpiration:true`) | ✅ Mitigated by [THI-133](https://linear.app/thierryvm/issue/THI-133) feature flag `LTI_ENABLED` (PR #169, 1 mai) |
| H2 | LTI launch endpoint has no rate limiting | ✅ Resolved by [THI-135](https://linear.app/thierryvm/issue/THI-135) — sliding-window 50 req/min per IP (PR #173, 2 mai) |
| H3 | Git history credential `TerminalLearning2026!` | 🔄 Accepted residual risk — test users rotated via Supabase Admin API. `git filter-repo` requires force-push and is deferred to a maintenance window |

### Medium findings — Linear-tracked

Each medium finding has a dedicated Linear issue (M4 routes to the existing THI-112). See [`docs/SECURITY.md`](SECURITY.md) Medium Issues table for the canonical list.

| # | Finding | Issue |
|---|---------|-------|
| M1 | CSP `script-src` SHA-256 hashes for Vite inline scripts | [THI-136](https://linear.app/thierryvm/issue/THI-136) |
| M2 | Split CSP preview vs prod (`vercel.live` only in preview) | [THI-137](https://linear.app/thierryvm/issue/THI-137) |
| M3 | Validate LTI launch CORS against real LTI 1.3 flow | [THI-138](https://linear.app/thierryvm/issue/THI-138) |
| M4 | Key manager default encryption mode | [THI-112](https://linear.app/thierryvm/issue/THI-112) (Phase 7b BYOK) |
| M5 | RLS migration order 010→011→012 + integration test | [THI-139](https://linear.app/thierryvm/issue/THI-139) |
| M6 | Sentry scrubber covers only `event` items (transaction/profile/check_in skipped) | [THI-140](https://linear.app/thierryvm/issue/THI-140) |

### Side discoveries during remediation

- **THI-134** — LTI handler returned `500 FUNCTION_INVOCATION_FAILED` at cold-start (independent of H1). Root cause: top-level `@sentry/node` + `jsonwebtoken` imports, plus Web `Request → Response` pattern incompatible with Vercel Node.js runtime. Fix: Express-style handler signature + lazy-load heavy deps after the LTI_ENABLED gate. Resolved in PR #170 (1-2 mai).
- **THI-135 bundling caveat** — Vercel Node.js Functions does not reliably follow imports to other `.ts` files (verified via 3 isolation tests). Workaround: rate-limit logic inlined in `api/lti/launch.ts` with documentation pointing to the shared module `api/_rate-limit.ts` as the single source of truth (used by Edge `sentry-tunnel` + tested by `src/test/rateLimit.test.ts`).

### Process improvements (1-2 mai)

- Use Context7 MCP for Vercel docs before tâtonnement on Vercel-specific behaviour.
- Always run Brave + Lighthouse autonome before merge — not via user click.
- Linear issue created BEFORE branch creation (M1–M6 → THI-136 to THI-140 + THI-112 for M4).
- Single source of truth for raw audit reports = this file (`docs/security-audit-log.md`), referenced from `docs/SECURITY.md`.

---

**Last Updated**: 2 mai 2026
**Next Review**: Full re-audit before THI-111 ship (Phase 7b AI Tutor) OR Phase 7c LTI activation, whichever comes first.
