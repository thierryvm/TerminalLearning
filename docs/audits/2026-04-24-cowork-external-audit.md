# Audit externe @cowork — Terminal Learning

**Date** : 24 avril 2026
**Auditeur** : @cowork (partenaire Ankora, regard externe sur Terminal Learning à la demande de @thierry)
**Scope** : analyse stratégique des docs, ADRs, CHANGELOG, ROADMAP, plan.md, guides, sécurité, architecture. Aucune ligne de code lue.

---

## 0. Reconnaissance préalable — la stratégie de @cc-terminal était LA bonne

Avant toute recommandation, je tiens à le poser : **la décision de stabiliser l'architecture + la sécurité + les performances AVANT d'étendre aux personae et aux intégrations LMS était stratégiquement juste**. Construire LTI 1.3 par-dessus un RBAC non robuste, un CSP mou ou des prompts non audités aurait créé de la dette structurelle massive. Les Phases 1-7 ont posé les fondations — c'est exactement ce qu'un bon architecte fait avant d'ouvrir les vannes.

Ce qui change aujourd'hui : **les fondations sont suffisamment solides pour supporter l'expansion verticale (LTI + personae)**. Le pivot de focus est désormais légitime. C'est le bon timing, pas un rattrapage.

---

## 1. Les 3 angles morts identifiés

### ① LTI 1.3 : décidé dans ADR-001, pas encore codé

Tu as documenté le positionnement LTI-first, les personae (student/teacher/institution_admin/super_admin), le RBAC, les guides. Mais **aucun endpoint LTI n'existe dans le code**. Sans `/api/lti/launch` + grade passback AGS + mapping JWT LMS → session Supabase, Terminal Learning reste un outil pour autodidactes — pas une plateforme institutionnelle.

**Impact** : zéro traction B2B possible tant que ce pont n'est pas posé. C'est l'écart le plus grand entre la vision et l'exécution actuelle.

### ② TTFR comme KPI unique : poétiquement juste, techniquement fragile

ADR-003 choisit "Time To First Real-world command" comme Nord. Le problème :
- Validation = regex sur input utilisateur copié-collé (auto-report, trichable)
- Biais massif : ceux qui oublient l'étape = pas enregistrés
- Impossible à prouver fiablement sans accès système externe

**Impact** : risque de décideur déçu à 6 mois (écoles qui challengent la métrique).

### ③ Curriculum debt silencieuse

64 leçons + 900 tests en TypeScript couplé. Pas de "grammar of curriculum" (YAML/JSON Zod-validé). Ajouter un Module 12 ou pivoter pédagogiquement = refactor code, pas refactor data. L'onboarding contributeurs pédagogues est frictionnel (ils devraient pouvoir éditer du YAML, pas du TS).

**Impact** : scalabilité pédagogique bridée, vélocité future à risque.

---

## 2. Les 3 recommandations priorisées

### #1 — LTI 1.3 client-side (PRIORITÉ MAXIMALE — bloquant vision B2B)

- Endpoint Edge Function `/api/lti/launch` qui consomme JWT du LMS hôte, crée/récupère utilisateur, injecte dans session Supabase
- Mapping rôles LMS (Instructor, Learner, Admin) → Terminal Learning (teacher, student, institution_admin)
- Grade passback via **Assignment and Grade Services (AGS)** — étudiant termine Module 5, Terminal Learning pousse note dans Moodle/Canvas gradebook
- Tests e2e avec **Canvas Free-for-Teacher** sandbox (gratuit, bac à sable stable)
- Nouveau ADR-006 pour documenter l'implémentation LTI choisie (1.3 only, pas 1.1 legacy)

**Effort estimé** : 4-6 semaines solo.

### #2 — Curriculum grammar (PRIORITÉ HAUTE — structural)

Formaliser le curriculum en YAML/JSON Zod-validé, générer le TypeScript from data :

```yaml
module_id: 5
title: "Redirection & Pipes"
lessons:
  - id: ls_pipe_grep
    title: "Combiner ls et grep"
    commands: ["ls", "|", "grep"]
    tests:
      - input: "ls | grep test"
        expected_output_pattern: "test_file.txt"
        skip_envs: []
```

Puis `src/app/data/curriculum.ts` = **generated from YAML**, pas manually edited. Tooling :
- Script `npm run curriculum:validate` qui vérifie structure + prérequis + commandes testées
- Script `npm run curriculum:export` qui génère CSV/Google Sheets pour enseignants

**Effort estimé** : 2 semaines.

