# Session Kickoff Protocol — Terminal Learning

> **Protocol lu automatiquement quand Thierry dit "lance les process habituels" ou "début de session".**
> Dernière mise à jour : 17 avril 2026

---

## Étape 1 — Checks santé (obligatoire en premier)

Lire `C:\Users\thier\.claude\projects\f--PROJECTS-Apps-Terminal-Learning\memory\user_health_signals.md` et vérifier :

- Heure actuelle CET (Thierry UTC+1/+2) — si > 22h, proposer scope réduit ou report
- Nombre de sessions dans les 24 dernières heures
- Thierry a-t-il mentionné fatigue/santé dans les 3 derniers messages ?

Si **1+ signal rouge** → proposer explicitement pause ou scope réduit avant d'exécuter.

---

## Étape 2 — Invocation `linear-sync`

Lancer l'agent `linear-sync` :
- Vérifie cohérence PRs GitHub ↔ statuts Linear
- Détecte issues orphelines, branches orphelines, PR↔Linear mismatches
- Si CRITICAL détecté → corriger avant de continuer

---

## Étape 3 — État Git

Commandes parallèles :
```bash
git status
git log --oneline -5
git branch --show-current
```

Si branche ≠ `main` et uncommitted changes détectés → vérifier si en cours de work ou orphan.

---

## Étape 4 — Lire issue Linear active

Si Thierry a une issue `In Progress` assignée, la lire intégralement avant toute action.

---

## Étape 5 — Lire `next-session-plan.md` s'il existe

`docs/processes/next-session-plan.md` contient le plan préparé à la session précédente.

Si le fichier existe :
- Lire intégralement
- Proposer à Thierry de démarrer par la priorité #1 listée
- Ne pas commencer sans son "go" explicite

Si le fichier n'existe pas : demander à Thierry ce qu'il veut faire cette session.

---

## Étape 6 — Vérifier contexte mémoire

Vérifier que les mémoires suivantes sont fraîches (< 30 jours) :
- `project_platform_vision_v2.md` — **SOURCE DE VÉRITÉ** stratégique
- `project_terminal_learning.md` — état phases
- `user_health_signals.md` — règle slow-down
- `feedback_session_protocol.md` — règles opérationnelles

Si > 30 jours non modifié sur un fichier core → flag à Thierry pour refresh éventuel.

---

## Étape 7 — Vérification fichiers CLAUDE.md

Les CLAUDE.md (global + projet) sont injectés automatiquement dans le contexte système par Claude Code. Vérifier :
- `C:\Users\thier\.claude\CLAUDE.md` — règles globales dev
- `f:\PROJECTS\Apps\Terminal Learning\CLAUDE.md` — règles projet

Priorité : **projet > global > instructions user**.

---

## Checklist sortie de session

À la fin d'une session, avant de rendre la main :

1. ✅ Todo items marqués `completed` dans TodoWrite
2. ✅ `git status` clean OU branche working committed+pushed
3. ✅ Issues Linear mises à jour (statut + commentaire si bloqué)
4. ✅ Si release majeure → lire `docs/processes/release-sync-checklist.md`
5. ✅ Si décisions stratégiques prises → créer un ADR ou mémoire
6. ✅ Si contexte saturé → proposer `/compact`
7. ✅ Si prochaine session nécessite préparation → écrire `docs/processes/next-session-plan.md`

---

## Règles d'or durant la session

- **Jamais** de commit direct sur `main`
- **Jamais** d'action destructive sans confirmation explicite Thierry
- **Jamais** de migration Supabase sans confirmation explicite
- **Jamais** de nouvelle dépendance npm sans confirmation explicite
- **Jamais** de claim public (landing, LinkedIn, HN) sans validation texte par texte
- **Toujours** CI verte + Sourcery checked + preview Vercel validée avant merge
- **Toujours** mettre à jour docs (`plan.md`, `ROADMAP.md` si phase avance) avant de clôturer

---

## En cas de blocage

- **Préférer pause et report** à un rush fatigué qui casse
- **Signaler explicitement** le blocage à Thierry
- **Proposer 2-3 alternatives** chiffrées en effort/impact
- **Ne jamais deviner** — demander clarification si ambigu
