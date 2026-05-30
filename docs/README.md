# Documentation Index — Terminal Learning

> Last updated: 30 May 2026 ~14h CEST — **🚀 Sprint 2.C étape 2 — signalement in-app (PR #326)** : migration 030 bucket privé `support_screenshots` + 5 RLS `storage.objects` + `SupportTicketModal` (focus-trap + Escape, form 3 champs, disclaimer PII, trigger Sidebar « Aide & feedback » gated `user`) + `submitTicket` (upload → URL signée 7j → insert + cleanup orphelin). **3 audits gate-zero ALL GREEN** (supabase-backend SHIP 11 tests adversariaux prod 0C/0H + ui clean + security 9.3/10), **code-review** 0 critical (2 fixes), **Context7** API Storage vérifiée. Tests **1765 → 1780 PASS** (8 composant + 7 RLS bucket empiriques PROD). CHANGELOG catch-up #319-325 (drift 29/05). Sprint 2.C reste 2 étapes (Resend → AdminPanel). Voir CHANGELOG.md / plan.md. — **Update précédent (24 May 2026 ~20h CEST) — 🧠 AI Tutor par rôle livré — Stage B1 + Stage B2** : 7 PRs mergées même jour (#287 → #293). Stage B1 (#290, THI-260) = eval matrix frontier 2025-2026 sur 10 modèles × 14 fixtures, $0.62 USD, 2 modèles 8/8 PASS (GPT-5.5 440 ms + Opus 4.7 premium). Stage B2 (#291, THI-275) = 3 system prompts FR cloisonnés par rôle + dispatcher + fallback student defense-in-depth + 17 tests + 4 fixtures injection `<role_context>` × 4 langues. `prompt-guardrail-auditor` Sonnet trouve 2 CRITICAL **fixés avant merge** (ghost block + DELIMITER_RX gap). 2 nouveaux agents : `legal-compliance-auditor` Opus 4.7 (THI-270 #288) + `user-forensics-auditor` Sonnet (THI-274 #293). Tests 1697 PASS (+57). Sprint 2.B prochaine session : `institution_admin` lite + `institution-rbac-auditor` gate-zero. Voir CHANGELOG.md / STORY.md pour la narrative complète. — **Update précédent (19 May 2026 ~21h CEST) — 🚀 Sprint 2.A Teacher workflow 75% shipped (étapes 1+2+2.bis+2.ter live)** : 5 PRs mergées journée (#267 `.env.example` exhaustif + #268 Teacher Dashboard CRUD `/app/teacher` + migrations 020/021 + #269 role-aware nav hub + login redirect safe + #270 adaptive default route per role super_admin → `/app/admin` + #271 docs CHANGELOG). Tests 1545 → 1604 (+59). Cascade ALL GREEN : security-auditor 9.4-9.5/10 · ui-auditor SHIP-READY · rbac-flow-tester 11/11 E2E PASS · happy path RPC empirique · Voie A Chrome MCP · Sourcery PASS. 6 follow-ups Linear créés (THI-237/238/239/240/241/242). Next : Sprint 2.A étape 3 = page `/app/join` consommant `join_class_by_code` RPC (pré-requis : agent `classroom-workflow-auditor` + THI-239 Vitest regression net + Voie A multi-personas). Voir CHANGELOG.md pour détails. — **Update précédent (16 May ~14h30 CEST) — 🚀 Sprint 2 étape 2/N — THI-153 ✅** : PR [#234](https://github.com/thierryvm/TerminalLearning/pull/234) mergée — cleanup UI bundle (umbrella audit). 4 items cherry-picked : `--github-red` CSS var unique source + migration AI/auth red palettes · UserMenu logout focus ring rouge → emerald · shadcn dead slots documentés · `sonner` désinstallé · **bonus brand fix** « Terminal Master » → « Terminal Learning » dans Layout mobile (`/app`). Sourcery review addressed (DestructiveActionButton helper local + emerald token rationale). 3 tickets backlog créés : THI-177 (pré-i18n discipline gate Phase 9 admin) · THI-178 (SEO longue traîne SSG Phase 10+) · THI-179 (securityheaders A+ COEP post-LTI 7c). Validation ui-auditor SHIP-READY · 1386 tests passed 0 errors · Landing chunk 7.33 kB gzip stable. Sprint 2 ordre verrouillé : THI-118 ✅ → THI-153 ✅ → **THI-131 Phase 7c LTI (next)** → THI-42 → THI-77/78. — **Update précédent (16 May ~10h45 CEST) — Sprint 2 démarré — deadline 10 juin — THI-118 ✅** : landing LCP regression fix mergée (PR [#232](https://github.com/thierryvm/TerminalLearning/pull/232)). Diagnostic Chrome DevTools MCP : LCP element = hero `<p>` sous-titre (texte), 98.9 % render delay, fuites `landingContent.ts` (`.reduce()` sur `commandCatalogue` forçait chunk curriculum eager) + `UserMenu`/`LoginModal`/`PWAInstallModal` eager. Fix : hardcoder + drift guard test + `React.lazy` modals. **Bundle Landing 27.29 → 7.33 kB gzip (−73 %)**, curriculum chunk plus dans le graph landing. Le test drift a caught un `TOTAL_LESSONS` 64 → 65 silencieux. Sprint 2 ordre verrouillé : THI-118 ✅ → THI-153 cleanup UI bundle (~75 min) → THI-131 Phase 7c LTI → THI-42 Profile Hub → THI-77/78 admin heatmaps. — **Update précédent (16 May ~10h CEST) — Sprint 1 Phase 7b lockdown CLOS à 4/4** : THI-148 (V1.0.1 méta-plateforme) ✅ → THI-144 (v1.1.0 anti-frictions + ADR-008) ✅ → THI-112 (onboarding AiKeySetup + AiConsentModal + AiSettings + Privacy section + M3-AI fix) ✅ → **THI-113 (audit final triple + H1 fix sentry-tunnel scrubber symétrique)** ✅. Score IA security : 8.7/10 (baseline 10 mai matin) → 9.0 → 9.1 → 9.3 → **9.4/10** post-H1 fix. Rapport audit final dans `docs/audits/ai-tutor-v1-2026-05-16.md` — verdict ALL CLEAR (3 agents : security-auditor + prompt-guardrail-auditor + ui-auditor). Prochaine étape : Phase 7c LTI activation (gate H4-AI jsonwebtoken). Voir CHANGELOG.md / STORY.md pour la narrative complète.  
> This directory contains active project documentation. For historical/stale docs, see `.archive/`.

---

## Quick Navigation

### Strategic & Architecture
- **[ROADMAP.md](ROADMAP.md)** — Public product roadmap (phases 0–7b, feature timeline, community tracking)
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — System design, layer breakdown, data flows, security model
- **[plan.md](plan.md)** — Detailed implementation roadmap with milestones, dependencies, and risks
- **[CONVENTIONS.md](CONVENTIONS.md)** — Coding standards, commit format, branch strategy, style guide

### Decision Records
- **[adr/](adr/)** — Architecture Decision Records (ADR-001 through ADR-007 ; ADR-008 reserved for THI-144 system prompt v1.1.0)
  - ADR-001: LTI-first positioning (institutional adoption strategy)
  - ADR-002: OpenRouter BYOK tiers (AI cost model)
  - ADR-003: TTFR KPI (performance target)
  - ADR-004: Classroom Composer UI (institutional features)
  - ADR-005: AI Tutor V1 implementation (security, architecture, gates)
  - ADR-006: LTI 1.3 implementation (Phase 7c, currently in SPIKE state — `LTI_ENABLED=false` by default)
  - ADR-007: Solo maintainer sustainability practices (rest cycle, oncall hygiene, quarterly reviews)

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
| ROADMAP.md | 10 May 2026 (Session marathon clôturée — 11 PRs livrées #208→#217, baseline llm-security 8.7/10) | 🟢 Active |
| ARCHITECTURE.md | 14 April 2026 | 🟢 Active |
| SECURITY.md | 1 May 2026 | 🟢 Active |
| CONVENTIONS.md | 13 April 2026 | 🟢 Active |
| plan.md | 10 May 2026 (Clôture finale session marathon — rename agent + baseline 8.7/10) | 🟢 Active |
| security-audit-log.md | 10 May 2026 (1ʳᵉ baseline llm-security-auditor 8.7/10 + actions shipped) | 🟢 Active |
| GUIDELINES.md | 11 April 2026 | 🟡 Stable |
| vercel-firewall.md | 14 April 2026 | 🟢 Active |
| ATTRIBUTIONS.md | 2 April 2026 | 🟡 Stable |
| adr/ | 24 April 2026 (ADR-007 solo-maintainer-sustainability ; ADR-008 reserved THI-144) | 🟢 Active |
| guides/ | 15 April 2026 | 🟢 Active |
| story/v1-5-mobile-recovery-narrative.md | 5 May 2026 (narration thématique sprint THI-152) | 🟢 Active |

---

**Questions?** Check GUIDELINES.md or open an issue in the repo.
