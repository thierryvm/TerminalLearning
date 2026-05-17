---
name: sustain-auditor
description: Quarterly sustainability health check for solo maintainer — document freshness, git pattern analysis (weekend/night commits, streaks), Sentry alert load, memory drift. Outputs 1-10 health score + warnings + recommendations. Trigger manual (comment) or scheduled quarterly.
---

# sustain-auditor Agent Specification

**Version** : 1.0 (Phase THI-129)
**Purpose** : Quarterly sustainability health check for solo maintainer
**Trigger** : Manual (comment on issue) or scheduled (quarterly)
**Inputs** : CLAUDE.md, git logs, Sentry patterns, memory index
**Outputs** : Health report (1-10 score) + warnings + recommendations

---

## Agent Responsibilities

### 1. Document Freshness Audit
```
Check:
- CLAUDE.md: last update date (target: ≤ 14 days)
- plan.md: last update date (target: ≤ 7 days)
- memory/MEMORY.md: all entries present + coherent (target: 100%)
- ADR files: all current major decisions documented (target: ≥95%)

Output:
- ✅ File: status "fresh" | ⚠️ "stale (N days)" | ❌ "missing"
```

### 2. Git Pattern Analysis
```
Check:
- Weekend commits (Sat/Sun) in last 90 days → WARN if > 20%
- Night commits (22:00-08:00) → WARN if > 10%
- Commit streaks (3+ days) → WARN if last 4 weeks
- Average commits/day → baseline for velocity trending

Output:
- Green: patterns show respect for rest cycle
- Yellow: occasional overwork, monitor
- Red: chronic overwork, rest cycle violated
```

### 3. Sentry Alert Patterns
```
Check:
- Night alerts (22:00-08:00) that woke Thierry → count
- Alert frequency per week → baseline
- Critical alerts requiring immediate response → count

Output:
- Green: 0 night pages
- Yellow: 1-2 per month (acceptable with schedule)
- Red: > 2 per month or pattern of night wakeups
```

### 4. Memory System Health
```
Check:
- memory/MEMORY.md entry count → target 30-50 (not too few, not overwhelming)
- Cross-session references working → test 5 random memory links
- Memory types represented → user / feedback / project / reference all present

Output:
- ✅ Healthy system
- ⚠️ Stale entries (>3 months old without update)
- ❌ Broken references or orphaned files
```

### 5. Workload Trending
```
Check:
- Issues in backlog → count by priority
- PRs in flight → count by age
- Milestone dates → slipping vs on-track
- Velocity vs capacity (commits/week vs sustainable pace)

Output:
- Green: Backlog manageable, PRs flowing, milestones on track
- Yellow: Backlog growing, PRs aged >1 week
- Red: Overwhelming backlog, stalled PRs, missed milestones
```

---

## Health Score Calculation

```
health_score = (docs_score + git_score + sentry_score + memory_score + workload_score) / 5

Ranges:
- 9-10: Sustainable, all guardrails respected
- 7-8: Stable, minor warnings
- 5-6: Concerning, recommend intervention
- 1-4: Critical, burnout risk
```

### Per-component scores (1-10):

**docs_score**
- 10: All docs fresh (≤ 14 days)
- 7: One file stale (15-30 days)
- 4: Multiple stale, missing sections
- 1: Critical gaps in CLAUDE.md or ADRs

**git_score**
- 10: Zero weekend commits, zero night commits
- 7: <10% weekend, <5% night commits
- 4: 10-20% weekend, 5-10% night
- 1: Frequent overwork pattern (>20% off-hours)

**sentry_score**
- 10: Zero night alerts
- 7: 1-2 night alerts per month
- 4: 3-5 per month
- 1: Chronic night pages (>5/month)

**memory_score**
- 10: 30-50 entries, all fresh, cross-referenced
- 7: 20-30 entries, some stale
- 4: < 20 entries OR many stale (>3 mo)
- 1: Broken memory system (orphaned, invalid links)

**workload_score**
- 10: Backlog < 20 items, PRs closing in <3 days
- 7: Backlog 20-40 items, PRs < 1 week
- 4: Backlog 40-60 items, PRs aging > 1 week
- 1: Overwhelming backlog (>60), stalled work

---

## Output Format

### Report Template
```markdown
# Sustain-Auditor Report — <DATE>

## Health Score: <X>/10

### Audit Summary
- Docs freshness: <status>
- Git patterns: <status>
- Sentry alerts: <status>
- Memory system: <status>
- Workload: <status>

### Key Findings
1. <Positive finding or warning>
2. <Finding>
3. ...

### Recommendations
- [ ] Action A (priority: <HIGH/MEDIUM/LOW>)
- [ ] Action B

### Trend (vs last quarter)
- Improving / Stable / Declining

### Next Review
- Date: <quarterly date>
- Trigger: Manual or scheduled
```

### Severity Levels
- **GREEN** ✅ : No action needed, sustainable trajectory
- **YELLOW** ⚠️ : Minor intervention recommended, monitor
- **RED** 🔴 : Burnout risk detected, immediate review recommended

---

## Integration Points

### Trigger mechanisms
1. **Manual** : Comment on issue `run sustain-auditor` or schedule special review
2. **Scheduled** : Cron job quarterly (or remind Thierry to run)
3. **Ad-hoc** : If health signals detected (late-night commits, stalled PRs), prompt review

### Output distribution
- **Primary** : Posted as comment on Linear issue THI-129 (sustain-auditor)
- **Secondary** : Saved to `docs/reports/sustain-auditor-<DATE>.md`
- **Alert** : If health_score ≤ 5, push notification to Thierry + Claude

### Follow-up actions
- Score ≤ 5 : Schedule "sustainability sync" with Claude to adjust practices
- Score 6-7 : Defer feature scope or extend timeline
- Score ≥ 8 : Continue current pace, update plan accordingly

---

## Implementation Notes (Phase THI-129 + beyond)

### Phase 1 (spec only)
- Write this spec ✓
- Draft agent skeleton (no automation yet)

### Phase 2 (post-Phase 7b)
- Build agent as Claude Code tool (Bash + shell script reading git/Sentry)
- OR build as GitHub Action checking metrics monthly
- OR build as manual checklist (Thierry runs quarterly)

### Phase 3 (refinement)
- Adjust component weights based on actual 2-3 quarterly runs
- Add more granular metrics if needed
- Automate via GitHub Actions + scheduled agent calls

---

## Success Criteria

This agent is successful when:
- ✅ Quarterly reports generated automatically or on-demand
- ✅ Thierry reviews report within 2 weeks of generation
- ✅ Recommendations acted upon within sprint (or explicitly deferred)
- ✅ Health score trending upward or stable (never declining)
- ✅ Rest cycle compliance ≥ 90% (measured in git patterns)
- ✅ No burnout incidents during Phase 7c (self-report + patterns)
