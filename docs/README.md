# Documentation Index — Terminal Learning

> Last updated: 2 May 2026  
> This directory contains active project documentation. For historical/stale docs, see `.archive/`.

---

## Quick Navigation

### Strategic & Architecture
- **[ROADMAP.md](ROADMAP.md)** — Public product roadmap (phases 0–7b, feature timeline, community tracking)
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — System design, layer breakdown, data flows, security model
- **[plan.md](plan.md)** — Detailed implementation roadmap with milestones, dependencies, and risks
- **[CONVENTIONS.md](CONVENTIONS.md)** — Coding standards, commit format, branch strategy, style guide

### Decision Records
- **[adr/](adr/)** — Architecture Decision Records (ADR-001 through ADR-005)
  - ADR-001: LTI-first positioning (institutional adoption strategy)
  - ADR-002: OpenRouter BYOK tiers (AI cost model)
  - ADR-003: TTFR KPI (performance target)
  - ADR-004: Classroom Composer UI (institutional features)
  - ADR-005: AI Tutor V1 implementation (security, architecture, gates)

### Security & Compliance
- **[SECURITY.md](SECURITY.md)** — Security policy, vulnerability disclosure, threat model, OWASP Top 10 coverage
- **[security-audit-log.md](security-audit-log.md)** — Audit trail of security findings, fixes, and verifications (timestamp-indexed)
- **[vercel-firewall.md](vercel-firewall.md)** — Vercel Firewall WAF rules, custom patterns, rate limiting configuration, and rollback procedures

### User Guides
- **[guides/student-guide.md](guides/student-guide.md)** — Getting started for learners (curriculum structure, progress tracking, authentication)
- **[guides/teacher-guide.md](guides/teacher-guide.md)** — Classroom management, student assignment, progress monitoring
- **[guides/institution-guide.md](guides/institution-guide.md)** — LTI integration, bulk enrollment, RBAC roles, reporting
- **[guides/admin-runbook.md](guides/admin-runbook.md)** — Operations manual for system administrators (maintenance, troubleshooting, backups, incident response)

### Processes
- **[processes/release-sync-checklist.md](processes/release-sync-checklist.md)** — Pre-release verification steps (CI, tests, docs, analytics, deploy)
- **[processes/gdpr-data-request.md](processes/gdpr-data-request.md)** — Handling user data access/deletion requests (legal compliance)
- **[processes/teacher-approval.md](processes/teacher-approval.md)** — Vetting flow for institutional teacher accounts
- **[processes/adr-template.md](processes/adr-template.md)** — Template for proposing new architectural decisions

### Troubleshooting
- **[troubleshooting/auth-issues.md](troubleshooting/auth-issues.md)** — Common authentication problems and solutions

### Reference
- **[ATTRIBUTIONS.md](ATTRIBUTIONS.md)** — Credits and open-source licenses used in the project
- **[GUIDELINES.md](GUIDELINES.md)** — Development guidelines and best practices

---

## Archived Documentation

Historical and session-transition documents have been moved to `.archive/`:
- **AGENT-RESILIENCE.md** — Theoretical defense strategies (planned, never implemented)
- **SECURITY-SESSION-TRANSITION.md** — Briefing for next session (now stale)
- **processes/next-session-plan.md** — Session planning (obsoleted by CLAUDE.md)
- **processes/session-kickoff.md** — Session startup protocol (obsoleted by CLAUDE.md)

These files remain in `.archive/` for historical reference. Current session protocols are documented in the project's **CLAUDE.md** files (global + local).

---

## Key Files by Role

### For Product Managers
→ ROADMAP.md, plan.md, guides/

### For Engineers
→ ARCHITECTURE.md, CONVENTIONS.md, adr/, security-audit-log.md, plan.md

### For Security Auditors
→ SECURITY.md, security-audit-log.md, vercel-firewall.md, ADR-005

### For Teachers & Institutions
→ guides/teacher-guide.md, guides/institution-guide.md, guides/admin-runbook.md

### For System Admins
→ guides/admin-runbook.md, security-audit-log.md, processes/

---

## Contributing

- New architectural decisions → ADR (see processes/adr-template.md)
- Security findings → security-audit-log.md (with timestamp and severity)
- Process updates → Corresponding guide or process file
- Roadmap changes → Update ROADMAP.md + plan.md together

---

## Document Freshness

| Document | Last Updated | Status |
|----------|-------------|--------|
| ROADMAP.md | 21 April 2026 | 🟢 Active |
| ARCHITECTURE.md | 14 April 2026 | 🟢 Active |
| SECURITY.md | 1 May 2026 | 🟢 Active |
| CONVENTIONS.md | 13 April 2026 | 🟢 Active |
| plan.md | 2 May 2026 (sprint sécurité clos) | 🟢 Active |
| security-audit-log.md | 2 May 2026 (audit run 1 May logged) | 🟢 Active |
| GUIDELINES.md | 11 April 2026 | 🟡 Stable |
| vercel-firewall.md | 14 April 2026 | 🟢 Active |
| ATTRIBUTIONS.md | 2 April 2026 | 🟡 Stable |
| adr/ | 18 April 2026 | 🟢 Active |
| guides/ | 15 April 2026 | 🟢 Active |

---

**Questions?** Check GUIDELINES.md or open an issue in the repo.
