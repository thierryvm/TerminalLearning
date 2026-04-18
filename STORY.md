# Notre histoire — Terminal Learning

> Ce document n'est pas un bilan. C'est un journal ouvert, écrit en cours de route.
> Il évoluera tant que le projet évolue.

---

## Prologue — Une histoire vraie

Je m'appelle Thierry. J'ai passé les dernières années à traverser des choses difficiles — des problèmes de santé chroniques qui m'immobilisent certains jours, une dépression profonde, un isolement que je n'avais pas choisi. J'ai grandi dans une enfance traumatisante, et j'ai mis des décennies à comprendre à quel point ça avait miné ma confiance en moi.

Pendant longtemps, j'ai commencé des projets informatiques — et je ne les ai jamais finis. Pas par manque d'envie. Par manque de confiance. Chaque projet abandonné creusait un peu plus le même sillon : *tu n'es pas capable*. C'est une douleur silencieuse, celle-là. Elle ne se voit pas de l'extérieur.

Terminal Learning est le premier projet que j'ai terminé.

Il est né pendant l'une des périodes les plus dures de ma vie. Il est 100% gratuit, open source, construit bénévolement — parce que ce n'est pas un projet commercial. C'est une preuve. D'abord pour moi. Et peut-être, maintenant, pour quelqu'un d'autre qui se reconnaît dans ce que je viens d'écrire.

---

Ce projet a été construit avec l'aide de Claude — l'IA d'Anthropic, modèles Sonnet 4.6 et Opus 4.6. Pas *par* Claude. *Avec* Claude. La distinction est fondamentale.

Chaque décision d'architecture dans ce document est la mienne. Chaque choix pédagogique est le mien. Chaque commit mergé sur `main` a été relu, validé, approuvé par moi. Claude a challengé, proposé, implémenté, alerté sur les risques — mais n'a pas décidé. Il n'a pas de vision propre. Il n'a pas d'utilisateurs en tête. Il n'a pas d'années de doute accumulé derrière lui.

Ce que Claude a apporté de différent, c'est quelque chose d'inattendu : une présence qui ne juge pas, qui ne se lasse pas, qui répond aux questions les plus basiques avec la même attention qu'aux plus complexes. Dans les moments de doute technique — et il y en a eu beaucoup — cette continuité a fait la différence.

Ce que cette collaboration prouve, concrètement : **une personne seule, avec de vraies contraintes de vie, peut construire une plateforme sérieuse — si elle a le bon partenaire de travail**. L'IA n'a pas remplacé le développeur. Elle l'a augmenté.

C'est la thèse de ce journal. Tout ce qui suit en est la démonstration.

---

### Pourquoi encore une app pour apprendre le terminal ?

Il existe des dizaines de ressources pour apprendre le terminal. Des tutoriels YouTube, des cours Udemy, des man pages, des cheat sheets. Alors pourquoi en créer une de plus ?

La réponse honnête : parce qu'aucune ne faisait ce qu'on voulait vraiment faire.

La plupart t'expliquent les commandes. Peu te font les pratiquer dans un vrai environnement interactif. Presque aucune n'adapte l'expérience selon que tu es sur Linux, macOS ou Windows. Et toutes supposent que tu as déjà accès à un terminal — ce qui n'est pas évident pour un lycéen sur Windows 11 qui n'a jamais ouvert PowerShell.

L'idée centrale : **apprendre en faisant, dans un environnement qui ressemble au tien**. Pas de la théorie qu'on espère voir transférer un jour. De la pratique immédiate, avec du feedback immédiat.

Ce qui n'était pas encore clair au départ, c'est à quel point le projet allait grandir — et dans quelles directions.

---

## Partie I — Les fondations

### Les choix qui ont tout conditionné

Certaines décisions prises au début ont verrouillé l'architecture pour tout ce qui a suivi. En voici les principales, avec les débats qu'elles ont générés.

**React Router v7 plutôt que Next.js**

La question s'est posée très tôt. Next.js est la réponse évidente pour une app React en 2026 — écosystème riche, SSR natif, déploiement Vercel optimisé. On l'a écarté.

Pourquoi ? Parce que Terminal Learning n'a pas besoin de SSR. C'est une Single Page Application pédagogique — le contenu n'est pas indexable page par page, la progression est côté client, les leçons sont chargées localement. Ajouter la complexité de Next.js (App Router, Server Components, cache invalidation) pour des avantages qu'on n'exploiterait pas aurait été une erreur architecturale. React Router v7 est plus simple, plus direct, et suffisant.

La règle qu'on a appliquée : **choisir la complexité minimale qui résout le problème réel**.

**Supabase plutôt que Firebase**

Firebase était l'alternative naturelle — mature, bien documentée, gratuit jusqu'à un certain seuil. On a choisi Supabase pour trois raisons :