### #3 — Sustain plan (PRIORITÉ HAUTE — humain, pas technique)

Identifier UNE personne (même pas co-maintainer, juste **pair programming 2h/semaine**). Objectifs :
- Réduire la charge mentale des audits sécurité
- Transférer du contexte (bus factor > 1)
- Donner une deadline externe (accountability naturelle)

**Effort** : 1 conversation, 1 engagement récurrent. **Impact** : la plus grande protection contre le burnout mainteneur solo.

---

## 3. Prompt prêt à coller pour @cc-terminal (Antigravity / Claude Code Opus)

```markdown
@cc-terminal — Audit externe @cowork reçu (24 avril 2026)

Contexte : @cowork (mon partenaire technique sur Ankora) a audité Terminal Learning depuis l'extérieur à ma demande. Son rapport complet est dans docs/audits/2026-04-24-cowork-external-audit.md.

Il valide explicitement ta stratégie "stabiliser avant expandre" (Phases 1-7). Pas de remise en cause. Mais il identifie 3 angles morts critiques maintenant que les fondations sont solides.

Ta mission (dans cet ordre, sans improviser l'ordre) :

1. LIRE docs/audits/2026-04-24-cowork-external-audit.md intégralement (sections 1, 2, 3).

2. RELIRE :
   - docs/adr/ADR-001-lti-first-positioning.md (vision LTI-first)
   - docs/adr/ADR-003-ttfr-kpi.md (KPI TTFR)
   - docs/ROADMAP.md (où on en est)
   - docs/plan.md (plan actuel)

3. POSTURE INGÉNIEUR PARTENAIRE — relire l'audit @cowork avec un œil critique :
   - Est-ce que LTI 1.3 first est VRAIMENT la bonne priorité par rapport à ce qui est en cours (Phase 7b AI Tutor V1, Phase 8 Ticket System prévue) ?
   - Est-ce que TTFR peut être sauvé avec un signal secondaire, ou faut-il vraiment changer de KPI ?
   - Est-ce que le curriculum grammar (YAML) vaut l'effort vs continuer en TypeScript couplé ?
   - Y a-t-il des contraintes internes (Supabase limits, Vercel Hobby, dépendances) qu'@cowork n'a pas vues ?

4. PRODUIRE UN RAPPORT CRITIQUE AVANT D'AGIR :
   - Section "Je valide (X/3 recos)" avec rationale
   - Section "Je challenge" si désaccord (avec preuves techniques)
   - Section "Je propose une alternative" si meilleur chemin identifié
   - Section "Questions à @thierry" si décision business nécessaire

5. SI @thierry VALIDE LE PLAN (ou un plan ajusté) :
   - Créer les issues Linear correspondantes (LTI-1.3-client, curriculum-grammar, etc.)
   - Rédiger ADR-006 pour l'implémentation LTI 1.3 choisie (1.3 only, AGS activé, mapping rôles défini)
   - Découper LTI en 4-6 PRs atomiques (< 600 lignes chacune)
   - Commencer par la PR la plus risquée (celle qui révèle le plus tôt les incertitudes techniques)

CONTRAINTES NON NÉGOCIABLES (rappel) :
- Tous les agents QA tournent AVANT merge (security-auditor, prompt-guardrail-auditor, ui-auditor, etc.)
- CSP strict, pas d'unsafe-eval, pas de wildcard
- RLS Supabase obligatoire sur toute nouvelle table
- Tests e2e Playwright pour tout nouveau endpoint LTI
- Aucun secret hardcodé (gitleaks scan pré-commit)
- ADR-006 obligatoire pour LTI (décision documentée)

CE QUE JE NE VEUX PAS :
- Que tu attaques l'implémentation avant ton rapport critique
- Que tu valides en bloc sans challenger
- Que tu lances 3 chantiers en parallèle (LTI + curriculum + autre) — priorité séquentielle
- Que tu proposes un "mini-LTI" qui couvre 30% et qu'on mergera jamais en prod

Livre ton rapport critique en markdown dans la conversation. Puis on tranche ensemble @thierry.
```

---

## 4. Note finale

Ce document peut être référencé dans les futures sessions Claude Code via `@docs/audits/2026-04-24-cowork-external-audit.md`. Il reste en place comme trace historique de la transition "stabilisation → expansion".

Si des recommandations évoluent après challenge de @cc-terminal, **ne pas modifier ce fichier** — créer un nouveau `docs/audits/2026-04-24-cc-terminal-response.md` en réponse. La traçabilité des désaccords techniques est précieuse.
