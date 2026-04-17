# ADR-004 — Classroom-as-Code via UI Composer (JSON en stockage)

**Date** : 17 avril 2026
**Statut** : Accepted
**Décideurs** : Thierry (owner), Claude (architecte)

## Contexte

Un enseignant belge avec 25 élèves × 3 classes n'a **pas 2 heures** à consacrer à apprendre un nouvel outil. La charge mentale d'onboarding prof est un critère bloquant pour l'adoption institutionnelle.

Initialement, l'idée "Classroom-as-Code" = JSON versionnable forkable était techniquement élégante mais pédagogiquement inaccessible : un prof sans background technique n'éditera jamais du JSON.

Moodle, Canvas, Blackboard n'offrent pas d'équivalent : un prof qui crée un super parcours ne peut pas le partager facilement avec un collègue — c'est une perte pédagogique massive au niveau communauté enseignante.

## Décision

**UI Pedagogy Composer + JSON comme format de stockage/export invisible.**

### Architecture à 3 couches

1. **Couche UI (visible prof)**
   - Page `/teacher/compose`
   - Panneau gauche : bibliothèque modules/leçons existants
   - Panneau droit : parcours en composition (drag-and-drop)
   - Cochage fin par leçon, réorganisation, définition deadlines
   - Preview temps réel de la vue élève
   - Boutons "Enregistrer brouillon" / "Publier à ma classe" / "Partager (fork public)"

2. **Couche stockage (invisible)**
   - Table Supabase `parcours` avec colonne `definition JSONB`
   - Versioning automatique à chaque save
   - Relation `forked_from_id` pour tracer les remix

3. **Couche export (avancée)**
   - Import/export JSON explicite pour profs techniques
   - Format documenté dans `docs/ARCHITECTURE.md` section "Classroom Composer Format"

### Bibliothèque de templates forkables
5 parcours par défaut à livrer avec V1 :
- 6e secondaire FWB (humanités générales)
- 5e-6e humanités (option info)
- CAP / CESS informatique
- Formation adulte Forem (reconversion dev)
- Formation Bruxelles Formation (secteur numérique)

## Conséquences

### Positives
- Onboarding enseignant zéro-friction : "je forke le parcours de ma collègue"
- Effet réseau enseignant : la communauté enrichit la plateforme
- Différenciation concurrentielle majeure (personne ne fait ça bien dans l'edtech EU)
- JSON préservé en arrière-plan = versioning Git possible pour profs techniques

### Négatives / risques
- Gros chantier UI (estimation 2-3 semaines réparties)
- Risque de sur-complexité si trop de features drag-and-drop (YAGNI strict)
- Schéma JSON doit être stable dans le temps (breaking changes = migrations)

### Alternatives rejetées
- **JSON édition directe** : inaccessible aux profs non-tech
- **Pas de composition** (parcours fixes) : perte d'adaptabilité pédagogique
- **Composer Drag-and-drop ultra-riche** (conditions, branchements) : over-engineering V1

## Implémentation
- Priorité : après LTI 1.3 (sans LTI, pas d'usage classe réel)
- Validé par agent `classroom-template-validator` (créé au 2e usage)

## Mémoires liées
- `project_platform_vision_v2.md`