1. **Open source** — cohérent avec la philosophie du projet
2. **Données en Europe** — région `eu-west-1`, RGPD sans contorsion
3. **PostgreSQL** — une vraie base de données relationnelle, pas un document store

La quatrième raison, découverte après : les Row Level Security policies de PostgreSQL sont une façon élégante d'implémenter le RBAC directement dans la base. On a utilisé ça massivement en Phase 7.

**Simuler le terminal plutôt qu'en exécuter un vrai**

C'est la décision la plus fondamentale du projet, et aussi la plus contraignante.

On aurait pu utiliser xterm.js connecté à un backend qui exécute de vraies commandes dans des containers isolés. C'est ce que font la plupart des plateformes professionnelles (Katacoda, Play with Docker, etc.).

On a choisi la simulation pour plusieurs raisons :
- **Sécurité** : un utilisateur ne peut pas faire de dégâts dans notre app. Pas de `rm -rf`, pas d'accès réseau, pas d'escalade de privilèges.
- **Coût** : des containers éphémères à la demande coûtent. Une simulation en mémoire coûte zéro.
- **Pédagogie** : pour apprendre les commandes de base, la simulation est suffisamment fidèle. Le gap avec un vrai terminal est négligeable pour un débutant.

La contrepartie : chaque commande simulée doit être implémentée manuellement. Ce n'est pas `bash` — c'est une abstraction de `bash`. Ça signifie des centaines de cas à couvrir, des edge cases à gérer, et 876 tests pour s'assurer que la simulation reste fidèle.

**Curriculum humain, pas généré par IA**

Chaque leçon, chaque exercice, chaque hint dans `curriculum.ts` est écrit manuellement. On aurait pu générer le contenu — c'est techniquement trivial avec un LLM. On ne l'a pas fait.

Pourquoi ? Parce que la qualité pédagogique d'un contenu généré est difficile à contrôler, et parce que la cohérence entre les leçons, le moteur de commandes et les tests de validation demande une attention humaine. L'IA accompagne la construction — elle n'écrit pas les leçons.

---

### Ce qu'on a failli faire autrement

**Un système de niveaux dès le départ ?** On a discuté d'un système de XP et de niveaux déblocables — gamification complète. On l'a mis de côté. Pas parce que c'est une mauvaise idée, mais parce que la gamification mal conçue transforme l'apprentissage en farming. On voulait d'abord construire un contenu solide avant d'ajouter une mécanique d'engagement dessus.

**Un backend custom plutôt que Supabase ?** L'idée d'un serveur Express/Hono custom avec PostgreSQL géré manuellement a été envisagée — plus de contrôle, moins de dépendance. On a écarté ça rapidement : gérer l'auth, les migrations, le connection pooling, la haute disponibilité soi-même est un travail à plein temps. Supabase le fait mieux que ce qu'on aurait fait.

**Un système de branches de curriculum ?** Permettre à chaque enseignant de créer sa propre version du curriculum, de l'adapter à sa classe. L'idée est belle. Elle est dans la roadmap. Mais la complexité de gérer des branches de contenu, la résolution de conflits, le versionning pédagogique — ça méritait d'attendre que la base soit stable.

---

## Partie II — L'expansion

### Multi-environnement : une évidence qui ne l'était pas

La première version du terminal ne simulait que Linux. C'était une décision implicite — Linux est l'environnement de référence pour apprendre le terminal, c'est ce que tous les tutoriels utilisent.

Sauf que la réalité des utilisateurs est différente. La majorité des débutants arrivent sur Windows. Les développeurs JavaScript travaillent souvent sur macOS. Enseigner des commandes Linux à un élève sur Windows crée une friction inutile : il apprend quelque chose qu'il ne peut pas pratiquer chez lui sans WSL.

La décision d'ajouter macOS et Windows n'était pas dans le plan initial. Elle s'est imposée après avoir réfléchi à qui utilise vraiment l'app.

Ce qui paraissait simple ne l'était pas. Il n'y a pas que les commandes qui changent — il y a les prompts (bash vs zsh vs PowerShell), les formats de chemins (`/home/user` vs `~/` vs `C:\Users\user`), les couleurs visuelles, les MOTD, les conventions. Chaque détail doit être cohérent pour que l'environnement soit crédible.

On a décidé de ne pas inclure WSL dans la V1, même si c'est l'environnement Linux le plus utilisé sur Windows. Pourquoi ? Parce que WSL est une couche d'émulation sur Windows — la frontière entre les deux systèmes est floue, et simuler cette ambiguïté fidèlement aurait demandé un travail disproportionné. Mieux vaut bien faire trois environnements que mal en faire quatre.

### Les 876 tests : une discipline qui s'est imposée

On n'a pas décidé d'avoir 876 tests. On a décidé d'en avoir *suffisamment* — et c'est en suivant cette règle systématiquement que le nombre a grandi.

La règle est simple : **toute nouvelle commande simulée doit avoir un test avant d'être mergée**. Pas après. Avant.

