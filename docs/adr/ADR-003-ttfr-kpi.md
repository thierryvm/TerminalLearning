# ADR-003 — TTFR (Time To First Real-world command) comme KPI central

**Date** : 17 avril 2026
**Statut** : Accepted
**Décideurs** : Thierry (owner), Claude (architecte)

## Contexte

Les métriques traditionnelles d'une plateforme pédagogique (inscription, taux de complétion, temps passé) sont superficielles et ne défendent pas la valeur réelle de Terminal Learning face à YouTube gratuit, Claude Code, ou ChatGPT.

La vraie valeur pédagogique = **l'étudiant devient autonome dans un vrai terminal**, pas "il a cliqué sur toutes les leçons".

## Décision

**TTFR (Time To First Real-world command)** devient le KPI central du projet.

### Définition
**TTFR** = temps entre l'inscription d'un étudiant et sa première commande terminale exécutée dans un *vrai* terminal (hors app), pour résoudre un *vrai* problème.

### Mécanisme de mesure
- Module dédié ou exercice transversal demande : "Exécute `uname -a` (ou `git log --oneline -3` sur un repo perso) dans ton propre terminal, puis colle la sortie ici"
- Regex de validation vérifie la plausibilité de la sortie (format attendu, variations contextuelles)
- Timestamp stocké dans Supabase : `profiles.ttfr_timestamp` + `profiles.ttfr_first_command`
- Agent `ttfr-analytics` calcule distribution par cohorte, vélocité, modules de décrochage

### Seuils cibles
- **Médiane TTFR < 3 heures** (étudiant diligent → terminal réel en 1 après-midi)
- **P90 TTFR < 7 jours** (étudiant intermittent → terminal réel en une semaine)
- **Taux TTFR atteint > 70% à J+30** (crédibilité institutionnelle)

## Conséquences

### Positives
- KPI défendable devant direction d'école : "87% de nos élèves utilisent le terminal réel dans les 3 semaines"
- Force chaque décision curriculaire à se justifier : "est-ce que ça rapproche de la première utilisation réelle ?"
- Élimine les modules "gratuits mais inutiles"
- Différenciation nette vs YouTube/ChatGPT (eux ne peuvent pas prouver l'usage réel)

### Négatives / risques
- Validation regex peut donner des faux positifs (étudiant copie-colle la sortie de ChatGPT)
- Biais self-report (l'étudiant doit volontairement faire l'étape)
- Peut être triché → KPI secondaire nécessaire (ex : fréquence retour sur l'app après TTFR)

### Alternatives considérées
- **Taux de complétion modules** : métrique passive, ne prouve pas l'apprentissage
- **Note d'évaluation finale** : coûteux à construire, peu différenciant
- **NPS/satisfaction étudiant** : utile mais subjectif

## Implémentation
- Phase 7 ou avant (audit multi-tenancy + schema ttfr)
- Migration Supabase : ajouter `ttfr_timestamp TIMESTAMPTZ NULL`, `ttfr_first_command TEXT NULL` sur `profiles`
- Exercice "Mission terrain" ajouté dans module transversal
- Agent `ttfr-analytics` créé au 2e usage

## Claims publics
- ✅ "Nous mesurons le temps jusqu'à la première commande réelle" (vrai, mesurable)
- ❌ "X% de nos élèves deviennent dev pro" (non démontrable, éviter)

## Mémoires liées
- `project_platform_vision_v2.md`
