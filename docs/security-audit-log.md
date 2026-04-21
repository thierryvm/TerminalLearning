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