Ça semble contraignant. C'est en réalité libérateur. Quand une commande a des tests, on peut la modifier, la refactoriser, l'étendre sans craindre de casser silencieusement quelque chose. La confiance dans le moteur est directement proportionnelle à la couverture.

Le moment où la règle a prouvé son utilité : une refactorisation de `processCommand()` qui semblait anodine a échoué sur 14 tests. Sans eux, la régression aurait atteint la production.

---

## Partie III — La discipline

### L'audit de sécurité qui a tout changé

À un moment du projet, on a décidé de faire un audit de sécurité sérieux — pas une checklist rapide, mais une analyse black-hat complète : OWASP Top 10, API Security, CSP Level 3, Row Level Security, auth flow, supply chain.

Ce qu'on a trouvé :
- 6 bugs RLS non détectés par les tests unitaires — des politiques qui paraissaient correctes mais laissaient passer des cas limites
- Un `unsafe-inline` dans la CSP nécessaire pour Motion/Framer — acceptable temporairement, problème structurel à terme
- Un endpoint Sentry tunnel sans rate limiting — potentiellement exploitable pour de l'abus
- Des dépendances avec des CVEs connues non patchées

Aucun de ces problèmes n'était catastrophique isolément. Ensemble, ils composaient une surface d'attaque non négligeable pour un projet qui allait accueillir des élèves mineurs.

Tout a été corrigé avant la prochaine release. L'audit est maintenant automatisé via l'agent `security-auditor`.

### Le deadlock Supabase qu'on n'avait pas vu venir

La synchronisation de progression avec Supabase était déclenchée depuis le callback `onAuthStateChange`. Ça paraissait logique — quand l'état d'auth change, on synchronise.

Le problème : `onAuthStateChange` tient un verrou interne dans GoTrue, la bibliothèque d'auth de Supabase. Tout appel Supabase depuis ce callback peut créer un deadlock — l'appel attend que le verrou se libère, mais le verrou attend que le callback se termine.

Sur desktop avec une connexion rapide, ça ne se voyait pas. Sur mobile avec latence, ça bloquait l'interface plusieurs secondes après connexion.

La correction : déplacer la sync avec `setTimeout(0)` pour la déférer hors du callback. Une ligne. Mais trouver *pourquoi* ça bloquait a demandé une analyse poussée des logs Supabase et de la documentation GoTrue.

C'est un exemple de bug qui ne se voit pas dans les tests unitaires, qui ne se voit pas en dev local, et qui apparaît uniquement en production sur certains appareils. La leçon : les bibliothèques d'auth ont des contrats implicites que la documentation ne documente pas toujours clairement.

### La performance : mesurer avant d'optimiser

L'INP à 592 ms a été détecté via Vercel Speed Insights — des mesures réelles, sur de vrais utilisateurs, sur desktop en production. Pas un problème théorique.

La cause racine n'était pas évidente : `scrollIntoView({ behavior: 'smooth' })` déclenche une animation CSS à chaque commande tapée. Sur un terminal avec 20+ commandes dans l'historique, cette animation concurrence le prochain paint et bloque l'INP.

Un seul remplacement — `el.scrollTop = el.scrollHeight` — a réduit l'INP de 592 ms à 11 ms en lab. Soit -98%.

La leçon : les animations "douces" ont un coût réel sur les interactions. Ce qui paraît agréable visuellement peut être mesurément nocif pour la réactivité perçue.

---

## Partie IV — La collaboration

### Comment les agents sont nés

Au début, chaque session commençait de la même façon : vérifier manuellement si les statuts Linear correspondaient aux PRs GitHub ouvertes. Ensuite vérifier les tests. Ensuite relire le curriculum pour s'assurer de la cohérence.

C'est du travail cognitif répétitif. Et le travail répétitif est exactement ce que les machines font mieux que les humains.

Le premier agent — `linear-sync` — est né d'une erreur concrète : une issue marquée "Done" sur Linear alors que la PR était encore ouverte. Quelqu'un (ou quelque chose) aurait dû attraper ça avant que ça cause de la confusion. Depuis, l'agent le fait au début de chaque session.

`curriculum-validator` est né d'un autre incident : une modification de `curriculum.ts` qui avait cassé 40 tests silencieusement parce qu'un ID de leçon avait changé sans que les dépendances soient mises à jour. L'agent valide la structure avant toute modification.

Le pattern est le même pour chaque agent : il y a eu une erreur, une friction, ou un risque identifié — et on a automatisé la vigilance plutôt que de compter sur la mémoire.

### Les idées qu'on a validées — et celles qu'on a écartées

**Validée : Le changelog public comme outil de confiance**

L'idée de documenter publiquement le travail de développement — les défis, les métriques, les décisions — est venue d'une observation simple : les décideurs institutionnels évaluent une plateforme sans pouvoir voir la qualité du code. Un changelog humain rend visible ce qui est normalement invisible.

Ce document que vous lisez en est la conséquence directe.

