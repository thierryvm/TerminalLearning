# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x (current) | ✅ |

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Report privately via GitHub's built-in security advisory system:
👉 https://github.com/thierryvm/TerminalLearning/security/advisories/new

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

You will receive an acknowledgement within 72 hours. Fixes are prioritized based on severity (CVSS score).

## Security Measures in Place

### Frontend
- **Content Security Policy** via `vercel.json` headers
- **No `dangerouslySetInnerHTML`** anywhere in the codebase
- **No secrets client-side** — zero API keys or tokens exposed
- **Input validation** on all terminal command inputs
- **X-Frame-Options: DENY** — clickjacking protection
- **X-Content-Type-Options: nosniff** — MIME sniffing protection
- **Referrer-Policy: strict-origin-when-cross-origin**

### Dependencies
- `npm audit` on every CI run
- Dependabot alerts enabled on the repository
- Dependencies updated regularly

### Data
- No personal data collected directly
- Progress stored in `localStorage` only (never sent to a server)
- No cookies, no tracking pixels

## Out of Scope

- Social engineering attacks
- Physical attacks
- Issues in third-party services (Ko-fi, GitHub, Vercel)
- Denial of service against Vercel infrastructure

## Disclosure Policy

Once a fix is deployed, a security advisory will be published on GitHub with credit to the reporter (unless anonymity is requested).
