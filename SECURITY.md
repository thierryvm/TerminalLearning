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
- **Content Security Policy** via `vercel.json` (strict — no unsafe-eval)
- **No `dangerouslySetInnerHTML`** anywhere in the codebase
- **No secrets client-side** — Supabase anon key only (safe by design + RLS)
- **Input validation** — Zod on all user inputs (auth forms + terminal)
- **X-Frame-Options: DENY**, **X-Content-Type-Options: nosniff**, HSTS-ready

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

## Planned Security Enhancements

### Phase 5.5 — Terminal Sentinel (THI-36)
Automated security audit tool running on two levels:
- **GitHub Actions weekly**: npm audit, gitleaks (secret scanning), HTTP security headers, cookie flags
- **Playwright local script** (pre-release): auth error message genericity, rate limiting, RBAC route guards, absence of stack traces in production

### Phase 7 — RBAC + Audit Log (THI-37)
- Role-based access control: `super_admin`, `institution_admin`, `teacher`, `student`, `public`
- Teacher identity verified via admin approval flow (no document upload — GDPR)
- Insert-only `audit_log` table: every privileged action recorded with actor, action, target, IP, timestamp
- RLS extended to all new tables — principle of least privilege

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
