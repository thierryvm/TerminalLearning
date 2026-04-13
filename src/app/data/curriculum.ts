import {
  validateOrientation, validatePwd, validateLs, validateLsLa, validateCd,
  validateMkdir, validateTouch, validateCp, validateMv, validateRm,
  validateCat, validateHeadTail, validateGrep, validateWc,
  validateComprendrePermissions, validateChmod, validateChown, validateSudo, validateSecurityPermissions,
  validatePs, validateKill, validateTop, validateBackground,
  validateRedirectionSortie, validatePipes, validateStderr, validateTee,
  validateEnvVars, validatePathVariable, validateShellConfig, validateDotenv, validateScripts, validateCron,
  validatePing, validateCurl, validateWget, validateDns, validateSsh, validateScp,
  validateGitInit, validateGitConfig, validateGitAddCommit, validateGitStatusLog, validateGitDiffGitignore, validateGitBranch, validateGitMerge,
  validateGitRemote, validateGitPushPull, validateGitFetchClone, validatePullRequests, validateConflicts, validateGithubActions,
  validateAiHelp, validateAiHelpCapabilities, validateAiHelpLimits, validateAiHelpPrompts,
  validateAiHelpContext, validateAiHelpValidate, validateAiHelpDebug, validateAiHelpSecurity,
  validateAiHelpClaudeCli, validateAiHelpCareers, validateAiHelpSenior, validateAiHelpWorkflow,
} from './validators';
export type BlockType = 'text' | 'code' | 'tip' | 'warning' | 'info';

export interface ContentBlock {
  type: BlockType;
  content: string;
  /** Per-environment content override — falls back to `content` if absent. */
  contentByEnv?: Partial<Record<EnvId, string>>;
  label?: string;
  /** Per-environment label override — falls back to `label` if absent. */
  labelByEnv?: Partial<Record<EnvId, string>>;
}

export type EnvId = 'linux' | 'macos' | 'windows';

export interface Exercise {
  instruction: string;
  /** Per-environment instruction override — falls back to `instruction` if absent. */
  instructionByEnv?: Partial<Record<EnvId, string>>;
  hint: string;
  /** Per-environment hint override. */
  hintByEnv?: Partial<Record<EnvId, string>>;
  /** env is passed by LessonPage from EnvironmentContext. */
  validate: (command: string, env?: EnvId) => boolean;
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
  /** Pedagogical level (1-5). Populated from commandCatalogue. */
  level?: 1 | 2 | 3 | 4 | 5;
  /** Module IDs that must be completed before this one unlocks. */
  prerequisites?: string[];
  /** Module IDs that this module unlocks upon completion. */
  unlocks?: string[];
}

