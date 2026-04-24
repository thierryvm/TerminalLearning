# Audit externe @cowork — Terminal Learning — V2 (décisions finales)

**Date** : 24 avril 2026 (fin de journée, post-rapport critique @cc-terminal)
**Statut** : V2 — décisions finales tranchées par @thierry
**Remplace** : `2026-04-24-cowork-external-audit.md` (V1) — gardé en archive pour traçabilité

---

## 0. Historique de la décision

- **V1** (ce matin) : @cowork audite depuis l'extérieur → 3 angles morts identifiés (LTI pas codé, TTFR fragile, curriculum debt) + 3 recos priorisées (LTI first, curriculum grammar, sustain plan humain).
- **Rapport critique @cc-terminal** (cet après-midi) : validation 2/3 avec rationale + **challenge timing séquentiel** (finir Phase 7b avant LTI) + alternative pragmatique curriculum (CSV puis YAML progressif) + 4 questions business à @thierry.
- **V2** (maintenant) : @thierry répond aux 4 questions, @cowork accepte la plupart des challenges CC + ajoute un SPIKE LTI en parallèle pour dérisquer. Plan final verrouillé.

---

## 1. Ce que @cowork a cédé à @cc-terminal (challenges acceptés)

### ✅ Timing séquentiel Phase 7b avant Phase 7c LTI

@cc-terminal avait raison. Interrompre AI Tutor V1 (THI-111/112/113) pour attaquer LTI = casser le momentum + dette pédagogique. **Phase 7b continue priorité #1**, LTI devient Phase 7c.

### ✅ Alternative curriculum en 2 phases

@cc-terminal a proposé Phase A (CSV export 1 semaine) → Phase B (YAML grammar progressive, backlog). C'est supérieur à la reco @cowork initiale "YAML full 2 semaines" parce que sans contributeurs pédagogues externes actifs aujourd'hui, le ROI immédiat du YAML est faible. **Phase A validée**, Phase B en backlog avec **deadline fin Q3 2026** (pas "un jour").

---

## 2. Le contre-challenge @cowork (ajout mineur)

### SPIKE LTI 1 semaine EN PARALLÈLE Phase 7b

Pas une implémentation prod. Objectif : **dérisquer Phase 7c** avant qu'elle commence.

- Écrire **ADR-006** (implémentation LTI 1.3 choisie : 1.3 only, AGS activé, mapping rôles)
- **POC Canvas sandbox** (Free-for-Teacher, gratuit) qui valide que les clés LMS/AGS fonctionnent
- **Zéro code prod**, juste de la recherche technique

**Coût** : 5-10h diffuses sur Phase 7b (40h/semaine).
**Gain** : quand Phase 7c commence, aucune découverte tardive de type "LTI 1.3 mapping ne fonctionne pas avec Moodle sur la version X".

---

## 3. Réponses @thierry aux 4 questions @cc-terminal

### Q1 — Timing LTI
**Réponse** : Phase 7c accepté + **SPIKE 1 semaine en parallèle Phase 7b** (contre-challenge @cowork ci-dessus). Communication aux écoles potentielles : "LTI integration, Q3 2026".

### Q2 — Contributeurs pédagogues externes
**Réponse @thierry** : **ZÉRO pour l'instant**. Projet 100 % solo, pas de pédagogue externe actif ni prévu court terme.
**Décision** : Phase A CSV livrée (quick win pour collecte feedback future), Phase B YAML en backlog **avec deadline fin Q3 2026** pour forcer revue décision objective.

### Q3 — Sustain plan
**Réponse @thierry (intégrale, à respecter)** :
> "Pas les moyens de prendre quelqu'un avec moi. Je forme un excellent combo avec vos instances Claude et mes agents mis en places par projet. Motivation à toute épreuve sur mes 2 projets pour ma future reconversion pro. Si mes projets décollent, j'ai une base solide pour démontrer mes compétences et comment j'ai été augmenté avec Claude, sans le moindre compromis y compris sur la sécurité globale."

**Implication** : **pas de pair humain**. Le sustain plan doit être **reframé autour d'IA + process + docs**.

### Q4 — RIZIV / GitHub Sponsors
**Réponse @thierry** : démarches en cours. Psychologue a signé la lettre pour Solidaris demandant accès à un revenu partiel lié au projet (sans perte de revenus actuels). Rendez-vous Solidaris à prendre.
**Impact Terminal Learning** : zéro technique. **Impact communication publique** : la phrase actuelle du README *"GitHub Sponsors — activated, donations on hold (pending Solidaris / RIZIV-INAMI authorization)"* est un red flag externe (recruteur/école qui lit sans contexte peut interpréter "projet bloqué"). À reformuler.

