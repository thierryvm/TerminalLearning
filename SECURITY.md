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

## Out of Scope

- Social engineering, physical attacks
- Issues in third-party services (Supabase, Vercel, GitHub, Ko-fi)
- Denial of service against Vercel/Supabase infrastructure

## Disclosure Policy

Once fixed, a security advisory will be published on GitHub with credit to the reporter (unless anonymity is requested).