export const curriculum: Module[] = [
  {
    id: 'navigation',
    title: 'Navigation',
    description: 'Maîtrisez vos déplacements dans le système de fichiers',
    iconName: 'Compass',
    color: '#22c55e',
    level: 1,
    prerequisites: [],
    unlocks: ['fichiers', 'lecture', 'search'],
    lessons: [
      {
        id: 'orientation',
        title: "Comment demander de l'aide",
        description: "Apprenez à vous repérer dans n'importe quel terminal inconnu",
        blocks: [
          {
            type: 'text',
            content:
              "La première compétence du terminal n'est pas de mémoriser des commandes — c'est de savoir **comment trouver de l'aide** quand on est bloqué. Cette leçon te donne les outils pour te débrouiller seul dans n'importe quel environnement.",
          },
          {
            type: 'tip',
            content:
              'Dans ce simulateur, tape `help` à tout moment pour voir la liste des commandes disponibles. Tape `help <commande>` pour obtenir les détails d\'une commande spécifique.',
          },
          {
            type: 'code',
            content: '$ help\nCommandes disponibles — Linux / bash:\n  pwd   ls   cd   mkdir ...\n\n$ help ls\nLS — ls [-la] [chemin]\nListe le contenu d\'un répertoire.',
            label: 'Dans ce simulateur',
            labelByEnv: {
              windows: 'Dans ce simulateur (PowerShell)',
              macos: 'Dans ce simulateur (zsh)',
            },
            contentByEnv: {
              windows:
                'PS> help\nCommandes disponibles — PowerShell / Windows:\n  Get-Location   Set-Location   Get-ChildItem ...\n\nPS> help Get-ChildItem\nLS — ls [-la] [chemin]\nListe le contenu d\'un répertoire.',
              macos:
                '% help\nCommandes disponibles — macOS / zsh:\n  pwd   ls   cd   mkdir ...\n\n% help ls\nLS — ls [-la] [chemin]\nListe le contenu d\'un répertoire.',
            },
          },
          {
            type: 'info',
            content:
              'Dans un **vrai terminal Linux/macOS**, les outils d\'aide natifs sont :\n- `man <commande>` — manuel complet (q pour quitter)\n- `<commande> --help` — aide rapide\n- `whatis <commande>` — description en une ligne\n- `apropos <mot-clé>` — trouver une commande par description',
            contentByEnv: {
              windows:
                'Dans un **vrai PowerShell**, les outils d\'aide natifs sont :\n- `Get-Help <commande>` — aide complète\n- `<commande> -?` — aide rapide\n- `Get-Command` — lister toutes les commandes disponibles\n- `Get-Member` — explorer les propriétés d\'un objet',
            },
          },
          {
            type: 'warning',
            content:
              "Mémoriser toutes les commandes n'est **pas** l'objectif. Les pros du terminal utilisent `man` et `--help` en permanence. L'important est de savoir où chercher.",
          },
        ],
        exercise: {
          instruction: 'Tape `help` pour afficher la liste des commandes disponibles dans ce simulateur.',
          instructionByEnv: {
            windows: 'Tape `help` pour afficher la liste des commandes disponibles en PowerShell.',
          },
          hint: 'Tape simplement "help" et appuie sur Entrée',
          hintByEnv: {
            windows: 'Tape simplement "help" et appuie sur Entrée',
          },
          validate: validateOrientation,
          successMessage:
            "Parfait ! Tu sais maintenant comment explorer un terminal inconnu. Cette commande sera ton meilleur allié tout au long de la formation.",
        },
      },
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
          instructionByEnv: {
            windows: 'Tapez `Get-Location` (ou son alias `gl`) pour afficher votre répertoire courant.',
          },
          hint: 'Entrez simplement "pwd" et appuyez sur Entrée',
          hintByEnv: {
            windows: 'Tapez "Get-Location" ou son alias "gl"',
          },
          validate: validatePwd,
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
          instructionByEnv: {
            windows: 'Listez les fichiers avec `Get-ChildItem` (ou son alias `dir`).',
          },
          hint: 'Tapez "ls" et appuyez sur Entrée',
          hintByEnv: {
            windows: 'Tapez "Get-ChildItem" ou son alias "dir"',
          },
          validate: validateLs,
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
          instructionByEnv: {
            windows: 'Utilisez `Get-ChildItem -Force` pour afficher aussi les fichiers cachés.',
          },
          hint: 'Tapez "ls -la" pour combiner les deux options',
          hintByEnv: {
            windows: 'Tapez "Get-ChildItem -Force" ou son alias "dir -Force"',
          },
          validate: validateLsLa,
          successMessage: 'Bravo ! Vous maîtrisez maintenant les options de listage avancées.',
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
          instructionByEnv: {
            windows: 'Naviguez dans le répertoire `documents` avec `Set-Location documents` (ou `cd documents`).',
          },
          hint: 'Tapez "cd documents" pour entrer dans ce répertoire',
          hintByEnv: {
            windows: 'Tapez "Set-Location documents" ou simplement "cd documents"',
          },
          validate: validateCd,
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
    level: 1,
    prerequisites: ['navigation'],
    unlocks: ['permissions', 'git', 'docker'],
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
          instructionByEnv: {
            windows: 'Créez un répertoire `test` avec `New-Item -ItemType Directory -Name test` ou simplement `mkdir test`.',
          },
          hint: 'Tapez "mkdir test" et appuyez sur Entrée',
          hintByEnv: {
            windows: 'Tapez "mkdir test" (fonctionne aussi en PowerShell) ou "New-Item -ItemType Directory -Name test"',
          },
          validate: validateMkdir,
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
          instructionByEnv: {
            windows: 'Créez un fichier `memo.txt` avec `New-Item -ItemType File -Name memo.txt`.',
          },
          hint: 'Tapez "touch memo.txt" et appuyez sur Entrée',
          hintByEnv: {
            windows: 'Tapez "New-Item -ItemType File -Name memo.txt" ou son alias "ni memo.txt"',
          },
          validate: validateTouch,
          successMessage: 'Parfait ! Vous savez créer des fichiers depuis le terminal.',
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
          instructionByEnv: {
            windows: 'Copiez `documents/notes.txt` vers `documents/notes-copy.txt` avec `Copy-Item`.',
          },
          hint: 'Utilisez "cp documents/notes.txt documents/notes-copy.txt"',
          hintByEnv: {
            windows: 'Tapez "Copy-Item documents/notes.txt documents/notes-copy.txt"',
          },
          validate: validateCp,
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
          instructionByEnv: {
            windows: 'Renommez le fichier avec `Move-Item documents/rapport.md documents/rapport-final.md`.',
          },
          hint: 'Utilisez "mv documents/rapport.md documents/rapport-final.md"',
          hintByEnv: {
            windows: 'Tapez "Move-Item documents/rapport.md documents/rapport-final.md"',
          },
          validate: validateMv,
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
          instructionByEnv: {
            windows: 'Supprimez `documents/notes.txt` avec `Remove-Item documents/notes.txt`.',
          },
          hint: 'Tapez "rm documents/notes.txt"',
          hintByEnv: {
            windows: 'Tapez "Remove-Item documents/notes.txt" ou son alias "del documents/notes.txt"',
          },
          validate: validateRm,
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
    level: 1,
    prerequisites: ['navigation', 'fichiers'],
    unlocks: ['search', 'logs', 'ssh_vps'],
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
          instructionByEnv: {
            windows: 'Affichez le contenu de `documents/notes.txt` avec `Get-Content documents/notes.txt`.',
          },
          hint: 'Tapez "cat documents/notes.txt"',
          hintByEnv: {
            windows: 'Tapez "Get-Content documents/notes.txt" ou son alias "gc documents/notes.txt"',
          },
          validate: validateCat,
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
          instructionByEnv: {
            windows: 'Affichez les 3 premières lignes avec `Get-Content documents/rapport.md | Select-Object -First 3`.',
          },
          hint: 'Tapez "head -n 3 documents/rapport.md"',
          hintByEnv: {
            windows: 'Tapez "Get-Content documents/rapport.md | Select-Object -First 3"',
          },
          validate: validateHeadTail,
          successMessage: 'Excellent ! Vous maîtrisez la lecture partielle de fichiers.',
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
          instructionByEnv: {
            windows: 'Recherchez "important" dans `documents/notes.txt` avec `Select-String "important" documents/notes.txt`.',
          },
          hint: 'Tapez "grep important documents/notes.txt" (ou avec guillemets)',
          hintByEnv: {
            windows: 'Tapez "Select-String \\"important\\" documents/notes.txt"',
          },
          validate: validateGrep,
          successMessage: 'Bravo ! La recherche dans les fichiers est l\'un des outils les plus puissants du terminal.',
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
          instructionByEnv: {
            windows: 'Comptez les lignes avec `(Get-Content documents/rapport.md).Count`.',
          },
          hint: 'Tapez "wc -l documents/rapport.md"',
          hintByEnv: {
            windows: 'Tapez "(Get-Content documents/rapport.md).Count"',
          },
          validate: validateWc,
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
    level: 2,
    prerequisites: ['navigation', 'fichiers', 'lecture'],
    unlocks: ['shell_scripts', 'ssh_vps', 'docker', 'security_basics'],
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
          instructionByEnv: {
            windows: 'Utilisez `Get-Acl documents/notes.txt` pour voir les permissions du fichier.',
          },
          hint: 'Tapez "ls -l" pour voir les permissions',
          hintByEnv: {
            windows: 'Tapez "Get-Acl documents/notes.txt" pour afficher les droits d\'accès',
          },
          validate: validateComprendrePermissions,
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
            contentByEnv: {
              windows:
                'Sur Windows, les permissions sont gérées par `icacls` (interface ligne de commande) ou `Set-ExecutionPolicy` pour les scripts PowerShell. Le concept de bits rwx n\'existe pas, mais le contrôle d\'accès (ACL) est similaire.',
            },
          },
          {
            type: 'code',
            content: '$ chmod 755 projets/script.sh\n$ ls -l projets/script.sh\n-rwxr-xr-x 1 user user 56 script.sh',
            label: 'Notation octale (Linux/macOS)',
            contentByEnv: {
              windows: 'PS> icacls documents\\notes.txt\nnotes.txt BUILTIN\\Administrators:(I)(F)\n          NT AUTHORITY\\SYSTEM:(I)(F)\n          user:(I)(M)\n\nPS> Set-ExecutionPolicy RemoteSigned\n# Autorise les scripts locaux non signés',
            },
            labelByEnv: {
              windows: 'Afficher et modifier les permissions (Windows)',
            },
          },
          {
            type: 'code',
            content: '$ chmod +x script.sh   # ajouter exécution à tous\n$ chmod u+x script.sh  # ajouter exécution au propriétaire\n$ chmod o-r fichier.txt # retirer lecture aux autres\n$ chmod 644 fichier.txt # rw-r--r--',
            label: 'Notation symbolique (Linux/macOS)',
            contentByEnv: {
              windows: 'PS> icacls documents\\notes.txt /grant user:(R)\n# Accorder lecture à un utilisateur\nPS> icacls documents\\notes.txt /deny Invitds:(W)\n# Refuser l\'écriture aux invités\nPS> icacls documents\\notes.txt /reset\n# Réinitialiser aux permissions héritées',
            },
            labelByEnv: {
              windows: 'icacls — modifier les droits d\'accès',
            },
          },
          {
            type: 'info',
            content:
              'Notation symbolique : u=propriétaire, g=groupe, o=autres, a=tous. Opérateurs : +=ajouter, -=retirer, ==définir exactement.',
            contentByEnv: {
              windows:
                'Les permissions Windows reposent sur des ACL (Access Control Lists). Chaque entrée (ACE) définit un utilisateur/groupe et ses droits : F=Full, M=Modify, R=Read, W=Write, X=Execute.',
            },
          },
          {
            type: 'warning',
            content:
              'Ne rendez jamais un fichier sensible exécutable ou lisible par tous. Les fichiers de configuration contenant des mots de passe doivent avoir les permissions 600 (rw-------).',
            contentByEnv: {
              windows:
                'Ne donnez jamais "Full Control" à "Everyone" sur un fichier sensible. Les fichiers `.env` ne doivent être accessibles qu\'à votre compte utilisateur.',
            },
          },
        ],
        exercise: {
          instruction: 'Rendez le script `projets/script.sh` exécutable avec `chmod +x`.',
          instructionByEnv: {
            windows: 'Sur Windows, définissez la politique d\'exécution avec `Set-ExecutionPolicy RemoteSigned`.',
          },
          hint: 'Tapez "chmod +x projets/script.sh"',
          hintByEnv: {
            windows: 'Tapez "Set-ExecutionPolicy RemoteSigned" (requis pour exécuter des scripts PS1)',
          },
          validate: validateChmod,
          successMessage: 'Super ! Vous maîtrisez les permissions d\'exécution.',
        },
      },
      {
        id: 'chown',
        title: 'chown — Propriété des fichiers',
        description: 'Modifiez le propriétaire et le groupe d\'un fichier',
        blocks: [
          {
            type: 'text',
            content:
              'Chaque fichier Unix appartient à un utilisateur et un groupe. `chown` (Change Owner) permet de modifier cette propriété. Seul root (ou `sudo`) peut changer le propriétaire d\'un fichier.',
            contentByEnv: {
              windows:
                'Sur Windows, la propriété d\'un fichier est gérée par le système NTFS. `icacls` gère les permissions mais `takeown` permet de prendre possession d\'un fichier.',
            },
          },
          {
            type: 'code',
            content: '$ ls -l documents/notes.txt\n-rw-r--r-- 1 user user 145 notes.txt\n#              ↑    ↑\n#          proprio  groupe\n\n$ sudo chown alice notes.txt\n$ sudo chown alice:devs notes.txt\n$ sudo chown :devs notes.txt   # changer seulement le groupe',
            label: 'chown — changer propriétaire (Linux/macOS)',
            contentByEnv: {
              windows: 'PS> Get-Acl documents\\notes.txt | Select-Object Owner\nOwner\n-----\nDESKTOP-ABC\\user\n\nPS> takeown /f documents\\notes.txt\n# Prendre possession du fichier\n\nPS> icacls documents\\notes.txt /setowner "BUILTIN\\Administrators"',
            },
            labelByEnv: {
              windows: 'Propriété sous Windows (takeown / icacls)',
            },
          },
          {
            type: 'code',
            content: '$ sudo chown -R user:user /home/user/projets\n# -R : récursif sur tout un dossier',
            label: 'chown récursif',
            contentByEnv: {
              windows: 'PS> takeown /f C:\\projets /r /d y\n# /r : récursif, /d y : répondre oui\nPS> icacls C:\\projets /grant user:(OI)(CI)F /t\n# (OI)(CI) : hériter, F : Full Control, /t : récursif',
            },
            labelByEnv: {
              windows: 'Prise de possession récursive',
            },
          },
          {
            type: 'info',
            content:
              '`chgrp` est l\'équivalent de `chown :groupe` — il ne change que le groupe. Dans la pratique, `chown user:groupe` est plus pratique car il fait les deux en une commande.',
          },
          {
            type: 'warning',
            content:
              'Changer le propriétaire d\'un fichier système peut briser votre installation. Utilisez `sudo chown` avec précaution et vérifiez toujours avant d\'appliquer récursivement.',
            contentByEnv: {
              windows:
                'Modifier les permissions de fichiers système Windows (System32, etc.) peut rendre le système instable. N\'utilisez `takeown` ou `icacls` que sur vos propres fichiers.',
            },
          },
        ],
        exercise: {
          instruction: 'Affichez le propriétaire de vos fichiers avec `ls -la` dans votre répertoire home.',
          instructionByEnv: {
            windows: 'Affichez le propriétaire d\'un fichier avec `Get-Acl documents/notes.txt | Select-Object Owner`.',
          },
          hint: 'Tapez "ls -la" pour voir propriétaire et groupe de chaque fichier',
          hintByEnv: {
            windows: 'Tapez: Get-Acl documents/notes.txt',
          },
          validate: validateChown,
          successMessage: 'Parfait ! Vous identifiez maintenant les propriétaires de fichiers.',
        },
      },
      {
        id: 'sudo',
        title: 'sudo — Élévation de privilèges',
        description: 'Exécutez des commandes avec les droits administrateur',
        blocks: [
          {
            type: 'text',
            content:
              '`sudo` (Super User Do) permet d\'exécuter une commande avec les droits root (administrateur système). C\'est le mécanisme de principe du moindre privilège : vous travaillez normalement en utilisateur, et n\'élevez vos droits que quand c\'est nécessaire.',
            contentByEnv: {
              windows:
                'Sur Windows, l\'équivalent est "Exécuter en tant qu\'administrateur". En PowerShell, on utilise `Start-Process` avec `-Verb RunAs`, ou on ouvre directement un terminal administrateur.',
            },
          },
          {
            type: 'code',
            content: '$ sudo apt update\n[sudo] password for user: ****\nHit:1 http://archive.ubuntu.com/ubuntu jammy InRelease\n...\n\n$ sudo -i          # ouvrir un shell root\n$ sudo -l          # lister les commandes autorisées\n$ sudo !!          # relancer la dernière commande en sudo',
            label: 'sudo — exemples courants (Linux)',
            contentByEnv: {
              macos: '$ sudo brew services restart nginx\n[sudo] password for user: ****\n...\n\n$ sudo -i          # ouvrir un shell root\n$ sudo dscacheutil -flushcache  # vider le cache DNS\n$ sudo -l          # lister les commandes autorisées',
              windows: 'PS> Start-Process powershell -Verb RunAs\n# Ouvre une nouvelle fenêtre PowerShell administrateur\n\nPS> Start-Process notepad -ArgumentList "C:\\Windows\\System32\\hosts" -Verb RunAs\n# Ouvrir un fichier système avec droits admin',
            },
          },
          {
            type: 'warning',
            content:
              'Ne faites jamais `sudo rm -rf /` ou toute commande `sudo` venant d\'internet sans comprendre exactement ce qu\'elle fait. Avec les droits root, une erreur peut détruire votre système.',
            contentByEnv: {
              windows:
                'En mode administrateur Windows, soyez prudent avec les commandes modifiant le registre ou les fichiers système. Créez un point de restauration avant toute opération risquée.',
            },
          },
          {
            type: 'info',
            content:
              'La configuration de sudo se trouve dans `/etc/sudoers` (éditable avec `visudo`). Elle définit qui peut exécuter quoi avec sudo. Sur Ubuntu, les membres du groupe `sudo` ont accès complet.',
          },
          {
            type: 'tip',
            content:
              'Principe de sécurité fondamental : **Moindre privilège**. N\'accordez que les droits strictement nécessaires. Un processus compromis avec les droits root peut tout détruire, un processus utilisateur est limité à vos fichiers.',
          },
        ],
        exercise: {
          instruction: 'Utilisez `whoami` pour afficher votre utilisateur courant, puis `sudo whoami` pour voir que sudo vous donne les droits root.',
          instructionByEnv: {
            windows: 'Affichez votre identité avec `whoami` en PowerShell normal.',
            macos: 'Utilisez `whoami` pour afficher votre utilisateur courant, puis `sudo whoami` pour vérifier l\'élévation.',
          },
          hint: 'Tapez d\'abord "whoami", puis "sudo whoami"',
          hintByEnv: {
            windows: 'Tapez simplement "whoami"',
            macos: 'Tapez "whoami" puis "sudo whoami"',
          },
          validate: validateSudo,
          successMessage: 'Bien ! Vous comprenez maintenant le principe d\'élévation de privilèges.',
        },
      },
      {
        id: 'security-permissions',
        title: 'Sécurité — Bonnes pratiques',
        description: 'Appliquez le principe du moindre privilège à vos fichiers',
        blocks: [
          {
            type: 'text',
            content:
              'Les permissions sont la première ligne de défense de votre système. Une mauvaise configuration peut exposer des données sensibles ou permettre l\'exécution de code malveillant.',
          },
          {
            type: 'code',
            content: '# Permissions recommandées :\n# 600 (rw-------)  Fichiers privés (.ssh/id_rsa, .env, configs)\n# 644 (rw-r--r--)  Fichiers publics (pages web, scripts lisibles)\n# 700 (rwx------)  Répertoires privés (.ssh/)\n# 755 (rwxr-xr-x)  Scripts exécutables publics, répertoires normaux\n# 777 (rwxrwxrwx)  DANGER — tout le monde peut tout faire',
            label: 'Référence des permissions',
            contentByEnv: {
              windows: '# Droits Windows recommandés :\n# FullControl (F)  — Administrateur uniquement pour fichiers système\n# Modify (M)       — Votre compte pour vos fichiers de travail\n# ReadAndExecute   — Utilisateurs normaux sur les scripts/exécutables\n# Read (R)         — Lecture seule sur les configs partagées\n# Évitez "Everyone: Full Control" sur tout fichier sensible',
            },
            labelByEnv: {
              windows: 'Référence des droits Windows',
            },
          },
          {
            type: 'warning',
            content:
              '`chmod 777` sur un fichier accessible depuis le web peut permettre à n\'importe qui de modifier ce fichier — y compris des attaquants. Ne l\'utilisez jamais en production.',
            contentByEnv: {
              windows:
                'Donner "Everyone: Full Control" sur un partage réseau ou un fichier web est l\'équivalent de `chmod 777`. C\'est une faille de sécurité majeure.',
            },
          },
          {
            type: 'info',
            content:
              'Commandes utiles pour l\'audit :\n• `find / -perm -4000 2>/dev/null` — trouver les fichiers SUID (exécutés comme root)\n• `ls -la ~/.ssh/` — vérifier les permissions SSH (doivent être 600/700)\n• `umask` — afficher le masque par défaut pour les nouveaux fichiers',
            contentByEnv: {
              windows:
                'Audit de sécurité Windows :\n• `icacls C:\\Users\\user\\.ssh` — vérifier les droits SSH\n• `Get-Acl C:\\path | Format-List` — audit détaillé des permissions\n• `auditpol /get /category:*` — voir la politique d\'audit active',
            },
          },
          {
            type: 'tip',
            content:
              'Vérifiez régulièrement vos fichiers `.ssh/` : `ls -la ~/.ssh/` — la clé privée `id_rsa` doit être en `600`, le répertoire `.ssh` en `700`. GitHub et la plupart des serveurs refuseront les connexions si les permissions sont trop ouvertes.',
            contentByEnv: {
              windows:
                'Sur Windows, vérifiez que votre clé SSH privée n\'est accessible qu\'à votre compte : clic droit → Propriétés → Sécurité → Avancé. Retirez tous les accès sauf le vôtre.',
            },
          },
        ],
        exercise: {
          instruction: 'Vérifiez les permissions de votre répertoire `.ssh` (simulé) avec `ls -la ~/.ssh` — ou s\'il n\'existe pas, vérifiez `ls -la` sur votre home.',
          instructionByEnv: {
            windows: 'Vérifiez les permissions de votre profil avec `Get-Acl $HOME | Format-List`.',
          },
          hint: 'Tapez "ls -la" pour voir les permissions de tous les fichiers',
          hintByEnv: {
            windows: 'Tapez: Get-Acl $HOME | Format-List',
          },
          validate: validateSecurityPermissions,
          successMessage: 'Excellent ! Vous intégrez maintenant la sécurité dans votre gestion de fichiers.',
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
    level: 2,
    prerequisites: ['navigation', 'fichiers'],
    unlocks: ['ssh_vps', 'docker', 'sysadmin'],
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
          instructionByEnv: {
            windows: 'Listez les processus avec `Get-Process` (ou `tasklist` en CMD).',
          },
          hint: 'Tapez simplement "ps"',
          hintByEnv: {
            windows: 'Tapez "Get-Process" ou son alias "gps"',
          },
          validate: validatePs,
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
            contentByEnv: {
              windows:
                '`Stop-Process` (alias `spps`, `taskkill`) arrête un processus par PID ou par nom. PowerShell offre plus d\'options que l\'ancien `taskkill` de CMD.',
            },
          },
          {
            type: 'code',
            content: '$ ps\n  PID TTY      TIME CMD\n 1234 pts/0    00:00 bash\n 9999 pts/0    00:00 mon-programme\n\n$ kill 9999\n[1]  Terminated  mon-programme',
            label: 'Arrêter un processus (Linux/macOS)',
            contentByEnv: {
              windows: 'PS> Get-Process\nHandles  NPM(K)    PM(K)    WS(K)   CPU(s)     Id ProcessName\n-------  ------    -----    -----   ------     -- -----------\n    500      30    10000    15000     0.50   9999 node\n\nPS> Stop-Process -Id 9999\nPS> Stop-Process -Name node       # par nom\nPS> Stop-Process -Name node -Force # arrêt forcé',
            },
            labelByEnv: {
              windows: 'Stop-Process — arrêter un processus (PowerShell)',
            },
          },
          {
            type: 'code',
            content: '$ kill -9 9999   # SIGKILL : arrêt forcé immédiat\n$ kill -15 9999  # SIGTERM : arrêt propre (défaut)\n$ kill -l        # lister tous les signaux\n$ killall node   # arrêter tous les processus "node"',
            label: 'Signaux disponibles (Linux/macOS)',
            contentByEnv: {
              windows: 'PS> taskkill /PID 9999           # CMD classique\nPS> taskkill /IM node.exe /F    # par nom, forcé\nPS> Get-Process node | Stop-Process  # pipeline PowerShell',
            },
            labelByEnv: {
              windows: 'taskkill et pipeline PowerShell',
            },
          },
          {
            type: 'warning',
            content:
              '`kill -9` (SIGKILL) force l\'arrêt immédiat sans laisser le processus nettoyer. À utiliser seulement si le processus ne répond plus à SIGTERM.',
            contentByEnv: {
              windows:
                '`-Force` dans PowerShell est l\'équivalent de `kill -9` — arrêt immédiat sans nettoyage. Un processus arrêté brutalement peut laisser des fichiers temporaires ou des connexions ouvertes.',
            },
          },
          {
            type: 'tip',
            content:
              '`killall nom-processus` arrête tous les processus avec ce nom. `pkill` offre encore plus d\'options de sélection. Utile pour redémarrer un serveur de développement bloqué.',
            contentByEnv: {
              windows:
                'En développement, `taskkill /IM node.exe /F` est utile pour libérer un port bloqué par un processus Node.js zombie. `netstat -ano | findstr :3000` trouve le PID utilisant un port.',
            },
          },
        ],
        exercise: {
          instruction: 'Affichez la liste complète des processus avec `ps aux` et identifiez le processus bash.',
          instructionByEnv: {
            windows: 'Listez les processus triés par CPU avec `Get-Process | Sort-Object CPU -Descending | Select-Object -First 5`.',
          },
          hint: 'Tapez "ps aux" pour la liste complète avec tous les utilisateurs',
          hintByEnv: {
            windows: 'Tapez "Get-Process | Sort-Object CPU -Descending"',
          },
          validate: validateKill,
          successMessage: 'Bien ! Vous savez maintenant surveiller et contrôler les processus.',
        },
      },
      {
        id: 'top',
        title: 'top — Monitoring en temps réel',
        description: 'Surveillez la consommation CPU et mémoire en direct',
        blocks: [
          {
            type: 'text',
            content:
              '`top` affiche une vue dynamique des processus actualisée en temps réel. Contrairement à `ps`, il se met à jour automatiquement et permet de voir qui consomme vos ressources.',
            contentByEnv: {
              windows:
                '`Get-Process | Sort-Object CPU -Descending` est l\'équivalent statique de `top`. Pour une vue dynamique, utilisez le Gestionnaire des tâches (`taskmgr`) ou `htop` via WSL2.',
            },
          },
          {
            type: 'code',
            content: '$ top\ntop - 17:00:00 up 2 days,  4:00,  1 user,  load average: 0.15, 0.10, 0.08\nTasks:  95 total,   1 running,  94 sleeping\n%Cpu(s):  2.3 us,  0.7 sy,  0.0 ni, 96.8 id\nMiB Mem :   7900.0 total,   3200.0 free,   2400.0 used\n\n  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n 1234 user      20   0  450000  25000  10000 S   2.3   0.3   0:05.23 node\n    1 root      20   0   22000   1500   1000 S   0.0   0.0   0:01.00 systemd',
            label: 'Sortie de top (Linux)',
            contentByEnv: {
              macos: '$ top\nProcesses: 250 total, 2 running\nLoad Avg: 1.45, 1.30, 1.20\nCPU usage: 8.33% user, 4.16% sys, 87.50% idle\nMemNet: 7.30G/8G used\n\n  PID COMMAND      %CPU TIME     #TH   #WQ  #POR MEM   PURG CMPR\n 1234 node         2.5  00:05.23 10    2    50   25M   0    0',
              windows: 'PS> Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name,CPU,WorkingSet\nName          CPU WorkingSet\n----          --- ----------\nChrome     124.5  350000000\nVSCode      45.2   80000000\nnode        12.3   45000000\n...\n# Pour une vue dynamique : ouvrez le Gestionnaire des tâches\n# ou tapez "taskmgr" dans la barre de recherche',
            },
          },
          {
            type: 'info',
            content:
              'Raccourcis dans `top` : `q` pour quitter, `k` pour tuer un processus (entrez le PID), `M` pour trier par mémoire, `P` pour trier par CPU, `h` pour l\'aide.',
            contentByEnv: {
              windows:
                '`htop` est une version améliorée de `top` avec une interface colorée et la navigation au clavier. Disponible via WSL2 (`sudo apt install htop`) ou dans Git Bash. En PowerShell pur, il n\'y a pas d\'équivalent natif temps réel.',
            },
          },
          {
            type: 'tip',
            content:
              '`htop` est une version améliorée de `top` avec interface colorée, navigation au clavier, et possibilité de tuer des processus visuellement. Installez-le avec `sudo apt install htop` (Ubuntu/Debian).',
            contentByEnv: {
              macos: '`htop` est disponible via Homebrew : `brew install htop`. Il améliore largement l\'expérience vs le `top` macOS natif. Activity Monitor offre une interface graphique équivalente.',
            },
          },
        ],
        exercise: {
          instruction: 'Listez les processus triés par consommation mémoire avec `ps aux --sort=-%mem | head -5`.',
          instructionByEnv: {
            macos: 'Affichez les 5 processus les plus gourmands en CPU avec `ps aux | sort -k3rn | head -5`.',
            windows: 'Affichez les 5 processus les plus gourmands en mémoire avec `Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 5`.',
          },
          hint: 'Tapez: ps aux --sort=-%mem | head -5',
          hintByEnv: {
            macos: 'Tapez: ps aux | sort -k3rn | head -5',
            windows: 'Tapez: Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 5',
          },
          validate: validateTop,
          successMessage: 'Excellent ! Vous savez maintenant identifier les processus les plus gourmands.',
        },
      },
      {
        id: 'background',
        title: 'Processus en arrière-plan',
        description: 'Gérez plusieurs tâches simultanément avec bg, fg et &',
        blocks: [
          {
            type: 'text',
            content:
              'Unix permet de lancer des processus en arrière-plan pour continuer à utiliser le terminal pendant qu\'ils s\'exécutent. C\'est essentiel pour les tâches longues (compilation, téléchargements, serveurs de dev).',
            contentByEnv: {
              windows:
                'PowerShell offre des **jobs** pour l\'exécution en arrière-plan : `Start-Job`, `Get-Job`, `Receive-Job`. C\'est plus puissant que le `&` Unix mais la syntaxe est différente.',
            },
          },
          {
            type: 'code',
            content: '$ long-task &            # lancer en arrière-plan\n[1] 1234               # [numéro] PID\n\n$ jobs                  # lister les jobs\n[1]+  Running    long-task &\n\n$ fg %1                 # ramener au premier plan\n$ bg %1                 # reprendre en arrière-plan\n\n# Ctrl+Z : suspendre le processus actuel\n# Ctrl+C : arrêter le processus actuel',
            label: 'Gestion des processus (Linux/macOS)',
            contentByEnv: {
              windows: 'PS> $job = Start-Job -ScriptBlock { Start-Sleep 30; "Terminé!" }\nPS> Get-Job\nId Name    State\n-- ----    -----\n 1 Job1    Running\n\nPS> Receive-Job -Id 1    # lire la sortie\nPS> Stop-Job -Id 1       # arrêter le job\nPS> Remove-Job -Id 1     # nettoyer',
            },
            labelByEnv: {
              windows: 'Jobs PowerShell (Start-Job / Get-Job)',
            },
          },
          {
            type: 'code',
            content: '# Exemple pratique : serveur dev en arrière-plan\n$ npm run dev &\n[1] 5678\n$ # Vous pouvez continuer à travailler ici\n$ echo "Serveur lancé !"\nServeur lancé !\n$ jobs\n[1]+  Running    npm run dev &\n$ kill %1  # ou kill $(lsof -t -i:3000)',
            label: 'Serveur de développement en arrière-plan',
            contentByEnv: {
              windows: 'PS> $devServer = Start-Job -ScriptBlock { npm run dev }\nPS> # Continuez à travailler dans ce terminal\nPS> Get-Job\nPS> Stop-Job $devServer\n\n# Alternative : ouvrir un deuxième terminal PowerShell\n# (Windows Terminal avec onglets est idéal pour ça)',
            },
            labelByEnv: {
              windows: 'Serveur de dev en background (PowerShell)',
            },
          },
          {
            type: 'tip',
            content:
              'En développement quotidien, il est plus clair d\'utiliser plusieurs onglets de terminal (Windows Terminal, iTerm2, tmux) plutôt que `&`. Les jobs en arrière-plan peuvent s\'oublier et consommer des ressources.',
          },
        ],
        exercise: {
          instruction: 'Affichez la liste des jobs en arrière-plan avec `jobs` (elle sera probablement vide dans ce terminal simulé — c\'est normal).',
          instructionByEnv: {
            windows: 'Listez les jobs PowerShell actifs avec `Get-Job`.',
          },
          hint: 'Tapez simplement "jobs"',
          hintByEnv: {
            windows: 'Tapez "Get-Job"',
          },
          validate: validateBackground,
          successMessage: 'Bien ! Vous connaissez maintenant les mécanismes de gestion des processus en arrière-plan.',
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
    level: 2,
    prerequisites: ['navigation', 'fichiers', 'lecture'],
    unlocks: ['shell_scripts', 'logs_observability'],
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
          instructionByEnv: {
            windows: 'Créez `bonjour.txt` avec `Write-Output "Bonjour le monde!" > bonjour.txt` ou `echo "Bonjour le monde!" > bonjour.txt`.',
          },
          hint: 'Tapez: echo "Bonjour le monde!" > bonjour.txt',
          hintByEnv: {
            windows: 'Tapez: echo "Bonjour le monde!" > bonjour.txt (fonctionne aussi en PowerShell)',
          },
          validate: validateRedirectionSortie,
          successMessage: 'Excellent ! Vous savez créer des fichiers par redirection.',
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
          instructionByEnv: {
            windows: 'Comptez les fichiers avec un pipe PowerShell : `Get-ChildItem | Measure-Object`.',
          },
          hint: 'Tapez "ls | wc -l"',
          hintByEnv: {
            windows: 'Tapez "Get-ChildItem | Measure-Object" (équivalent PowerShell de ls | wc -l)',
          },
          validate: validatePipes,
          successMessage: 'Bravo ! Vous maîtrisez maintenant les pipes — l\'essence de la ligne de commande.',
        },
      },
      {
        id: 'stderr',
        title: 'Redirection des erreurs',
        description: 'Gérez stdout et stderr séparément pour des logs propres',
        blocks: [
          {
            type: 'text',
            content:
              'Chaque commande Unix a deux canaux de sortie : **stdout** (sortie standard, fd=1) et **stderr** (sortie d\'erreur, fd=2). Par défaut, les deux s\'affichent dans le terminal, mais on peut les rediriger séparément.',
            contentByEnv: {
              windows:
                'PowerShell utilise le même concept : stdout est le flux de succès (stream 1), stderr est le flux d\'erreur (stream 2). La syntaxe est légèrement différente de bash.',
            },
          },
          {
            type: 'code',
            content: '$ ls fichier-inexistant\nls: cannot access \'fichier-inexistant\': No such file or directory\n\n$ ls fichier-inexistant 2> erreurs.log\n# L\'erreur va dans le fichier, rien ne s\'affiche\n\n$ ls documents/ 2> erreurs.log\ndocuments/notes.txt  documents/rapport.md\n# stdout s\'affiche, stderr va dans le fichier',
            label: '2> — rediriger stderr seul',
            contentByEnv: {
              windows: 'PS> Get-Item fichier-inexistant\nGet-Item : Cannot find path...\n\nPS> Get-Item fichier-inexistant 2> erreurs.txt\n# L\'erreur va dans le fichier\n\nPS> Get-Item documents 2> erreurs.txt\ndirectory: C:\\Users\\user\\documents',
            },
            labelByEnv: {
              windows: '2> — rediriger les erreurs (PowerShell)',
            },
          },
          {
            type: 'code',
            content: '$ command > output.log 2>&1\n# stdout ET stderr → output.log\n\n$ command > output.log 2>/dev/null\n# stdout → output.log, stderr → poubelle\n\n$ command 2>&1 | grep "Error"\n# Chercher "Error" dans stdout + stderr',
            label: '2>&1 et /dev/null',
            contentByEnv: {
              windows: 'PS> command > output.log 2>&1\n# Même syntaxe — fonctionne en PowerShell !\n\nPS> command > output.log 2>$null\n# stderr → poubelle ($null = /dev/null Windows)\n\nPS> command *>&1 | Select-String "Error"\n# Tous les flux → stdout → grep',
            },
            labelByEnv: {
              windows: '2>&1 et $null (PowerShell)',
            },
          },
          {
            type: 'info',
            content:
              '`/dev/null` est un fichier spécial Unix qui absorbe tout ce qu\'on y écrit. C\'est la "poubelle" du terminal. `2>/dev/null` est très courant dans les scripts pour ignorer les erreurs non critiques.',
            contentByEnv: {
              windows:
                '`$null` est l\'équivalent PowerShell de `/dev/null`. `Out-Null` est aussi utilisé : `command | Out-Null` supprime toute la sortie. `2>$null` supprime uniquement stderr.',
            },
          },
          {
            type: 'warning',
            content:
              'Ne redirigez pas `2>/dev/null` systématiquement pour "éviter les messages d\'erreur". Vous masquez des problèmes réels. Utilisez-le uniquement pour les erreurs que vous avez analysées et décidé d\'ignorer.',
          },
        ],
        exercise: {
          instruction: 'Essayez de lister un fichier qui n\'existe pas et redirigez l\'erreur vers un fichier : `ls fichier-inexistant 2> erreurs.txt`.',
          instructionByEnv: {
            windows: 'Essayez : `Get-Item fichier-inexistant 2> erreurs.txt` pour capturer l\'erreur dans un fichier.',
          },
          hint: 'Tapez: ls fichier-inexistant 2> erreurs.txt',
          hintByEnv: {
            windows: 'Tapez: Get-Item fichier-inexistant 2> erreurs.txt',
          },
          validate: validateStderr,
          successMessage: 'Parfait ! Vous gérez maintenant stdout et stderr séparément.',
        },
      },
      {
        id: 'tee',
        title: 'tee — Afficher ET sauvegarder',
        description: 'Divisez la sortie pour l\'afficher et la sauvegarder simultanément',
        blocks: [
          {
            type: 'text',
            content:
              '`tee` lit depuis stdin et écrit simultanément vers stdout ET vers un fichier. Son nom vient du raccord en T de plomberie. Très utile pour les logs de build ou les longues opérations qu\'on veut suivre ET garder.',
            contentByEnv: {
              windows:
                '`Tee-Object` est l\'équivalent PowerShell de `tee`. Il peut envoyer la sortie vers un fichier ou une variable tout en la laissant continuer dans le pipeline.',
            },
          },
          {
            type: 'code',
            content: '$ ls -la | tee liste.txt\n[affiche la liste dans le terminal]\n[et sauvegarde dans liste.txt]\n\n$ npm run build 2>&1 | tee build.log\n# Voir le build en direct + garder le log\n\n$ tee -a fichier.txt\n# -a : ajouter au lieu d\'écraser',
            label: 'tee — exemples',
            contentByEnv: {
              windows: 'PS> Get-ChildItem | Tee-Object -FilePath liste.txt\n[affiche la liste]\n[sauvegarde dans liste.txt]\n\nPS> npm run build 2>&1 | Tee-Object -FilePath build.log\n# Build visible + log sauvegardé\n\nPS> Get-Process | Tee-Object -Variable procs\n# Affiche ET stocke dans $procs',
            },
            labelByEnv: {
              windows: 'Tee-Object — exemples PowerShell',
            },
          },
          {
            type: 'info',
            content:
              'Cas d\'usage typiques de `tee` :\n• `npm run build 2>&1 | tee build.log` — log de build\n• `make install | tee install.log` — log d\'installation\n• `ansible-playbook deploy.yml | tee deploy-$(date +%Y%m%d).log` — log daté',
          },
          {
            type: 'tip',
            content:
              'Combiné avec `2>&1`, `tee` capture toute la sortie d\'une commande longue sans bloquer l\'affichage en temps réel. C\'est bien plus pratique que de rediriger vers un fichier et attendre la fin pour lire le log.',
            contentByEnv: {
              windows:
                'Dans un pipeline PowerShell, `Tee-Object` peut aussi stocker dans une variable : `Get-Process | Tee-Object -Variable result | Where-Object CPU -gt 10`. Vous avez la sortie filtrée ET tous les processus dans `$result`.',
            },
          },
        ],
        exercise: {
          instruction: 'Utilisez `tee` pour afficher et sauvegarder la liste de vos fichiers : `ls | tee ma-liste.txt`.',
          instructionByEnv: {
            windows: 'Utilisez `Tee-Object` pour afficher et sauvegarder : `Get-ChildItem | Tee-Object -FilePath ma-liste.txt`.',
          },
          hint: 'Tapez: ls | tee ma-liste.txt',
          hintByEnv: {
            windows: 'Tapez: Get-ChildItem | Tee-Object -FilePath ma-liste.txt',
          },
          validate: validateTee,
          successMessage: 'Excellent ! tee est un outil indispensable pour les scripts de déploiement et les logs.',
        },
      },
    ],
  },
  {
    id: 'variables',
    title: 'Variables & Scripts',
    description: 'Maîtrisez les variables d\'environnement, les fichiers de config et l\'automatisation',
    iconName: 'Code2',
    color: '#f59e0b',
    level: 3,
    prerequisites: ['navigation', 'fichiers', 'lecture', 'permissions', 'redirection'],
    unlocks: ['reseau', 'git'],
    lessons: [
      {
        id: 'env-vars',
        title: 'Variables d\'environnement',
        description: 'Stockez et accédez à des valeurs globales dans votre shell',
        blocks: [
          {
            type: 'text',
            content:
              'Une variable d\'environnement est une paire clé/valeur stockée dans votre shell. Elle peut être lue par n\'importe quel programme. Par exemple, `PATH` contient la liste des répertoires où le shell cherche les commandes.',
          },
          {
            type: 'code',
            content: '$ export GREETING=Hello\n$ echo $GREETING\nHello',
            label: 'Créer et lire une variable (Linux/macOS)',
          },
          {
            type: 'code',
            content: 'PS> $env:GREETING = "Hello"\nPS> echo $env:GREETING\nHello',
            label: 'PowerShell',
          },
          {
            type: 'info',
            content:
              'La commande `env` (Linux/macOS) ou `Get-ChildItem Env:` (Windows) liste toutes les variables d\'environnement actives.',
          },
          {
            type: 'tip',
            content:
              'Convention : les noms de variables d\'environnement sont en MAJUSCULES. Les noms en minuscules sont réservés aux variables locales au script.',
          },
        ],
        exercise: {
          instruction: 'Créez une variable `GREETING` avec la valeur `Hello` en utilisant `export GREETING=Hello`.',
          instructionByEnv: {
            windows: 'Créez une variable avec `$env:GREETING = "Hello"` (PowerShell).',
          },
          hint: 'Tapez: export GREETING=Hello',
          hintByEnv: {
            windows: 'Tapez: $env:GREETING = "Hello"',
          },
          validate: validateEnvVars,
          successMessage: 'Parfait ! Vous avez créé votre première variable d\'environnement.',
        },
      },
      {
        id: 'path-variable',
        title: '$PATH — Le chemin des commandes',
        description: 'Comprenez comment le shell trouve vos commandes',
        blocks: [
          {
            type: 'text',
            content:
              '`$PATH` est la variable d\'environnement la plus importante. Elle contient une liste de répertoires séparés par `:` (Linux/macOS) ou `;` (Windows). Quand vous tapez une commande, le shell cherche dans chacun de ces répertoires.',
          },
          {
            type: 'code',
            content: '$ echo $PATH\n/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
            label: 'Afficher le PATH (Linux/macOS)',
          },
          {
            type: 'code',
            content: 'PS> echo $env:PATH\nC:\\Windows\\System32;C:\\Windows;C:\\Program Files\\Git\\bin',
            label: 'Afficher le PATH (Windows)',
          },
          {
            type: 'code',
            content: '$ export PATH=$PATH:/opt/myapp/bin\n$ echo $PATH\n/usr/local/bin:/usr/bin:/bin:/opt/myapp/bin',
            label: 'Ajouter un répertoire au PATH',
          },
          {
            type: 'warning',
            content:
              'Modifier le PATH avec `export` dans le terminal est temporaire (jusqu\'à la fermeture). Pour le rendre permanent, ajoutez-le à votre fichier de config shell (`.bashrc`, `.zshrc`).',
          },
        ],
        exercise: {
          instruction: 'Affichez la valeur de votre $PATH avec `echo $PATH`.',
          instructionByEnv: {
            windows: 'Affichez votre PATH avec `echo $env:PATH`.',
          },
          hint: 'Tapez: echo $PATH',
          hintByEnv: {
            windows: 'Tapez: echo $env:PATH',
          },
          validate: validatePathVariable,
          successMessage: 'Excellent ! Vous voyez maintenant les répertoires où le shell cherche vos commandes.',
        },
      },
      {
        id: 'shell-config',
        title: 'Fichiers de configuration shell',
        description: 'Personnalisez votre shell au démarrage avec .bashrc et .zshrc',
        blocks: [
          {
            type: 'text',
            content:
              'Chaque shell charge automatiquement des fichiers de configuration au démarrage. C\'est là que vous définissez vos variables permanentes, alias et fonctions.',
          },
          {
            type: 'info',
            content:
              'Fichiers importants :\n• Linux (bash) : `~/.bashrc` (shell interactif), `~/.profile` (connexion)\n• macOS (zsh) : `~/.zshrc`\n• Windows (PowerShell) : `$PROFILE`',
          },
          {
            type: 'code',
            content: '# Dans ~/.bashrc ou ~/.zshrc :\nexport EDITOR=nano\nexport NODE_ENV=development\nalias ll="ls -la"\nalias gs="git status"',
            label: 'Contenu typique de .bashrc/.zshrc',
          },
          {
            type: 'code',
            content: '$ cat ~/.bashrc\n# Configuration Bash\nalias ll="ls -la"\nexport PATH=$PATH:/usr/local/bin\nexport EDITOR=nano',
            label: 'Afficher votre .bashrc',
          },
          {
            type: 'tip',
            content:
              'Après avoir modifié votre fichier de config, rechargez-le sans relancer le terminal : `source ~/.bashrc` (ou `. ~/.zshrc` sur macOS).',
          },
        ],
        exercise: {
          instruction: 'Affichez le contenu de votre fichier `~/.bashrc` avec `cat ~/.bashrc`.',
          instructionByEnv: {
            macos: 'Affichez votre configuration zsh avec `cat ~/.zshrc`.',
            windows: 'Affichez votre configuration PowerShell avec `cat $PROFILE` (ou notez que $PROFILE n\'existe peut-être pas encore).',
          },
          hint: 'Tapez: cat ~/.bashrc',
          hintByEnv: {
            macos: 'Tapez: cat ~/.zshrc',
            windows: 'Tapez: cat $PROFILE',
          },
          validate: validateShellConfig,
          successMessage: 'Bien joué ! Voici votre configuration shell actuelle.',
        },
      },
      {
        id: 'dotenv',
        title: 'Fichiers .env — Secrets et configuration',
        description: 'Gérez les variables sensibles de vos projets sans les committer',
        blocks: [
          {
            type: 'text',
            content:
              'Dans les projets de développement, les secrets (clés API, mots de passe de base de données) ne doivent **jamais** être dans le code source. La convention est de les stocker dans un fichier `.env` à la racine du projet.',
          },
          {
            type: 'code',
            content: '# .env — NE PAS COMMITTER\nDB_HOST=localhost\nDB_PORT=5432\nDB_NAME=myapp\nDB_USER=admin\nDB_PASSWORD=EXAMPLE_PASSWORD_NOT_REAL\nAPI_KEY=EXAMPLE_API_KEY_NOT_REAL\nNODE_ENV=development',
            label: 'Exemple de fichier .env',
          },
          {
            type: 'warning',
            content:
              'Ajoutez TOUJOURS `.env` à votre `.gitignore` ! Si vous commitez un fichier `.env` avec de vrais secrets, changez immédiatement tous les mots de passe et clés concernés.',
          },
          {
            type: 'info',
            content:
              'En développement Node.js, `dotenv` charge automatiquement les variables du fichier `.env` dans `process.env`. En Python, utilisez `python-dotenv`. Votre framework fait souvent ça automatiquement (Next.js, Vite, etc.).',
          },
          {
            type: 'tip',
            content:
              'Bonne pratique : fournissez un fichier `.env.example` avec des valeurs fictives dans le repo. Chaque développeur crée son `.env` local à partir de ce modèle.',
          },
        ],
        exercise: {
          instruction: 'Dans le répertoire `projets`, il y a un fichier `.env`. Naviguez-y avec `cd projets` puis affichez son contenu avec `cat .env`.',
          instructionByEnv: {
            windows: 'Dans le répertoire `projets`, affichez le fichier `.env` avec `Get-Content .env` (ou `cat .env`).',
          },
          hint: 'Faites d\'abord "cd projets", puis "cat .env"',
          hintByEnv: {
            windows: 'Faites "cd projets" puis "Get-Content .env"',
          },
          validate: validateDotenv,
          successMessage: 'Parfait ! Vous voyez les variables d\'environnement du projet. Ne commitez jamais ce fichier !',
        },
      },
      {
        id: 'scripts',
        title: 'Scripts bash — Automatisez vos tâches',
        description: 'Créez vos premiers scripts exécutables',
        blocks: [
          {
            type: 'text',
            content:
              'Un script bash est simplement un fichier texte contenant des commandes. Il commence par une ligne `#!/bin/bash` (le "shebang") qui indique au système quel interpréteur utiliser.',
          },
          {
            type: 'code',
            content: '#!/bin/bash\n# Mon premier script\necho "Bonjour $USER !"\ndate\necho "Répertoire courant : $(pwd)"',
            label: 'Structure d\'un script bash',
          },
          {
            type: 'code',
            content: '# 1. Créer le script\n$ touch mon-script.sh\n\n# 2. Le rendre exécutable\n$ chmod +x mon-script.sh\n\n# 3. L\'exécuter\n$ ./mon-script.sh\nBonjour user !\nWed Apr  8 17:00:00 UTC 2026',
            label: 'Créer et exécuter un script',
          },
          {
            type: 'info',
            content:
              'Le `./` est obligatoire pour exécuter un script dans le répertoire courant — le shell ne cherche pas dans `.` par sécurité. Le script doit avoir le bit exécutable (`chmod +x`).',
          },
          {
            type: 'tip',
            content:
              'Dans le répertoire `projets`, il y a déjà un `script.sh` exécutable. Essayez `./script.sh` pour le lancer !',
          },
        ],
        exercise: {
          instruction: 'Dans le répertoire `projets`, exécutez le script existant avec `./script.sh`.',
          instructionByEnv: {
            windows: 'Dans le répertoire `projets`, exécutez le script avec `.\\script.sh` ou `bash script.sh`.',
          },
          hint: 'Faites d\'abord "cd projets" si ce n\'est pas déjà fait, puis "./script.sh"',
          hintByEnv: {
            windows: 'Tapez ".\\script.sh" ou "bash script.sh"',
          },
          validate: validateScripts,
          successMessage: 'Bravo ! Vous venez d\'exécuter votre premier script bash.',
        },
      },
      {
        id: 'cron',
        title: 'cron — Planifier des tâches',
        description: 'Automatisez l\'exécution de scripts à intervalles réguliers',
        blocks: [
          {
            type: 'text',
            content:
              '`cron` est le planificateur de tâches d\'Unix/Linux. Il permet d\'exécuter des scripts automatiquement selon un calendrier défini dans un fichier appelé "crontab".',
          },
          {
            type: 'code',
            content: '# Format d\'une ligne crontab :\n# minute   heure   jour   mois   jour_semaine   commande\n#   *         *      *      *          *          commande\n\n# Exemples :\n0 9 * * 1-5   /home/user/backup.sh      # Lundi-vendredi à 9h\n*/15 * * * *   /usr/bin/check-disk.sh    # Toutes les 15 minutes\n0 0 1 * *      /home/user/monthly.sh     # 1er du mois à minuit',
            label: 'Syntaxe crontab',
          },
          {
            type: 'code',
            content: '$ crontab -l       # Lister les tâches planifiées\n$ crontab -e       # Éditer (ouvre vi/nano)\n$ crontab -r       # Supprimer toutes les tâches',
            label: 'Commandes crontab',
          },
          {
            type: 'info',
            content:
              'Sur Windows, l\'équivalent de cron est le "Planificateur de tâches" (Task Scheduler), accessible via `taskschd.msc` ou PowerShell avec `Register-ScheduledTask`.',
          },
          {
            type: 'tip',
            content:
              'Utilisez https://crontab.guru pour vérifier la syntaxe de vos expressions cron avant de les utiliser en production.',
          },
        ],
        exercise: {
          instruction: 'Listez les tâches planifiées avec `crontab -l`.',
          instructionByEnv: {
            windows: 'Listez les tâches planifiées PowerShell avec `Get-ScheduledTask` (simulé — tapez `crontab -l` pour voir un exemple).',
          },
          hint: 'Tapez: crontab -l',
          hintByEnv: {
            windows: 'Tapez: crontab -l (pour voir un exemple de tâches planifiées)',
          },
          validate: validateCron,
          successMessage: 'Parfait ! Vous savez maintenant lister vos tâches planifiées.',
        },
      },
    ],
  },
  {
    id: 'reseau',
    title: 'Réseau & SSH',
    description: 'Testez la connectivité, effectuez des requêtes HTTP et connectez-vous à des serveurs distants',
    iconName: 'Globe',
    color: '#06b6d4',
    level: 3,
    prerequisites: ['variables'],
    unlocks: ['github-collaboration'],
    lessons: [
      {
        id: 'ping',
        title: 'ping — Tester la connectivité',
        description: 'Vérifiez si un hôte est accessible sur le réseau',
        blocks: [
          {
            type: 'text',
            content:
              '`ping` envoie des paquets ICMP à un hôte pour tester s\'il est accessible et mesurer le temps de réponse (latence). C\'est le premier réflexe pour diagnostiquer un problème réseau.',
          },
          {
            type: 'code',
            content: '$ ping google.com\nPING google.com: 56 data bytes\n64 bytes from google.com: icmp_seq=0 ttl=54 time=12.3 ms\n64 bytes from google.com: icmp_seq=1 ttl=54 time=11.8 ms\n\n--- google.com ping statistics ---\n3 packets transmitted, 3 received, 0% packet loss',
            label: 'Exemple (Linux/macOS)',
            labelByEnv: {
              windows: 'Exemple (Windows)',
            },
            contentByEnv: {
              windows: 'PS> ping google.com\nPinging google.com [142.250.74.46] with 32 bytes of data:\nReply from 142.250.74.46: bytes=32 time=12ms TTL=54\nReply from 142.250.74.46: bytes=32 time=11ms TTL=54\n\nPing statistics for 142.250.74.46:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)',
            },
          },
          {
            type: 'info',
            content:
              'Sur Linux/macOS, `ping` envoie des paquets en continu (Ctrl+C pour arrêter). Utilisez `-c 4` pour limiter à 4 paquets. Sur Windows, `ping` s\'arrête automatiquement après 4 paquets.',
            contentByEnv: {
              windows: 'Sur Windows, `ping` envoie 4 paquets par défaut et s\'arrête automatiquement. Sur Linux/macOS, ajoutez `-c 4` pour le même comportement.',
            },
          },
          {
            type: 'code',
            content: '# Limiter le nombre de paquets\n$ ping -c 4 google.com\n\n# Tester une adresse IP directement\n$ ping 8.8.8.8\n\n# Ping rapide (intervalle 0.2s)\n$ ping -i 0.2 google.com',
            label: 'Options utiles (Linux/macOS)',
            labelByEnv: {
              windows: 'Options utiles (Windows)',
            },
            contentByEnv: {
              windows: '# Limiter le nombre de paquets\nPS> ping -n 4 google.com\n\n# Tester une adresse IP directement\nPS> ping 8.8.8.8\n\n# Ping en continu (comme Unix)\nPS> ping -t google.com',
            },
          },
          {
            type: 'tip',
            content: 'Si `ping` échoue, testez `ping 8.8.8.8` (DNS Google). Si ça marche mais que `ping google.com` échoue, c\'est un problème DNS, pas réseau.',
          },
        ],
        exercise: {
          instruction: 'Testez la connectivité vers `google.com` avec la commande `ping google.com`.',
          hint: 'Tapez: ping google.com',
          validate: validatePing,
          successMessage: 'Excellent ! Vous savez maintenant tester la connectivité réseau.',
        },
      },
      {
        id: 'curl',
        title: 'curl — Requêtes HTTP',
        description: 'Effectuez des requêtes HTTP/HTTPS directement depuis le terminal',
        blocks: [
          {
            type: 'text',
            content:
              '`curl` (Client URL) permet d\'envoyer des requêtes HTTP depuis le terminal. C\'est un outil indispensable pour tester des APIs, télécharger des fichiers et déboguer des endpoints web.',
          },
          {
            type: 'code',
            content: '# Requête GET simple\n$ curl https://api.github.com\n\n# Afficher les headers HTTP\n$ curl -I https://example.com\n\n# Envoyer du JSON (POST)\n$ curl -X POST https://api.example.com/data \\\n  -H "Content-Type: application/json" \\\n  -d \'{"key": "value"}\'',
            label: 'Usages courants (Linux/macOS)',
            labelByEnv: {
              windows: 'Usages courants (Windows)',
            },
            contentByEnv: {
              windows: '# curl est disponible nativement sur Windows 10+\nPS> curl https://api.github.com\n\n# Afficher les headers HTTP\nPS> curl -I https://example.com\n\n# Alternative PowerShell native\nPS> Invoke-WebRequest -Uri https://api.github.com',
            },
          },
          {
            type: 'info',
            content:
              '`curl` est disponible nativement sur Linux, macOS et Windows 10+. Sur Windows, `curl` est un alias de `Invoke-WebRequest` en PowerShell — utilisez `curl.exe` pour forcer le vrai curl.',
            contentByEnv: {
              windows: 'En PowerShell, `curl` est un alias de `Invoke-WebRequest`. Pour utiliser le vrai curl, tapez `curl.exe`. Les deux fonctionnent pour des requêtes simples.',
            },
          },
          {
            type: 'code',
            content: '# Sauvegarder la réponse dans un fichier\n$ curl -o fichier.json https://api.example.com\n\n# Suivre les redirections\n$ curl -L https://example.com\n\n# Authentification\n$ curl -u user:password https://api.example.com',
            label: 'Options avancées',
          },
          {
            type: 'tip',
            content: 'Ajoutez `-s` (silent) pour supprimer la barre de progression, et `| jq .` pour formater le JSON : `curl -s https://api.github.com | jq .`',
          },
        ],
        exercise: {
          instruction: 'Effectuez une requête GET vers l\'API GitHub avec `curl https://api.github.com`.',
          instructionByEnv: {
            windows: 'Effectuez une requête GET vers l\'API GitHub avec `curl https://api.github.com` ou `Invoke-WebRequest -Uri https://api.github.com`.',
          },
          hint: 'Tapez: curl https://api.github.com',
          hintByEnv: {
            windows: 'Tapez: curl https://api.github.com (ou Invoke-WebRequest -Uri https://api.github.com)',
          },
          validate: validateCurl,
          successMessage: 'Parfait ! Vous savez maintenant interroger des APIs depuis le terminal.',
        },
      },
      {
        id: 'wget',
        title: 'wget — Télécharger des fichiers',
        description: 'Téléchargez des fichiers depuis le web en ligne de commande',
        blocks: [
          {
            type: 'text',
            content:
              '`wget` (Web Get) est un utilitaire de téléchargement non-interactif. Contrairement à `curl`, il est optimisé pour télécharger des fichiers et peut reprendre les téléchargements interrompus.',
          },
          {
            type: 'code',
            content: '# Télécharger un fichier\n$ wget https://example.com/fichier.zip\n\n# Nommer le fichier à la sortie\n$ wget -O mon-fichier.zip https://example.com/fichier.zip\n\n# Reprendre un téléchargement interrompu\n$ wget -c https://example.com/gros-fichier.iso',
            label: 'Usages courants (Linux/macOS)',
            labelByEnv: {
              windows: 'Usages courants (Windows)',
            },
            contentByEnv: {
              windows: '# wget via winget (si installé)\nPS> wget https://example.com/fichier.zip\n\n# Alternative native PowerShell\nPS> Invoke-WebRequest -Uri https://example.com/fichier.zip -OutFile fichier.zip\n\n# Alias court\nPS> iwr https://example.com/fichier.zip -OutFile fichier.zip',
            },
          },
          {
            type: 'info',
            content:
              '`wget` est préinstallé sur la plupart des distributions Linux et disponible via Homebrew sur macOS. Sur Windows, il faut l\'installer ou utiliser `Invoke-WebRequest` de PowerShell.',
            contentByEnv: {
              windows: 'Sur Windows, l\'équivalent natif de `wget` est `Invoke-WebRequest` (alias `iwr`). La syntaxe est différente mais le résultat est identique : télécharger un fichier depuis une URL.',
            },
          },
          {
            type: 'code',
            content: '# Télécharger en arrière-plan\n$ wget -b https://example.com/gros-fichier.iso\n\n# Télécharger plusieurs fichiers d\'une liste\n$ wget -i liste-urls.txt\n\n# Limiter la vitesse (utile pour ne pas saturer la connexion)\n$ wget --limit-rate=1m https://example.com/fichier.iso',
            label: 'Options avancées (Linux/macOS)',
          },
          {
            type: 'tip',
            content: 'Pour télécharger un site entier en local (mirror) : `wget --mirror --convert-links https://example.com`. Utile pour archiver ou consulter hors-ligne.',
          },
        ],
        exercise: {
          instruction: 'Téléchargez un fichier avec `wget https://example.com/fichier.zip`.',
          instructionByEnv: {
            windows: 'Téléchargez un fichier avec `Invoke-WebRequest -Uri https://example.com/fichier.zip -OutFile fichier.zip` ou `wget https://example.com/fichier.zip`.',
          },
          hint: 'Tapez: wget https://example.com/fichier.zip',
          hintByEnv: {
            windows: 'Tapez: Invoke-WebRequest -Uri https://example.com/fichier.zip -OutFile fichier.zip',
          },
          validate: validateWget,
          successMessage: 'Bien joué ! Vous savez maintenant télécharger des fichiers depuis le terminal.',
        },
      },
      {
        id: 'dns',
        title: 'DNS — Résoudre les noms de domaine',
        description: 'Comprenez le DNS et diagnostiquez les problèmes de résolution de noms',
        blocks: [
          {
            type: 'text',
            content:
              'Le DNS (Domain Name System) traduit les noms de domaine (`google.com`) en adresses IP (`142.250.74.46`). Quand une page web ne charge pas, le problème vient souvent du DNS.',
          },
          {
            type: 'code',
            content: '# Résolution simple\n$ nslookup google.com\nServer:  8.8.8.8\nAddress: 8.8.8.8#53\n\nNon-authoritative answer:\nName: google.com\nAddress: 142.250.74.46\n\n# Interroger un serveur DNS spécifique\n$ nslookup google.com 1.1.1.1',
            label: 'nslookup (disponible partout)',
          },
          {
            type: 'code',
            content: '# dig — plus verbeux, idéal pour le diagnostic\n$ dig google.com\n\n; <<>> DiG 9.18.1 <<>> google.com\n;; ANSWER SECTION:\ngoogle.com. 299 IN A 142.250.74.46\n\n;; Query time: 12 msec\n;; SERVER: 8.8.8.8#53\n\n# Réponse courte\n$ dig +short google.com\n142.250.74.46',
            label: 'dig (Linux/macOS)',
            labelByEnv: {
              windows: 'Alternatives Windows',
            },
            contentByEnv: {
              windows: '# nslookup fonctionne sur tous les OS\nPS> nslookup google.com\n\n# Résolution via PowerShell\nPS> Resolve-DnsName google.com\n\nName                           Type TTL  Section IPAddress\n----                           ---- ---  ------- ---------\ngoogle.com                     A    299  Answer  142.250.74.46',
            },
          },
          {
            type: 'info',
            content:
              '`nslookup` est disponible sur Linux, macOS et Windows. `dig` est disponible sur Linux et macOS (et via Chocolatey sur Windows). Pour Windows, `Resolve-DnsName` est l\'alternative PowerShell native.',
            contentByEnv: {
              windows: '`nslookup` est disponible nativement sur Windows. `Resolve-DnsName` est l\'outil PowerShell natif plus moderne. `dig` n\'est pas inclus par défaut mais peut être installé via Chocolatey.',
            },
          },
          {
            type: 'tip',
            content: 'Les serveurs DNS publics les plus rapides : `8.8.8.8` (Google), `1.1.1.1` (Cloudflare), `9.9.9.9` (Quad9 — axé privacy). Utilisez `dig @1.1.1.1 google.com` pour tester un DNS spécifique.',
          },
        ],
        exercise: {
          instruction: 'Résolvez le nom de domaine `google.com` avec `nslookup google.com`.',
          instructionByEnv: {
            windows: 'Résolvez le nom de domaine `google.com` avec `nslookup google.com` ou `Resolve-DnsName google.com`.',
          },
          hint: 'Tapez: nslookup google.com',
          hintByEnv: {
            windows: 'Tapez: nslookup google.com (ou Resolve-DnsName google.com)',
          },
          validate: validateDns,
          successMessage: 'Parfait ! Vous savez maintenant interroger le DNS depuis le terminal.',
        },
      },
      {
        id: 'ssh',
        title: 'SSH — Connexion distante sécurisée',
        description: 'Connectez-vous à des serveurs distants et gérez vos clés SSH',
        blocks: [
          {
            type: 'text',
            content:
              'SSH (Secure Shell) est le protocole standard pour se connecter à des serveurs distants de manière chiffrée. C\'est une compétence fondamentale pour tout développeur qui déploie des applications.',
          },
          {
            type: 'code',
            content: '# Connexion de base\n$ ssh user@serveur.example.com\n\n# Connexion sur un port non-standard\n$ ssh -p 2222 user@serveur.example.com\n\n# Connexion avec une clé spécifique\n$ ssh -i ~/.ssh/ma-cle user@serveur.example.com',
            label: 'Connexion SSH (Linux/macOS/Windows)',
          },
          {
            type: 'code',
            content: '# Générer une paire de clés ED25519 (recommandé)\n$ ssh-keygen -t ed25519 -C "mon@email.com"\n\nGenerating public/private ed25519 key pair.\nEnter file (.ssh/id_ed25519): [Entrée]\nEnter passphrase: [optionnel]\n\nYour public key has been saved in ~/.ssh/id_ed25519.pub\n\n# Copier la clé publique sur un serveur\n$ ssh-copy-id user@serveur.example.com',
            label: 'Générer des clés SSH',
          },
          {
            type: 'info',
            content:
              'SSH utilise une paire de clés : une **clé privée** (à ne jamais partager) et une **clé publique** (à déposer sur les serveurs). L\'authentification se fait sans mot de passe — bien plus sécurisé.',
            contentByEnv: {
              windows: 'OpenSSH est intégré à Windows 10+ (version 1803). Les commandes `ssh`, `ssh-keygen`, `ssh-copy-id` fonctionnent dans PowerShell et CMD. Les clés sont stockées dans `%USERPROFILE%\\.ssh\\`.',
            },
          },
          {
            type: 'tip',
            content: 'Préférez `ed25519` à `rsa` pour les nouvelles clés : plus court, plus rapide, plus sécurisé. Ajoutez toujours une passphrase à votre clé privée — c\'est votre dernière ligne de défense si la clé est volée.',
          },
        ],
        exercise: {
          instruction: 'Générez une paire de clés SSH ED25519 avec `ssh-keygen -t ed25519`.',
          hint: 'Tapez: ssh-keygen -t ed25519',
          validate: validateSsh,
          successMessage: 'Bravo ! Vous venez de générer votre première paire de clés SSH.',
        },
      },
      {
        id: 'scp',
        title: 'scp — Copier des fichiers via SSH',
        description: 'Transférez des fichiers entre machines de manière sécurisée',
        blocks: [
          {
            type: 'text',
            content:
              '`scp` (Secure Copy Protocol) copie des fichiers entre machines en utilisant le protocole SSH. C\'est la méthode la plus simple pour transférer des fichiers vers un serveur distant sans interface graphique.',
          },
          {
            type: 'code',
            content: '# Copier un fichier local vers un serveur\n$ scp fichier.txt user@serveur:/home/user/\n\n# Copier depuis un serveur vers local\n$ scp user@serveur:/home/user/fichier.txt ./\n\n# Copier un répertoire entier (-r)\n$ scp -r mon-projet/ user@serveur:/var/www/',
            label: 'Syntaxe scp (Linux/macOS/Windows)',
          },
          {
            type: 'code',
            content: '# Copier sur un port non-standard\n$ scp -P 2222 fichier.txt user@serveur:/home/user/\n\n# Copier avec compression (-C)\n$ scp -C gros-fichier.tar user@serveur:/backup/\n\n# Afficher la progression (-v verbose)\n$ scp -v fichier.txt user@serveur:/home/user/',
            label: 'Options utiles',
          },
          {
            type: 'info',
            content:
              'Note : `-p` en minuscule pour `ssh` (port), `-P` en majuscule pour `scp` (port). Cette asymétrie est historique.',
            contentByEnv: {
              windows: 'Sur Windows 10+, `scp` est disponible nativement. Pour des transferts récurrents ou complexes, `rsync` (via WSL ou Git Bash) offre plus d\'options : reprise sur interruption, synchronisation différentielle.',
            },
          },
          {
            type: 'tip',
            content: 'Pour des transferts récurrents ou de gros volumes, préférez `rsync` : `rsync -avz mon-projet/ user@serveur:/var/www/`. Il transfère uniquement les fichiers modifiés et supporte la reprise.',
          },
        ],
        exercise: {
          instruction: 'Copiez un fichier vers un serveur distant avec `scp fichier.txt user@serveur.example.com:/home/user/`.',
          hint: 'Tapez: scp fichier.txt user@serveur.example.com:/home/user/',
          validate: validateScp,
          successMessage: 'Excellent ! Vous savez maintenant transférer des fichiers de manière sécurisée.',
        },
      },
    ],
  },

  // ── Module 9 — Git Fondamentaux ─────────────────────────────────────────────
  {
    id: 'git',
    title: 'Git Fondamentaux',
    description: 'Maîtrisez le contrôle de version avec Git — l\'outil indispensable de tout développeur professionnel',
    iconName: 'GitBranch',
    color: '#f97316',
    level: 4,
    prerequisites: ['variables'],
    unlocks: ['github-collaboration'],
    lessons: [
      {
        id: 'git-init',
        title: 'git init — Initialiser un dépôt',
        description: 'Créez votre premier dépôt Git et comprenez la structure interne',
        blocks: [
          {
            type: 'text',
            content:
              'Git est un système de contrôle de version distribué. Chaque développeur possède une copie complète de l\'historique du projet. C\'est l\'outil #1 dans tous les environnements professionnels — maîtriser Git est non-négociable.',
          },
          {
            type: 'code',
            content: '# Créer un nouveau dépôt dans le répertoire courant\n$ git init\nInitialized empty Git repository in /home/user/mon-projet/.git/\n\n# Créer un dépôt avec un nom de répertoire\n$ git init mon-projet\nInitialized empty Git repository in /home/user/mon-projet/.git/',
            label: 'git init (Linux/macOS)',
          },
          {
            type: 'code',
            content: '# PowerShell — même commande, multiplateforme\nPS> git init\nInitialized empty Git repository in C:\\Users\\user\\mon-projet\\.git\\\n\nPS> git init mon-projet',
            label: 'git init (Windows PowerShell)',
          },
          {
            type: 'info',
            content:
              'Le dossier `.git/` contient tout l\'historique du projet : commits, branches, configuration. **Ne jamais supprimer ce dossier** — c\'est la mémoire complète du dépôt.',
            contentByEnv: {
              windows: 'Sur Windows, `.git/` est un dossier caché. Dans l\'Explorateur, activez "Éléments masqués" pour le voir. En PowerShell : `ls -Force` ou `Get-ChildItem -Force`.',
            },
          },
          {
            type: 'tip',
            content: 'Convention pro : toujours initialiser un dépôt git dès le début d\'un projet, même seul. L\'historique est inestimable pour comprendre pourquoi une décision a été prise — même des mois plus tard.',
          },
        ],
        exercise: {
          instruction: 'Initialisez un nouveau dépôt Git avec `git init`.',
          hint: 'Tapez: git init',
          validate: validateGitInit,
          successMessage: 'Parfait ! Votre premier dépôt Git est initialisé. Le dossier .git/ a été créé.',
        },
      },
      {
        id: 'git-config',
        title: 'git config — Configurer votre identité',
        description: 'Configurez votre nom et email avant votre premier commit',
        blocks: [
          {
            type: 'text',
            content:
              'Avant de commencer à committer, Git a besoin de savoir qui vous êtes. Cette identité est attachée à chaque commit — elle est visible dans l\'historique et sur GitHub.',
          },
          {
            type: 'code',
            content: '# Configuration globale (pour tous vos projets)\n$ git config --global user.name "Votre Nom"\n$ git config --global user.email "vous@example.com"\n\n# Vérifier la configuration\n$ git config --list\nuser.name=Votre Nom\nuser.email=vous@example.com\ncore.editor=nano\ninit.defaultBranch=main',
            label: 'Configuration git (Linux/macOS/Windows)',
          },
          {
            type: 'code',
            content: '# Définir l\'éditeur par défaut\n$ git config --global core.editor "code --wait"   # VS Code\n$ git config --global core.editor "nano"          # Nano\n$ git config --global core.editor "vim"           # Vim\n\n# Définir la branche par défaut\n$ git config --global init.defaultBranch main',
            label: 'Configuration avancée',
          },
          {
            type: 'info',
            content:
              '`--global` configure Git pour tous vos projets (fichier `~/.gitconfig`). Sans ce flag, la configuration ne s\'applique qu\'au dépôt courant (fichier `.git/config`). Utilisez `--local` pour surcharger par projet.',
            contentByEnv: {
              windows: 'Sur Windows, le fichier de configuration global est dans `C:\\Users\\VotreNom\\.gitconfig`. Vous pouvez aussi utiliser `git config --list --show-origin` pour voir d\'où vient chaque paramètre.',
            },
          },
          {
            type: 'tip',
            content: 'En entreprise, vous utiliserez souvent une configuration globale pour votre compte personnel et une configuration locale par projet (email pro vs perso). `git config --list --show-origin` vous montre exactement quelle config est active.',
          },
        ],
        exercise: {
          instruction: 'Vérifiez votre configuration Git avec `git config --list`.',
          hint: 'Tapez: git config --list',
          validate: validateGitConfig,
          successMessage: 'Votre configuration Git est visible. Nom et email sont les deux réglages essentiels avant le premier commit.',
        },
      },
      {
        id: 'git-add-commit',
        title: 'git add & commit — Enregistrer vos modifications',
        description: 'Comprenez la zone de staging et créez vos premiers commits',
        blocks: [
          {
            type: 'text',
            content:
              'Git utilise un système en trois zones : le **répertoire de travail** (vos fichiers), la **zone de staging** (les modifications prêtes à être commitées) et le **dépôt** (l\'historique permanent). Cette architecture donne un contrôle précis sur ce qu\'on enregistre.',
          },
          {
            type: 'code',
            content: '# Voir l\'état actuel\n$ git status\nOn branch main\nUntracked files:\n  (use "git add <file>" to include)\n\tfichier.txt\n\n# Ajouter un fichier spécifique\n$ git add fichier.txt\n\n# Ajouter tous les fichiers du répertoire courant\n$ git add .\n\n# Ajouter interactivement (sélection fine)\n$ git add -p',
            label: 'Staging (Linux/macOS/Windows)',
          },
          {
            type: 'code',
            content: '# Créer un commit avec message en ligne\n$ git commit -m "feat: ajouter la page d\'accueil"\n[main a3f8c12] feat: ajouter la page d\'accueil\n 1 file changed, 25 insertions(+)\n\n# Commit avec titre + description\n$ git commit -m "feat: authentification utilisateur" -m "Ajoute login/logout avec JWT et refresh token automatique"',
            label: 'Créer un commit',
          },
          {
            type: 'info',
            content:
              'Convention de message de commit (Conventional Commits) : `type(scope): description`. Types courants : `feat` (nouvelle feature), `fix` (bug), `refactor`, `test`, `docs`, `chore`. Cette convention est standard en entreprise — lisez les commits de projets open source pour vous en imprégner.',
          },
          {
            type: 'warning',
            content: '`git add .` ajoute TOUT — y compris les fichiers `.env`, les clés API, les mots de passe. Configurez toujours un `.gitignore` AVANT de faire `git add .` pour ne pas exposer de secrets.',
          },
          {
            type: 'tip',
            content: '`git add -p` ("patch mode") permet de sélectionner des hunks individuels à l\'intérieur d\'un même fichier. Indispensable pour faire des commits propres et atomiques — chaque commit = un sujet précis.',
          },
        ],
        exercise: {
          instruction: 'Ajoutez tous les fichiers du répertoire courant à la zone de staging avec `git add .`.',
          hint: 'Tapez: git add .',
          validate: validateGitAddCommit,
          successMessage: 'Fichiers stagés ! Maintenant vous pouvez les committer avec git commit -m "message".',
        },
      },
      {
        id: 'git-status-log',
        title: 'git status & log — Surveiller votre dépôt',
        description: 'Inspectez l\'état courant et consultez l\'historique des commits',
        blocks: [
          {
            type: 'text',
            content:
              '`git status` et `git log` sont vos yeux dans Git. Status vous dit où vous en êtes maintenant ; log vous raconte l\'histoire du projet. Vous les utiliserez des dizaines de fois par jour en entreprise.',
          },
          {
            type: 'code',
            content: '# État du répertoire de travail\n$ git status\nOn branch main\nChanges to be committed:\n  (use "git restore --staged" to unstage)\n\tnew file:   index.html\n\nChanges not staged for commit:\n  modified:   style.css\n\nUntracked files:\n  script.js',
            label: 'git status',
          },
          {
            type: 'code',
            content: '# Historique complet\n$ git log\ncommit a3f8c12 (HEAD -> main)\nAuthor: Vous <vous@example.com>\nDate:   Mon Apr 11 2026\n\n    feat: ajouter la page d\'accueil\n\n# Format court (très utilisé en pratique)\n$ git log --oneline\na3f8c12 feat: ajouter la page d\'accueil\nb2e9d01 chore: initialisation du projet\n\n# Avec le graphe de branches\n$ git log --oneline --graph --all',
            label: 'git log',
          },
          {
            type: 'code',
            content: '# Voir un commit spécifique en détail\n$ git show a3f8c12\n\n# Voir les commits d\'un auteur\n$ git log --author="Votre Nom"\n\n# Chercher dans les messages de commit\n$ git log --grep="feat"\n\n# Voir les fichiers modifiés par commit\n$ git log --stat',
            label: 'git log avancé',
          },
          {
            type: 'tip',
            content: '`git log --oneline --graph --all --decorate` est la commande de référence pour visualiser l\'état complet d\'un dépôt avec toutes ses branches. Créez un alias : `git config --global alias.lg "log --oneline --graph --all --decorate"`',
          },
        ],
        exercise: {
          instruction: 'Affichez le statut de votre dépôt avec `git status`.',
          hint: 'Tapez: git status',
          validate: validateGitStatusLog,
          successMessage: 'Vous savez lire l\'état de votre dépôt. git status sera votre commande la plus utilisée au quotidien.',
        },
      },
      {
        id: 'git-diff-gitignore',
        title: 'git diff & .gitignore — Comparer et filtrer',
        description: 'Visualisez les différences et excluez les fichiers non pertinents',
        blocks: [
          {
            type: 'text',
            content:
              '`git diff` montre exactement ce qui a changé dans vos fichiers. `.gitignore` dit à Git quels fichiers ignorer — variables d\'environnement, dépendances, fichiers de build. Ces deux outils sont essentiels pour des commits propres.',
          },
          {
            type: 'code',
            content: '# Voir les modifications non-stagées\n$ git diff\ndiff --git a/style.css b/style.css\n--- a/style.css\n+++ b/style.css\n@@ -1,3 +1,4 @@\n body {\n+  font-family: sans-serif;\n   margin: 0;\n }\n\n# Voir les modifications stagées (avant commit)\n$ git diff --staged\n\n# Comparer deux branches\n$ git diff main feature/login',
            label: 'git diff',
          },
          {
            type: 'code',
            content: '# Exemple de .gitignore pour un projet Node.js\nnode_modules/\ndist/\nbuild/\n\n# Fichiers sensibles — JAMAIS committer\n.env\n.env.local\n.env.*.local\n*.key\n*.pem\n\n# OS & IDE\n.DS_Store\nThumbs.db\n.vscode/settings.json\n.idea/\n\n# Logs\n*.log\nnpm-debug.log*',
            label: '.gitignore — fichier de référence',
          },
          {
            type: 'code',
            content: '# Vérifier si un fichier est ignoré\n$ git check-ignore -v .env\n.gitignore:4:.env\t.env\n\n# Forcer l\'ajout d\'un fichier ignoré (rarement conseillé)\n$ git add --force fichier.log\n\n# Utiliser github.com/github/gitignore pour des templates\n# Ex. gitignore pour Node, Python, Rust, etc.',
            label: 'Vérification et debug',
          },
          {
            type: 'warning',
            content: 'Un `.gitignore` ajouté après que des fichiers ont déjà été commités ne les supprime PAS de l\'historique. Pour supprimer des secrets déjà commités, utilisez `git filter-repo` ou contactez GitHub Support — et considérez les secrets compromis.',
          },
          {
            type: 'tip',
            content: 'Créez toujours votre `.gitignore` AVANT le premier `git add`. GitHub propose des templates ready-to-use pour chaque langage sur `github.com/github/gitignore`.',
          },
        ],
        exercise: {
          instruction: 'Visualisez les différences actuelles dans votre dépôt avec `git diff`.',
          hint: 'Tapez: git diff',
          validate: validateGitDiffGitignore,
          successMessage: 'Vous savez lire un diff Git. Les lignes en vert (+) sont les ajouts, en rouge (-) les suppressions.',
        },
      },
      {
        id: 'git-branch',
        title: 'git branch — Travailler avec les branches',
        description: 'Créez, listez et gérez les branches pour isoler vos développements',
        blocks: [
          {
            type: 'text',
            content:
              'Les branches sont l\'une des forces majeures de Git. Elles permettent de travailler sur une feature ou un bug fix en isolation totale, sans perturber la branche principale. En entreprise, vous ne travaillez pratiquement jamais directement sur `main`.',
          },
          {
            type: 'code',
            content: '# Lister les branches locales (* = branche active)\n$ git branch\n* main\n  feature/login\n  fix/typo-header\n\n# Créer une nouvelle branche\n$ git branch feature/panier\n\n# Créer et basculer immédiatement (méthode classique)\n$ git checkout -b feature/panier\n\n# Méthode moderne (Git 2.23+)\n$ git switch -c feature/panier\nSwitched to a new branch \'feature/panier\'',
            label: 'Créer et lister des branches (Linux/macOS/Windows)',
          },
          {
            type: 'code',
            content: '# Renommer une branche\n$ git branch -m ancien-nom nouveau-nom\n\n# Supprimer une branche mergée\n$ git branch -d feature/login\n\n# Supprimer une branche non-mergée (force)\n$ git branch -D feature/experimental\n\n# Lister toutes les branches (locales + distantes)\n$ git branch -a\n* main\n  feature/login\n  remotes/origin/main\n  remotes/origin/develop',
            label: 'Gérer les branches',
          },
          {
            type: 'info',
            content:
              'Convention de nommage en entreprise : `feature/THI-28-git-modules` (prefixe + ID issue + description), `fix/login-redirect`, `hotfix/cve-2026`, `release/v2.0.0`. Chaque équipe a ses conventions — vérifiez le CONTRIBUTING.md du projet.',
            contentByEnv: {
              windows: 'Toutes les commandes git branch fonctionnent identiquement sur Windows, macOS et Linux. Git est conçu pour être cross-platform depuis le départ.',
            },
          },
          {
            type: 'tip',
            content: 'La règle d\'or : **une branche = un sujet**. Ne mélangez pas une feature et un bugfix sur la même branche. Les Pull Requests seront plus faciles à relire et à revenir en arrière si nécessaire.',
          },
        ],
        exercise: {
          instruction: 'Créez une nouvelle branche `feature/ma-feature` et basculez dessus avec `git checkout -b feature/ma-feature`.',
          hint: 'Tapez: git checkout -b feature/ma-feature',
          validate: validateGitBranch,
          successMessage: 'Branche créée et activée ! Vous développez maintenant en isolation totale de main.',
        },
      },
      {
        id: 'git-merge',
        title: 'git merge — Fusionner des branches',
        description: 'Intégrez le travail d\'une branche dans une autre et gérez les conflits',
        blocks: [
          {
            type: 'text',
            content:
              'Une fois votre feature terminée, vous devez l\'intégrer dans la branche principale. `git merge` fusionne l\'historique de deux branches. C\'est la dernière étape du workflow feature branch — avant la Pull Request sur GitHub.',
          },
          {
            type: 'code',
            content: '# Retourner sur la branche cible\n$ git checkout main\n\n# Fusionner la branche feature\n$ git merge feature/panier\nUpdating a3f8c12..b7e2d45\nFast-forward\n panier.html | 42 ++++++++++++\n 1 file changed, 42 insertions(+)',
            label: 'Merge fast-forward (Linux/macOS/Windows)',
          },
          {
            type: 'code',
            content: '# En cas de conflit :\n$ git merge feature/login\nAuto-merging index.html\nCONFLICT (content): Merge conflict in index.html\nAutomatic merge failed; fix conflicts and then commit the result.\n\n# Ouvrez le fichier conflictueux :\n<<<<<<< HEAD\n<title>Mon App</title>\n=======\n<title>Login — Mon App</title>\n>>>>>>> feature/login\n\n# Après résolution manuelle :\n$ git add index.html\n$ git commit -m "merge: resolve conflict in index.html"',
            label: 'Résoudre un conflit de merge',
          },
          {
            type: 'info',
            content:
              'Deux stratégies de merge : **fast-forward** (si la branche cible n\'a pas avancé — historique linéaire) et **merge commit** (si les deux branches ont divergé — conserve la trace de la fusion). `git merge --no-ff` force un merge commit même si fast-forward est possible.',
          },
          {
            type: 'tip',
            content: 'En pratique en entreprise, le merge est souvent fait via une Pull Request sur GitHub — pas directement en ligne de commande. La PR permet la code review avant le merge. Comprendre `git merge` reste indispensable pour gérer les conflits.',
          },
        ],
        exercise: {
          instruction: 'Fusionnez la branche `feature/ma-feature` dans la branche courante avec `git merge feature/ma-feature`.',
          hint: 'Tapez: git merge feature/ma-feature',
          validate: validateGitMerge,
          successMessage: 'Fusion réussie ! Le travail de la branche est maintenant intégré. C\'est le coeur du workflow Git en entreprise.',
        },
      },
    ],
  },

  // ── Module 10 — GitHub & Collaboration ──────────────────────────────────────
  {
    id: 'github-collaboration',
    title: 'GitHub & Collaboration',
    description: 'Synchronisez avec des dépôts distants, ouvrez des Pull Requests et collaborez comme en entreprise',
    iconName: 'GitFork',
    color: '#8b5cf6',
    level: 4,
    prerequisites: ['git', 'reseau'],
    unlocks: [],
    lessons: [
      {
        id: 'git-remote',
        title: 'git remote — Connecter au dépôt distant',
        description: 'Liez votre dépôt local à GitHub et gérez vos remotes',
        blocks: [
          {
            type: 'text',
            content:
              'Un "remote" est un lien entre votre dépôt local et un dépôt hébergé (GitHub, GitLab, Bitbucket…). C\'est le pont entre votre machine et le monde. En équipe, le remote `origin` est la référence partagée par tous.',
          },
          {
            type: 'code',
            content: '# Ajouter un remote (étape après git init)\n$ git remote add origin https://github.com/user/mon-projet.git\n\n# Lister les remotes configurés\n$ git remote -v\norigin\thttps://github.com/user/mon-projet.git (fetch)\norigin\thttps://github.com/user/mon-projet.git (push)\n\n# Supprimer un remote\n$ git remote remove origin\n\n# Renommer un remote\n$ git remote rename origin upstream',
            label: 'Gérer les remotes (Linux/macOS/Windows)',
          },
          {
            type: 'code',
            content: '# HTTPS vs SSH — deux méthodes d\'authentification\n\n# HTTPS (simple, authentification par token)\nhttps://github.com/user/repo.git\n\n# SSH (recommandé, clé cryptographique)\ngit@github.com:user/repo.git\n\n# Changer l\'URL d\'un remote existant\n$ git remote set-url origin git@github.com:user/repo.git',
            label: 'HTTPS vs SSH',
          },
          {
            type: 'info',
            content:
              'GitHub a supprimé l\'authentification par mot de passe en 2021. Pour HTTPS, vous avez besoin d\'un **Personal Access Token (PAT)** ou d\'utiliser GitHub CLI (`gh auth login`). Pour SSH, configurez vos clés SSH dans les paramètres GitHub → SSH and GPG keys.',
            contentByEnv: {
              windows: 'Sur Windows, **Git Credential Manager** (inclus avec Git for Windows) stocke automatiquement vos tokens HTTPS. Pour SSH, les clés générées avec `ssh-keygen` dans PowerShell ou Git Bash fonctionnent identiquement.',
            },
          },
          {
            type: 'tip',
            content: 'Convention : le remote principal s\'appelle toujours `origin`. Quand vous forkez un projet pour contribuer, le dépôt original s\'appelle `upstream` — vous pouvez synchroniser avec `git pull upstream main`.',
          },
        ],
        exercise: {
          instruction: 'Ajoutez un remote `origin` pointant vers `https://github.com/user/mon-projet.git` avec `git remote add origin https://github.com/user/mon-projet.git`.',
          hint: 'Tapez: git remote add origin https://github.com/user/mon-projet.git',
          validate: validateGitRemote,
          successMessage: 'Remote ajouté ! Votre dépôt local est maintenant connecté à GitHub.',
        },
      },
      {
        id: 'git-push-pull',
        title: 'git push & pull — Synchroniser avec GitHub',
        description: 'Envoyez vos commits vers GitHub et récupérez les modifications de votre équipe',
        blocks: [
          {
            type: 'text',
            content:
              '`git push` envoie vos commits locaux vers le dépôt distant. `git pull` récupère les commits distants et les intègre à votre branche. Ces deux commandes sont le rythme quotidien du travail en équipe.',
          },
          {
            type: 'code',
            content: '# Premier push — définir la branche de tracking\n$ git push -u origin main\nEnumerating objects: 3, done.\nCounting objects: 100% (3/3), done.\nTo https://github.com/user/repo.git\n * [new branch]      main -> main\nBranch \'main\' set up to track \'origin/main\'.\n\n# Push suivants (tracking déjà configuré)\n$ git push\n\n# Push d\'une nouvelle branche feature\n$ git push -u origin feature/panier',
            label: 'git push (Linux/macOS/Windows)',
          },
          {
            type: 'code',
            content: '# Récupérer ET intégrer les commits distants\n$ git pull\nremote: Enumerating objects: 5, done.\nUpdating a3f8c12..c9f1e34\nFast-forward\n README.md | 3 +++\n 1 file changed, 3 insertions(+)\n\n# Pull avec rebase (historique linéaire)\n$ git pull --rebase\n\n# Voir ce qui arrive avant d\'intégrer\n$ git fetch && git log HEAD..origin/main --oneline',
            label: 'git pull',
          },
          {
            type: 'info',
            content:
              'La différence entre `pull` et `fetch` : `fetch` télécharge les changements sans les intégrer (safe), `pull` = `fetch` + `merge` (intègre automatiquement). En équipe active, `fetch` d\'abord, puis analyser, puis `merge` ou `rebase`.',
            contentByEnv: {
              windows: 'Toutes ces commandes fonctionnent identiquement sur Windows. Si vous utilisez GitHub Desktop ou Fork (GUI), ces apps exécutent les mêmes commandes git en arrière-plan.',
            },
          },
          {
            type: 'warning',
            content: '`git push --force` ou `git push -f` réécrit l\'historique distant. **Ne jamais faire sur une branche partagée** (`main`, `develop`) — vous écrasez le travail de vos collègues. Utilisez `--force-with-lease` si vous devez forcer sur votre propre branche feature.',
          },
          {
            type: 'tip',
            content: 'Workflow quotidien en équipe : 1) `git pull` au démarrage, 2) travailler sur votre branche, 3) `git push` en fin de journée ou après chaque feature terminée. Ne laissez jamais des commits locaux non-poussés plus d\'une journée.',
          },
        ],
        exercise: {
          instruction: 'Envoyez vos commits vers GitHub avec `git push -u origin main`.',
          hint: 'Tapez: git push -u origin main',
          validate: validateGitPushPull,
          successMessage: 'Push réussi ! Vos commits sont maintenant sur GitHub, visibles par toute votre équipe.',
        },
      },
      {
        id: 'git-fetch-clone',
        title: 'git fetch & clone — Récupérer et cloner',
        description: 'Clonez un dépôt existant et récupérez les mises à jour sans intégration automatique',
        blocks: [
          {
            type: 'text',
            content:
              '`git clone` est votre point d\'entrée sur un projet existant. `git fetch` est l\'outil de synchronisation safe — il télécharge sans toucher à votre travail. Ces deux commandes sont indispensables dès le premier jour dans une entreprise.',
          },
          {
            type: 'code',
            content: '# Cloner un dépôt public\n$ git clone https://github.com/org/projet.git\nCloning into \'projet\'...\nremote: Enumerating objects: 1247, done.\nReceiving objects: 100% (1247/1247), done.\n\n# Cloner dans un dossier spécifique\n$ git clone https://github.com/org/projet.git mon-dossier\n\n# Cloner une branche spécifique\n$ git clone -b develop https://github.com/org/projet.git\n\n# Cloner en SSH (recommandé)\n$ git clone git@github.com:org/projet.git',
            label: 'git clone (Linux/macOS/Windows)',
          },
          {
            type: 'code',
            content: '# Fetch : télécharger sans intégrer\n$ git fetch origin\nFrom https://github.com/org/projet\n * branch            main       -> FETCH_HEAD\n\n# Voir ce qui a changé sur le remote\n$ git fetch && git log HEAD..origin/main --oneline\n\n# Voir toutes les branches distantes\n$ git fetch --all\n\n# Comparer local vs remote après fetch\n$ git diff main origin/main',
            label: 'git fetch',
          },
          {
            type: 'code',
            content: '# Workflow de contribution typique en open source\n# 1. Forker sur GitHub (via l\'interface web)\n\n# 2. Cloner votre fork\n$ git clone git@github.com:VOTRE-USER/projet.git\n\n# 3. Ajouter l\'upstream (projet original)\n$ git remote add upstream git@github.com:org/projet.git\n\n# 4. Synchroniser régulièrement\n$ git fetch upstream\n$ git merge upstream/main',
            label: 'Workflow fork & contribution',
          },
          {
            type: 'tip',
            content: '`git fetch` est la commande la plus "safe" pour la synchronisation — elle ne modifie jamais votre travail local. Utilisez-la pour voir les changements avant de les intégrer avec `merge` ou `rebase`.',
          },
        ],
        exercise: {
          instruction: 'Clonez un dépôt distant avec `git clone https://github.com/user/projet.git`.',
          hint: 'Tapez: git clone https://github.com/user/projet.git',
          validate: validateGitFetchClone,
          successMessage: 'Dépôt cloné ! Vous pouvez maintenant travailler sur un projet existant avec tout son historique.',
        },
      },
      {
        id: 'pull-requests',
        title: 'Pull Requests — Code Review & Collaboration',
        description: 'Maîtrisez le workflow Pull Request, pilier de la collaboration professionnelle',
        blocks: [
          {
            type: 'text',
            content:
              'La Pull Request (PR) — ou Merge Request sur GitLab — est le mécanisme central de la collaboration en équipe. Elle permet de proposer des changements, de les faire relire avant le merge, et de documenter les décisions techniques.',
          },
          {
            type: 'code',
            content: '# Workflow complet pour ouvrir une PR\n\n# 1. Créer une branche feature\n$ git checkout -b feature/THI-28-git-modules\n\n# 2. Développer et committer\n$ git add .\n$ git commit -m "feat(curriculum): add git module"\n\n# 3. Pousser la branche\n$ git push -u origin feature/THI-28-git-modules\n\n# 4. Ouvrir la PR sur GitHub (interface web ou CLI)\n$ gh pr create --title "feat(curriculum): add git module" --body "..."',
            label: 'Workflow PR complet',
          },
          {
            type: 'code',
            content: '# GitHub CLI (gh) — travailler avec les PRs depuis le terminal\n\n# Lister les PRs ouvertes\n$ gh pr list\n\n# Voir une PR spécifique\n$ gh pr view 42\n\n# Checkout d\'une PR pour review locale\n$ gh pr checkout 42\n\n# Approuver une PR\n$ gh pr review 42 --approve\n\n# Merger une PR\n$ gh pr merge 42 --squash',
            label: 'GitHub CLI — PR management',
          },
          {
            type: 'info',
            content:
              'Anatomie d\'une bonne PR : **titre clair** (même format que le commit message), **description** avec le contexte + screenshots si UI, **checklist** de ce qui a été fait et testé, **lien vers l\'issue** Linear/Jira. Une PR < 400 lignes de diff est plus facile à relire.',
            contentByEnv: {
              windows: 'GitHub CLI (`gh`) est disponible sur Windows via `winget install GitHub.cli` ou `scoop install gh`. Il s\'intègre avec Git Credential Manager pour l\'authentification.',
            },
          },
          {
            type: 'tip',
            content: 'En code review : soyez constructif, non subjectif. "Cette fonction fait 200 lignes, pourrions-nous la découper ?" est mieux que "c\'est trop long". Approuvez ce qui est bon, suggérez ce qui peut s\'améliorer, bloquez ce qui est une erreur réelle.',
          },
        ],
        exercise: {
          instruction: 'Simulez le début d\'un workflow PR : créez une branche `feature/nouvelle-feature` avec `git checkout -b feature/nouvelle-feature`.',
          hint: 'Tapez: git checkout -b feature/nouvelle-feature',
          validate: validatePullRequests,
          successMessage: 'Branche feature créée ! Dans un vrai projet, vous développeriez ici puis ouvreriez une PR vers main.',
        },
      },
      {
        id: 'conflicts',
        title: 'Conflits de merge — Les résoudre comme un pro',
        description: 'Comprenez pourquoi les conflits apparaissent et apprenez à les résoudre avec méthode',
        blocks: [
          {
            type: 'text',
            content:
              'Les conflits de merge sont inévitables en équipe. Ils surviennent quand deux développeurs modifient la même ligne dans la même période. Ce n\'est pas un bug Git — c\'est Git qui refuse de deviner lequel des deux changements est correct.',
          },
          {
            type: 'code',
            content: '# Scénario typique de conflit\n$ git merge feature/login\nAuto-merging index.html\nCONFLICT (content): Merge conflict in index.html\nAutomatic merge failed; fix conflicts and then commit the result.\n\n# Voir quels fichiers sont en conflit\n$ git status\nboth modified:   index.html\n\n# Contenu d\'un fichier en conflit\n<<<<<<< HEAD (votre version)\n<title>Mon App v2</title>\n=======\n<title>Login — Mon App</title>\n>>>>>>> feature/login (version entrante)',
            label: 'Comprendre un conflit',
          },
          {
            type: 'code',
            content: '# Résolution en 4 étapes\n\n# 1. Ouvrir le fichier conflictueux dans votre éditeur\n$ code index.html  # VS Code avec extension GitLens\n\n# 2. Choisir ou combiner les deux versions\n<title>Login — Mon App v2</title>  # version fusionnée\n\n# 3. Supprimer les marqueurs de conflit\n# (<<<, ===, >>> n\'ont plus lieu d\'être)\n\n# 4. Stager et committer\n$ git add index.html\n$ git commit -m "merge: resolve title conflict between main and feature/login"',
            label: 'Résolution étape par étape',
          },
          {
            type: 'code',
            content: '# Outils graphiques pour les conflits\n\n# VS Code intégré (recommandé débutants)\n$ git mergetool\n\n# Voir les 3 versions (base, local, remote)\n$ git diff --conflict=diff3\n\n# Abandonner le merge\n$ git merge --abort\n\n# Prévenir les conflits : merge fréquemment\n$ git pull --rebase origin main  # au lieu de merge\n\n# Stratégie rebase pour historique linéaire\n$ git rebase main',
            label: 'Outils et stratégies avancées',
          },
          {
            type: 'warning',
            content: 'Ne jamais committer un fichier avec des marqueurs de conflit (`<<<<<<<`, `=======`, `>>>>>>>`) encore présents. Certains outils de CI détectent automatiquement ces marqueurs et bloquent le build.',
          },
          {
            type: 'tip',
            content: 'La meilleure façon d\'éviter les conflits : merger/rebaser souvent depuis main. Un branche qui diverge pendant 2 semaines aura beaucoup plus de conflits qu\'une branche quotidiennement synchronisée.',
          },
        ],
        exercise: {
          instruction: 'Fusionnez la branche `feature/nouvelle-feature` dans la branche courante avec `git merge feature/nouvelle-feature`.',
          hint: 'Tapez: git merge feature/nouvelle-feature',
          validate: validateConflicts,
          successMessage: 'Fusion effectuée ! En cas de conflit réel, vous savez maintenant comment les identifier et les résoudre.',
        },
      },
      {
        id: 'github-actions',
        title: 'GitHub Actions — CI/CD automatisé',
        description: 'Automatisez vos tests, builds et déploiements avec GitHub Actions',
        blocks: [
          {
            type: 'text',
            content:
              'GitHub Actions est la plateforme CI/CD intégrée à GitHub. Elle permet d\'automatiser tout ce qui doit se passer à chaque push, PR ou merge : tests, linting, build, déploiement. En entreprise, c\'est le garde-fou qualité de l\'équipe.',
          },
          {
            type: 'code',
            content: '# Structure d\'un workflow GitHub Actions\n# Fichier : .github/workflows/ci.yml\n\nname: CI\non:\n  push:\n    branches: [main, develop]\n  pull_request:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: \'20\'\n      - run: npm install\n      - run: npm run lint\n      - run: npm test\n      - run: npm run build',
            label: 'Workflow CI/CD minimal',
          },
          {
            type: 'code',
            content: '# Workflow multi-jobs avec matrix\njobs:\n  test:\n    runs-on: ${{ matrix.os }}\n    strategy:\n      matrix:\n        os: [ubuntu-latest, windows-latest, macos-latest]\n        node: [18, 20, 22]\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: ${{ matrix.node }}\n      - run: npm test\n\n  deploy:\n    needs: test  # attend que tous les tests passent\n    if: github.ref == \'refs/heads/main\'\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo "Déploiement en production"',
            label: 'Matrix + déploiement conditionnel',
          },
          {
            type: 'code',
            content: '# Commandes utiles avec GitHub CLI\n\n# Lister les workflows\n$ gh workflow list\n\n# Voir les runs récents\n$ gh run list\n\n# Voir les détails d\'un run\n$ gh run view 12345\n\n# Déclencher manuellement un workflow\n$ gh workflow run ci.yml\n\n# Télécharger les artifacts d\'un run\n$ gh run download 12345',
            label: 'Gestion via GitHub CLI',
          },
          {
            type: 'info',
            content:
              'Le fichier de workflow doit être dans `.github/workflows/`. GitHub détecte automatiquement tous les fichiers `.yml` dans ce dossier. Les triggers les plus courants : `push`, `pull_request`, `schedule` (cron), `workflow_dispatch` (manuel).',
            contentByEnv: {
              windows: 'Les runners GitHub Actions disponibles incluent `windows-latest` (Windows Server). Vous pouvez tester sur plusieurs OS en parallèle avec la matrix strategy — utile pour les outils cross-platform.',
            },
          },
          {
            type: 'tip',
            content: 'Règle pratique : si vous le faites à la main à chaque PR, automatisez-le avec GitHub Actions. Tests, linting, type-check, build, déploiement preview, mise à jour de la documentation — tout peut être automatisé.',
          },
        ],
        exercise: {
          instruction: 'Vérifiez l\'état de votre dépôt git avant un push avec `git status`.',
          hint: 'Tapez: git status',
          validate: validateGithubActions,
          successMessage: 'Parfait ! Avant chaque push, vérifiez toujours l\'état de votre dépôt. GitHub Actions fera ensuite tourner automatiquement vos tests et votre build.',
        },
      },
    ],
  },

  // ── Module 11 — L'IA comme outil dev ──────────────────────────────────────
  {
    id: 'ia-dev',
    title: "L'IA comme outil dev",
    description: "Maîtrisez l'IA comme amplificateur de vos compétences — pas comme béquille",
    iconName: 'Bot',
    color: '#a78bfa',
    level: 5,
    prerequisites: ['github-collaboration'],
    unlocks: [],
    lessons: [
      {
        id: 'ia-dev-intro',
        title: "L'IA en 2026 : un outil, pas un oracle",
        description: "Comprendre ce que l'IA change réellement pour un développeur",
        blocks: [
          { type: 'text', content: "En 2026, l'IA fait partie du quotidien du développeur. Elle génère du code, explique des erreurs, rédige de la documentation. Mais elle n'est pas infaillible — et surtout, elle n'est pas un remplacement. C'est un amplificateur : elle décuple ce que vous savez déjà faire." },
          { type: 'text', content: "Ce module vous apprend à utiliser l'IA avec discernement. Pas à copier-coller aveuglément, mais à collaborer intelligemment. La différence entre un développeur junior et un senior qui utilisent l'IA, c'est la maîtrise des fondamentaux — exactement ce que vous venez d'acquérir dans les 10 modules précédents." },
          { type: 'info', content: "Terminal Learning a lui-même été construit avec l'IA (Claude Sonnet/Opus). Pas en demandant à l'IA de tout faire — en collaborant : l'humain pose les questions, comprend les réponses, prend les décisions. C'est la posture que vous allez apprendre ici." },
          { type: 'tip', content: "La commande `ai-help` vous accompagne tout au long de ce module. Tapez `ai-help` pour voir la liste complète des sous-commandes disponibles." },
        ],
        exercise: {
          instruction: "Découvrez le guide de ce module en tapant `ai-help`",
          hint: 'Tapez: ai-help',
          validate: validateAiHelp,
          successMessage: "Vous avez accès à 11 guides pratiques. Ce module est votre référence permanente — revenez consulter ces guides dans votre vie professionnelle.",
        },
      },
      {
        id: 'ia-dev-capacites',
        title: "Ce que l'IA sait vraiment faire",
        description: "Inventaire honnête des capacités réelles des IA de code en 2026",
        blocks: [
          { type: 'text', content: "Les IA de code (GitHub Copilot, Claude, GPT-4o, Gemini) sont remarquablement efficaces sur un spectre de tâches précis. Les connaître évite deux erreurs opposées : sous-utiliser l'outil par méfiance, ou lui confier des tâches pour lesquelles il n'est pas fiable." },
          { type: 'code', content: '# Tâches où l\'IA excelle\n# Génération de code depuis une description\n"Crée une fonction TypeScript qui valide un email avec regex"\n# Explication de code existant\n"Explique ce que fait cette fonction ligne par ligne"\n# Débogage avec contexte fourni\n"TypeError: Cannot read properties of null — voici mon code"\n# Écriture de tests unitaires\n"Génère les tests Vitest pour cette fonction validateUser"\n# Refactoring guidé\n"Refactorise pour suivre le pattern Strategy"', label: "Cas d'usage à haute valeur ajoutée" },
          { type: 'info', content: "L'IA est aussi très forte pour les tâches répétitives : traduire du code d'un langage à un autre, générer de la documentation, adapter du contenu pour différents niveaux. Pour un enseignant, c'est un gain de temps considérable.", contentByEnv: { windows: "Sur Windows, GitHub Copilot s'intègre nativement à VS Code. Claude Code CLI fonctionne dans PowerShell et Windows Terminal. Les capacités sont identiques sur toutes les plateformes." } },
          { type: 'tip', content: "Règle pratique : si une tâche est mécanique, répétitive ou bien définie, l'IA peut l'accélérer. Si elle demande du jugement ou de l'expérience — c'est votre rôle." },
        ],
        exercise: {
          instruction: "Explorez les capacités détaillées avec `ai-help capabilities`",
          hint: 'Tapez: ai-help capabilities',
          validate: validateAiHelpCapabilities,
          successMessage: "Bonne maîtrise des capacités. L'étape suivante est aussi importante : connaître les limites.",
        },
      },
      {
        id: 'ia-dev-limites',
        title: "Ce que l'IA ne sait pas faire",
        description: "Les limites réelles et les pièges à éviter pour ne pas accumuler de la dette technique",
        blocks: [
          { type: 'text', content: "Connaître les limites d'un outil est aussi important que ses forces. Les développeurs qui ont les pires expériences avec l'IA sont ceux qui lui font une confiance aveugle, sans vérifier. Le résultat : du code qui fonctionne aujourd'hui mais qui explose en production dans six mois." },
          { type: 'warning', content: "Hallucinations : les IA inventent des fonctions, des API, des arguments qui n'existent pas. Exemple courant : proposer une méthode avec des options qui n'ont jamais existé dans la version que vous utilisez." },
          { type: 'code', content: '# Exemples de sorties problématiques\n# 1. API inventée\nconst result = await db.findAndModify({ ... })  # peut ne pas exister\n# 2. Version obsolète\nnpm install react-scripts@3.x  # vulnérabilités connues\n# 3. Dépendance manquante\nimport { toast } from \'sonner\'  # pas dans votre projet\n# 4. Race condition ignorée\nasync function saveUser(id) {\n  const user = await getUser(id)  # user peut être null\n  user.updatedAt = new Date()     # TypeError en prod\n}', label: 'Pièges typiques générés par IA' },
          { type: 'info', content: "La date de coupure de connaissance est critique : un modèle entraîné en 2024 ne connaît pas les breaking changes d'une librairie publiée en 2025. Vérifiez toujours la compatibilité de version avec la documentation officielle." },
        ],
        exercise: {
          instruction: "Consultez les limites détaillées avec `ai-help limits`",
          hint: 'Tapez: ai-help limits',
          validate: validateAiHelpLimits,
          successMessage: "Parfait. Connaître les limites, c'est la moitié de la maîtrise. Passons maintenant à comment bien formuler vos demandes.",
        },
      },
      {
        id: 'ia-dev-prompts-basics',
        title: "Écrire un bon prompt — les bases",
        description: "La qualité de la réponse dépend directement de la qualité de la question",
        blocks: [
          { type: 'text', content: "Le prompt engineering n'est pas une discipline mystérieuse. C'est l'art d'être précis. Une IA reçoit exactement ce que vous lui envoyez — pas plus. Si votre demande est vague, la réponse sera générique. Si elle est précise, la réponse sera utile." },
          { type: 'code', content: '# Mauvais prompt (réponse trop générique)\n"Fix my code"\n\n# Bon prompt (réponse ciblée)\n"J\'ai une TypeError: Cannot read properties of undefined\n(reading \'id\') à la ligne 42 de fetchUser().\nL\'objet user peut être null quand l\'utilisateur est\ndéconnecté. Corrige avec un guard approprié.\nStack : TypeScript 5, React 18, Supabase."', label: 'Comparaison prompt vague vs précis' },
          { type: 'code', content: '# Structure d\'un prompt efficace\n[CONTEXTE]   Stack, version, environnement\n[PROBLÈME]   Erreur exacte ou comportement attendu vs observé\n[CODE]       Uniquement le snippet concerné\n[CONTRAINTE] Ce que vous ne voulez pas changer\n[FORMAT]     Type de réponse : explication / code / liste', label: 'Template universel' },
          { type: 'tip', content: "Si l'IA donne une réponse à côté, ce n'est pas forcément sa faute — c'est souvent un manque de contexte dans le prompt. Avant de relancer, demandez-vous : qu'est-ce que j'ai oublié de dire ?" },
        ],
        exercise: {
          instruction: "Consultez le guide prompts avec `ai-help prompts`",
          hint: 'Tapez: ai-help prompts',
          validate: validateAiHelpPrompts,
          successMessage: "Les bases sont là. Passons aux prompts avancés avec contexte technique complet.",
        },
      },
      {
        id: 'ia-dev-prompts-avances',
        title: "Prompts avancés — donner du contexte technique",
        description: "Maîtrisez les prompts complexes pour des tâches d'architecture et de formation",
        blocks: [
          { type: 'text', content: "Pour des tâches complexes — refactoring d'une architecture, génération de contenu pédagogique, migration de base de données — le prompt doit inclure le contexte complet du projet. L'IA n'a pas accès à votre codebase : vous devez lui donner les informations dont elle a besoin." },
          { type: 'code', content: '# Prompt d\'architecture complet\n"Je travaille sur une app React 18 + TypeScript strict\n+ Supabase (PostgreSQL + RLS). Je dois implémenter\nun système RBAC avec 4 rôles : student, teacher,\ninstitution_admin, super_admin.\nContrainte : les policies RLS doivent éviter la\nrécursion sur la table profiles.\nPropose l\'architecture SQL + les policies RLS."', label: "Prompt d'architecture (exemple réel)" },
          { type: 'code', content: '# Prompt pédagogique pour enseignants\n"Génère 5 exercices progressifs sur grep\npour des débutants en terminal Linux.\nNiveau 1 : recherche simple dans un fichier\nNiveau 2 : options -i, -r, -n\nNiveau 3 : regex basiques\nChaque exercice inclut : consigne, exemple, corrigé\net les 2 erreurs les plus fréquentes des débutants."', label: "Prompt de génération de contenu pédagogique" },
          { type: 'info', content: "Pour les enseignants qui construisent des parcours : l'IA peut adapter automatiquement le même exercice pour Linux, macOS et Windows. Précisez toujours les 3 environnements dans votre prompt si vous ciblez une plateforme multi-OS." },
        ],
        exercise: {
          instruction: "Explorez les prompts avec contexte via `ai-help context`",
          hint: 'Tapez: ai-help context',
          validate: validateAiHelpContext,
          successMessage: "Vous maîtrisez les prompts avancés. Étape suivante critique : savoir valider ce que l'IA produit.",
        },
      },
      {
        id: 'ia-dev-valider',
        title: "Valider la sortie — ne jamais copier-coller aveuglément",
        description: "La checklist critique pour évaluer tout code généré par une IA",
        blocks: [
          { type: 'text', content: "Copier-coller du code sans le comprendre était risqué sur Stack Overflow. Avec l'IA, le volume de code généré est tellement plus grand que le risque est multiplié. Chaque ligne que vous committez — qu'elle vienne de vous ou d'une IA — vous appartient. Vous en êtes responsable." },
          { type: 'warning', content: "Cas réel : un développeur colle du code IA en production. Le code fonctionne. Six mois plus tard, une dépendance a une CVE critique. L'audit révèle que le code n'a jamais été relu. Résultat : incident de sécurité, données exposées." },
          { type: 'code', content: '# Checklist avant tout commit de code IA\n□ Lu entièrement — chaque ligne, pas juste le résultat\n□ Compris — si une ligne est floue, demandez l\'explication\n□ Testé en isolation — pas directement en production\n□ Dépendances vérifiées — version, licence, CVE connues\n□ Hallucinations chassées — fonctions qui n\'existent pas\n□ Tests lancés — le code IA peut casser l\'existant\n□ Edge cases ajoutés — l\'IA oublie souvent null/undefined', label: 'Checklist validation code IA' },
          { type: 'tip', content: "Astuce : demandez à l'IA de critiquer son propre code. \"Quels sont les problèmes potentiels dans le code que tu viens de générer ?\" La réponse est souvent révélatrice." },
        ],
        exercise: {
          instruction: "Consultez la checklist complète avec `ai-help validate`",
          hint: 'Tapez: ai-help validate',
          validate: validateAiHelpValidate,
          successMessage: "Excellente posture. Cette checklist doit devenir un réflexe. Passons au workflow de debug assisté.",
        },
      },
      {
        id: 'ia-dev-debug',
        title: "Déboguer avec l'IA — workflow pratique",
        description: "Transformez l'IA en partenaire de debug efficace avec la bonne méthode",
        blocks: [
          { type: 'text', content: "Le debug assisté par IA est l'un des cas d'usage les plus puissants — et les plus mal utilisés. La plupart des développeurs collent juste l'erreur et attendent. Les développeurs efficaces préparent un contexte complet qui permet à l'IA de diagnostiquer précisément." },
          { type: 'code', content: '# Workflow de debug assisté\n# 1. Isolez le problème\ngit stash          # revenez à un état stable\ngit bisect start   # trouvez quel commit a introduit le bug\n# 2. Reproduisez de façon minimale\n# Créez le plus petit exemple qui reproduit le bug\n# 3. Collectez le contexte\ncat package.json | grep -E "react|typescript|vite"\n# 4. Collez à l\'IA\n"Stack trace complète + code minimal + versions + contexte"', label: 'Préparation du contexte de debug', contentByEnv: { windows: '# Workflow de debug — PowerShell\ngit stash\ngit bisect start\nGet-Content package.json | Select-String "react|typescript|vite"' } },
          { type: 'code', content: '# Anti-pattern vs pattern efficace\n# ✗ Prompt inutile :\n"Mon app plante"\n# ✓ Prompt efficace :\n"TypeError: Cannot read properties of null (reading \'data\')\nà la ligne 89 de useAuth.tsx. Reproductible quand :\n- l\'utilisateur se déconnecte pendant une requête en cours\nStack : React 18.3, Supabase 2.x, TypeScript 5.4\nVoici le hook complet : [code]"', label: 'Anti-pattern vs pattern efficace' },
          { type: 'info', content: "Si l'IA ne résout pas en 2 itérations, changez d'angle : demandez-lui d'expliquer pourquoi le bug existe plutôt que de donner un correctif. La compréhension mène souvent à la solution." },
        ],
        exercise: {
          instruction: "Consultez le workflow de debug avec `ai-help debug`",
          hint: 'Tapez: ai-help debug',
          validate: validateAiHelpDebug,
          successMessage: "Workflow de debug maîtrisé. Avant de continuer : une leçon critique sur la sécurité.",
        },
      },
      {
        id: 'ia-dev-securite',
        title: "Sécurité & IA — ce qu'il ne faut jamais partager",
        description: "Les règles absolues pour utiliser l'IA sans compromettre votre sécurité",
        blocks: [
          { type: 'text', content: "Utiliser une IA cloud, c'est envoyer du texte à un serveur distant. La plupart des providers ont des politiques de confidentialité solides — mais la règle de base reste la même qu'avec tout service externe : ne jamais envoyer ce que vous ne voudriez pas voir fuiter." },
          { type: 'warning', content: "Données interdites à envoyer à une IA cloud : clés API, tokens, mots de passe, fichiers .env, données personnelles clients (RGPD), code source propriétaire sous NDA, données de production (logs avec IPs, exports DB)." },
          { type: 'code', content: '# Anonymisation avant d\'envoyer\n# ✗ Ne jamais envoyer :\nconst supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."\nconst dbUrl = "postgresql://user:password@host:5432/db"\n# ✓ Anonymisez toujours :\nconst supabaseKey = "YOUR_SUPABASE_ANON_KEY"\nconst dbUrl = "YOUR_DATABASE_URL"\n# ✗ Données personnelles :\n{ "email": "jean.dupont@client.com" }\n# ✓ Anonymisées :\n{ "email": "user@example.com" }', label: "Règles d'anonymisation" },
          { type: 'info', content: "Pour les entreprises et données très sensibles : des IA locales existent (Ollama + Llama, LM Studio). Elles tournent entièrement sur votre machine, sans envoi de données vers l'extérieur.", contentByEnv: { windows: "Sur Windows, Ollama s'installe via winget : `winget install Ollama.Ollama`. LM Studio propose une interface graphique complète. Les deux fonctionnent sans connexion internet une fois les modèles téléchargés." } },
        ],
        exercise: {
          instruction: "Révisez les règles de sécurité avec `ai-help security`",
          hint: 'Tapez: ai-help security',
          validate: validateAiHelpSecurity,
          successMessage: "Règles de sécurité acquises. Maintenant : l'outil qui incarne ce module — Claude Code CLI.",
        },
      },
      {
        id: 'ia-dev-claude-cli',
        title: "Claude Code CLI — l'IA dans le terminal",
        description: "Découvrez le workflow terminal-first avec un agent IA agentique",
        blocks: [
          { type: 'text', content: "Claude Code est un agent IA qui vit dans votre terminal. Contrairement aux chatbots web, il peut lire vos fichiers, exécuter des commandes, analyser votre git history et modifier votre code — tout en expliquant chaque action. C'est l'incarnation du workflow terminal-first." },
          { type: 'code', content: '# Installation\nnpm install -g @anthropic-ai/claude-code\n\n# Session interactive\nclaude\n\n# Question directe\nclaude "Qu\'est-ce que fait ce fichier ?"\n\n# Mode non-interactif (scripts, CI)\nclaude --print "Génère un README pour ce projet"\n\n# Combiner avec Unix\ngit diff HEAD~1 | claude "Revue de code"\ncat error.log | claude "Analyse ces erreurs"', label: 'Commandes Claude Code essentielles', contentByEnv: { windows: '# Installation (PowerShell)\nnpm install -g @anthropic-ai/claude-code\nclaude\ngit diff HEAD~1 | claude "Revue de code"\nGet-Content error.log | claude "Analyse ces erreurs"' } },
          { type: 'code', content: '# Workflows puissants\ngrep -r "TypeError" src/ | claude "Identifie les patterns"\nclaude "Génère les tests Vitest pour src/auth.ts"\nclaude "Explique l\'architecture de ce projet"\nclaude "Migre ce composant de class à function component"', label: 'Workflows avancés' },
          { type: 'tip', content: "Claude Code a accès à votre système de fichiers et peut exécuter des commandes. Pour les opérations destructives (suppression, réécriture), il demande toujours une confirmation. Ne désactivez jamais cette confirmation en production." },
        ],
        exercise: {
          instruction: "Explorez le workflow Claude Code avec `ai-help claude-cli`",
          hint: 'Tapez: ai-help claude-cli',
          validate: validateAiHelpClaudeCli,
          successMessage: "Vous connaissez maintenant l'outil qui a contribué à construire cette plateforme. Passons aux parcours métier.",
        },
      },
      {
        id: 'ia-dev-metiers',
        title: "L'IA par parcours métier",
        description: "Applications concrètes selon votre rôle : DevOps, fullstack, sysadmin, enseignant, étudiant",
        blocks: [
          { type: 'text', content: "L'IA n'est pas utilisée de la même façon selon le métier. Un DevOps l'utilise pour de l'infrastructure as code. Un enseignant pour générer des exercices. Un développeur fullstack pour accélérer les PR. Voici les cas d'usage concrets par rôle." },
          { type: 'code', content: '# DevOps / SRE\nclaude "Génère un Dockerfile optimisé pour Node.js 20 + non-root user"\ncat alert.log | claude "Identifie la cause racine et propose un runbook"\nclaude "Écris un script bash pour nettoyer les images Docker orphelines"\nclaude "Identifie les vulnérabilités dans ce workflow GitHub Actions"', label: "DevOps — cas d'usage", contentByEnv: { windows: '# DevOps / SRE — PowerShell\nclaude "Génère un Dockerfile optimisé pour Node.js 20"\nGet-Content alert.log | claude "Identifie la cause racine"\nclaude "Écris un script PowerShell pour nettoyer les images Docker"' } },
          { type: 'code', content: '# Développeur Fullstack\nclaude "Génère l\'endpoint REST POST /users avec validation Zod,\ngestion d\'erreur et tests Vitest"\ngit diff main...feature/auth | claude "Revue de code + sécurité"\n\n# Enseignant / Formateur\nclaude "Crée 5 exercices progressifs sur grep pour débutants Linux,\navec corrigés et erreurs fréquentes"\n\n# Étudiant en reconversion\n# Demandez l\'explication du POURQUOI, pas juste la solution', label: 'Fullstack + Enseignant + Étudiant' },
          { type: 'info', content: "Pour les étudiants en reconversion : demandez à l'IA d'expliquer pourquoi une solution est préférable à une autre. C'est la différence entre apprendre et copier." },
        ],
        exercise: {
          instruction: "Explorez les parcours métier avec `ai-help careers`",
          hint: 'Tapez: ai-help careers',
          validate: validateAiHelpCareers,
          successMessage: "Vision métier de l'IA acquise. Avant la synthèse finale, la leçon la plus importante : la posture senior.",
        },
      },
      {
        id: 'ia-dev-posture',
        title: "Posture senior : l'IA comme amplificateur",
        description: "Ce que l'IA n'apprend pas à votre place — et pourquoi les fondamentaux restent essentiels",
        blocks: [
          { type: 'text', content: "Il y a une illusion dangereuse : avec l'IA, on n'aurait plus besoin d'apprendre les fondamentaux. C'est faux. Un développeur junior qui utilise l'IA produit du code plus rapidement — du code qu'il ne comprend pas. La dette technique s'accumule jusqu'à l'incident." },
          { type: 'code', content: '# La différence n\'est pas dans l\'outil\n# Junior avec IA :\n"Génère-moi un système d\'auth"\n→ Colle sans lire → fonctionne en dev → CVE en prod\n\n# Senior avec IA :\n"Génère l\'auth avec PKCE, JWT rotation 15min,\nblacklist Redis, rate limiting 5 tentatives/min.\nExplique chaque choix de sécurité."\n→ Relit chaque ligne → comprend les trade-offs\n→ Adapte au contexte → revue de pair avant merge', label: 'Junior vs Senior avec IA' },
          { type: 'code', content: '# Ce que l\'IA n\'apprend pas à votre place\n✗ Lire et comprendre un codebase inconnu de 50k lignes\n✗ Anticiper les problèmes de scalabilité à 1M d\'utilisateurs\n✗ Arbitrer les trade-offs techniques sous contrainte\n✗ Communiquer une décision technique à un client non-tech\n✗ Faire des revues de code qui forment les juniors\n✗ Prendre la responsabilité d\'une architecture sur 5 ans\n# Ces compétences viennent de la pratique et des erreurs\n# — et des 10 modules que vous venez de terminer.', label: "Compétences non-délégables à l'IA" },
          { type: 'info', content: "Terminal Learning a été construit par un autodidacte avec l'IA — pas par l'IA toute seule. Chaque décision d'architecture, chaque choix de sécurité : humain. L'IA a implémenté, suggéré, accéléré. L'humain a décidé, validé, corrigé. C'est la posture." },
        ],
        exercise: {
          instruction: "Intériorisez la posture senior avec `ai-help senior`",
          hint: 'Tapez: ai-help senior',
          validate: validateAiHelpSenior,
          successMessage: "Posture acquise. Dernière leçon : le workflow complet du brief au déploiement.",
        },
      },
      {
        id: 'ia-dev-workflow',
        title: "Workflow complet — du brief au déploiement avec l'IA",
        description: "Synthèse : le cycle de vie complet d'un projet avec l'IA comme partenaire",
        blocks: [
          { type: 'text', content: "Vous avez maintenant toutes les pièces. Cette leçon les assemble dans un workflow complet — de la première conversation client jusqu'au monitoring en production. C'est le workflow que les développeurs seniors utilisent avec l'IA en 2026." },
          { type: 'code', content: '# Cycle complet d\'un projet avec IA\n# 1. BRIEF\nclaude "Pose-moi les questions pour clarifier les specs."\n# 2. ARCHITECTURE\nclaude "Propose une architecture pour [description]. Stack : [stack]."\n# 3. IMPLÉMENTATION\n# IA génère → vous relisez → vous testez → vous committez\ngit add -p  # toujours réviser avant de stager\n# 4. REVUE\ngit diff main | claude "Revue : sécurité, perf, lisibilité"\n# 5. TESTS\nclaude "Génère les tests pour [fichier] avec edge cases."', label: 'Étapes 1–5 : brief à tests', contentByEnv: { windows: '# Même workflow sous PowerShell\ngit diff main | claude "Revue : sécurité, perf, lisibilité"\ngit add -p  # fonctionne identiquement dans Git Bash ou PowerShell' } },
          { type: 'code', content: '# 6. CI/CD\n# Si le pipeline échoue :\ngh run view --log-failed | claude "Explique et corrige"\n# 7. DÉPLOIEMENT\nclaude "Checklist de déploiement pour [type de projet]"\n# 8. MONITORING\n# Si une alerte Sentry arrive :\nclaude "Analyse cette stack trace : [trace anonymisée]"\n\n# Votre IA ne remplace pas votre expertise.\n# Elle la rend 5× plus rapide.', label: 'Étapes 6–8 : CI/CD à monitoring' },
          { type: 'tip', content: "Vous venez de terminer les 11 modules de Terminal Learning. Du terminal de base à l'IA professionnelle. Vous avez le profil d'un développeur autonome en 2026." },
        ],
        exercise: {
          instruction: "Consultez le workflow complet avec `ai-help workflow`",
          hint: 'Tapez: ai-help workflow',
          validate: validateAiHelpWorkflow,
          successMessage: "Félicitations — vous avez terminé l'intégralité du curriculum Terminal Learning. 11 modules, du terminal de base à l'IA professionnelle. Vous êtes prêt.",
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
