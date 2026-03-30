export type BlockType = 'text' | 'code' | 'tip' | 'warning' | 'info';

export interface ContentBlock {
  type: BlockType;
  content: string;
  label?: string;
}

export interface Exercise {
  instruction: string;
  hint: string;
  validate: (command: string) => boolean;
  successMessage: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  blocks: ContentBlock[];
  exercise?: Exercise;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  iconName: string;
  color: string;
  lessons: Lesson[];
}

export const curriculum: Module[] = [
  {
    id: 'navigation',
    title: 'Navigation',
    description: 'Maîtrisez vos déplacements dans le système de fichiers',
    iconName: 'Compass',
    color: '#22c55e',
    lessons: [
      {
        id: 'pwd',
        title: 'pwd — Où suis-je ?',
        description: 'Affichez votre position exacte dans le système de fichiers',
        blocks: [
          {
            type: 'text',
            content:
              'La commande `pwd` (Print Working Directory) affiche le chemin absolu du répertoire dans lequel vous vous trouvez. C\'est votre boussole dans le terminal.',
          },
          {
            type: 'info',
            content:
              'Dans un système Unix/Linux, les fichiers sont organisés en arborescence. Chaque répertoire peut contenir des fichiers et d\'autres sous-répertoires.',
          },
          {
            type: 'code',
            content: '$ pwd\n/home/user',
            label: 'Exemple',
          },
          {
            type: 'text',
            content:
              'Le chemin commence toujours par `/` (la racine du système), suivi des répertoires imbriqués séparés par des slashes. `/home/user` signifie : racine → home → user.',
          },
          {
            type: 'tip',
            content: 'Utilisez `pwd` chaque fois que vous êtes perdu. C\'est votre repère absolu !',
          },
        ],
        exercise: {
          instruction: 'Tapez la commande `pwd` pour afficher votre répertoire courant.',
          hint: 'Entrez simplement "pwd" et appuyez sur Entrée',
          validate: (cmd) => cmd.trim() === 'pwd',
          successMessage: 'Parfait ! Vous savez maintenant afficher votre répertoire courant.',
        },
      },
      {
        id: 'ls',
        title: 'ls — Lister les fichiers',
        description: 'Affichez le contenu d\'un répertoire',
        blocks: [
          {
            type: 'text',
            content:
              'La commande `ls` (list) affiche les fichiers et dossiers présents dans le répertoire courant. C\'est probablement la commande que vous utiliserez le plus souvent.',
          },
          {
            type: 'code',
            content: '$ ls\ndocuments  downloads  projets',
            label: 'ls simple',
          },
          {
            type: 'text',
            content: 'Vous pouvez aussi lister le contenu d\'un répertoire en passant son chemin en argument :',
          },
          {
            type: 'code',
            content: '$ ls documents\nnotes.txt  rapport.md',
            label: 'ls avec chemin',
          },
          {
            type: 'tip',
            content:
              'Sur la plupart des systèmes, `ls` colore les répertoires en bleu et les fichiers exécutables en vert pour les distinguer visuellement.',
          },
        ],
        exercise: {
          instruction: 'Listez les fichiers du répertoire courant avec `ls`.',
          hint: 'Tapez "ls" et appuyez sur Entrée',
          validate: (cmd) => /^ls(\s.*)?$/.test(cmd.trim()),
          successMessage: 'Excellent ! Vous voyez maintenant le contenu de votre répertoire.',
        },
      },
      {
        id: 'ls-la',
        title: 'ls -la — Détails et fichiers cachés',
        description: 'Affichez tous les détails d\'un répertoire, y compris les fichiers cachés',
        blocks: [
          {
            type: 'text',
            content:
              '`ls` accepte des options (ou "flags") qui modifient son comportement. Les deux plus importantes sont `-l` (format long) et `-a` (afficher les cachés).',
          },
          {
            type: 'code',
            content: '$ ls -l\ntotal 3\ndrwxr-xr-x 2 user user 4096 Mar 30 documents\ndrwxr-xr-x 2 user user 4096 Mar 30 downloads\ndrwxr-xr-x 2 user user 4096 Mar 30 projets',
            label: 'ls -l (format long)',
          },
          {
            type: 'info',
            content:
              'Le format long montre : les permissions, le nombre de liens, le propriétaire, le groupe, la taille, la date de modification et le nom.',
          },
          {
            type: 'code',
            content: '$ ls -a\n.  ..  .bashrc  .profile  documents  downloads  projets',
            label: 'ls -a (fichiers cachés)',
          },
          {
            type: 'text',
            content:
              'Les fichiers commençant par un `.` sont cachés. Vous pouvez combiner les flags : `ls -la` ou `ls -al` — les deux sont équivalents.',
          },
          {
            type: 'warning',
            content:
              'Les répertoires `.` (répertoire courant) et `..` (répertoire parent) apparaissent toujours avec `ls -a`. C\'est normal !',
          },
        ],
        exercise: {
          instruction: 'Utilisez `ls -la` pour voir tous les fichiers avec leurs détails.',
          hint: 'Tapez "ls -la" pour combiner les deux options',
          validate: (cmd) => /^ls\s+(-la|-al|-a -l|-l -a)$/.test(cmd.trim()),
          successMessage: 'Bravo ! Vous maîtrisez maintenant les options de ls.',
        },
      },
      {
        id: 'cd',
        title: 'cd — Se déplacer',
        description: 'Naviguez entre les répertoires du système de fichiers',
        blocks: [
          {
            type: 'text',
            content:
              'La commande `cd` (Change Directory) permet de changer de répertoire courant. C\'est le moyen de vous déplacer dans l\'arborescence du système.',
          },
          {
            type: 'code',
            content: '$ cd documents\n$ pwd\n/home/user/documents',
            label: 'Chemin relatif',
          },
          {
            type: 'code',
            content: '$ cd /home/user/projets\n$ pwd\n/home/user/projets',
            label: 'Chemin absolu',
          },
          {
            type: 'info',
            content:
              'Chemin relatif : relatif à votre position actuelle. Chemin absolu : commence par `/`, depuis la racine du système.',
          },
          {
            type: 'code',
            content: '$ cd ..\n$ pwd\n/home\n\n$ cd ~\n$ pwd\n/home/user\n\n$ cd -\n$ pwd\n/home',
            label: 'Raccourcis utiles',
          },
          {
            type: 'tip',
            content:
              '`cd ..` remonte d\'un niveau. `cd ~` va dans votre dossier personnel. `cd -` revient au répertoire précédent.',
          },
        ],
        exercise: {
          instruction: 'Naviguez dans le répertoire `documents` avec `cd documents`.',
          hint: 'Tapez "cd documents" pour entrer dans ce répertoire',
          validate: (cmd) => cmd.trim() === 'cd documents',
          successMessage: 'Parfait ! Vous savez maintenant vous déplacer dans le système de fichiers.',
        },
      },
    ],
  },
  {
    id: 'fichiers',
    title: 'Fichiers & Dossiers',
    description: 'Créez, copiez, déplacez et supprimez fichiers et répertoires',
    iconName: 'FolderOpen',
    color: '#3b82f6',
    lessons: [
      {
        id: 'mkdir',
        title: 'mkdir — Créer des répertoires',
        description: 'Créez de nouveaux dossiers dans le système de fichiers',
        blocks: [
          {
            type: 'text',
            content:
              'La commande `mkdir` (Make Directory) crée un nouveau répertoire. Vous pouvez créer un ou plusieurs répertoires à la fois.',
          },
          {
            type: 'code',
            content: '$ mkdir mon-dossier\n$ ls\ndocuments  downloads  mon-dossier  projets',
            label: 'Créer un répertoire',
          },
          {
            type: 'code',
            content: '$ mkdir -p projets/web/css\n$ ls projets/web\ncss',
            label: 'Créer des répertoires imbriqués (-p)',
          },
          {
            type: 'info',
            content:
              'L\'option `-p` (parents) crée automatiquement tous les répertoires intermédiaires si ils n\'existent pas encore.',
          },
          {
            type: 'tip',
            content:
              'Évitez les espaces dans les noms de fichiers et dossiers. Préférez les tirets `-` ou underscores `_`.',
          },
        ],
        exercise: {
          instruction: 'Créez un nouveau répertoire appelé `test` avec `mkdir test`.',
          hint: 'Tapez "mkdir test" et appuyez sur Entrée',
          validate: (cmd) => /^mkdir\s+(-p\s+)?test$/.test(cmd.trim()),
          successMessage: 'Super ! Vous avez créé votre premier répertoire.',
        },
      },
      {
        id: 'touch',
        title: 'touch — Créer des fichiers',
        description: 'Créez de nouveaux fichiers vides',
        blocks: [
          {
            type: 'text',
            content:
              'La commande `touch` crée un fichier vide s\'il n\'existe pas. Si le fichier existe déjà, elle met à jour sa date de modification.',
          },
          {
            type: 'code',
            content: '$ touch fichier.txt\n$ ls\ndocuments  downloads  fichier.txt  projets',
            label: 'Créer un fichier',
          },
          {
            type: 'code',
            content: '$ touch a.txt b.txt c.txt\n$ ls\na.txt  b.txt  c.txt  documents  downloads  projets',
            label: 'Créer plusieurs fichiers',
          },
          {
            type: 'tip',
            content:
              'Pour créer un fichier avec du contenu, utilisez `echo "contenu" > fichier.txt` ou un éditeur de texte comme `nano`.',
          },
        ],
        exercise: {
          instruction: 'Créez un fichier nommé `memo.txt` avec `touch memo.txt`.',
          hint: 'Tapez "touch memo.txt" et appuyez sur Entrée',
          validate: (cmd) => cmd.trim() === 'touch memo.txt',
          successMessage: 'Parfait ! Vous savez créer des fichiers avec touch.',
        },
      },
      {
        id: 'cp',
        title: 'cp — Copier',
        description: 'Copiez des fichiers et des répertoires',
        blocks: [
          {
            type: 'text',
            content:
              'La commande `cp` (copy) copie un fichier vers une nouvelle destination. Le fichier source n\'est pas modifié.',
          },
          {
            type: 'code',
            content: '$ cp documents/notes.txt documents/notes-backup.txt\n$ ls documents\nnotes-backup.txt  notes.txt  rapport.md',
            label: 'Copier un fichier',
          },
          {
            type: 'code',
            content: '$ cp -r documents documents-backup\n$ ls\ndocuments  documents-backup  downloads  projets',
            label: 'Copier un répertoire (-r)',
          },
          {
            type: 'warning',
            content:
              'Pour copier un répertoire, vous devez utiliser l\'option `-r` (récursif). Sans elle, `cp` échouera avec un message d\'erreur.',
          },
          {
            type: 'tip',
            content:
              'Vous pouvez aussi copier un fichier vers un répertoire : `cp fichier.txt dossier/` copiera le fichier dans ce dossier en conservant son nom.',
          },
        ],
        exercise: {
          instruction: 'Copiez le fichier `documents/notes.txt` vers `documents/notes-copy.txt`.',
          hint: 'Utilisez "cp documents/notes.txt documents/notes-copy.txt"',
          validate: (cmd) =>
            cmd.trim() === 'cp documents/notes.txt documents/notes-copy.txt',
          successMessage: 'Excellent ! Vous maîtrisez la copie de fichiers.',
        },
      },
      {
        id: 'mv',
        title: 'mv — Déplacer & Renommer',
        description: 'Déplacez ou renommez des fichiers et répertoires',
        blocks: [
          {
            type: 'text',
            content:
              'La commande `mv` (move) déplace un fichier ou un répertoire. Elle est aussi utilisée pour renommer des fichiers.',
          },
          {
            type: 'code',
            content: '$ mv documents/notes.txt .\n$ ls\ndocuments  downloads  notes.txt  projets',
            label: 'Déplacer un fichier',
          },
          {
            type: 'code',
            content: '$ mv notes.txt mes-notes.txt\n$ ls\ndocuments  downloads  mes-notes.txt  projets',
            label: 'Renommer un fichier',
          },
          {
            type: 'info',
            content:
              '`mv` déplace sans copier : le fichier original n\'existe plus à son emplacement d\'origine. Contrairement à `cp`, pas besoin de `-r` pour les répertoires.',
          },
          {
            type: 'warning',
            content:
              'Si le fichier de destination existe déjà, `mv` l\'écrasera sans avertissement. Faites attention !',
          },
        ],
        exercise: {
          instruction: 'Renommez `documents/rapport.md` en `documents/rapport-final.md`.',
          hint: 'Utilisez "mv documents/rapport.md documents/rapport-final.md"',
          validate: (cmd) =>
            cmd.trim() === 'mv documents/rapport.md documents/rapport-final.md',
          successMessage: 'Bravo ! Vous savez maintenant déplacer et renommer des fichiers.',
        },
      },
      {
        id: 'rm',
        title: 'rm — Supprimer',
        description: 'Supprimez des fichiers et des répertoires',
        blocks: [
          {
            type: 'text',
            content:
              'La commande `rm` (remove) supprime des fichiers. Attention : la suppression est définitive, il n\'y a pas de corbeille !',
          },
          {
            type: 'code',
            content: '$ rm fichier.txt\n$ ls\ndocuments  downloads  projets',
            label: 'Supprimer un fichier',
          },
          {
            type: 'code',
            content: '$ rm -r dossier\n$ ls\ndocuments  downloads  projets',
            label: 'Supprimer un répertoire (-r)',
          },
          {
            type: 'warning',
            content:
              'La commande `rm -rf /` ou `rm -rf *` peut détruire votre système entier ! Ne l\'utilisez jamais sans être absolument certain de ce que vous faites.',
          },
          {
            type: 'tip',
            content:
              'Utilisez `rm -i` pour demander une confirmation avant chaque suppression. C\'est une bonne habitude de sécurité.',
          },
        ],
        exercise: {
          instruction: 'Supprimez le fichier `documents/notes.txt` avec `rm`.',
          hint: 'Tapez "rm documents/notes.txt"',
          validate: (cmd) => cmd.trim() === 'rm documents/notes.txt',
          successMessage: 'Parfait ! Vous savez supprimer des fichiers. Utilisez cette commande avec précaution !',
        },
      },
    ],
  },
  {
    id: 'lecture',
    title: 'Lecture de fichiers',
    description: 'Affichez, recherchez et analysez le contenu des fichiers',
    iconName: 'FileText',
    color: '#a855f7',
    lessons: [
      {
        id: 'cat',
        title: 'cat — Afficher le contenu',
        description: 'Lisez et affichez le contenu d\'un fichier',
        blocks: [
          {
            type: 'text',
            content:
              'La commande `cat` (concatenate) affiche le contenu d\'un ou plusieurs fichiers dans le terminal. C\'est la façon la plus simple de lire un fichier.',
          },
          {
            type: 'code',
            content: '$ cat documents/notes.txt\nMes notes importantes\nTâches du jour:\n1. Apprendre les commandes bash\n2. Pratiquer la navigation',
            label: 'Afficher un fichier',
          },
          {
            type: 'code',
            content: '$ cat fichier1.txt fichier2.txt\n[contenu de fichier1]\n[contenu de fichier2]',
            label: 'Concaténer plusieurs fichiers',
          },
          {
            type: 'tip',
            content:
              'Pour les gros fichiers, préférez `less` (non disponible dans ce simulateur) qui permet de naviguer page par page. `cat` est idéal pour les petits fichiers.',
          },
        ],
        exercise: {
          instruction: 'Affichez le contenu du fichier `documents/notes.txt` avec `cat`.',
          hint: 'Tapez "cat documents/notes.txt"',
          validate: (cmd) => cmd.trim() === 'cat documents/notes.txt',
          successMessage: 'Parfait ! Vous pouvez maintenant lire le contenu des fichiers.',
        },
      },
      {
        id: 'head-tail',
        title: 'head & tail — Début et fin',
        description: 'Affichez le début ou la fin d\'un fichier',
        blocks: [
          {
            type: 'text',
            content:
              '`head` affiche les premières lignes d\'un fichier et `tail` affiche les dernières. Très utile pour les gros fichiers de logs.',
          },
          {
            type: 'code',
            content: '$ head documents/rapport.md\n# Rapport Mensuel\n\n## Introduction\nCe rapport résume les activités du mois.',
            label: 'head (10 premières lignes par défaut)',
          },
          {
            type: 'code',
            content: '$ head -n 3 documents/rapport.md\n# Rapport Mensuel\n\n## Introduction',
            label: 'head -n (nombre de lignes)',
          },
          {
            type: 'code',
            content: '$ tail -n 2 documents/rapport.md\n\n## Conclusion\nExcellent travail de l\'équipe.',
            label: 'tail -n (dernières lignes)',
          },
          {
            type: 'info',
            content:
              '`tail -f fichier.log` suit un fichier en temps réel — très utile pour surveiller des logs de serveur.',
          },
        ],
        exercise: {
          instruction: 'Affichez les 3 premières lignes de `documents/rapport.md` avec `head -n 3`.',
          hint: 'Tapez "head -n 3 documents/rapport.md"',
          validate: (cmd) => cmd.trim() === 'head -n 3 documents/rapport.md',
          successMessage: 'Excellent ! Vous maîtrisez head pour lire le début des fichiers.',
        },
      },
      {
        id: 'grep',
        title: 'grep — Rechercher dans les fichiers',
        description: 'Trouvez des mots et patterns dans vos fichiers',
        blocks: [
          {
            type: 'text',
            content:
              '`grep` (Global Regular Expression Print) recherche un motif (pattern) dans un fichier et affiche toutes les lignes contenant ce motif.',
          },
          {
            type: 'code',
            content: '$ grep "notes" documents/notes.txt\nMes notes importantes',
            label: 'Recherche simple',
          },
          {
            type: 'code',
            content: '$ grep -n "Section" documents/rapport.md\n5:## Section 1',
            label: 'grep -n (avec numéros de lignes)',
          },
          {
            type: 'code',
            content: '$ grep -i "rapport" documents/rapport.md\n# Rapport Mensuel',
            label: 'grep -i (insensible à la casse)',
          },
          {
            type: 'tip',
            content:
              'Vous pouvez utiliser des expressions régulières avec grep pour des recherches très puissantes : `grep "^#" fichier.md` trouve toutes les lignes commençant par #.',
          },
        ],
        exercise: {
          instruction: 'Recherchez le mot "important" dans `documents/notes.txt` avec `grep`.',
          hint: 'Tapez "grep important documents/notes.txt" (ou avec guillemets)',
          validate: (cmd) =>
            /^grep\s+(-\w+\s+)*["']?important["']?\s+documents\/notes\.txt$/.test(cmd.trim()),
          successMessage: 'Bravo ! grep est l\'un des outils les plus puissants du terminal.',
        },
      },
      {
        id: 'wc',
        title: 'wc — Compter le contenu',
        description: 'Comptez les lignes, mots et caractères d\'un fichier',
        blocks: [
          {
            type: 'text',
            content:
              '`wc` (Word Count) compte les lignes, les mots et les octets d\'un fichier. Très utile pour analyser la taille du contenu.',
          },
          {
            type: 'code',
            content: '$ wc documents/notes.txt\n 6 20 145 documents/notes.txt',
            label: 'wc complet (lignes mots octets)',
          },
          {
            type: 'code',
            content: '$ wc -l documents/notes.txt\n6 documents/notes.txt\n\n$ wc -w documents/notes.txt\n20 documents/notes.txt\n\n$ wc -c documents/notes.txt\n145 documents/notes.txt',
            label: 'Options -l (lignes) -w (mots) -c (octets)',
          },
          {
            type: 'tip',
            content:
              'Combinez `wc` avec un pipe : `ls | wc -l` compte le nombre de fichiers dans un répertoire.',
          },
        ],
        exercise: {
          instruction: 'Comptez le nombre de lignes dans `documents/rapport.md` avec `wc -l`.',
          hint: 'Tapez "wc -l documents/rapport.md"',
          validate: (cmd) => cmd.trim() === 'wc -l documents/rapport.md',
          successMessage: 'Parfait ! Vous savez analyser la taille d\'un fichier.',
        },
      },
    ],
  },
  {
    id: 'permissions',
    title: 'Permissions',
    description: 'Contrôlez l\'accès aux fichiers et répertoires',
    iconName: 'Shield',
    color: '#f59e0b',
    lessons: [
      {
        id: 'comprendre-permissions',
        title: 'Comprendre les permissions',
        description: 'Décryptez le système de permissions Unix',
        blocks: [
          {
            type: 'text',
            content:
              'Chaque fichier et répertoire Unix a des permissions qui définissent qui peut le lire, l\'écrire ou l\'exécuter. On les voit avec `ls -l`.',
          },
          {
            type: 'code',
            content: '$ ls -l\n-rw-r--r-- 1 user user 145 notes.txt\ndrwxr-xr-x 2 user user 4096 documents',
            label: 'Affichage des permissions',
          },
          {
            type: 'info',
            content:
              'Le premier caractère : `-` = fichier, `d` = répertoire. Ensuite : 3 groupes de 3 caractères pour le propriétaire, le groupe, et les autres. r=lecture, w=écriture, x=exécution.',
          },
          {
            type: 'code',
            content: '-  rw-  r--  r--\n│   │    │    └── Autres : lecture seule\n│   │    └─────── Groupe : lecture seule  \n│   └──────────── Propriétaire : lecture + écriture\n└──────────────── Type : fichier',
            label: 'Décomposition',
          },
          {
            type: 'tip',
            content:
              'Les permissions sont aussi représentées en octal : r=4, w=2, x=1. Donc `rwxr-xr-x` = 755 et `rw-r--r--` = 644.',
          },
        ],
        exercise: {
          instruction: 'Utilisez `ls -l` pour voir les permissions de tous les fichiers.',
          hint: 'Tapez "ls -l" pour voir les permissions',
          validate: (cmd) => cmd.trim() === 'ls -l',
          successMessage: 'Vous voyez maintenant les permissions de chaque fichier !',
        },
      },
      {
        id: 'chmod',
        title: 'chmod — Modifier les permissions',
        description: 'Changez les droits d\'accès sur vos fichiers',
        blocks: [
          {
            type: 'text',
            content:
              '`chmod` (Change Mode) modifie les permissions d\'un fichier. Vous pouvez utiliser la notation octale ou symbolique.',
          },
          {
            type: 'code',
            content: '$ chmod 755 projets/script.sh\n$ ls -l projets/script.sh\n-rwxr-xr-x 1 user user 56 script.sh',
            label: 'Notation octale',
          },
          {
            type: 'code',
            content: '$ chmod +x script.sh   # ajouter exécution à tous\n$ chmod u+x script.sh  # ajouter exécution au propriétaire\n$ chmod o-r fichier.txt # retirer lecture aux autres\n$ chmod 644 fichier.txt # rw-r--r--',
            label: 'Notation symbolique',
          },
          {
            type: 'info',
            content:
              'Notation symbolique : u=propriétaire, g=groupe, o=autres, a=tous. Opérateurs : +=ajouter, -=retirer, ==définir exactement.',
          },
          {
            type: 'warning',
            content:
              'Ne rendez jamais un fichier sensible exécutable ou lisible par tous. Les fichiers de configuration contenant des mots de passe doivent avoir les permissions 600 (rw-------).',
          },
        ],
        exercise: {
          instruction: 'Rendez le script `projets/script.sh` exécutable avec `chmod +x`.',
          hint: 'Tapez "chmod +x projets/script.sh"',
          validate: (cmd) =>
            /^chmod\s+(\+x|755|u\+x)\s+projets\/script\.sh$/.test(cmd.trim()),
          successMessage: 'Super ! Le script est maintenant exécutable.',
        },
      },
    ],
  },
  {
    id: 'processus',
    title: 'Processus',
    description: 'Gérez les programmes en cours d\'exécution',
    iconName: 'Cpu',
    color: '#ef4444',
    lessons: [
      {
        id: 'ps',
        title: 'ps — Lister les processus',
        description: 'Affichez les processus en cours d\'exécution',
        blocks: [
          {
            type: 'text',
            content:
              'Un processus est un programme en cours d\'exécution. La commande `ps` affiche la liste des processus actifs avec leur identifiant (PID).',
          },
          {
            type: 'code',
            content: '$ ps\n  PID TTY          TIME CMD\n 1234 pts/0    00:00:00 bash\n 5678 pts/0    00:00:00 ps',
            label: 'ps simple',
          },
          {
            type: 'code',
            content: '$ ps aux\nUSER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot         1  0.0  0.1  22544  1024 ?        Ss   10:00   0:01 /sbin/init\nuser      1234  0.0  0.2  15000  2048 pts/0    Ss   10:01   0:00 bash\nuser      5678  0.0  0.1   8000  1024 pts/0    R+   10:05   0:00 ps aux',
            label: 'ps aux (tous les processus)',
          },
          {
            type: 'info',
            content:
              'PID = Process ID (identifiant unique). TTY = terminal associé. %CPU et %MEM = utilisation des ressources. STAT = état du processus (S=sleeping, R=running).',
          },
        ],
        exercise: {
          instruction: 'Listez les processus en cours avec `ps`.',
          hint: 'Tapez simplement "ps"',
          validate: (cmd) => /^ps(\s+.*)?$/.test(cmd.trim()),
          successMessage: 'Parfait ! Vous voyez maintenant les processus en cours.',
        },
      },
      {
        id: 'kill',
        title: 'kill — Arrêter un processus',
        description: 'Terminez des processus par leur identifiant',
        blocks: [
          {
            type: 'text',
            content:
              '`kill` envoie un signal à un processus. Par défaut, il envoie SIGTERM (signal 15) pour demander l\'arrêt propre du processus.',
          },
          {
            type: 'code',
            content: '$ ps\n  PID TTY      TIME CMD\n 1234 pts/0    00:00 bash\n 9999 pts/0    00:00 mon-programme\n\n$ kill 9999\n[1]  Terminated  mon-programme',
            label: 'Arrêter un processus',
          },
          {
            type: 'code',
            content: '$ kill -9 9999   # SIGKILL : arrêt forcé immédiat\n$ kill -15 9999  # SIGTERM : arrêt propre (défaut)\n$ kill -l        # lister tous les signaux',
            label: 'Signaux disponibles',
          },
          {
            type: 'warning',
            content:
              '`kill -9` (SIGKILL) force l\'arrêt immédiat sans laisser le processus nettoyer. À utiliser seulement si le processus ne répond plus à SIGTERM.',
          },
          {
            type: 'tip',
            content:
              '`killall nom-processus` arrête tous les processus avec ce nom. `pkill` offre encore plus d\'options de sélection.',
          },
        ],
        exercise: {
          instruction: 'Affichez la liste des processus avec `ps` pour trouver leurs PIDs.',
          hint: 'Tapez "ps" pour voir les processus actuels',
          validate: (cmd) => /^ps(\s+.*)?$/.test(cmd.trim()),
          successMessage: 'Bien ! En situation réelle, vous utiliseriez le PID pour arrêter un processus.',
        },
      },
    ],
  },
  {
    id: 'redirection',
    title: 'Redirection & Pipes',
    description: 'Chaînez les commandes et redirigez les flux de données',
    iconName: 'GitMerge',
    color: '#06b6d4',
    lessons: [
      {
        id: 'redirection-sortie',
        title: '> et >> — Redirection de sortie',
        description: 'Redirigez la sortie d\'une commande vers un fichier',
        blocks: [
          {
            type: 'text',
            content:
              'Par défaut, les commandes affichent leur résultat dans le terminal. Vous pouvez rediriger cette sortie vers un fichier avec `>` (écraser) ou `>>` (ajouter).',
          },
          {
            type: 'code',
            content: '$ echo "Bonjour" > salutation.txt\n$ cat salutation.txt\nBonjour',
            label: '> Écrire dans un fichier',
          },
          {
            type: 'code',
            content: '$ echo "Première ligne" > fichier.txt\n$ echo "Deuxième ligne" >> fichier.txt\n$ cat fichier.txt\nPremière ligne\nDeuxième ligne',
            label: '>> Ajouter à un fichier',
          },
          {
            type: 'warning',
            content:
              '`>` écrase le fichier existant ! Utilisez `>>` pour ajouter du contenu sans perdre ce qui existe déjà.',
          },
          {
            type: 'code',
            content: '$ ls -la > liste-fichiers.txt\n$ cat liste-fichiers.txt\n[liste de tous les fichiers]',
            label: 'Sauvegarder le résultat d\'une commande',
          },
        ],
        exercise: {
          instruction: 'Créez un fichier `bonjour.txt` contenant "Bonjour le monde!" avec echo et `>`.',
          hint: 'Tapez: echo "Bonjour le monde!" > bonjour.txt',
          validate: (cmd) =>
            /^echo\s+["']?Bonjour le monde!?["']?\s+>\s+bonjour\.txt$/.test(cmd.trim()),
          successMessage: 'Excellent ! Vous savez maintenant créer des fichiers depuis le terminal.',
        },
      },
      {
        id: 'pipes',
        title: '| — Les pipes',
        description: 'Chaînez plusieurs commandes pour créer des pipelines puissants',
        blocks: [
          {
            type: 'text',
            content:
              'Le pipe `|` connecte la sortie d\'une commande à l\'entrée de la suivante. C\'est l\'une des fonctionnalités les plus puissantes du terminal Unix.',
          },
          {
            type: 'code',
            content: '$ ls | wc -l\n3',
            label: 'Compter les fichiers',
          },
          {
            type: 'code',
            content: '$ cat documents/notes.txt | grep "Tâche"\nTâches du jour:',
            label: 'Filtrer le contenu',
          },
          {
            type: 'code',
            content: '$ ls -la | grep "^d"\ndrwxr-xr-x 2 user user 4096 documents\ndrwxr-xr-x 2 user user 4096 downloads\ndrwxr-xr-x 2 user user 4096 projets',
            label: 'Filtrer les répertoires',
          },
          {
            type: 'info',
            content:
              'Vous pouvez chaîner autant de pipes que vous voulez : `cat fichier | grep motif | wc -l` compte les lignes contenant un motif.',
          },
          {
            type: 'tip',
            content:
              'La philosophie Unix : faire une chose, la faire bien, et s\'interfacer avec d\'autres programmes. Les pipes permettent de composer des outils simples en pipelines puissants.',
          },
        ],
        exercise: {
          instruction: 'Utilisez un pipe pour compter les fichiers dans le répertoire courant : `ls | wc -l`.',
          hint: 'Tapez "ls | wc -l"',
          validate: (cmd) => cmd.trim() === 'ls | wc -l',
          successMessage: 'Bravo ! Vous maîtrisez maintenant les pipes — l\'essence de la philosophie Unix.',
        },
      },
    ],
  },
];

export function getModuleById(id: string): Module | undefined {
  return curriculum.find((m) => m.id === id);
}

export function getLessonById(moduleId: string, lessonId: string): Lesson | undefined {
  const mod = getModuleById(moduleId);
  return mod?.lessons.find((l) => l.id === lessonId);
}

export function getNextLesson(
  moduleId: string,
  lessonId: string
): { moduleId: string; lessonId: string } | null {
  const modIndex = curriculum.findIndex((m) => m.id === moduleId);
  if (modIndex === -1) return null;
  const mod = curriculum[modIndex];
  const lessonIndex = mod.lessons.findIndex((l) => l.id === lessonId);
  if (lessonIndex < mod.lessons.length - 1) {
    return { moduleId, lessonId: mod.lessons[lessonIndex + 1].id };
  }
  if (modIndex < curriculum.length - 1) {
    const nextMod = curriculum[modIndex + 1];
    return { moduleId: nextMod.id, lessonId: nextMod.lessons[0].id };
  }
  return null;
}

export function getPrevLesson(
  moduleId: string,
  lessonId: string
): { moduleId: string; lessonId: string } | null {
  const modIndex = curriculum.findIndex((m) => m.id === moduleId);
  if (modIndex === -1) return null;
  const mod = curriculum[modIndex];
  const lessonIndex = mod.lessons.findIndex((l) => l.id === lessonId);
  if (lessonIndex > 0) {
    return { moduleId, lessonId: mod.lessons[lessonIndex - 1].id };
  }
  if (modIndex > 0) {
    const prevMod = curriculum[modIndex - 1];
    return { moduleId: prevMod.id, lessonId: prevMod.lessons[prevMod.lessons.length - 1].id };
  }
  return null;
}

export function getTotalLessons(): number {
  return curriculum.reduce((acc, mod) => acc + mod.lessons.length, 0);
}