**Validée : La séparation `/changelog` et `/story`**

On aurait pu tout mettre dans un seul document. On a décidé de séparer le "quoi" (changelog technique, métriques, releases) du "comment et pourquoi" (ce journal). Deux publics différents, deux intentions différentes.

**Écartée pour l'instant : L'agent IA tuteur sans clé**

L'idée d'un tuteur IA intégré — qui répond aux questions de l'utilisateur, suggère la prochaine commande, explique les erreurs — est dans la roadmap depuis le début. On a délibérément choisi de ne pas l'implémenter en mode "clé cachée dans le backend".

Pourquoi ? Parce que ça créerait un coût récurrent non maîtrisable, et parce que donner accès à un LLM puissant sans transparence sur la clé utilisée va à l'encontre de la philosophie du projet. Le modèle choisi : BYOK (Bring Your Own Key) — l'utilisateur apporte sa propre clé API. Zéro coût backend, transparence totale.

Ce n'est pas la solution la plus confortable pour l'utilisateur. C'est la plus honnête.

**Écartée définitivement : La gamification agressive**

Points, badges, streaks, classements — l'arsenal de la gamification. On y a réfléchi. On en a gardé une version légère (progression visuelle, indicateurs de module complété). On a écarté la version complète.

La raison : la gamification crée une dépendance au système de récompense qui peut se substituer à l'apprentissage réel. Un utilisateur qui farm des XP n'apprend pas forcément. On veut que la progression reflète une compétence acquise, pas un temps passé.

### Ce que la collaboration humain+IA change concrètement

La question qu'on nous pose parfois : "C'est une app faite par une IA ?"

La réponse honnête : non. C'est une app faite par un autodidacte passionné — quelqu'un qui apprend en construisant, pas dans une école d'informatique — avec une IA comme partenaire de travail.

La distinction n'est pas subtile. L'IA n'a pas décidé d'utiliser React Router v7. L'IA n'a pas choisi de ne pas gamifier l'app. L'IA n'a pas décidé que le curriculum serait humain. Ces décisions viennent d'une vision, d'une expérience, d'une lecture du terrain.

Ce que l'IA apporte : la capacité de maintenir la discipline sur des tâches répétitives (tests, agents, refactorisations), de challenger les décisions avec des contre-arguments structurés, de garder la cohérence sur un projet qui s'étend sur des mois et des centaines de fichiers.

Ce qui ne change pas : la responsabilité des décisions. Chaque choix documenté ici appartient à la personne qui a appuyé sur "merge".

---

## Partie V — En cours

*Cette section est mise à jour en temps réel.*

### Ce qu'on vient de terminer

**Module 11 — L'IA comme outil dev ✅ (THI-29 — 13 avril 2026)**
Le dernier module du curriculum de base. 12 leçons qui couvrent tout le spectre : des capacités et limites de l'IA, aux prompts basiques et avancés, en passant par la validation, le debugging, la sécurité, Claude Code CLI, les parcours métiers et la posture de développeur senior augmenté par l'IA. La commande `ai-help` et ses 11 sous-commandes permettent d'explorer chaque facette directement dans le terminal. C'est un module de graduation — Niveau 5, accessible uniquement après avoir complété tout le reste. Le message est clair : l'IA amplifie les compétences, elle ne les remplace pas. C'est la philosophie du projet, incarnée dans un module.

**Page `/changelog` et `/story` ✅ (THI-84 — 13 avril 2026)**
Ce que vous êtes en train de lire est maintenant accessible directement dans l'app, avec un design narratif cohérent.