---

## 4. Sustain plan REFRAMÉ (sans pair humain)

Puisque @thierry travaille seul et forme un combo IA+agents satisfaisant, le sustain plan doit être **systémique** (process + docs + agents), pas humain.

### (a) ADR-007 "Solo-sustainable practices"

Formaliser dans un ADR les règles :
- **Rest cycle hebdo** — 1 jour off minimum (typiquement dimanche), pas de commit ni review
- **Alerts Sentry fine-tuned** — jamais un bug prod ne doit réveiller @thierry la nuit (severity-based routing)
- **Documentation vivante** — toute décision humaine critique doit vivre dans `docs/processes/`, pas uniquement dans la tête de @thierry
- **Bus factor mitigation** — si @thierry pause forcée (santé, Solidaris, etc.), les docs permettent relève par lecture (future co-maintainer ou continuité @cc-terminal + @cowork)
- **Limite PR-par-jour** — pas plus de 2 PRs mergées/jour en moyenne sur 7j glissant (indicateur de fatigue)

### (b) Nouvel agent `.claude/agents/sustain-auditor.md`

Audit **mensuel automatique** de la charge cognitive :
- PRs stale (ouvertes > 14 jours)
- Issues stale (sans activité > 30 jours)
- Commits tardifs (> 23h heure belge) — signal fatigue
- Vélocité hebdo vs baseline (si + 40 % = warning)
- Rapport posté en issue GitHub + notif Slack channel TerminalLearning dédié

### (c) Docs/guides/ renforcées pour onboarding externe futur

Pas pour un co-maintainer maintenant. Pour le jour où @thierry décide d'ouvrir (ou doit passer la main temporairement). Les guides `student-guide.md`, `teacher-guide.md`, `institution-guide.md` existent déjà. Ajouter : `docs/guides/contributor-onboarding.md` + `docs/guides/maintainer-continuity.md`.

---

## 5. GitHub public polish — 5 quick wins (~2h total)

Depuis un audit externe de `github.com/thierryvm/TerminalLearning` :

**(a) OG social preview customisée** → image 1280×640 brandée uploadée dans Settings → Social preview. Impact Twitter/LinkedIn énorme.

**(b) Tag v0.1.0 release** → cohérent avec CHANGELOG existant, signale "projet vivant avec versions". Pour l'instant 0 release = amateur visuel.

**(c) Badge CI dynamique** dans README → GitHub Actions status (`shields.io/github/actions/workflow/status/...`). Le README annonce "all PRs must pass CI" mais rien ne le prouve publiquement.

**(d) Reformuler la phrase RIZIV** → avant : *"GitHub Sponsors — activated, donations on hold (pending Solidaris / RIZIV-INAMI authorization)"*. Après : *"Open-source by choice — sponsor support available once regulatory setup is complete."* Plus pro, retire le jargon belge, reste honnête.

**(e) Badge Lighthouse** (optionnel, si CI Lighthouse run) → preuve visuelle de qualité perf/a11y.

---

## 6. Plan final verrouillé — ordre d'exécution

```
1. Phase 7b AI Tutor V1 (THI-111/112/113) — priorité #1 — 2-3 semaines
2. SPIKE LTI (ADR-006 + POC Canvas) — 1 semaine diffuse parallèle Phase 7b
3. Phase A Curriculum CSV export — 1 semaine parallèle Phase 7b ou 7c
4. ADR-007 Solo-sustainable + agent sustain-auditor — 3 jours
5. GitHub public polish (5 quick wins) — 2h
6. Phase 7c LTI 1.3 client full — 4-6 semaines après Phase 7b
7. Phase B YAML grammar — BACKLOG, deadline fin Q3 2026 (revue objective)
```

---

## 7. Prompt prêt à coller pour @cc-terminal (Antigravity / Claude Code Opus)

