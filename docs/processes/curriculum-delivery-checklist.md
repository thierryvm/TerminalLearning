# Livrer une commande, une leçon ou un module — liste de contrôle

> Créée le 1er octobre 2026 avec le plan [« Des bases au niveau intermédiaire »](../strategy/2026-10-01-bases-vers-intermediaire.md). Elle s'applique à toute PR qui ajoute ou change une commande du simulateur, une leçon ou un module. Pour une release qui change de phase, voir aussi [`release-sync-checklist.md`](release-sync-checklist.md).
>
> Une case non cochée se signale dans la PR (« non fait, parce que… »). Elle ne disparaît jamais en silence.

## 1. Avant d'écrire du code

- [ ] Relire le lot visé dans le plan et cocher ce qu'il couvre. Une PR ne traite qu'un sujet.
- [ ] Lister les fichiers touchés et l'ordre des modifications, grâce à Grep et Glob.
- [ ] **Capturer les vraies sorties d'abord**, dans un dossier temporaire neuf : jamais à la racine du dépôt, toujours avec `-LiteralPath`/`-Value` sous PowerShell.
  - Linux : Git Bash ; Ubuntu sous WSL pour ce que Git Bash n'a pas (`apt`, `systemctl`, `journalctl`).
  - Windows : PowerShell 7 en culture en-US. Le français de la machine donne « Répertoire : » au lieu de « Directory: ».
  - macOS : pas de référence locale. Documenter les écarts BSD connus, ne rien inventer.
- [ ] Si `curriculum.ts` change : lancer `curriculum-validator`.

## 2. Pendant

**Moteur** (`terminalEngine.ts`, `commands/*.ts`)

- [ ] Chaque nouvelle commande a ses tests dans `src/test/terminalEngine.test.ts` (ou `shellLayer.test.ts` pour les pipes et les redirections). Les attendus viennent de la capture, jamais de la sortie du moteur.
- [ ] Les trois environnements sont traités : Linux, macOS et Windows (alias PowerShell, paramètres, messages d'erreur).
- [ ] Une option non simulée affiche une note honnête, et non un résultat faux ou un silence.

**Leçons et exercices** (`curriculum.ts`, `lessonSetup.ts`, `exerciseSteps.ts`)

- [ ] Chaque leçon a son exercice et sa solution pour chaque environnement (`src/test/lessonSolutions.ts`).
- [ ] Exercice en étapes : pas d'impasse. Une étape d'observation passe dès que l'élève observe, une étape d'action passe aussi quand son effet est déjà là, et chaque impasse restante a un `warn`. Essayer les étapes dans le désordre.
- [ ] Les blocs de théorie se rejouent dans le moteur. Lancer `npm run theory:gaps` : les cliquets `KNOWN_THEORY_GAPS`, `BASH_SHOWN_ON_WINDOWS_MAX` et `KNOWN_DESYNCS` ne peuvent que baisser.
- [ ] Pas de bash montré à un élève Windows : utiliser `contentByEnv` et `labelByEnv`.

**Page Référence** (`commandCatalogue.ts`, `commandExamples.ts`)

- [ ] La commande y figure avec ses variantes par environnement, des exemples exécutables (un test les rejoue) et ses erreurs fréquentes.

**Ce que voit le public**, si un compteur ou la liste des commandes change :

- [ ] `src/app/data/landingContent.ts` : compteurs, liste des commandes, feuille de route publique.
- [ ] `index.html` : métadonnées (description, Open Graph, Twitter) et FAQ en JSON-LD.
- [ ] `public/llms.txt` et `public/llms-full.txt`.
- [ ] `README.md`, `CLAUDE.md` (section Phases), `docs/ARCHITECTURE.md`, `docs/exports/README.md`.
- [ ] Les tests `docLessonCount`, `landingTotals`, `publicCounters` (`llms*.txt` et métadonnées d'`index.html`, depuis le 2 octobre 2026) et `seo` doivent passer. Un échec signale un compteur à corriger partout, pas un test à ajuster.

## 3. Avant la PR

- [ ] Contrôles : `tsc`, `npm run lint`, `vitest`, `npm run build`, puis `git checkout -- public/sitemap.xml` (le build le régénère).
- [ ] `terminal-fidelity-auditor` sur les commandes touchées : 0 ENGINE-WRONG et 0 THEORY-WRONG non expliqués.
- [ ] Les auditeurs spécialisés que le périmètre désigne (`ui-auditor` pour un composant, etc.), puis `feature-dev:code-reviewer` en dernier sur le diff stabilisé.
- [ ] `CHANGELOG.md` : une entrée avec ce que l'élève voit de nouveau et les chiffres vérifiés.
- [ ] `STORY.md` : un court chapitre dans la partie en cours, avec ce qui a été appris ou décidé.
- [ ] Bandeau de `docs/plan.md` et de `docs/ROADMAP.md`, et la case du lot cochée dans le plan.
- [ ] Recherche de secrets dans le diff (`password`, `secret`, `token`, `key`, `sk-`) : zéro résultat.
- [ ] `git add` avec des chemins explicites, puis `git show --stat HEAD`.

## 4. Après la PR

- [ ] CI verte, Sourcery lu (SKIPPED accepté quand le quota est atteint).
- [ ] Preview : exercices joués de bout en bout dans les trois environnements, sur ordinateur et en 390px. Pas d'erreur console, pas de débordement horizontal. Regarder les captures d'écran, pas seulement les ✓.
- [ ] Merge, puis la même vérification en production, plus les pages principales en 200.
- [ ] Mémoire de session : ce qui est livré, la dette restante, le prochain lot.
- [ ] Les écarts trouvés et laissés pour plus tard sont notés dans le plan, avec leur raison.
