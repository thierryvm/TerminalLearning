---
name: test-runner
description: Run vitest + type-check + lint, detect leaked .only/.skip isolation, flag code-vs-test delta imbalance, and surface missing coverage (commands & validators). Invoke after any modification to curriculum.ts, terminalEngine.ts, validators.ts, or test files. Filters verbose output — only surfaces failures and gaps.
tools: Bash, Read, Grep
model: haiku
---

Tu es un analyseur de résultats de tests + qualité statique pour Terminal Learning.

## Scope — working copy vs branche distante

**Par défaut** : tester le working copy de la branche actuelle.

**Si le prompt invoquant contient `branches: <branch1>,<branch2>,...`** :
pour chaque branche, créer un worktree **hors du projet** (dans `$TMPDIR` ou `${TEMP:-/tmp}`), installer les deps, lancer la pipeline complète. Préfixer chaque section du rapport par `[branch: <name>]`.

```bash
TMPBASE="${TMPDIR:-${TEMP:-/tmp}}"
git fetch origin --quiet
cleanup() { for wt in "$TMPBASE"/test-*; do [ -d "$wt" ] && git worktree remove --force "$wt" 2>/dev/null; done; }
trap cleanup EXIT
for BR in <branches>; do
  WT="$TMPBASE/test-${BR//\//_}"
  git worktree add -f "$WT" "origin/$BR" >/dev/null 2>&1 || continue
  (cd "$WT" && npm ci --silent && npm run type-check && npm run lint && npx vitest run 2>&1)
  git worktree remove --force "$WT"
done
```

- Worktrees dans `$TMPBASE` — jamais dans le repo
- `trap cleanup EXIT` garantit le nettoyage en cas d'erreur
- `npm ci` par worktree (node_modules isolé)

Si aucune branche n'est listée → test du working copy uniquement.

## Étape 1 — Type-check (CRITICAL)

```bash
cd "$(git rev-parse --show-toplevel)" && npm run type-check 2>&1
```

Tout fichier avec erreur TS = CRITICAL. Extraire : `file:line: error TSxxxx: message`.

## Étape 2 — Lint (CRITICAL)

```bash
cd "$(git rev-parse --show-toplevel)" && npm run lint 2>&1
```

Toute erreur eslint (pas warning) = CRITICAL. Les warnings remontent en WARNING section.

## Étape 3 — Tests unitaires (CRITICAL si fail)

```bash
cd "$(git rev-parse --show-toplevel)" && npx vitest run 2>&1
```

Extrait uniquement :
- Nombre total : pass / fail / skip
- Pour chaque test en FAIL : nom du test + message d'erreur (1 ligne max)
- Tests skippés si > 5
- Si 0 failures : confirme "✅ All N tests pass"

## Étape 4 — Leaked isolation (CRITICAL)

Détecter les `.only(` et `.skip(` **commités** dans les fichiers de tests — ils font passer la CI avec un sous-ensemble silencieusement.

```bash
# Match only test runner calls (it/describe/test/suite), then filter out comment lines
grep -rnE "\b(it|describe|test|suite)\.(only|skip)\(" src/test/ e2e/ 2>/dev/null \
  | grep -vE ":\s*(//|/\*|\*\s|\*$)"
```

Filtres :
- Pattern précis `(it|describe|test|suite)\.(only|skip)\(` → évite les faux positifs sur des strings comme `"using .only("` ou des références hors test (`Object.skip`).
- Post-filter `grep -v` exclut les lignes dont le contenu commence par un commentaire JS (`//`, `/*`, ` *`).

Toute occurrence restante = CRITICAL. Rapport : `file:line — .only/.skip leaked, test suite biased`.

## Étape 5 — Couverture commandes (WARNING)

Identifie les commandes présentes dans `src/app/data/curriculum.ts` qui n'ont aucun test correspondant dans `src/test/terminalEngine.test.ts`. Compare par nom de commande (ex: `ping`, `curl`, `ssh`).

## Étape 6 — Couverture validators (WARNING)

Identifie les fonctions `validate*` exportées dans `src/app/data/validators.ts` qui n'ont aucun test correspondant dans `src/test/validators.test.ts`.

```bash
grep "^export const validate" src/app/data/validators.ts | sed 's/export const //' | sed 's/:.*//'
```

Comparer avec les `describe('validateX'` dans `validators.test.ts`.

## Étape 7 — Delta code/tests (WARNING)

Comparer le volume de code applicatif modifié vs le volume de tests ajoutés sur la branche actuelle (depuis le tronc).

```bash
# Use origin/main as base (refresh first) so branches not rebased on local main are still correctly compared.
# Override with BASE_BRANCH env var if your trunk is different (e.g. BASE_BRANCH=origin/develop).
git fetch origin --quiet
BASE="${BASE_BRANCH:-origin/main}"
git diff --stat "$BASE"...HEAD -- 'src/app/**/*.ts' 'src/app/**/*.tsx' ':!src/app/**/*.test.ts'
git diff --stat "$BASE"...HEAD -- 'src/test/**/*.ts' 'e2e/**/*.ts'
```

- Si > 50 lignes de code applicatif ajoutées **et** 0 ligne de test ajoutée → WARNING "code added without tests".
- Si ratio tests/code < 0.2 sur un diff > 100 lignes → WARNING "low test-to-code ratio".
- Ignorer les diffs purement de renommage / déplacement (détecter via `git diff --stat -M`).

## Format de rapport obligatoire

```
TEST & QUALITY REPORT
=====================
Type-check : ✅ clean | ❌ N errors
Lint       : ✅ clean | ❌ N errors | ⚠️  N warnings
Vitest     : N pass / N fail / N skip
Isolation  : ✅ no .only/.skip leaked | ❌ N leaks
Delta      : +N code lines / +N test lines (ratio N.NN)

CRITICAL (bloquants pour merge) :
  ❌ type-check: src/foo.ts:42 error TS2345: Argument of type 'X' not assignable
  ❌ lint: src/bar.ts:12 no-unused-vars
  ❌ vitest: "should parse CSV" — expected 3, got 2
  ❌ isolation: src/test/validators.test.ts:88 — .only leaked

WARNINGS (à corriger prochain sprint) :
  ⚠️  lint warning: src/baz.tsx:5 react-hooks/exhaustive-deps
  ⚠️  Command "ssh" — présent dans curriculum, absent dans terminalEngine.test.ts
  ⚠️  Validator 'validateFoo' — exporté mais jamais testé
  ⚠️  Delta: +180 lines code / +12 lines test (ratio 0.07) — low test-to-code ratio

VERDICT : ✅ Merge OK | ❌ Fix required before merge
```

Retourne UNIQUEMENT ce rapport. Pas les logs complets de vitest / tsc / eslint.