```markdown
@cc-terminal — Décisions finales post-audit @cowork V2

Contexte : Ton rapport critique a été analysé par @thierry et @cowork. Tes challenges étaient justes. Ajustements mineurs ajoutés. Plan final verrouillé dans docs/audits/2026-04-24-cowork-external-audit-v2.md — lis-le intégralement avant tout.

=== Résumé des décisions ===

1. TIMING — Tu avais raison sur le séquentiel Phase 7b avant LTI. Ajustement @cowork : SPIKE LTI 1 semaine EN PARALLÈLE Phase 7b (5-10h diffuses), objectif ADR-006 + POC Canvas sandbox, zéro code prod. But : dérisquer Phase 7c.

2. CURRICULUM — Ton alternative validée : Phase A CSV (1 semaine), Phase B YAML = BACKLOG avec DEADLINE fin Q3 2026 (pas vague).

3. SUSTAIN PLAN — Réponse @thierry : PAS de co-maintainer humain prévu. Il travaille seul par choix + contrainte (Solidaris/RIZIV). Il forme un combo IA+agents satisfaisant. Le sustain plan est REFRAMÉ autour d'IA + process + docs, pas d'humain. Voir section 4 du V2.

4. RIZIV — Démarches en cours (psychologue a signé lettre Solidaris). Impact technique : zéro. Impact public : reformuler la phrase du README (voir section 5d du V2).

5. POLISH GITHUB PUBLIC — 5 quick wins ~2h total (OG image, release tag v0.1.0, badge CI dynamique, reformulation RIZIV, badge Lighthouse optionnel).

=== Ta mission ===

1. Créer les issues Linear dans cet ordre :
   - THI-LTI-spike : "SPIKE LTI 1.3 — ADR-006 + POC Canvas sandbox" (1 sem diffuse parallèle Phase 7b)
   - THI-CURRICULUM-csv : "Phase A curriculum export CSV/Google Sheets" (1 sem)
   - THI-SUSTAIN-adr007 : "ADR-007 Solo-sustainable + agent sustain-auditor" (3 jours)
   - THI-POLISH-public : "GitHub public polish — 5 quick wins" (2h)
   - THI-LTI-phase7c : "Phase 7c LTI 1.3 client full" (4-6 sem, après Phase 7b)
   - THI-CURRICULUM-yaml : "Phase B YAML grammar" — BACKLOG, deadline fin Q3 2026

2. Drafter ADR-006 — LTI 1.3 : 1.3 only, AGS activé, mapping rôles LMS → RBAC TL (Instructor → teacher, Learner → student, Admin → institution_admin), sandbox Canvas Free-for-Teacher.

3. Drafter ADR-007 — Solo-sustainable practices (rest cycle, alerts fine-tuning, doc vivante, bus factor mitigation, PR-par-jour cap).

4. Créer `.claude/agents/sustain-auditor.md` — audit mensuel charge cognitive (PRs stale, issues stale, commits tardifs, vélocité vs baseline), rapport en issue GitHub + notif Slack.

5. Commencer par la PR la plus dérisquante du SPIKE LTI : setup sandbox Canvas + 1 endpoint `/api/lti/launch` minimal qui consomme JWT sans persister de data prod. Objectif : découvrir tôt les incertitudes techniques.

6. Rapport final à @thierry :
   - Issues Linear créées (liens)
   - ADRs draftés (chemins)
   - Prochaine PR ouverte (numéro + scope)
   - Estimations ajustées si nécessaire

=== Contraintes rappelées ===
- Agents QA obligatoires avant merge (security-auditor, prompt-guardrail-auditor, ui-auditor, content-auditor, curriculum-validator, etc.)
- PR < 600 lignes sauf justification
- RLS Supabase obligatoire sur toute nouvelle table
- Gitleaks pré-commit obligatoire
- ADRs obligatoires pour toute décision architecturale majeure

=== Posture ingénieur partenaire rappelée ===
Ce plan n'est PAS un ordre descendant. Si tu identifies un problème d'exécution technique (contrainte Supabase limits, dépendance Vercel Hobby, ordre de PRs plus efficient pour éviter un rebase hell), challenge-le AVANT d'agir. @thierry tranche en dernier.

Go.
```

---

## 8. Note finale @cowork

@thierry, tu as dit :
> "Je forme un excellent combo avec vos instances Claude et mes agents."

Confirmé côté @cowork. Ta maîtrise de **l'orchestration multi-agents** (Cowork + CC Terminal Learning + CC Ankora + CC Design + agents QA spécialisés par projet) est le vrai asset transférable pour ta reconversion pro. Ce n'est pas "un solopreneur qui code" — c'est **"un product owner qui augmente ses capacités via 4 agents IA complémentaires sans compromis sécurité"**. Cette histoire se raconte. Terminal Learning en est la preuve technique, Ankora la preuve business. Les deux projets se valident mutuellement.

Bonne nuit. À demain au reset Claude Design.
