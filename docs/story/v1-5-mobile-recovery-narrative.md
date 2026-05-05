# Sprint Mobile Recovery TL — narration V1.5 (5 mai 2026)

> Récit thématique du sprint THI-152 « Mobile Recovery TL ». Pour la chronologie continue du projet, voir [STORY.md](../../STORY.md). Pour l'inventaire technique des releases, voir [CHANGELOG.md](../../CHANGELOG.md).

---

## Le 4 mai au soir, un grain de sable visible

Le sprint Mobile Recovery TL n'est pas né d'une priorisation théorique. Il est né d'un iPhone 14 réel, allumé sur le canapé de Thierry, qui ouvrait `terminallearning.dev` ajouté en raccourci home screen. Trois choses se sont vues à l'œil nu : le drawer du tuteur IA rendait la page horizontalement déplaçable dès qu'on l'ouvrait, le haut du dashboard `/app` passait sous les icônes wifi/batterie/signal en mode standalone, et le bouton « Commencer → » de la landing était partiellement occlus par la batterie sur la même page après hard refresh complet. Trois bugs empiriques que ni Vitest, ni Playwright Chromium, ni Lighthouse n'avaient détectés — parce qu'aucun de ces outils n'émule vraiment WebKit Safari iOS en mode PWA standalone.

C'était le constat de départ. Pas une conviction. Une observation.

## Trio @cowork / @cc-terminallearning / @thierry — voie safe absolue

@cowork a tranché tôt sur la voie safe : **aucune modification de `ui/button.tsx`** pendant tout le sprint, **aucune nouvelle variant** créée. Cela signifiait qu'il fallait fixer chaque bug en touchant uniquement les `<button>` natifs HTML, les `<textarea>` natives, les wrappers structurels (`Layout.tsx`, `Sidebar.tsx`, `LoginModal.tsx`), ou le CSS global. Tous les consumers shadcn déjà en production restaient intacts — donc zéro régression invisible sur les variants partagées.

Cette contrainte semble étrange à première vue (pourquoi ne pas centraliser le fix dans la variant ?) mais elle a été le levier principal du sprint. Elle a forcé à comprendre **localement** chaque bug avant de le corriger, plutôt que d'introduire des effets de bord transversaux. Le coût : 3 fichiers à toucher au lieu d'un. Le bénéfice : zéro régression desktop, zéro consumer shadcn cassé.

## FINDING-01 GOLD — 4 CSS vars undefined, FAB transparent

Avant même le déroulé séquentiel des 9 mini-PRs, un finding rétroactif : `BUG-FAB-001`. Le FAB Sparkles du tuteur IA était littéralement transparent sur certains backgrounds parce que `theme.css` référençait `--github-accent`, `--github-accent-hover`, `--github-bg-primary`, `--github-bg-tertiary` — quatre CSS vars qui n'existaient nulle part dans `:root`. Le hot fix PR #194 a comblé cela isolément.

Ce finding a validé rétroactivement l'investissement dans `mobile-responsive-auditor` (12ᵉ agent du projet, créé en THI-150). Il avait été conçu après un sprint similaire sur Ankora — adapté Vite/React/Tailwind v4 — avec une section bonus exigée par @cowork : « Section 11 Desktop Preservation », inscrivant dans l'agent lui-même le critère absolu *toute fix mobile qui casse le desktop = blocker merge*. ROI dès la première invocation.

## Le déroulé — 9 mini-PRs, 1 hotfix

