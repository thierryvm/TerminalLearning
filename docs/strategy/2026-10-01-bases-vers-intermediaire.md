# Des bases au niveau intermédiaire — plan validé le 1er octobre 2026

> Décision de @thierry, 1er octobre 2026 : Terminal Learning devient **la référence pour apprendre les bases du terminal, jusqu'au niveau intermédiaire**, dans les limites d'une simulation fidèle. Les outils de métier (sécurité offensive, analyse réseau, OSINT) ne sont pas simulés. Pour ces métiers, le site oriente vers les plateformes gratuites qui les enseignent déjà.
>
> Procédure à suivre pour chaque livraison : [`docs/processes/curriculum-delivery-checklist.md`](../processes/curriculum-delivery-checklist.md).

## Pourquoi

Le constat date de la même soirée. Les 11 modules et 66 leçons font un très bon premier contact avec le terminal. Le simulateur est vérifié contre de vrais shells, il couvre Linux, macOS et Windows, et il est gratuit, en français et open source.

Il manque encore une marche avant qu'un élève soit prêt à apprendre un métier :

- traiter du texte : chercher, trier, filtrer, comparer ;
- écrire des scripts ;
- manipuler le système : archives, disque, paquets ;
- survivre dans un éditeur ;
- prouver ce qu'on sait sans être guidé.

Simuler `nmap`, `wireshark` ou un vrai réseau donnerait un résultat faux ou un jouet. Cela irait contre la règle qui fait la valeur du projet : chaque sortie correspond à un vrai shell. OverTheWire, picoCTF et TryHackMe (salles gratuites) font déjà ce travail. On y renvoie plutôt que de le refaire.

## Périmètre

| Dans le périmètre (simulable fidèlement) | Hors périmètre |
| --- | --- |
| Commandes qui travaillent sur des fichiers et du texte | Outils d'attaque ou d'analyse réseau (`nmap`, `wireshark`, `tcpdump`) |
| Scripts bash (et un sous-ensemble PowerShell) | Vrai réseau entre plusieurs machines |
| Éditeurs `nano` et `vim` (survie) | OSINT sur de vraies personnes (RGPD) |
| Enquêtes sur des journaux fictifs | Exploitation de failles |
| `apt`, `systemctl`, `journalctl`, si leur sortie est capturée sur le vrai Ubuntu de WSL | Paquets réellement installés, services qui tournent vraiment |

**Sources de vérité pour les sorties attendues :**

- Git Bash : bash et coreutils GNU ;
- PowerShell 7.6, en culture en-US ;
- **Ubuntu sous WSL 2** (présent sur la machine de @thierry, vérifié le 1er octobre 2026) pour ce que Git Bash n'a pas.

macOS reste sans référence locale. Ses écarts BSD sont documentés, pas inventés.

## Ordre d'implémentation

Une PR à la fois. Chaque lot respecte la procédure de livraison. Les estimations comptent les PR, pas les jours.

| Lot | Contenu | PR (estimation) | Dépend de |
| --- | --- | --- | --- |
| **0** | Ce plan, la roadmap, la procédure de livraison | 1 | — |
| **0b** | Garde-fous des compteurs : `llms.txt`, `llms-full.txt` et les métadonnées d'`index.html` vérifiés par un test | 1 | — |
| **1** | Chercher et trier : `sort`, `uniq`, `cut`, `find`, `xargs`, `diff`, options utiles de `wc` et `grep` ; côté PowerShell : `Sort-Object`, `Where-Object`, `Select-Object` sur les objets de `Get-ChildItem` et les lignes de `Get-Content` | 3–4 | — |
| **2** | Archives et disque : `tar`, `gzip`, `zip`/`unzip`, `Compress-Archive`, `du`, `df`, `which`/`type`/`Get-Command` | 1–2 | — |
| **3** | `sed` et `awk` : ce qu'un débutant utilise (substitution, champs, `-F`, motifs simples), avec un message honnête au-delà | 1–2 | 1 |
| **4** | Module « Enquêter dans les journaux » : journaux fictifs (connexions, serveur web), missions en étapes sans réponse donnée | 2–3 | 1, 3 |
| **5** | Éditeurs : `nano` (ouvrir, modifier, enregistrer, quitter) et la survie dans `vim` (`i`, `Échap`, `:wq`, `:q!`) | 1–2 | — |
| **6** | Module Scripts : mini-interpréteur bash (`if`/`test`, `for`/`while`, fonctions, `$1`…`$#`, `$?`, `exit`), puis les leçons, puis un sous-ensemble PowerShell | 4–6 | 1 |
| **7** | Système Linux, uniquement avec des sorties capturées sur WSL : `apt`, `systemctl status`, `journalctl`, `free` | 1–2 | 6 |
| **8** | Mission finale : un scénario sans indice qui mélange les modules. Elle débloque la suite, et on peut la passer directement si on connaît déjà les bases | 1–2 | 1–6 |
| **9** | Ponts vers la suite : module « Personnaliser son terminal » (déjà planifié, avec l'installation d'un vrai terminal et de WSL) et page « Et après ? » qui oriente par métier vers les ressources externes | 2–3 | 8 |

Le cœur (lots 1 à 6 et 8) représente environ **15 à 20 PR**, les lots 7 et 9 en ajoutent 3 à 5. L'ordre suit les dépendances. Le lot 1 vient d'abord, car les missions, les scripts et la mission finale s'appuient sur lui.

## Ce qui évolue en même temps (à chaque lot, pas à la fin)

- **Page Référence** : chaque nouvelle commande y entre, avec ses variantes Linux, macOS et Windows et des exemples exécutables.
- **Page d'accueil** : la liste des commandes disponibles, les compteurs et la feuille de route publique (`landingContent.ts`). Quand les lots 4 et 8 arrivent, l'accueil raconte le nouveau parcours : « des bases jusqu'au niveau intermédiaire », avec un exemple de mission d'enquête.
- **SEO et moteurs IA** : `index.html` (métadonnées, FAQ en JSON-LD), `llms.txt`, `llms-full.txt`, le sitemap.
- **CHANGELOG** pour les décideurs et **STORY** pour la communauté, à chaque PR de code.
- **ROADMAP et plan** : le bandeau en tête et la case cochée du lot.

## Ce qui n'est pas décidé ici

- **Les badges et certificats** (Phase 11b) restent en attente : ils supposent la mission finale (lot 8).
- **Les parcours métiers internes** (Phase 11b, « Career Branches ») sont remplacés par la page d'orientation du lot 9. On en reparlera si un partenaire (école, plateforme de labos) propose un vrai environnement.
- **Le mode histoire** (Phase 12) reste après le parcours principal.
