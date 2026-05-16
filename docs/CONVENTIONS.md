# Conventions de travail — Terminal Learning

> Dernière mise à jour : 10 avril 2026  
> Issue Linear : [THI-8](https://linear.app/thierryvm/issue/THI-8/set-project-workflow-conventions)

---

## Branches

| Type | Pattern | Exemple |
|------|---------|---------|
| Feature | `feat/THI-XX-description` | `feat/THI-12-add-git-module` |
| Fix | `fix/THI-XX-description` | `fix/THI-15-progress-reset-bug` |
| Docs | `docs/THI-XX-description` | `docs/THI-8-add-conventions` |
| Chore | `chore/THI-XX-description` | `chore/THI-3-update-deps` |

**Règles :**
- Toujours partir de `main` à jour
- Jamais de commit direct sur `main`
- Inclure l'identifiant Linear (`THI-XX`) dans le nom de branche → lie automatiquement la PR à l'issue

---

## Commits (Conventional Commits)

```
type(scope): description courte en anglais
```

**Types autorisés :** `feat` `fix` `docs` `chore` `refactor` `test` `security`

**Exemples :**
```
feat(curriculum): add git basics module
fix(terminal): handle empty input without crash
docs(readme): update installation steps
chore(deps): upgrade vite to 6.2
```

---

## Pull Requests

**Titre :** `type(THI-XX): description courte`  
**Exemple :** `feat(THI-12): add git basics module`

**Template body :**
```
## Summary
- Ce que cette PR fait (1-3 bullets)

## Motivation
Pourquoi ce changement est nécessaire.

## Changes
- Liste des fichiers/fonctions modifiés

## Test plan
- [ ] CI passe (type-check + lint + test + build)
- [ ] Testé localement sur Chrome + Firefox
- [ ] Pas de régression sur curriculum.ts / ProgressContext
```

**Règles :**
- CI doit passer avant merge
- Au moins 1 review si collaborateur présent
- Squash merge préféré pour garder `main` propre

---

## Issues Linear

| État | Signification |
|------|--------------|
| **Triage** | Idée à évaluer, pas encore décidée |
| **Todo** | Décidée, prête à être traitée |
| **In Progress** | Branche créée, travail en cours |
| **In Review** | PR ouverte sur GitHub |
| **Done** | PR mergée dans `main` |

**Convention de nommage :**
```
type: description courte en anglais
```
Exemples : `feat: add progress export`, `fix: lesson 3 typo`, `docs: update roadmap`

---

## Workflow simple (débutant)

### Rôle de chaque outil

- **Linear** = définir et suivre le travail
- **Claude Code** = aider à réaliser le travail
- **GitHub** = héberger le code, les branches et les pull requests
- **Slack** = recevoir les notifications et discuter des changements

### Ordre de travail recommandé

1. Créer ou choisir une issue dans Linear
2. Passer l'issue en **Todo** si elle est prête
3. Créer une branche GitHub liée à l'issue
4. Travailler avec Claude Code dans cette branche
5. Ouvrir une pull request sur GitHub
6. Passer l'issue en **In Review** si une PR est ouverte
7. Vérifier que la CI passe
8. Merger la pull request
9. Passer l'issue en **Done** une fois mergée dans `main`

### Règle mentale simple

- **Pas commencé** → Todo
- **En train de faire** → In Progress
- **PR ouverte** → In Review
- **Terminé et mergé** → Done

### Schéma rapide

```text
Linear -> Issue à faire
GitHub -> Branche + PR
Claude Code -> Aide à coder
Linear -> Suit l'avancement
Slack -> Notifie et permet d'en discuter
```

---

## Design System — shadcn/ui obligatoire (THI-85)

**Règle :** ne jamais créer de composant custom quand un équivalent shadcn/ui existe.

| Besoin | Composant shadcn | Import |
|--------|-----------------|--------|
| Bouton | `<Button>` | `ui/button` |
| Carte | `<Card>` | `ui/card` |
| Badge | `<Badge>` | `ui/badge` |
| Input | `<Input>` | `ui/input` |
| Onglets | `<Tabs>` | `ui/tabs` |
| Barre de progression | `<Progress>` | `ui/progress` |
| Dialog/Modal | `<Dialog>` | `ui/dialog` |
| Menu déroulant | `<DropdownMenu>` | `ui/dropdown-menu` |
| Tooltip | `<Tooltip>` | `ui/tooltip` |
| Tableau | `<Table>` | `ui/table` |

**Exceptions :** composants métier (TerminalEmulator, TerminalPreview) et designs spécifiques Landing hero.

**Garde-fou :** lancer l'agent `ui-auditor` avant toute PR qui touche des composants UI. Tout CRITICAL dans le rapport bloque le merge.

---

## Validation visuelle obligatoire (projet vitrine)

**Toute PR sur `main` doit passer par cette checklist avant merge :**

1. CI passe (type-check + lint + test + build) — automatique
2. Vercel génère une **preview URL** automatiquement pour chaque PR (visible dans les commentaires GitHub)
3. **Thierry valide visuellement** sur la preview Vercel (Chrome + mobile)
4. Merge seulement après validation explicite

> Ne jamais merger sur `main` sans avoir validé la preview Vercel.

---

## Migrations Supabase — template GRANT obligatoire (post-30 octobre 2026)

À partir du **30 octobre 2026**, Supabase applique un breaking change : les nouvelles tables créées dans le schema `public` ne sont **plus exposées automatiquement** via PostgREST / GraphQL / `@supabase/supabase-js`. Sans `GRANT` explicite, le frontend retourne 404 / empty pour ces tables.

Référence officielle : [Discussion #45329](https://github.com/orgs/supabase/discussions/45329) · [Changelog](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)

### Template à appliquer pour TOUTE nouvelle migration `public.*`

**Principe de moindre privilège** : commencer avec `SELECT` seulement, ajouter `INSERT/UPDATE/DELETE` au cas par cas selon le besoin réel du client.

```sql
-- ─── 0XX: <Description> ──────────────────────────────────────────────────
-- ⚠️ Rappel post-30 octobre 2026 : sans GRANT explicite, cette table ne sera
-- pas exposée via PostgREST/GraphQL/supabase-js (breaking change Supabase
-- Data API opt-in). Voir docs/CONVENTIONS.md section "Migrations Supabase".

create table if not exists public.<nom_table> (
  -- ... colonnes ...
);

-- 1. RLS obligatoire (zero policy si table service_role-only, sinon policies explicites)
alter table public.<nom_table> enable row level security;

-- 2. GRANT minimal par défaut (SELECT only — principe de moindre privilège).
--    ↳ Ajouter INSERT/UPDATE/DELETE uniquement si le client réel en a besoin.
grant select on table public.<nom_table> to anon, authenticated;
-- grant insert, update, delete on table public.<nom_table> to authenticated; -- si CRUD client

-- 3. Pour les fonctions SECURITY DEFINER : REVOKE FROM PUBLIC (pas seulement anon/authenticated).
--    ↳ Pattern vu lors de la migration 015 — PUBLIC inheritance bypass les REVOKE explicites.
--    ↳ ATTENTION : la signature complète (types d'arguments) doit matcher exactement.
--    Pour des fonctions avec paramètres :
--      revoke execute on function public.<nom_fonction>(arg1_type, arg2_type) from public;
--    Pour des fonctions sans paramètres :
revoke execute on function public.<nom_fonction>() from public;
```

### Exceptions valides

- **Audit logs write-only** (ex: `lti_launches`, `admin_audit_log`) : pas de GRANT — la table reste service_role-only, accessible uniquement depuis Vercel Functions avec `SUPABASE_SERVICE_ROLE_KEY`.
- **Schémas dédiés non-public** (ex: schema `private` pour les RLS helpers — THI-182) : ne pas exposer du tout, ne pas GRANT.

### Cas particulier : SECURITY DEFINER functions

Pour les fonctions `SECURITY DEFINER` :
- Si **trigger-only** (pas appelée en RPC) : `revoke execute from PUBLIC` + `revoke execute from anon, authenticated` (defense in depth)
- Si **RLS-essential** (invoquée par USING clauses) : **NE PAS REVOKE** — PostgreSQL exige EXECUTE même pour invocation via RLS. Solution structurelle : déplacer dans schema `private` non-exposé par PostgREST.

Vu empiriquement migration 015 : `REVOKE FROM anon, authenticated` ne suffit pas, il faut inclure `PUBLIC` (anon/authenticated héritent de PUBLIC par défaut).

---

## Synchronisation de la documentation

**À la fin de chaque session de développement, vérifier :**

| Fichier | Quand le mettre à jour |
|---------|----------------------|
| `docs/plan.md` | Statut de phase changé, item coché, décision prise |
| `docs/CONVENTIONS.md` | Nouvelle règle ou workflow ajouté |
| `README.md` | Stack change, nouvelle phase live, nouvelle URL |
| `CLAUDE.md` | Règle projet ou décision technique durable |

**Règle anti-doublon :**
- `plan.md` = état du projet (phases, to-do, décisions en attente)
- `CONVENTIONS.md` = règles de travail (git, PR, workflow)
- `README.md` = documentation publique (stack, démo, setup)
- `CLAUDE.md` = instructions pour Claude Code (règles projet, stack, fichiers critiques)

Ne jamais copier le même contenu dans deux fichiers — pointer vers la source si nécessaire.