Mini-PR 1/9 : focus traps + Escape + ARIA modaux (a11y modaux clavier). 2/9 : `font-size: 16px` minimum sur les inputs (élimine le zoom auto Safari iOS au focus). 3/9 : FAB Sparkles size + opacity + position propre. 4/9 : PWA `apple-touch-icon` PNG 180×180 + standalone metas (l'app se lance enfin en mode plein écran après Add to Home Screen au lieu de rouvrir Safari avec sa chrome). 5/9 : touch targets ≥44 mobile / ≤40 desktop preserve, avec FAB recalibration **Option D**.

Cette Option D est intéressante. La 3/9 avait bumpé le FAB à `h-12` (48 px) en suivant la doc Material 3. Le 5/9 a relevé empiriquement avec @thierry sur preview que 48 px occupait visuellement ~12 % du viewport iPhone 393 px et paraissait pesant. Décision @cowork : retour à `h-11` (44 px exact Apple HIG) sur mobile, **garder `md:h-14` (56 px) inchangé sur desktop**. Asymétrie 44/56 mobile/desktop intentionnelle, documentée comme « FAB primary action exemption » dans les specs preserve. Empirique > théorique, à chaque fois.

Mini-PR 6/9 — drawer overflow word-break + header truncation. C'est le bug qui rendait la page horizontalement déplaçable. Cause structurelle : chat bubbles sans `break-words`, header h2 sans `min-w-0 truncate`, drawer container sans `overflow-x-hidden`. Trois manques qui ensemble laissaient fuir l'overflow dès qu'un descendant recevait une URL longue. Fix purement Tailwind, validé Playwright avec injection synthétique 200 chars + 300 chars + `<pre>` 500 chars via `page.evaluate()` — pas de mock OpenRouter, pas de coût LLM en CI.

Mini-PR 7/9 — PWA safe-area top + autoFocus terminal contrôlé. Le scope original était 8/9, **promu 7/9** par décision @cowork : safe-area P0 visible avant focus rings P1 cosmétique. Diagnostic : `index.html` avait déjà `viewport-fit=cover` et `apple-mobile-web-app-status-bar-style=black-translucent` ; il manquait juste `pt-[env(safe-area-inset-top)]` sur le `flex-1` wrapper de `Layout.tsx`. Mêmes ajustements pour le `LoginModal` et un `useEffect` autoFocus contrôlé sur le `TerminalEmulator` (skip si touch device, skip si modal/drawer ouvert — pattern emprunté à `MessageInput.tsx`).

Mini-PR mergée. Hard refresh @thierry sur iPhone 14 PWA standalone. **Bug toujours présent**. Diagnostic chirurgical : le fix sur `Layout.tsx` flex-1 wrapper couvre les routes `/app`. Mais Landing (`/`) **n'utilise pas Layout** — elle a son propre `<nav>`. Hotfix 7bis isolé : 1 fichier, 1 modif, `pt-[max(1rem,env(safe-area-inset-top))]` sur le `<nav>` Landing.

Décision senior CC TL ici : @cowork suggérait `pt-[env(safe-area-inset-top)]` pur. Mais sur Safari classique mobile et desktop où `env() = 0`, cela aurait collapsé le padding-top à 0 — perte des 16 px de respiration baseline. Le pattern `max(1rem, env(...))` préserve les 16 px sur mobile classique et desktop, et shifte uniquement sur PWA standalone. Ce pattern est devenu la signature du sprint : on le retrouve sur le footer Landing (préexistant), sur le FAB AiTutorPanel (THI-147), sur le Landing nav (7bis), et sur la Sidebar landscape (9/9).

Mini-PRs 8/9 — focus rings emerald harmonization (8 occurrences `focus-visible:outline-2` alignées sur le pattern canonique TL `focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0`). Mini-PR 9/9 — final polish HTML metas + tap-highlight transparent + Sidebar landscape `pl-[max(0px,env(safe-area-inset-left))]`. Cette dernière touchait le backlog flagué dans 7/9.

## Bilan — chiffres et leçons

- **10 PRs mergées** sur une journée (#196 à #205).
- **0 régression desktop** (critère @cowork « ne pas casser le desktop » tenu de bout en bout).
- **0 modification de `ui/button.tsx` variants** (voie safe @cowork tenue).
- **~25 specs e2e WebKit** + **~15 specs Chromium desktop preserve** ajoutés.
- **1268/1268 vitest** stable tout le sprint.
- **3 bugs empiriques @thierry éradiqués** — drawer overflow, header `/app` PWA, Landing nav PWA.

Quatre leçons reproductibles :

1. **La validation empirique humaine reste irremplaçable sur PWA iOS.** Ni Playwright Chromium, ni Chrome DevTools MCP n'émulent vraiment `env(safe-area-inset-*)` en mode standalone. Les tests automatisés vérifient que la propriété CSS est appliquée (computed = `Npx`, pas `auto`) ; seul un iPhone réel valide que le shift visuel est correct.
2. **Trio IA discipliné > brute-force solo.** @cowork tranche les arbitrages, @cc-terminallearning code en respectant scope et voie safe, @thierry valide empiriquement sur device réel. Chaque rôle reste dans son périmètre. Aucun ne déborde.
3. **Voie safe = anti-régression invisible.** Ne pas toucher aux variants shadcn déjà en production a coûté 3 fichiers de plus à toucher dans le sprint, mais a évité la classe entière de régressions transversales dont on n'aurait découvert l'existence qu'en production.
4. **Cross-validation @cowork (Brave MCP) ↔ @cc-terminallearning (Chrome DevTools MCP).** Les deux outils MCP donnent une vue Chromium qui rate les bugs WebKit-only. La validation empirique iPhone réel @thierry est la couche qui ferme la boucle.

Le sprint a été clos en une journée de travail effective. C'est court parce que les 10 PRs étaient discrètes, scopées strict, parallélisables avec @thierry qui pouvait merger pendant que @cc-terminallearning préparait la suivante. Méthode reproductible — on l'utilisera de nouveau, sur d'autres surfaces, quand un bug empirique réapparaîtra et que les outils automatisés ne le verront pas.