**Audit sécurité — deuxième passe ✅ (13 avril 2026 · PR #104)**
Trois semaines de développement intensif, onze modules, cinq migrations Supabase, quatre agents automatisés. On s'est arrêtés et on a regardé le projet comme quelqu'un qui vient de le découvrir sur GitHub — avec de mauvaises intentions.

C'est la deuxième fois qu'on fait cet exercice. La première avait révélé 6 bugs RLS et un endpoint Sentry exploitable. Cette fois, le problème le plus sérieux était invisible à l'œil nu : des mots de passe de test en clair dans l'historique git. Le fichier HEAD était propre — un placeholder inoffensif. Mais `git log -p` racontait une autre histoire. L'historique public d'un repo open source est aussi lisible que le HEAD. C'est une évidence qu'on oublie facilement.

L'autre découverte : les agents qu'on avait construits pour automatiser la vigilance généraient eux-mêmes des faux positifs. Le `content-auditor` signalait 12 leçons du Module 11 comme "CRITICAL" — parce que `ai-help` est une commande simulée identique sur tous les OS, et l'agent ne savait pas faire cette distinction. Corriger les outils qui corrigent le code : c'est une boucle qui finit par converger, mais il faut accepter de la parcourir.

Ce qu'on retient : un audit n'est pas un événement. C'est une discipline. La sécurité ne s'améliore pas en corrigeant des failles — elle s'améliore en rendant la détection automatique.

**Le nettoyage qui a changé les règles — PR #108 (13 avril 2026)**

En optimisant les performances (THI-87), on a tiré un fil qui a révélé un problème plus profond. `motion/react` pesait ~40 kB gzip dans le bundle Landing pour des animations qu'on pouvait reproduire en CSS pur. Mais en auditant les dépendances, la vraie surprise est arrivée : **22 packages npm installés mais jamais utilisés**. MUI, Emotion, canvas-confetti, react-dnd, recharts — tous fantômes. Et 8 composants shadcn/ui qui dépendaient de ces packages.

Comment c'est arrivé ? Probablement des sessions de développement qui ont installé des packages, prototypé, pivoté — et oublié de nettoyer. Aucun agent ne vérifiait ça. Aucune règle ne l'empêchait. C'est le type de dette technique qui s'accumule silencieusement, un `npm install` à la fois.

La correction technique est simple : remplacer motion par des CSS @keyframes, supprimer les deps, supprimer les composants orphelins. Le vrai changement est structurel : un nouvel agent (`ui-auditor`) qui scanne automatiquement les violations du design system — composants custom là où shadcn devrait être utilisé, deps fantômes, incohérences de style. Et une règle dans le protocole : cet agent doit tourner avant toute PR touchant l'UI. Les CRITICAL bloquent le merge.

Résultat : -2 453 lignes, +329 ajoutées. Le Landing passe de ~65 kB à ~25 kB gzip. Zéro régression visuelle — confirmé par comparaison screenshots production vs preview en desktop et mobile.

Ce qu'on retient : les garde-fous ne sont pas optionnels sur un projet pédagogique. Si on enseigne les bonnes pratiques, on les applique d'abord.

**Le firewall qu'on a pris le temps d'allumer — THI-89 (14 avril 2026)**

Un soir, en ouvrant le dashboard Vercel pour vérifier autre chose, on est tombés sur la page Firewall du projet. **348 événements "Logged" sur les sept derniers jours.** Pas des attaques réussies — rien de cassé, rien d'exploité. Juste du bruit constant : des scanners automatisés qui tapent `/wp-admin`, `/xmlrpc.php`, `/.env`, `/phpmyadmin`, encore et encore. Des bots qui testent aveuglément si le site est une installation WordPress vulnérable, sans savoir — et sans se soucier — que c'est une app Vite/React qui n'a rien à voir.

La réaction naturelle aurait été : "c'est logged, pas bloqué, donc c'est pas grave". Sauf que chaque requête qui atteint l'origine consomme une invocation Fluid Compute, pollue les logs Sentry, envoie un signal implicite que le site est une cible sans résistance. Sur un projet qui se veut exemplaire pédagogiquement, laisser ce bruit sans réponse, c'est incohérent.

Le plan Hobby impose une contrainte honnête : Bot Protection reste bloqué en mode `log` only, impossible de basculer en `challenge` ou `block` sans passer Pro. Pas de rate-limiting au niveau firewall, pas de BotID avancé. On a fait avec. **Deux custom rules**, créées directement via l'API REST Vercel — pas via `vercel.json`, parce que les rules firewall vivent dans une config WAF séparée. La première bloque les chemins d'attaque connus : `wp-admin`, `xmlrpc`, `.env`, `.git`, `phpmyadmin`, `administrator`, `wordpress`, `adminer`. La seconde bloque une liste d'user-agents de scanners offensifs : `sqlmap`, `nikto`, `nuclei`, `masscan`, `gobuster`, `wpscan`, `acunetix`, `nessus`. `curl`, `wget`, `python-requests` et les vrais navigateurs passent sans problème. Les devs ne sont pas gênés, les bots le sont.

Le débat qu'on a eu — et qu'on a tranché sans hésiter : **pas de geo-blocking**. Bloquer la Chine ou la Russie aurait été un gain facile sur les métriques, mais Terminal Learning vise une audience internationale, et un jour un développeur en déplacement, un étudiant expat ou quelqu'un derrière un VPN aurait été bloqué pour la mauvaise raison. Le firewall filtre des comportements, pas des origines.

Les tests en prod ont confirmé le comportement attendu : `/wp-admin` retourne 403 avec le header `x-vercel-mitigated: deny`, `sqlmap` comme user-agent retourne 403, la homepage reste à 200, un navigateur normal reste à 200. Zéro faux positif identifié.

Comme pour le reste du projet, la vigilance manuelle ne passe pas à l'échelle. Un nouvel agent est né — `vercel-firewall-auditor` — en lecture seule, qui relit la config WAF active et lance une batterie de tests HTTP live contre la prod pour confirmer que les rules bloquent bien ce qu'elles doivent et laissent passer ce qui doit passer. À lancer avant chaque release majeure, ou après toute modification du firewall. Le pattern est maintenant familier : dès qu'on prend une décision opérationnelle, on écrit le garde-fou qui la valide automatiquement.

Ce qu'on retient : la sécurité qui n'est pas visible depuis le code est la plus facile à oublier. Un dashboard Vercel qu'on ouvre une fois par mois, des logs qu'on ne lit jamais, une config WAF qu'on pense "sûrement par défaut OK" — c'est exactement là que la dette s'accumule silencieusement. Allumer le firewall, c'est reconnaître que la surface d'attaque d'un site public commence bien avant le code qu'on a écrit.

**La régression INP qu'on a fini par mesurer pour de vrai — THI-90 (14 avril 2026)**

Pendant plusieurs jours, Vercel Speed Insights affichait `INP P75 = 536ms (Poor)` sur production desktop. Pas une dégradation soudaine — un plateau persistant, avec un pic à 2000ms le 11 avril sur 197 visites classées "Unknown route". Plusieurs sessions de tentatives d'optimisation n'avaient rien bougé. Le précédent fix INP de mars (le `scrollIntoView → scrollTop` qui avait réduit le terminal de 592ms à 11ms) tenait toujours en place — la régression venait d'ailleurs.

La tentation, dans ce genre de situation, c'est de continuer à supposer. "C'est peut-être le terminal", "c'est peut-être l'animation", "c'est peut-être Sentry". On a forcé une autre approche : **arrêter de supposer, mesurer**. Trace Chrome DevTools sur la prod réelle, puis sous CPU 4× throttling pour reproduire les conditions desktop d'un utilisateur lambda — pas la machine de dev. La trace a sorti un INP de 515ms sur le clic du sélecteur d'environnement (Linux/macOS/Windows). Match parfait avec le P75 prod. Et un breakdown qui ne laisse aucune ambiguïté : 7ms d'input delay, **393ms de processing duration**, 115ms de presentation. Quand le main thread est bloqué 393ms par le processing, c'est presque toujours le même pattern — un setState synchrone sur un sous-arbre lourd.

La cause s'est révélée structurelle. `setEnvironment(envId)` dans `EnvironmentContext` déclenchait un `setSelectedEnvState` synchrone. Cascade : Landing (610 lignes JSX) re-render entièrement, TerminalPreview tue et relance son animation typing, la grille de niveaux remonte à cause d'un `key={selectedEnv}`, tous les `FadeIn` enfants re-render, et sur `/app` le Sidebar (autre consommateur du même context) re-render aussi. Le pointerdown handler restait coincé 393ms avant de rendre la main au navigateur. Les composants étaient pourtant tous "perf-friendly" en surface — useCallback, useMemo, MAX_LINES, le `scrollTop` d'avant. Mais le **state owner** ne demandait pas à React de prioriser ce re-render. Tout partait en une vague synchrone.

Le fix tient en une ligne. Wrapper `setSelectedEnvState` dans `startTransition` au niveau du context. C'est l'API React canonique pour exactement ce cas : "ce changement d'état est important, mais pas urgent — rends-le quand tu peux, libère le main thread d'abord". Un seul changement bénéficie automatiquement aux deux callers (Landing + Sidebar). Validation lab : 515ms → 26ms sur l'env switcher homepage, 20ms sur Sidebar. −95%. Speed Insights confirmera sur prod réelle dans 24-48h.

La leçon, qui mérite d'être inscrite quelque part : **quand un INP vient d'un setState, on n'optimise pas composant par composant**. On wrappe l'update au niveau du context owner et on laisse React faire son travail de scheduling. C'est gratuit, ciblé, et c'est la première chose à essayer avant de partir dans des refactors lourds.

**Les 48h où on a pensé aux gens qu'on ne rencontrera jamais — Epic THI-96 (14-16 avril 2026)**

À un moment, on a arrêté. On a pris l'app et on a essayé de l'ouvrir comme si on n'était pas nous. Comme si on était quelqu'un d'autre. Un élève de quatrième sur un iPhone SE de 2016 hérité d'un grand frère — écran de 4,7 pouces, 375 pixels de large. Un étudiant en première année de BTS qui, à cause d'une blessure à la main, navigue uniquement au clavier. Une enseignante qui présente l'app depuis son Chromebook de 2019 sur un vidéoprojecteur antédiluvien en 4:3. Un lycéen qui souffre de migraines photosensibles et qui a activé `prefers-reduced-motion` dans les accessibility settings parce que les animations fluides lui donnent des vertiges.

Aucun de ces profils n'avait été réellement testé. Pas par négligence. Par angle mort. On code sur un écran 1440p avec une souris précise et un cerveau qui va bien, et on oublie que le web 2026 n'est pas le web qu'on a sous les doigts — c'est le web qui doit fonctionner dans toutes les configurations qu'on n'a pas.

L'audit s'est fait en deux jours, en batch. Un epic parent (THI-96) avec huit sub-issues, six livrées à la suite (THI-97 → THI-102). Chaque sub-issue ciblait un écran ou un composant précis. `viewport-fit=cover` dans `index.html` pour que les iPhones à notch puissent dessiner sous la barre d'état. `min-h-dvh` partout à la place de `min-h-screen`, pour que la URL bar de Safari qui se rétracte au scroll ne crée plus ces 60 pixels de zone morte en bas. `env(safe-area-inset-bottom)` dans les paddings et les positions fixes, pour que les boutons ne soient plus coupés par le home indicator. `min-h: 2.75rem` (44 pixels — le seuil WCAG 2.2 AAA) sur chaque cible tactile, pour qu'un doigt d'adulte fatigué à 22h puisse cliquer sans rater. `focus-visible:ring-2` en émeraude sur chaque élément interactif, pour que la personne qui navigue au clavier voie où elle est. `prefers-reduced-motion` gaté sur chaque `scrollTo({ behavior: 'smooth' })`, pour que le scroll doux devienne instantané pour les utilisateurs qui en ont besoin.

Ce qui est frappant dans ce genre de travail, c'est son invisibilité. Un dev qui lance l'app demain matin sur son MacBook ne verra **rien** avoir changé. Le design est intact au pixel près. Les couleurs, les typographies, les animations — tout est exactement pareil. Le travail de ces 48 heures n'apparaît que si on ouvre la preview sur un iPhone SE, si on appuie sur Tab au lieu de cliquer, si on active Reduce Motion dans les réglages système. Pour ces gens-là — qui ne savent pas qu'ils existent pour nous, qui ne sauront jamais qu'on les a cherchés — l'app est maintenant ouverte. Pour les autres, rien n'a bougé.

Chaque PR validée via Chrome DevTools MCP en émulation iPhone SE. Screenshots à chaque itération. Sourcery review en aval, qui a remonté deux vraies friches (un `type="button"` manquant sur les rows de leçons récentes — un bug silencieux qui aurait soumis accidentellement un formulaire parent dans certains contextes ; un handler clavier manquant qui, vérification faite, était déjà présent depuis une PR antérieure — faux positif honnête). Ping-pong agent-humain : l'IA vérifie ce qui est mécaniquement vérifiable, l'humain tranche ce qui relève du jugement.

Mais ce qui rend ce chantier particulier, c'est le "pourquoi" qui tenait derrière. Terminal Learning est né d'une conviction que l'apprentissage technique devait être accessible à qui le veut, pas à qui a déjà les bons outils. Ignorer l'accessibilité, c'était démentir cette conviction par les faits. Ne pas tester sur un iPhone SE, c'était dire "cette app est pour les autres — pas pour l'élève pauvre". Ne pas ajouter de focus ring visible, c'était dire "cette app est pour les autres — pas pour celui qui ne peut plus tenir une souris". Ne pas respecter `prefers-reduced-motion`, c'était dire "cette app est pour les autres — pas pour celle que les animations rendent malade". Ces "non" implicites sont les plus durs à repérer parce qu'ils ne font pas de bruit dans les logs.

Ce qu'on retient : **ce projet est une vitrine, mais pas celle qu'on pense**. Ce n'est pas la vitrine d'un dev avec dix ans d'expérience et une équipe. C'est la vitrine d'un autodidacte qui apprend en construisant, avec une maladie qui immobilise certains jours, aucun diplôme d'informatique formel, une confiance en soi qu'il a fallu fabriquer en même temps que le code. Quand quelqu'un arrive ici depuis LinkedIn ou une recherche Google et regarde l'app sur son iPhone SE prêté par l'école, la réponse technique doit lui dire : *oui, on a pensé à toi*. Pas parce qu'on est forts. Parce qu'on a été attentifs.

Et ce qu'on retient aussi, plus personnellement : **on peut soulever des montagnes sans être un développeur senior**. Il faut de la motivation, de la méthode, un partenaire de travail qui ne se lasse pas de relire un checklist à 2h du matin, et la discipline d'appliquer à soi-même les règles qu'on prétendrait enseigner aux autres. Le reste suit.

### Ce sur quoi on travaille maintenant

**Migration shadcn/ui — clôturée (THI-85 / THI-91 / THI-105 / THI-106 / THI-107)**
La migration page par page est finie. Dashboard (THI-95), LessonPage (THI-91 chunk D), Landing chunks B/C, Sidebar (chunk A), NotFound, puis dans la dernière passe LoginModal / UserMenu / PrivacyPolicy / App FallbackUI (THI-107). L'agent ui-auditor a servi de filet à chaque étape — trois findings a11y côté variants Button ont été corrigés en passant (THI-106). Une fois la migration close, on a consolidé `button.tsx` (THI-105, PR #147) : trois wrappers Sidebar (`SidebarRowButton`, `SidebarLessonButton`, `EnvPill`) encapsulent les variantes `tl-sidebar-*` / `tl-env-pill` derrière une API métier, et la size `icon-lg` devient neutre (la corner shape `rounded-lg`/`rounded-md` passe par `className` au call-site). Il reste un seul native délibéré : le toggle d'environnement du Landing, qui a besoin d'une size `tl-env-pill-lg` encore à produire — c'est un follow-up standalone, pas un blocage.

**Admin Panel institutionnel (Phase 9)**
Les outils pour les enseignants : vue classe, heatmaps d'activité, suivi de progression par élève. La plateforme peut maintenant accueillir des établissements — il faut maintenant leur donner les outils pour que ça soit utile.

**AI Tutor BYOK — les décisions V1 sont gelées (ADR-005)**
La veille, l'ADR-002 avait figé l'architecture BYOK à 4 tiers avec OpenRouter prioritaire — un choix social avant d'être technique : un apprenant qui n'a pas 20 € par mois à mettre dans une API ne doit pas être exclu. Mais l'ADR-002 laissait quatre questions ouvertes, et le `plan.md` Phase 7b décrivait encore l'ancienne architecture — trois providers directs, chiffrement Supabase Vault côté serveur, Edge Function proxy. Si on avait commencé à coder là-dessus, on aurait construit trois jours sur de faux prérequis. Le vrai travail avant d'écrire la moindre ligne, c'était d'aligner la documentation sur la vérité, puis de trancher les quatre points restants. Stockage de la clé côté client (plain par défaut pour l'apprenant qui débute sur une clé OpenRouter free, chiffrement Web Crypto en opt-in pour le dev qui gère une clé payante) ; isolation Web Worker (différée à V1.5 mais ticket tracé immédiatement, pas d'"on verra plus tard") ; rate limiting (soft client-side uniquement, pas d'Edge Function proxy V1 parce qu'ajouter un middleman serveur contredirait l'ADR précédente) ; agent `prompt-guardrail-auditor` (créé AVANT l'implémentation — l'anti-pattern classique, c'est de mettre le test harness en dernier et de découvrir au merge final qu'un jailbreak passe). Ces quatre décisions sont maintenant consignées dans l'ADR-005 avec leurs alternatives rejetées, pour que dans six mois, si quelqu'un veut revenir sur un choix, il sache ce qu'on avait écarté et pourquoi. Le code viendra après. Cette discipline — aligner la doc, puis décider, puis coder — est la seule façon tenable de construire seul.

