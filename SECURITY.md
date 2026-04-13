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
- **Rate limiting** on all public API endpoints — sliding-window per IP, with automatic stale-entry eviction
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

## Planned Security Enhancements

### Phase 9 — Admin Panel Security Center
- Real-time anomaly detection: failed logins, rate-limit hits, terminal fuzzing patterns
- Audit log viewer (super_admin only)
- Weekly automated security report via Supabase Edge Function → email

## Out of Scope

- Social engineering, physical attacks
- Issues in third-party services (Supabase, Vercel, GitHub, Ko-fi)
- Denial of service against Vercel/Supabase infrastructure

## Disclosure Policy

Once fixed, a security advisory will be published on GitHub with credit to the reporter (unless anonymity is requested).
