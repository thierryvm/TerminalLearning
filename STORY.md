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

### Ce sur quoi on travaille maintenant

**Admin Panel institutionnel (Phase 9)**
Les outils pour les enseignants : vue classe, heatmaps d'activité, suivi de progression par élève. La plateforme peut maintenant accueillir des établissements — il faut maintenant leur donner les outils pour que ça soit utile.

**Dashboard santé super_admin (THI-85)**
Mode maintenance ON/OFF, graphiques de santé en temps réel, vérification de compatibilité des frameworks. Un vrai cockpit d'administration.

**Système de tickets intégré (THI-86) + capture d'écran intelligente (THI-87)**
Les enseignants et élèves pourront remonter des bugs, suggestions et corrections directement depuis l'app — avec capture pleine page annotable. Pas besoin d'installer un outil tiers.

### Les débats ouverts

**Quand réactiver les dons ?**
Ko-fi et GitHub Sponsors sont techniquement prêts. Les boutons dans l'app sont désactivés en attente d'un accord administratif (mutuelle Solidaris / RIZIV). Ce n'est pas un choix technique — c'est une contrainte réglementaire belge. Quand l'accord arrive, c'est une modification de trois lignes dans le code.

**Multilingue : oui, mais quand ?**
L'app est en français. L'anglais et le néerlandais sont dans la roadmap. La question n'est pas technique — c'est une question de contenu. Traduire 64 leçons et 891 validations de commandes demande une attention pédagogique qu'on ne peut pas expédier.

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
*Dernière mise à jour : 13 avril 2026*
