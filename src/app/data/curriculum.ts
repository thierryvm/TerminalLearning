export type BlockType = 'text' | 'code' | 'tip' | 'warning' | 'info';

export interface ContentBlock {
  type: BlockType;
  content: string;
  label?: string;
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return ['get-location', 'gl', 'pwd'].includes(c);
            return c === 'pwd';
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^(get-childitem|gci|dir|ls)(\s.*)?$/.test(c);
            return /^ls(\s.*)?$/.test(c);
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^(get-childitem|gci|dir)\s+(-force|-hidden)/.test(c) || /^ls\s+(-la|-al)$/.test(c);
            return /^ls\s+(-la|-al|-a -l|-l -a)$/.test(c);
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return ['cd documents', 'set-location documents', 'sl documents'].includes(c);
            return c === 'cd documents';
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^(mkdir|md|new-item|ni)\s+.*test/.test(c);
            return /^mkdir\s+(-p\s+)?test$/.test(c);
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^(new-item|ni)\s+.*memo\.txt/.test(c) || c === 'touch memo.txt';
            return c === 'touch memo.txt';
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^(copy-item|cpi|copy|cp)\s+documents\/notes\.txt\s+documents\/notes-copy\.txt/.test(c);
            return c === 'cp documents/notes.txt documents/notes-copy.txt';
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^(move-item|mi|move|mv)\s+documents\/rapport\.md\s+documents\/rapport-final\.md/.test(c);
            return c === 'mv documents/rapport.md documents/rapport-final.md';
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^(remove-item|ri|del|erase|rm)\s+documents\/notes\.txt/.test(c);
            return c === 'rm documents/notes.txt';
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^(get-content|gc|cat|type)\s+documents\/notes\.txt/.test(c);
            return c === 'cat documents/notes.txt';
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /get-content.+rapport\.md.*select-object.*-first\s+3/.test(c) || c === 'head -n 3 documents/rapport.md';
            return c === 'head -n 3 documents/rapport.md';
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^(select-string|sls)\s+["']?important["']?\s+documents\/notes\.txt/.test(c) || /^grep\s+["']?important["']?\s+documents\/notes\.txt/.test(c);
            return /^grep\s+(-\w+\s+)*["']?important["']?\s+documents\/notes\.txt$/.test(c);
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /\(get-content.+rapport\.md\)\.count/.test(c) || c === 'wc -l documents/rapport.md';
            return c === 'wc -l documents/rapport.md';
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^(get-acl|ls -l|icacls)/.test(c);
            return c === 'ls -l';
          },
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
          instructionByEnv: {
            windows: 'Sur Windows, définissez la politique d\'exécution avec `Set-ExecutionPolicy RemoteSigned`.',
          },
          hint: 'Tapez "chmod +x projets/script.sh"',
          hintByEnv: {
            windows: 'Tapez "Set-ExecutionPolicy RemoteSigned" (requis pour exécuter des scripts PS1)',
          },
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^set-executionpolicy\s+(remotesigned|unrestricted|bypass)/.test(c) || /^chmod\s+(\+x|755)\s+projets\/script\.sh/.test(c);
            return /^chmod\s+(\+x|755|u\+x)\s+projets\/script\.sh$/.test(c);
          },
          successMessage: 'Super ! Vous maîtrisez les permissions d\'exécution.',
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^(get-process|gps|tasklist|ps)(\s.*)?$/.test(c);
            return /^ps(\s+.*)?$/.test(c);
          },
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
          instruction: 'Affichez la liste des processus avec `ps aux` pour voir tous les processus.',
          instructionByEnv: {
            windows: 'Arrêtez un processus par son nom avec `Stop-Process -Name node`.',
          },
          hint: 'Tapez "ps aux" pour la liste complète',
          hintByEnv: {
            windows: 'Tapez "Stop-Process -Name node" (remplace "kill" en PowerShell)',
          },
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^(stop-process|spps|taskkill)(\s.*)?$/.test(c) || /^ps(\s.*)?$/.test(c);
            return /^ps(\s+.*)?$/.test(c);
          },
          successMessage: 'Bien ! Vous savez maintenant surveiller et contrôler les processus.',
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
          validate: (cmd, env) => {
            const c = cmd.trim();
            if (env === 'windows') return /^(write-output|write-host|echo)\s+["']?Bonjour le monde!?["']?\s*>\s*bonjour\.txt$/i.test(c);
            return /^echo\s+["']?Bonjour le monde!?["']?\s+>\s+bonjour\.txt$/.test(c);
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^(get-childitem|dir|ls)\s*\|\s*(measure-object|measure)/.test(c) || c === 'ls | wc -l';
            return c === 'ls | wc -l';
          },
          successMessage: 'Bravo ! Vous maîtrisez maintenant les pipes — l\'essence de la ligne de commande.',
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
          validate: (cmd, env) => {
            const c = cmd.trim();
            if (env === 'windows') return /^\$env:[A-Za-z_]\w*\s*=\s*.+/.test(c);
            return /^export\s+[A-Za-z_]\w*=.+/.test(c);
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return c === 'echo $env:path' || c === '$env:path';
            return c === 'echo $path';
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'macos') return c === 'cat ~/.zshrc';
            if (env === 'windows') return /^(cat|get-content|gc)\s+\$profile$/i.test(c);
            return c === 'cat ~/.bashrc';
          },
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
            content: '# .env — NE PAS COMMITTER\nDB_HOST=localhost\nDB_PORT=5432\nDB_NAME=myapp\nDB_USER=admin\nDB_PASSWORD=secret123\nAPI_KEY=sk-abc123xyz456\nNODE_ENV=development',
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^(get-content|gc|cat)\s+\.env$/.test(c);
            return c === 'cat .env';
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^\.(\\|\/)script\.sh$/.test(c) || /^bash\s+script\.sh$/.test(c);
            return c === './script.sh' || c === 'bash script.sh';
          },
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
          validate: (cmd) => cmd.trim().toLowerCase() === 'crontab -l',
          successMessage: 'Parfait ! Vous savez maintenant lister vos tâches planifiées.',
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
