# Security Audit Log

Record of security findings, fixes, and protocol improvements for Terminal Learning.
This log is updated after each security audit and serves as institutional memory.

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
