# ADR-001 — Positionnement LTI-first, pas LMS complet

**Date** : 17 avril 2026
**Statut** : Accepted
**Décideurs** : Thierry (owner), Claude (architecte)

## Contexte

Lors de la session stratégique du 16-17 avril 2026, la question s'est posée : Terminal Learning doit-il évoluer en LMS complet (Moodle-like, avec forums, gradebook, calendrier, messagerie) ou rester un outil pédagogique spécialisé intégrable dans les LMS existants ?

Moodle, Canvas, Blackboard représentent 20 ans de développement par des équipes full-time. Un bénévole solo fragile ne peut pas rivaliser. Par ailleurs, 90%+ des écoles belges utilisent déjà Smartschool, Office 365 Education ou Google Workspace EDU.

## Décision

**Terminal Learning se positionne comme outil pédagogique spécialisé LTI 1.3 compliant.**

- Les écoles l'intègrent comme "activity" dans leur LMS existant via un clic
- Les briques génériques (gradebook, calendrier, messagerie, forum) sont **déléguées** au LMS hôte via les APIs LTI (AGS, NRPS, DL 2.0)
- Terminal Learning se concentre sur ce qui n'existe nulle part ailleurs : curriculum terminal multi-env, tuteur IA socratique, Classroom-as-Code, TTFR tracking

## Conséquences

### Positives
- Effort concentré sur la différenciation pédagogique (pas de reconstruction d'infra LMS)
- Adoption virale possible via installation LTI en 1 clic dans Moodle/Canvas/Smartschool
- Compatible avec écosystème existant des écoles — zéro migration forcée
- Posture défendable : "on ne remplace pas votre LMS, on le complète"

### Négatives / risques
- Dépendance à l'adoption LTI par les écoles (certaines n'ont pas activé LTI dans leur Smartschool)
- Effort initial LTI 1.3 significatif (1-2 mois)
- Obligation de maintenir compatibilité LTI dans le temps

### Alternatives rejetées
- **LMS complet** : effort 5+ ans, burnout garanti pour solo maintainer
- **Standalone seulement** (statu quo) : plafond d'adoption B2B institutionnel
- **SCORM 2004** : standard plus ancien, moins adopté 2026, inférieur à LTI 1.3 pour interop temps réel

## Implémentation prioritaire
Voir `docs/processes/next-session-plan.md` section "LTI 1.3 + SSO OIDC".

## Mémoires liées
- `project_platform_vision_v2.md`
