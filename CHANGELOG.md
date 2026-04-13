# Changelog — Terminal Learning

> Journal des évolutions majeures. Chaque entrée raconte le défi, la décision, et l'impact mesurable.
> Pour l'histoire complète de la collaboration et des choix techniques : [Notre histoire](STORY.md).

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
