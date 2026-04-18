# Changelog — Terminal Learning

> Journal des évolutions majeures. Chaque entrée raconte le défi, la décision, et l'impact mesurable.
> Pour l'histoire complète de la collaboration et des choix techniques : [Notre histoire](STORY.md).

---

## AI Tutor BYOK — architecture V1 gelée (ADR-005)
*18 avril 2026 · Phase 7b · doc alignment + décisions V1*

**Le défi :** L'architecture BYOK 4-tiers avait été figée la veille par l'ADR-002 (OpenRouter prioritaire, client-side only, zéro clé serveur). Mais `plan.md` Phase 7b décrivait encore l'ancienne architecture à 3 providers avec chiffrement Supabase Vault et Edge Function proxy — un écart silencieux qui aurait mené à une implémentation sur de faux prérequis. Avant de coder quoi que ce soit, il fallait aligner les documents guides et arbitrer quatre points laissés ouverts par l'ADR-002 : stockage de la clé côté client, rate limiting, isolation process, et calendrier de création de l'agent de validation.

**La méthode :** Brainstorm structuré en quatre axes (B1 stockage, B2 rate limiting, B3 guardrails socratiques — les threat models OWASP LLM Top 10 d'abord, puis les options techniques), suivi d'un arbitrage décisif par l'owner. Les décisions sont consignées dans l'ADR-005 avec rationale, alternatives rejetées, et séquence d'implémentation en 7 étapes.

**Ce qui a été livré :**
- **ADR-005** — quatre décisions V1 gelées avec traçabilité complète :
  1. Stockage clé : `localStorage` plain par défaut + opt-in Web Crypto (AES-GCM, PBKDF2 ≥ 210k iter, passphrase) — progressive disclosure (A1 free tier = zéro friction, Tier 2 pro = chiffrement actif)
  2. Web Worker isolation différée à V1.5, ticket séparé créé immédiatement (pas de "on verra plus tard")
  3. Rate limiting client-side soft uniquement en V1 (pas d'Edge Function proxy — contredirait ADR-002)
  4. Agent `prompt-guardrail-auditor` (Sonnet) créé AVANT l'implémentation — pas après, pour éviter le blocker surprise en fin de chantier
- **`docs/plan.md` Phase 7b** — intégralement réécrite sur base ADR-002 + ADR-005 : 4 tiers, zéro clé serveur, table Supabase `user_ai_keys` supprimée (la clé reste côté client), séquence d'implémentation en 7 PRs
- **Mémoire `project_ai_agent_byok.md`** — alignée sur la nouvelle architecture (providers exclus, tiers, workflow)
- **`docs/ROADMAP.md`** — header remis à jour (ADRs 001-005), retrait de la confusion "Phase 10 brainstorm" (le AI Tutor est Phase 7b)
- **`docs/adr/README.md`** — index ADR complété

**Validation :**
- Grep transversal sur `Phase 7b`, `AI Tutor`, `BYOK`, `OpenRouter` — aucun résidu de l'ancienne archi
- Cohérence interne ADR-002 ↔ ADR-005 ↔ plan.md ↔ mémoire ↔ ROADMAP vérifiée
- Tests vitest verts (909 pass — aucun code produit, uniquement de la documentation)

**Pourquoi c'est important :** La dette documentaire est la plus insidieuse. Elle ne casse pas un test, ne déclenche pas une alerte Sentry, ne bloque pas un merge. Elle se manifeste quand on commence à coder sur une base qu'on croyait correcte et qu'on réalise, trois jours plus tard, que le plan de référence ne décrivait plus la réalité. Ici, l'écart n'a pas produit de code — parce qu'on a vérifié avant. Cette vérification est devenue une règle explicite (feedback memory `feedback_doc_alignment.md`) : avant tout brainstorm ou plan d'architecture, grep transversal sur les docs guide pour détecter les drifts.

**Leçon :** Quand une ADR consigne une décision stratégique, les plans opérationnels doivent être mis à jour dans la même journée. Un ADR accepté qui n'est pas répercuté dans `plan.md` ne fait pas foi — il crée une zone grise où deux vérités coexistent. La règle devient : **nouvelle ADR acceptée = PR de doc alignment dans les 24h**, ou la décision n'est pas vraiment acceptée.

---

## Migration shadcn/ui — clôturée
*17–18 avril 2026 · THI-85 / THI-91 / THI-105 / THI-106 / THI-107*

**Le défi :** 39 composants Radix UI étaient installés depuis la Phase 3, mais l'UI était 100% custom Tailwind — un écart silencieux entre ce que `package.json` annonçait et ce que le code utilisait réellement. Chaque `<button>` natif recodait ses propres focus rings, ses propres couleurs hover, ses propres tailles — sans garantie de cohérence d'une page à l'autre.

**La méthode :** Migration page par page pilotée par l'agent `ui-auditor` qui scanne avant chaque PR : Dashboard (THI-95), LessonPage (THI-91 chunk D), Landing chunks B/C, Sidebar (THI-91 chunk A), NotFound (THI-85). Puis clôture en deux temps : d'abord un fix a11y sur 5 variantes Button qui n'avaient pas de `focus-visible` ring (THI-106), puis la migration des 11 derniers `<button>` natifs de `src/app/` (THI-107) — App FallbackUI, LoginModal (close + OAuth GitHub/Google + submit + link switch), UserMenu (guest CTA + card/dropdown sign-out + avatar toggle), PrivacyPolicy back nav.

**Ce qui a été livré :**
- Tous les éléments interactifs passent par `<Button variant=... size=...>` avec variantes CVA centralisées dans `src/app/components/ui/button.tsx`
- `focus-visible` ring emerald (`ring-emerald-500/60 ring-2`) harmonisé sur l'ensemble du codebase
- Sidebar modules verrouillés : `disabled={locked}` natif (sortis du tab order) + `disabled:opacity-100` pour préserver le contraste AA sur fond `#0d1117`
- Cleanup des `aria-disabled` redondants (LessonPage)
- 2 natives délibérées restantes : `sidebar.tsx` (shadcn interne) + `Landing.tsx:153` toggle env (différé à THI-105 qui ajoutera une size `tl-env-pill-lg`)

**Validation :**
- 901 tests unitaires verts sur chaque PR
- Sourcery review OK sur #140, #141, #142, #143
- Vérification visuelle Chrome DevTools MCP desktop + iPhone 14 sur Landing, LoginModal, PrivacyPolicy, Dashboard sidebar — zéro régression
- `ui-auditor` post-PR : baseline 2 natives restantes confirmée, zéro nouvelle violation

**Pourquoi c'est important :** Un design system n'est pas une dépendance qu'on installe — c'est une discipline qu'on applique. Avoir Radix UI dans `package.json` sans l'utiliser, c'était vivre avec un mensonge de 50 lignes. La clôture de cette saga signifie qu'à partir de maintenant, toute nouvelle UI passera par le composant `<Button>` (ou équivalent `<Card>`, `<Badge>`) — et `ui-auditor` est là pour s'assurer que personne n'oublie.

**Leçon :** Quand une refactor s'étend sur plusieurs PRs, un umbrella issue (ici THI-91) qui liste les sous-chantiers et un agent qui audite avant chaque merge suffisent pour éviter le drift. Les petites corrections a11y trouvées en route (THI-106) ne méritent pas leur propre saga — elles se greffent à la PR en cours et avancent en même temps.

---

## Web 2026 compliance — mobile + clavier, 6 PRs livrées en 48h
*14–16 avril 2026 · Epic THI-96 (THI-97 → THI-102)*

**Le défi :** L'app était fonctionnelle sur desktop moderne, mais n'avait jamais été auditée contre les standards web 2026 : WCAG 2.2 AAA (touch targets 44 × 44 px), Apple HIG (safe-area-insets iPhone notch/home indicator), `dvh` (URL bar iOS dynamique), `prefers-reduced-motion` (utilisateurs photosensibles), `focus-visible` ring clavier. Un élève sur iPhone SE 2016, un enseignant qui navigue uniquement au clavier, un étudiant avec vertiges provoqués par les animations fluides — aucun de ces profils n'avait été testé.

**La méthode :** Epic parent THI-96 décomposé en 8 sub-issues (6 shippées, 2 restantes : Desktop a11y avancé + CSS moderne 2026). Chaque sub-issue ciblée sur un écran ou un composant précis, avec validation live via Chrome DevTools MCP en émulation iPhone SE (375 × 667 × 2), screenshots avant merge, et audit Sourcery systématique.

**Ce qui a été livré :**
- **THI-97** — `viewport-fit=cover` dans `index.html` (BLOCKER iOS), `min-h-dvh` remplace `min-h-screen` partout, `@media (prefers-reduced-motion: reduce)` globalisé
- **THI-98** — Sidebar : `padding: max(1rem, env(safe-area-inset-bottom))`, touch targets 44 px, focus-visible ring emerald
- **THI-99** — LessonPage mobile 2026 : nav bottom safe-area, CTA Next pill 44 px, focus-visible partout
- **THI-100** — LoginModal : `autoComplete="email|current-password|new-password"`, `inputMode="email"`, touch targets
- **THI-101** — MarkdownPage (changelog + story) : FAB scroll-top safe-area + `prefers-reduced-motion`, touch 44 px
- **THI-102** — Batch 4 petites pages (NotFound, Privacy, Dashboard, CommandReference) : 404 fluide via `clamp(3rem,10vw,3.75rem)`, footer safe-area Privacy, CTA Dashboard migré vers `<Button variant="emerald" size="cta-pill">`, modules `<div role="button">` avec `onKeyDown(Enter|Space)`, filtres catégorie Reference 44 px + focus-visible

**Validation :**
- 901 tests unitaires passent sur chaque PR
- Lighthouse a11y mobile et desktop stables
- Zéro régression visuelle desktop (tous les ajouts sont invisibles hors focus clavier)
- Chrome DevTools MCP émulation iPhone SE 375 × 667 : 404 sur 1 ligne, FAB Privacy au-dessus du home indicator, filtres Reference tous à 44 px, focus rings visibles partout
- Zéro erreur console sur la preview Vercel

**Pourquoi c'est important :** L'accessibilité n'est pas un bonus — c'est la condition pour que l'app soit utilisable par les publics qu'elle cible réellement. Une plateforme pédagogique qui n'accueille pas correctement les utilisateurs d'iPhone d'entrée de gamme, les personnes clavier-first, ou les utilisateurs photosensibles, exclut silencieusement une partie de son audience. Dans un contexte scolaire belge où les établissements ont des parcs hétérogènes (Chromebooks 2018, iPads prêtés, PC fixes 4:3), chaque détail compte.

**Leçon :** Les standards web 2026 ne sont pas une checklist à cocher en fin de projet — ils sont un ensemble de règles qui, appliquées tôt, rendent le code plus simple, pas plus complexe. `dvh` est plus court que `height: 100vh; @supports (dvh)`. `env(safe-area-inset-bottom)` est plus court qu'un hack JS de détection du notch. `focus-visible` est un pseudo-classe natif. L'accessibilité bien faite coûte zéro ligne de plus que l'accessibilité bâclée.

---

## INP P75 536ms → ~26ms — fix env switcher avec startTransition
*14 avril 2026 · THI-90*

**Le défi :** Régression INP persistante sur production desktop depuis plusieurs jours. Vercel Speed Insights affichait **P75 = 536ms (Poor)** avec un pic à 2000ms le 11 avril, sur 197 visites classées "Unknown route". Plusieurs sessions de tentatives sans amélioration visible. Le précédent fix INP (`scrollIntoView` → `scrollTop`) tenait toujours en place, donc la régression venait d'ailleurs.

**La méthode :** Plutôt que continuer à supposer, mesurer. Trace Chrome DevTools sur la prod, puis sous CPU 4× throttling pour reproduire les conditions desktop réelles. Reproduit en lab : **INP = 515ms**, breakdown processing duration = 393ms — le marqueur d'un setState synchrone non-prioritisé sur un sous-arbre lourd.

**Cause racine :** `setEnvironment(envId)` dans `EnvironmentContext` déclenchait un re-render synchrone en cascade : Landing (610 lignes JSX), TerminalPreview (qui tue/relance son animation typing), grille de niveaux remontée à cause de `key={selectedEnv}`, tous les `FadeIn` enfants. Le pointerdown handler restait bloqué 393ms avant de rendre la main au navigateur.

**Le fix :** Une seule ligne dans `EnvironmentContext.tsx` — wrapper `setSelectedEnvState` dans `startTransition`. L'API React canonique pour exactement ce cas : déprioriser le re-render, libérer le main thread immédiatement, laisser React rendre pendant les frames idle. Le bénéfice se propage automatiquement à Landing ET Sidebar (deux callers).

**Validation lab (CPU 4× throttling, vite preview prod) :**
- Homepage env switcher : **515ms → 26ms** (−95%)
- Sidebar /app env switcher : **20ms** (consommateur secondaire, même fix)
- 900/900 tests vitest passent

**Pourquoi c'est important :** L'INP est le Web Vital de la "responsivité ressentie". À 536ms, chaque clic donnait l'impression d'un site qui rame. À 26ms, c'est instantané. Speed Insights confirmera sur prod réelle dans 24-48h.

**Leçon :** Le code "perf-friendly" en surface (useCallback, useMemo, MAX_LINES, `scrollTop` plutôt que `scrollIntoView`) ne suffit pas si un setState reste synchrone sur un sous-arbre large. `startTransition` est gratuit, ciblé, et c'est la première chose à essayer avant d'optimiser des composants individuels.

---

## Durcissement firewall Vercel — 2 custom rules de blocage
*14 avril 2026*

**Le défi :** Audit du Vercel Firewall sur plan Hobby. Le dashboard montrait 348 événements "Logged" sur 7 jours — des scanners automatisés qui atteignaient l'origine en consommant des invocations Fluid Compute inutiles. Bot Protection en mode `log` uniquement (limite Hobby), aucune custom rule, aucune IP bloquée. Surface de bruit importante qui allait croître avec la visibilité du site.

**Ce qu'on a fait :** Configuration directe via l'API REST Vercel (`PATCH /v1/security/firewall/config`), aucun changement de code, aucune PR. Deux custom rules créées :
- **Rule 1 — Block Common Attack Paths** (`rule_block_common_attack_paths_vdZOUZ`) : regex sur `/wp-admin`, `/xmlrpc.php`, `/.env`, `/.git`, `/phpmyadmin`, `/administrator`, `/wordpress`, `/adminer`, `/cgi-bin`. Ces chemins n'existent pas sur un Vite SPA — aucun user légitime ne les visite.
- **Rule 2 — Block Scanner User Agents** (`rule_block_scanner_user_agents_JRvc3A`) : substring match sur `sqlmap`, `nikto`, `nuclei`, `masscan`, `gobuster`, `dirbuster`, `feroxbuster`, `wpscan`, `acunetix`, `nessus`, `openvas`, `zgrab`, `CensysInspect`. `curl`, `wget`, `python-requests` et navigateurs restent autorisés.

**Validation :** Tests HTTP live — `/wp-admin` → 403 `x-vercel-mitigated: deny`, `/xmlrpc.php` → 403, UA sqlmap → 403, UA browser normal → 200, homepage → 200. Zéro impact sur les users légitimes. Projet visant une audience internationale → pas de geo-blocking.

**Pourquoi c'est important :** Chaque requête bloquée au niveau firewall, c'est une invocation Fluid Compute économisée, un log Sentry de moins pollué, un signal clair envoyé aux scanners que le site n'est pas une cible facile. Surtout, c'est une **configuration externe réversible en 1 call API** — aucun risque pour le code.

**Traçabilité :** Documentation complète dans `docs/vercel-firewall.md` (IDs, patterns, procédure de rollback, endpoints API). Agent dédié créé : `.claude/agents/vercel-firewall-auditor.md` — audite la config et teste les rules en conditions réelles, à lancer avant chaque release majeure.

**Limite connue du plan Hobby :** Bot Protection avancé et rate-limiting firewall-level nécessitent Pro. Si le site scale, c'est la première fonctionnalité à activer. Entre-temps, les 2 custom rules + OWASP CRS partiel en `log` couvrent le risque principal.

---

## 900 tests unitaires — couverture complète du curriculum
*13 avril 2026 · PR #112*

**Le milestone :** Le projet atteint **900 tests unitaires** (+ 20 tests RBAC d'intégration skippés en CI, en attente d'un env staging Supabase). C'est le résultat naturel de l'architecture multi-environnement : chaque commande est testée sur Linux, macOS et Windows.

**Anatomie des 900 tests :**
- **terminalEngine** (~295) — chaque commande × chaque OS × cas positifs/négatifs (ex: `ls` sur Linux, `dir` sur Windows, `Get-ChildItem` sur PowerShell)
- **validators** (242) — les 67 fonctions `validate()` : acceptation, rejet, injection XSS/SQL, DoS, casse et espaces
- **curriculumEnvAwareness** (~200) — cohérence structurelle de chaque leçon × chaque environnement
- **unlocking** (~50) — graphe de prérequis : modules accessibles dans le bon ordre, zéro dépendance circulaire
- **progressSync** (~40) — synchronisation localStorage ↔ Supabase : merge, delta, conflits, mode offline
- **divers** (~53) — routing, helpers, edge cases

**Aussi dans cette PR :** `validatePing` resserré — rejetait auparavant n'importe quel contenu après `ping `, accepte maintenant uniquement des hostnames valides (`[a-zA-Z0-9._-]`).

---

## Phase 4c — Bundle Optimization : motion/react retiré, 22 deps nettoyées
*13 avril 2026 · THI-87 · PR #108*

**Le défi :** Le bundle Landing pesait ~65 kB gzip, principalement à cause de `motion/react` (~40 kB gzip / 124 kB raw) chargé pour des animations d'entrée et de scroll-reveal. Plus grave : en auditant les dépendances, on a découvert que **22 packages npm étaient installés mais jamais importés** dans le code source — vestiges de sessions précédentes qui n'ont pas nettoyé derrière elles. Et que **8 composants shadcn/ui** dépendaient de ces packages fantômes.

**Pourquoi c'est important :** Ce projet est une vitrine pédagogique pour des enseignants et élèves. Des dépendances inutilisées, c'est du poids mort qui ralentit l'installation, augmente la surface d'attaque, et envoie le mauvais signal aux contributeurs qui lisent le `package.json`. On ne peut pas enseigner les bonnes pratiques si on ne les applique pas soi-même.

**Ce qu'on a fait :**
- Remplacé `motion/react` par des CSS `@keyframes` + un hook `useInView` (IntersectionObserver natif) — même rendu visuel, zéro dépendance externe
- Migré 3 composants : `Landing.tsx` (7 sections), `TerminalPreview.tsx`, `NotFound.tsx` (5 animations)
- Supprimé 22 dépendances inutilisées (MUI, Emotion, canvas-confetti, react-dnd, recharts, cmdk, vaul, etc.)
- Supprimé 8 composants shadcn/ui dormants qui ne compilaient plus après le nettoyage
- Créé l'agent `ui-auditor` pour détecter automatiquement ce type de dette à l'avenir

**Impact :** Landing chunk ~65 kB → ~25 kB gzip. `package-lock.json` allégé de ~1 400 lignes. Installation npm significativement plus rapide. Zéro régression visuelle confirmée par comparaison screenshots prod vs preview (desktop + mobile).

**Leçon tirée :** Un agent d'audit (ui-auditor) a été créé et ajouté au protocole de session obligatoire. Il doit être exécuté avant toute PR touchant l'UI — les CRITICAL bloquent le merge. C'est un garde-fou structurel, pas une vérification ponctuelle.

---

## Audit sécurité — Durcissement post-Phase 7
*13 avril 2026 · PR #104*

**Le défi :** Après trois semaines de développement intensif — RBAC, 5 migrations Supabase, 4 agents automatisés, 11 modules de curriculum — le moment était venu de regarder le projet avec les yeux d'un attaquant. Pas une checklist théorique : un audit black-hat complet, comme si le repo venait d'être cloné par quelqu'un qui cherche des failles.

**Ce qu'on a trouvé et corrigé :**
- CSP `img-src` trop permissive — un wildcard `https:` autorisait le chargement d'images depuis n'importe quel domaine. Restreint aux trois CDN réellement utilisés (avatars GitHub, Google, Vercel Live)
- GitHub Actions sur tags mutables (`@v4`) — vulnérables à une compromission de tag upstream. Les 6 actions des deux workflows CI et security-sentinel sont maintenant épinglées par SHA de commit
- 5 comptes de test RBAC avec mots de passe exposés dans l'historique git (migration 006). Mots de passe rotés en production via l'API Supabase — bcrypt cost 12, 64 caractères aléatoires
- 4 agents d'audit améliorés après analyse des faux positifs : le `content-auditor` ne signale plus les commandes simulées identiques sur tous les OS, le `security-auditor` scanne désormais l'historique git complet

**Impact :** Score de sécurité maintenu à 7.5/10. Les vulnérabilités restantes (CSP `unsafe-inline` pour Motion, rate limiting Sentry tunnel) sont documentées et planifiées — aucune n'est exploitable en l'état.

**Sous le capot :**
- `vercel.json` — directive `img-src` restreinte à `'self' data: https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://vercel.live`
- `.github/workflows/ci.yml` + `security-sentinel.yml` — 6 actions épinglées par SHA
- `ARCHITECTURE.md` + `SECURITY.md` mis à jour (stats curriculum, phases, tables RBAC)
- Agents : règles anti-faux-positifs, scan historique git étendu, vérification couverture validators

---

## Phase 7 — RBAC & Infrastructure institutionnelle
*Avril 2026 · THI-37, THI-76, THI-80*

**Le défi :** L'app était conçue pour des apprenants individuels. Mais la vision était plus large dès le départ : si un enseignant voulait l'utiliser en classe demain, il n'aurait aucun outil pour suivre ses élèves, aucun rôle distinct, aucune séparation des données entre institutions. Construire le RBAC maintenant, avant que le besoin soit urgent, c'est une décision d'architecture anticipée — pas une réaction à des utilisateurs existants.

**Ce qu'on a construit :**
- Système de rôles complet : `student`, `teacher`, `institution_admin`, `super_admin`
- Row Level Security sur toutes les tables exposées — chaque rôle ne voit que ce qu'il doit voir
- Kit de test : 5 utilisateurs de test (un par rôle), institution fictive, classe, inscriptions
- 20 tests d'intégration RBAC + 4 bugs RLS corrigés en chemin

**Impact :** La plateforme peut maintenant accueillir des établissements scolaires. C'est une décision d'architecture anticipée — construire maintenant pour un besoin qui viendra.

**Sous le capot :**
- Migrations Supabase 005 + 006 — nouvelles tables `institutions`, `classes`, `enrollments`
- Principe du moindre privilège agentique appliqué aux politiques RLS
- GoTrue compatibility rules : pas d'inserts directs dans `auth.users`, Admin API uniquement

---

## Module 11 — L'IA comme outil dev
*13 avril 2026 · THI-29 · PR #103*

**Le défi :** Les plateformes pédagogiques ignorent l'IA ou la traitent comme une boîte noire. Nos élèves et enseignants ont besoin de comprendre comment utiliser l'IA comme un amplificateur de compétences — pas comme un remplaçant. C'est un module de graduation (Niveau 5), le dernier du parcours actuel.

**Ce qu'on a construit :**
- 12 leçons couvrant l'intégralité du workflow IA pour développeurs : des capacités aux limites, des prompts basiques aux prompts avancés, de la validation au debugging, de la sécurité aux parcours métiers
- Commande `ai-help` avec 11 sous-commandes interactives dans le terminal
- Posture "senior avec IA" : apprendre à challenger, valider et contextualiser les réponses IA
- Parcours métiers : comment l'IA s'intègre dans chaque branche professionnelle

**Impact :** 11 modules, 64 leçons, 891 tests. Le curriculum couvre maintenant de la navigation de base jusqu'à l'utilisation professionnelle de l'IA — un parcours complet du débutant au développeur augmenté.

---

## Phase 5 — Curriculum expansion *(en cours)*
*Avril 2026 · THI-35*

**Le défi :** Le curriculum initial couvrait les bases. Mais apprendre le terminal, c'est aussi Git, les scripts, la manipulation de fichiers avancée, les permissions — tout ce qu'on utilise vraiment en conditions réelles.

**Ce qu'on construit :**
- 11 modules, 64 leçons — Linux, macOS, Windows, Git, scripting, IA
- 891 tests unitaires couvrant chaque commande et chaque variante d'environnement
- Progression adaptée par OS : un apprenant Windows ne voit pas les commandes bash, et inversement

**Impact :** *En cours de mesure — cette section sera mise à jour à chaque module livré.*

---

## Phase 5.5 — Terminal Sentinel
*Avril 2026 · THI-36 · PR #90*

**Le défi :** Après l'audit de sécurité OWASP, on avait corrigé les vulnérabilités connues. Mais comment s'assurer que de nouvelles n'entrent pas silencieusement avec chaque PR ?

**Ce qu'on a construit :**
- Agent `security-auditor` : audit black-hat automatisé à chaque release majeure
- Couverture : OWASP Top 10 (2021), OWASP API Security (2023), CSP Level 3, RLS, auth flow, supply chain, RGPD, vecteurs 2026
- Agent `content-auditor` : audit pédagogique complet (liens externes, cohérence curriculum↔moteur↔tests, chaîne de prérequis)

**Impact :** Les régressions de sécurité sont détectées avant de toucher `main`. L'audit prend 2 minutes au lieu d'une journée manuelle.

**Sous le capot :**
- Agents Claude spécialisés dans `.claude/agents/` — lecture seule, scope minimal
- `security-auditor` a trouvé 6 bugs RLS non détectés par les tests unitaires lors de sa première exécution

---

## Performance — Bundle & Core Web Vitals
*Avril 2026 · THI-67, THI-81, THI-82, THI-83 · PRs #77, #96, #99*

**Le défi :** Le bundle principal pesait 140 kB. Le FCP réel mesuré sur des utilisateurs français et espagnols dépassait 2,7 secondes. Sur mobile mid-range, l'INP atteignait 592 ms — seuil "Poor" selon les Core Web Vitals de Google. La plateforme était lente pour ceux qui en avaient le plus besoin.

**Ce qu'on a construit :**

| Métrique | Avant | Après | Méthode |
|----------|-------|-------|---------|
| Bundle principal | 140 kB | 16 kB | Lazy-load curriculum (THI-67) |
| FCP (lab) | 2,96 s | 0,6 s | Self-hosted Geist + lazy curriculum |
| INP (production) | 592 ms | < 200 ms | Instant scroll + MAX_LINES cap + startTransition |
| Supabase eager | 194 kB | 0 au chargement | Dynamic import AuthContext + ProgressContext |

**Impact :** La page d'accueil charge en moins d'une seconde sur une connexion standard. Le terminal répond instantanément, même après 50 commandes tapées.

**Sous le capot :**
- `scrollIntoView({ behavior: 'smooth' })` était la cause racine de l'INP 592 ms — une animation CSS qui bloquait le prochain paint à chaque commande
- Remplacé par `el.scrollTop = el.scrollHeight` — instant, zéro animation, zéro blocage
- `startTransition` sépare les updates urgentes (effacer l'input) des non-urgentes (afficher les lignes)
- Cap `MAX_LINES = 300` : empêche le DOM de croître indéfiniment sur les longues sessions

---

## Phase 4 — Multi-environnement Linux / macOS / Windows
*9 avril 2026 · THI-25 · PR #35*

**Le défi :** Le terminal ne simulait que Linux. Mais la majorité des débutants arrivent sur Windows, et les développeurs macOS ont des commandes et une culture différentes. Une app universelle ne peut pas ignorer ça.

**Ce qu'on a construit :**
- Trois profils d'environnement complets : bash (Linux), zsh/Oh My Zsh (macOS), PowerShell 7 (Windows)
- Prompts visuellement distincts : vert pour bash, violet pour zsh, cyan pour PowerShell
- Adaptation automatique des commandes selon l'OS sélectionné
- 192 tests nouveaux couvrant les trois environnements

**Impact :** Un élève sur Windows n'apprend plus des commandes qui ne fonctionneront pas chez lui. L'enseignant peut choisir l'environnement cible de sa classe.

**Sous le capot :**
- `SelectedEnvironment` comme type discriminant central — propagé dans tout le moteur
- `displayPathForEnv()` gère les formats de chemin par OS (forward slash vs backslash)
- WSL prévu mais volontairement absent du V1 — scope défini, pas d'approximation

---

## Phase 3 — Auth & Sauvegarde cloud
*Avril 2026 · Supabase Auth + OAuth*

**Le défi :** La progression était sauvegardée localement. Changer d'appareil = repartir de zéro. Mais ajouter une authentification obligatoire irait contre la philosophie du projet : aucune inscription ne doit être requise pour apprendre.

**Ce qu'on a construit :**
- Authentification optionnelle : l'app fonctionne à 100% sans compte
- OAuth GitHub et Google — zéro mot de passe à créer
- Synchronisation cloud silencieuse quand connecté, localStorage quand non connecté
- Deadlock Supabase résolu : la sync était déclenchée dans `onAuthStateChange`, qui tient un verrou interne GoTrue — déplacée en dehors du callback

**Impact :** Les utilisateurs qui veulent sauvegarder peuvent le faire en 2 clics. Les autres ne voient rien changer.

**Sous le capot :**
- `onAuthStateChange` tient un verrou GoTrue — tout appel Supabase depuis ce callback peut créer un deadlock
- Solution : `setTimeout(0)` pour déférer la sync hors du lock
- Abort controller pour annuler les syncs en vol si l'utilisateur se déconnecte avant la fin

---

## Phase 1 — Le moteur de commandes
*Début 2026*

**Le défi :** Simuler un terminal dans le navigateur sans exécuter de vraies commandes — par définition, un utilisateur ne peut pas `rm -rf /` dans notre app. Mais la simulation doit être assez fidèle pour que ce qu'on apprend ici soit transférable dans un vrai terminal.

**Ce qu'on a construit :**
- `terminalEngine.ts` : moteur de simulation de commandes, filesystem en mémoire, historique, tab completion
- 876 tests unitaires couvrant chaque commande, chaque cas limite, chaque variante d'environnement
- Sécurité : sanitisation des inputs, cap `MAX_INPUT_LENGTH`, strip des caractères de contrôle ASCII

**Impact :** Un élève peut taper `ls -la`, `cd ../projects`, `grep -r "todo" .` et voir exactement ce qu'il verrait dans un vrai terminal — sans risquer quoi que ce soit.

**Sous le capot :**
- Filesystem virtuel en mémoire — `FSNode` tree avec profondeur limitée (MAX_FS_NODES = 10 000)
- `processCommand()` dispatche vers des handlers spécialisés par commande
- Chaque nouvelle commande doit avoir un test dans `terminalEngine.test.ts` avant d'être mergée — règle non négociable

---

## Agents & Workflow — L'automatisation de la vigilance
*Mars–Avril 2026 · THI-34, THI-45, THI-53*

**Le défi :** Plus le projet grandissait, plus les choses pouvaient dériver silencieusement — statuts Linear désynchronisés des PRs GitHub, modifications de `curriculum.ts` cassant des tests sans avertissement, régressions de sécurité passant inaperçues.

**Ce qu'on a construit :**

| Agent | Rôle | Déclencheur |
|-------|------|-------------|
| `linear-sync` | Vérifie cohérence PRs GitHub ↔ statuts Linear | Début de chaque session |
| `curriculum-validator` | Valide structure de `curriculum.ts` | Avant toute modification |
| `test-runner` | Lance vitest, ne remonte que les failures | Après chaque modif moteur |
| `content-auditor` | Audit pédagogique complet A→Z | Avant chaque release majeure |
| `security-auditor` | Audit black-hat OWASP/CSP/RLS | Avant release ou après dépendances |

**Impact :** Les régressions sont détectées avant d'atteindre `main`. La vigilance n'est plus une question de mémoire humaine — elle est automatisée.

---

---

## Glossaire

Pour les lecteurs qui découvrent ces termes :

| Terme | Signification |
|-------|---------------|
| **RBAC** | Role-Based Access Control — système de permissions où chaque utilisateur a un rôle (étudiant, enseignant, admin) qui détermine ce qu'il peut voir et faire |
| **RLS** | Row Level Security — mécanisme de base de données qui filtre automatiquement les données selon l'identité de l'utilisateur, au niveau le plus bas possible |
| **CSP** | Content Security Policy — liste blanche déclarée dans les headers HTTP qui dit au navigateur quels scripts et ressources il a le droit de charger |
| **OWASP** | Open Web Application Security Project — organisation qui publie les 10 vulnérabilités web les plus critiques (injection SQL, XSS, etc.) |
| **FCP** | First Contentful Paint — temps entre le clic et le moment où le navigateur affiche le premier élément visible à l'écran |
| **INP** | Interaction to Next Paint — temps entre une action utilisateur (clic, touche) et le moment où le navigateur *dessine* le résultat à l'écran. Au-dessus de 200 ms, l'interface paraît lente |
| **Paint** | Action du navigateur qui *dessine* les pixels à l'écran. Un "paint" bloqué = l'écran reste figé même si la logique a déjà tourné |
| **Bundle** | Fichier JavaScript regroupant tout le code de l'app, envoyé au navigateur au chargement. Plus il est lourd, plus la page met du temps à démarrer |
| **GoTrue** | Serveur d'authentification open source utilisé par Supabase pour gérer les comptes, sessions et tokens OAuth |
| **OAuth** | Protocole standard qui permet de se connecter avec un compte existant (GitHub, Google) sans créer de mot de passe supplémentaire |
| **Core Web Vitals** | Métriques officielles de Google mesurant la performance perçue par les vrais utilisateurs : FCP, INP, et CLS (stabilité visuelle) |
| **Lazy-load** | Technique qui charge un fichier JavaScript uniquement quand il est nécessaire, plutôt qu'au démarrage de l'app |

---

*Ce changelog est mis à jour à chaque release majeure.*
*Dernière mise à jour : 13 avril 2026*
