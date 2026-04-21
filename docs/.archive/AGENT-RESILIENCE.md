# Agent Resilience — Protection Against Autonomous LLM Attack Vectors (2026)

> **Context:** Public GitHub repo. Attackers can scan, analyze, and attempt autonomous PRs. This doc defines protections against LLM-driven attack chains discovered 2024-2026.

---

## Vector 1: Malicious PRs from Compromised / Rogue LLMs

### Attack Pattern
1. Attacker runs local LLM with repo context
2. LLM generates malicious PR: adds credential exfiltration, backdoor logic, or prompt injection
3. PR auto-merges if CI passes (weak gate)

### Defense: Branch Protection + Manual Review Gate

```json
// .github/branch-protection.json (planned, via Vercel/GitHub API)
{
  "branch": "main",
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": false,
    "require_code_owner_review": true,
    "required_approving_review_count": 1
  },
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci/type-check", "ci/lint", "ci/test", "ci/build"]
  },
  "enforce_admins": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

**Implementation:** Branch protection enforced via GitHub UI (admin setting) or `gh api` post-setup. Thierry is CODEOWNER (@thierryvm in `.github/CODEOWNERS`).

**Cost:** Every merge requires Thierry approval. Acceptable for Phase 7b+ maturity.

---

## Vector 2: Unsigned Commits via Workflow / Local Pushes

### Attack Pattern
1. Attacker compromises GitHub token or local git config
2. Pushes unsigned commits that appear to be from Thierry
3. CI trusts commit and auto-merges (no signature verification)

### Defense: Required Signed Commits

```bash
# In .github/workflows/ci.yml (or vercel.json middleware)
# Reject unsigned commits early in CI
git verify-commit HEAD || { echo "Commit must be signed"; exit 1; }
```

**Setup (local):**
```bash
git config --global commit.gpgsign true
git config --global user.signingkey <GPG_KEY_ID>
```

**Cost:** All commits must be signed locally. One-time setup, then automatic.

**Status:** Optional for Phase 7b (recommendation). Mandatory for Phase 9+ (multi-tenancy, student data).

---

## Vector 3: Action Runner Token Compromise

### Attack Pattern
1. GitHub Action runner (`ubuntu-latest`) is compromised or hijacked
2. Runner exfiltrates secrets (VERCEL_TOKEN, SENTRY_DSN, etc.)
3. Attacker uses secrets to deploy malicious code to production

### Defense: Pin Action SHA (not tag mutable)

**Current (vulnerable):**
```yaml
- uses: actions/setup-node@v20  # ❌ Tag is mutable
```

**Fixed (resilient):**
```yaml
- uses: actions/setup-node@507323e2bf4a8c5ca2d5a8a4e3e7c9d0f1a2b3c4d  # ✅ SHA pinned
```

**Cost:** SHA pins require manual updates (no auto-update via Dependabot, which we skip).

**Benefit:** Prevents compromised action runner from downloading malicious step code.

**Status:** Audit `.github/workflows/*.yml` and pin all `uses:` to commit SHA before Phase 9.

---

## Vector 4: Supply Chain — Typosquatting + Malicious Dependencies

### Attack Pattern
1. Attacker publishes `@my-namespace/class-variance-auth0rity` (typo of class-variance-authority)
2. npm audit doesn't catch it (not in package.json CVE databases)
3. Transitive dependency pulls malicious code

### Defense: npm audit + package-lock.json integrity

```bash
npm audit --audit-level=high  # Weekly check
npm ci  # CI always uses lock file (never npm install)
```

**Lock file committed:** `package-lock.json` is in git, never regenerated in CI.

**Status:** ✅ Already enforced (package-lock.json committed, CI uses `npm ci`).

---

## Vector 5: Sentry Tunnel Abuse (SSRF via Own Infrastructure)

### Attack Pattern
1. Attacker finds Sentry tunnel endpoint `/api/sentry-tunnel` (public)
2. Uses it as proxy to scan internal AWS/Supabase endpoints
3. Exfiltrates API keys from internal services

### Defense: Sentry Tunnel Validation + Rate Limiting

**Implemented (Phase 7b):**
- DSN validation: only `sentry.io` allowed, no proxy to arbitrary hosts
- Rate limiting: 50 req/min per IP (Edge Function isolated)
- Scrubbing: all payloads scrubbed before relay (C3 layer)

**Cost:** None (already implemented).

**Status:** ✅ THI-120 phase 7b.

---

## Vector 6: Prompt Injection via GitHub Issues / PRs (Indirect)

### Attack Pattern
1. Attacker opens GitHub Issue with malicious prompt injection payload
2. Thierry/LLM agent reads issue, payload injects into system prompt
3. Agent bypasses guardrails and executes unauthorized code

### Defense: Sanitize External Input in Prompts

**Tools in place:**
- `prompt-guardrail-auditor` agent (gates before THI-111 AiTutorPanel)
- Input sanitizer: user-supplied content escapes HTML/markdown before prompt injection

**Cost:** Audit all user-facing inputs (GitHub issues, comments, uploaded files) before they reach prompts.

**Status:** ✅ Designed in ADR-005, enforced before THI-111.

---

## Summary: Defense Layers

| Vector | Attack | Defense | Cost | Status |
|--------|--------|---------|------|--------|
| **1** | Malicious PR auto-merge | Branch protection + code owner review | 1 approval/merge | 🔜 Phase 9 |
| **2** | Unsigned commit impersonation | Required signed commits | 1-time setup | 🔜 Phase 9 |
| **3** | Action runner token theft | Pin action SHA (not mutable tag) | Manual updates | 🔜 Audit Phase 9 |
| **4** | Typosquatted dep | npm audit + npm ci lock | None | ✅ Done |
| **5** | SSRF via Sentry tunnel | DSN validation + rate limit + scrub | None | ✅ THI-120 |
| **6** | Prompt injection via issues | Sanitize external input | Audit inputs | ✅ ADR-005 |

---

## Roadmap: Implement by Phase

- **Phase 7b (now):** ✅ SSRF + prompt injection gates designed
- **Phase 9:** Branch protection + signed commits mandatory (multi-tenancy, student data)
- **Phase 9+:** Action runner SHA pins audit (before public CI/CD secrets expanded)

---

**Authored:** 21 April 2026 (security-auditor post-audit recommendation)
