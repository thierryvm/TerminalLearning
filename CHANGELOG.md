# Changelog — Terminal Learning

> Journal des évolutions majeures. Chaque entrée raconte le défi, la décision, et l'impact mesurable.
> Pour l'histoire complète de la collaboration et des choix techniques : [Notre histoire](/story).

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

## Phase 5 — Curriculum expansion *(en cours)*
*Avril 2026 · THI-xx*

**Le défi :** Le curriculum initial couvrait les bases. Mais apprendre le terminal, c'est aussi Git, les scripts, la manipulation de fichiers avancée, les permissions — tout ce qu'on utilise vraiment en conditions réelles.

**Ce qu'on construit :**
- 10 modules, 52 leçons planifiées — Linux, macOS, Windows, Git, scripting
- 876 tests unitaires couvrant chaque commande et chaque variante d'environnement
- Progression adaptée par OS : un apprenant Windows ne voit pas les commandes bash, et inversement

**Impact :** *En cours de mesure — cette section sera mise à jour à chaque module livré.*

---

## Phase 5.5 — Terminal Sentinel
*Avril 2026 · THI-36 · PR #90*

**Le défi :** Après l'audit sécurité OWASP, on avait corrigé les vulnérabilités connues. Mais comment s'assurer que de nouvelles n'entrent pas silencieusement avec chaque PR ?

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