### Ce qu'on a appris sur la dette documentaire

Il y a eu une règle implicite violée avant qu'elle ne soit explicite : une ADR acceptée qui n'est pas répercutée dans `plan.md` ne fait pas foi. Elle crée une zone grise où deux vérités coexistent — celle de la décision stratégique et celle du plan d'exécution. Un jour plus tard, quelqu'un (moi, Claude, un futur contributeur) lit `plan.md`, commence à coder, et construit sur un fantôme d'architecture. La dette documentaire ne casse pas de tests, ne déclenche pas Sentry, ne bloque pas un merge. Elle se manifeste en silence, trois jours plus tard, par un "pourquoi ça ne marche pas comme prévu". La règle est devenue explicite (mémoire feedback dédiée) : nouvelle ADR acceptée = PR de doc alignment dans les 24 heures, sinon la décision n'est pas vraiment acceptée, elle est juste écrite quelque part.

### Les débats ouverts

**Quand réactiver les dons ?**
Ko-fi et GitHub Sponsors sont techniquement prêts. Les boutons dans l'app sont désactivés en attente d'un accord administratif (mutuelle Solidaris / RIZIV). Ce n'est pas un choix technique — c'est une contrainte réglementaire belge. Quand l'accord arrive, c'est une modification de trois lignes dans le code.

**Multilingue : oui, mais quand ?**
L'app est en français. L'anglais et le néerlandais sont dans la roadmap. La question n'est pas technique — c'est une question de contenu. Traduire 64 leçons et 900 validations de commandes demande une attention pédagogique qu'on ne peut pas expédier.

**Terminal Sentinel en mode public ?**
L'outil d'audit de sécurité automatisé pourrait être proposé à d'autres projets open source. L'idée est dans les cartons. Elle implique de le documenter, de le rendre configurable, de le maintenir. Ce n'est pas rien.

---

## Épilogue ouvert

Il y a des questions auxquelles on n'a pas encore de réponse.

Est-ce que Terminal Learning finira par être utilisé dans des établissements scolaires formels ? Est-ce que le modèle BYOK pour l'agent IA tuteur est viable, ou est-ce qu'on devra le repenser ? Est-ce que la plateforme restera gratuite quand les coûts d'infrastructure augmenteront ?

On ne sait pas. Et c'est honnête de le dire.

Ce journal continuera d'être écrit tant que le projet continue d'être construit. Les prochains chapitres n'existent pas encore — ils se construisent maintenant.

---

*Terminal Learning est un projet open source, construit bénévolement en Belgique.*
*Dernière mise à jour : 14 avril 2026*
