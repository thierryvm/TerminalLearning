# ADR-007 — Solo Maintainer Sustainability Practices

**Date** : 24 avril 2026
**Statut** : Proposed (implementation Phase 7c)
**Décideurs** : Thierry (owner), Claude (architecte)

---

## Contexte

Terminal Learning est maintenu par un bénévole solo qui combine :
- Maladie chronique (5 ans) + dépression historique → énergie cognitive limitée
- Engagement long terme (10+ ans vision) + accumulation de responsabilité technique
- Risque documenté de burnout sans intervention structurelle

**Paradoxe** : Plus le projet réussit (adoption B2B, Phase 7c LTI, agent IA), plus la charge augmente. Sans pratiques explicites de durabilité, le succès devient non-durable.

**Audit 2026** (cowork, 24 avril) recommande : "Formalize sustainability practices. The founder's health is critical infrastructure."

## Décision

**Terminal Learning adopte un protocole de durabilité pour mainteneur solo**, structuré en 3 piliers :

### 1. Rest Cycle (Sacrée)

- **1 jour/semaine minimum SANS commits/reviews** (samedi ou dimanche fixe)
- **0 Sentry alerts la nuit** (critère accepté : aucun incident page oncall 22h-8h)
- **0 GitHub notifications sur téléphone** (asynchrone sur PC workday seulement)
- **Quarterly reviews** : re-évaluer charge de travail avec Claude chaque trimestre

### 2. Living Documentation (Mémoire augmentée)

Tout ce qui vit dans la tête de Thierry doit être écrit :

- **`CLAUDE.md`** : directives projet, règles git, checklist session (mis à jour hebdo)
- **`docs/processes/`** : runbooks, escalade, release process, onboarding futur
- **ADRs** : décisions critiques + rationale (pas de surprise technique)
- **Memory system** : `~/.claude/projects/f--PROJECTS-Apps-Terminal-Learning/memory/` (notes structurées, cross-session)
- **Inline comments** : _uniquement_ pour le "pourquoi" non-évident (pas "what")

**Impact** : Replaçabilité. Si Thierry quitte, l'app survit par la documentation.

### 3. Augmented Intelligence (Claude as co-maintainer)

IA ne remplace pas, mais _augmente_ :

- **Session protocol** : `linear-sync` → `git status` → lire issue → agir (5-10 min setup)
- **Guardrails** : Agents obligatoires (security, ui, curriculum validators) = QA sans fatigue
- **Context budgeting** : `/compact` régulièrement, ne pas laisser une session s'effondrer
- **Decision delegation** : Claude décide technique (sauf si Thierry flag "need discussion")
- **Async feedback** : PR reviews via comments, pas meetings sync

---

## Conséquences

### Positives

- **Sustainability** : Thierry peut maintenir le projet 10+ ans sans burnout
- **Quality** : Agents + documentation → moins de bugs, plus de traçabilité
- **Bus factor** : Documentation + Claude memory = community peut onboard après
- **Community trust** : "Solo maintainer who does it right" > burnout + revert commits
- **Competes with burnout** : Structures explicites battent bonnes intentions + fatigue

### Négatives

- **Discipline required** : Rest day + documentation discipline, pas optionnel
- **New overhead** : Memory updates, CLAUDE.md, ADRs — ~5% velocity burn
- **Risk if abandoned** : If practices lapse, technical debt re-accumulates quickly
- **Scaling limit** : Practices keep solo sustainable, but don't enable 10 contributors

### Trade-offs

- **Slower feature velocity** : Sustainability ≠ maximum speed. Acceptable.
- **More documentation** : Some time spent writing > time lost to context-switching. Acceptable.
- **IA dependency** : Claude augments, doesn't replace. Thierry makes final calls. Acceptable.

---

## Alternatives Rejetées

- **No change** : Solo maintainer + no structure = burnout within 18 months (observed pattern in OSS)
- **Hire co-maintainer** : Forces fund sourcing, dilutes vision, doesn't fit volunteer model
- **Reduce scope** : Killing features = demoralizing. Durability via structure > scope cut
- **Distribute to team** : Terminal Learning is solo-viable iff processes scale to 1 person
- **IA full automation** : Would require "AI maintainer" (not ready 2026), risks divergence

---

## Implémentation

### Phase 1 (THI-129 — now)
1. Write ADR-007 (this doc) ✓
2. Draft `sustain-auditor` agent spec (see below)
3. Update CLAUDE.md + memory with explicit rest cycle + doc guidelines
4. Commit + publish for transparency

### Phase 2 (post-Phase 7b)
1. Integrate sustain-auditor agent into session protocol
2. Run first quarterly review (3 months post-go-live)
3. Adjust practices based on real metrics

### Metrics to track
- **Rest compliance** : % of no-commit days met (target: 100%)
- **Doc freshness** : CLAUDE.md + plan.md age (target: updated within 2 weeks of PR)
- **Memory utilization** : cross-session decisions informed by prior memory (target: >70%)
- **Burnout signals** : late-night commits, 3-day streaks, skipped rest days (target: zero)

---

## Sustain-Auditor Agent Specification

A new agent (`sustain-auditor`) runs quarterly to audit sustainability metrics :

### Inputs
- `CLAUDE.md` freshness (date last updated)
- `memory/MEMORY.md` size + age of entries
- Git logs for commit patterns (weekends, night time, streaks)
- Sentry alert patterns (night pages, frequency)

### Outputs
- **Health score** (1-10) on sustainability trajectory
- **Warnings** : "3-day commit streak detected", "CLAUDE.md outdated by 14 days"
- **Recommendations** : "Consider reducing Phase 8 scope" or "Rest week suggested"
- **Trend** : Improving / Stable / Declining

### Trigger
- Manual : `gh issue comment --issue THI-<number> --body "run sustain-auditor"`
- Scheduled : Quarterly (April, July, October, January)
- Ad-hoc : If Thierry feels burnout, comments "sustainability check"

---

## Definitions & Guardrails

### "Rest cycle" means:
- NO git commits (code/docs/config)
- NO PR reviews/merges
- NO Sentry alerts in inbox (filters prevent them)
- ALLOWED: reading docs, thinking, planning next quarter, message replies

### "Living documentation" means:
- Decision + rationale in writing (not email, not Slack)
- Accessible to future Thierry + future maintainer
- Validated by Claude (agents check inconsistencies)
- Durable format (Markdown, not video, not voice memo)

### "Augmented intelligence" means:
- Claude is _decision support_, not decision-maker
- Thierry retains veto on all technical + ethical choices
- Agents flag issues, Thierry decides action
- No IA making unilateral product changes

---

## Related Documents

- `CLAUDE.md` — global + project development profile
- `docs/plan.md` — current implementation roadmap
- `docs/security.md` — security practices (complementary to sustainability)
- `user_health_signals.md` — memory entry on Thierry's health context

---

## Success Criteria (for Phase 7c review)

✅ ADR-007 written + committed (Phase THI-129 done)
✅ sustain-auditor agent spec drafted
✅ Rest cycle respected for 8 weeks (end of Phase 7c)
✅ CLAUDE.md + memory updated >= weekly
✅ Zero burnout signals (git patterns, Sentry, self-report)
✅ Velocity stable (no degradation vs Phase 7b)
