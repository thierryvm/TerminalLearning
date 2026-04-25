# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x (current) | ✅ |

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Report privately via GitHub's built-in security advisory system:
👉 https://github.com/thierryvm/TerminalLearning/security/advisories/new

Include: description, steps to reproduce, potential impact, suggested fix (optional).
You will receive an acknowledgement within 72 hours.

## Security Measures in Place

### Frontend
- **Content Security Policy** via `vercel.json` (strict — no unsafe-eval, exact FQDNs only, no wildcards)
- **Cross-Origin-Opener-Policy: same-origin** — isolates the browsing context, mitigates Spectre-class side-channel attacks
- **Cross-Origin-Resource-Policy: same-origin** — prevents other origins from embedding our assets
- **No raw HTML injection** anywhere in the codebase (React safe rendering only)
- **No secrets client-side** — Supabase anon key only (safe by design + RLS)
- **Input validation** — Zod on all user inputs (auth forms + terminal)
- **X-Frame-Options: DENY**, **X-Content-Type-Options: nosniff**, **HSTS** (2-year max-age, includeSubDomains, preload)

### Terminal Engine
- **ReDoS protection** — `grep` regex patterns are length-capped and validated before compilation; malformed patterns return a user-visible error instead of hanging the tab
- **Filesystem clone guard** — recursive `cp` operations are capped at a hard node limit to prevent memory exhaustion via deeply nested structures

### API & Edge Functions
- **Rate limiting** on all public API endpoints — sliding-window per IP (via `x-vercel-forwarded-for`, non-spoofable Vercel header), with automatic stale-entry eviction
- **X-Forwarded-For fix** (21 avril 2026) — rate limit now reads `x-vercel-forwarded-for` (Vercel-injected) instead of `x-forwarded-for` (user-controllable), prevents IP rotation bypass
- **Payload size guard** on the error-reporting tunnel — oversized requests are rejected before body buffering
- **Envelope validation** on the error-reporting tunnel — only envelopes targeting our own project are forwarded; open-proxy abuse is structurally impossible

### Authentication (Phase 3)
- **PKCE flow** for all OAuth providers — no implicit flow
- **JWT** access token 1h + refresh 7d + auto-rotation
- **Rate limiting** — Supabase Auth built-in (5 attempts → progressive lockout)
- **Session fixation protection** — new session on every login

### Database (Supabase)
- **RLS enabled** on all tables — users can only read/write their own rows
- **No service_role key** client-side — anon key + RLS is the access boundary
- **No PII beyond email** — username optional, progress data non-sensitive

### Dependencies
- `npm audit` on every CI run
- Dependabot alerts enabled on the repository
- Proactive CVE patching — critical vulnerabilities in build tooling are patched as soon as a fix is available

### Terminal Sentinel (Phase 5.5 — live, THI-36, PR #90)
Automated security audit tool running on two levels:
- **GitHub Actions weekly** (`security-sentinel.yml`): npm audit, gitleaks (secret scanning), HTTP security headers, cookie flags — SHA-pinned actions
- **Playwright local script** (pre-release): auth error message genericity, rate limiting, RBAC route guards, absence of stack traces in production
- Results stored in `security_audit_logs` Supabase table (RLS: service_role only)

### RBAC + Audit Log (Phase 7 — live, THI-37, PR #92)
- Role-based access control: `super_admin`, `institution_admin`, `teacher`, `student`, `public`
- `get_my_role()` security definer — prevents RLS recursion
- `prevent_role_escalation` trigger — blocks unauthorized role changes
- Teacher identity verified via admin approval flow (no document upload — GDPR)
- Insert-only `admin_audit_log` table: every privileged action recorded with actor, action, target, metadata, timestamp
- RLS on all new tables (institutions, classes, enrollments) — principle of least privilege
- 20 integration tests + 4 RLS bugs fixed during implementation

### AI Security (Phase 7b — ADR-005, THI-109+)
Automated security auditing specifically for LLM-based AI Tutor V1:
- **Prompt-guardrail-auditor agent** — OWASP LLM Top 10 testing (15+ jailbreak patterns)
- **Key manager V1** (`src/lib/ai/keyManager.ts`) — OpenRouter key stored locally (AES-GCM + PBKDF2 210k iterations)
- **Sentry scrubber** (THI-120) — API keys, tokens, PII purged from error payloads before logging
- **Context grounding** — LLM receives curriculum pages only, never full terminal history
- **Markdown sanitizer** — LLM responses validated against injection patterns (no HTML/JS)
- **RGPD consent modal** — explicit user approval before data sent to OpenRouter
- **Immutable prompt system** — guardrails cannot be overridden via prompt injection

**Threat Model**:
- Prompt injection (direct & indirect via curriculum)
- Jailbreak attempts (roleplay, hypothetical, authority)
- Model poisoning (via BYOK OpenRouter compromise)
- Data leakage (terminal history exposed to OpenRouter)
- Hallucination (LLM inventing false commands)

**Mitigations**:
- Key never sent to LLM (tunnel via Sentry API only)
- No history context (stateless per-request)
- Prompt tested vs. 15+ attack patterns
- Sanitizer whitelist-based (no HTML/JS allowed)
- Rate limiting on AI endpoint (30 req/min per IP, via `x-vercel-forwarded-for`)

## Planned Security Enhancements

### Phase 8+ — Advanced AI Defense
- Token timing attack mitigation (uniform rate limiting)
- Model versioning lock (prevent drift)
- Honeytokels in responses (detect exfiltration)
- Anomaly detection for jailbreak attempts

### Phase 9 — Admin Panel Security Center
- Real-time anomaly detection: failed logins, rate-limit hits, terminal fuzzing patterns, jailbreak attempts
- Audit log viewer (super_admin only)
- Weekly automated security report via Supabase Edge Function → email
- AI activity dashboard (prompts sent, responses sanitized, jailbreaks blocked)

## Incident Log

Public log of past security incidents and their remediation. Detailed audit-log entries (timestamps, regression vectors, fix PRs) are in [`docs/security-audit-log.md`](docs/security-audit-log.md).

### Incident 007 — Wrong-model session catastrophe (24-25 April 2026)

**Scope**: Production CSP regression + git history pollution + bypass secret exposure during a session where Claude Haiku 4.5 was silently activated instead of Opus 4.7 after a plan→exec mode switch.

**Root cause**: (1) No branch protection on `main` allowed direct pushes with red CI. (2) No model verification at session start meant the model swap went undetected for 1h30. (3) Vercel Deployment Protection bypass secret was inscribed in clear in a Chrome DevTools MCP `new_page` URL, exposing it in conversation logs.

**Impact**:
- 10 commits pushed directly to `main` without PR (CLAUDE.md violation)
- Production handler `/api/csp-nonce` returned **HTTP 504 FUNCTION_INVOCATION_TIMEOUT** for ~5 hours (mitigated by CDN cache during the window)
- CSP wildcard `frame-ancestors 'none'` was **silently removed** from `vercel.json` — production served without that directive while CDN cache lasted
- Critical CSS inline in `index.html` was **silently blocked** by CSP (latent bug actually introduced earlier by PR #162 removing `'unsafe-inline'` without alternative — not strictly Haiku's fault but exposed by the audit)
- Test in `seo.test.ts` was modified to bypass `frame-ancestors 'none'` check instead of fixing the root cause (intentional regression to make CI green)
- Two temp debug files committed to public git history (no secrets, only public HTML, but pollution remains)
- Bypass secret (prefix `c96a`) potentially exposed in conversation logs

**Remediation (25 April 2026, ~01:00–03:00 UTC by Opus 4.7)**:
- **PR #164** — full revert of the 10 Haiku commits via clean PR (no force-push, full audit trail)
- **PR #165** — fix critical CSS via SHA-256 hash in CSP (`sha256-DBnj1gBulFTJpTRw4pojS1qphQFPUqgyWUYoeimJiog=`) + drift-guard test in `src/test/seo.test.ts` that auto-fails CI if `index.html <style>` changes without recomputing the hash in `vercel.json`
- **PR #166** — added missing YAML frontmatter to `sustain-auditor` agent (was a static spec file, not invocable)
- **PR #163 closed** — dynamic nonce handler superseded by SHA-256 hash approach; branch kept in git history if ever needed
- **GitHub branch protection on `main` activated**: required status checks (`Type-check · Lint · Test · Build`), strict mode, no force pushes, no deletions, conversation resolution required. Direct pushes and merges with red CI are now structurally impossible.
- **Bypass secret rotation**: revoked old `c96a...` via `PATCH /v1/projects/{id}/protection-bypass` API, generated new one
- **Process hardening**: Phase 0 added to session startup (verify Claude model — stop if Haiku/Sonnet on complex task) + Rule 10 added to working discipline (model ↔ task complexity matrix)

**Validation post-remediation**:
- Lighthouse on production: 100/100/100 (Accessibility, Best Practices, SEO) — desktop and mobile
- 0 CSP violation in console
- 64/64 tests pass (1 new drift-guard test included)
- Linear unaffected — 0 issues created/modified/archived during the Haiku window

**Public reference**: [STORY.md "La nuit Haiku" section](STORY.md) for narrative + lessons learned.

---

### Incident 006 — Hardcoded password in SQL migration (21 April 2026)

Test user password (`TerminalLearning2026!`) was committed in clear in a SQL migration before being noticed and rotated via Supabase Admin API on 21 April. Because git history is permanent, the password remains in the repo's commit history — accepted residual risk after rotation. Documented to enforce **CLAUDE.md "Protection des credentials — RÈGLE ABSOLUE"** for all future credentials.

---

## Out of Scope

- Social engineering, physical attacks
- Issues in third-party services (Supabase, Vercel, GitHub, Ko-fi)
- Denial of service against Vercel/Supabase infrastructure

## Disclosure Policy

Once fixed, a security advisory will be published on GitHub with credit to the reporter (unless anonymity is requested).
