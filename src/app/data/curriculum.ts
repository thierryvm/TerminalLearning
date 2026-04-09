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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^set-executionpolicy\s+(remotesigned|unrestricted|bypass)/.test(c) || /^chmod\s+(\+x|755)\s+projets\/script\.sh/.test(c);
            return /^chmod\s+(\+x|755|u\+x)\s+projets\/script\.sh$/.test(c);
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^(get-acl|get-item)\s+/.test(c) || c === 'ls -la';
            return /^ls\s+(-la|-al)$/.test(c) || /^ls\s+-l/.test(c);
          },
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
          },
          validate: (cmd) => {
            const c = cmd.trim().toLowerCase();
            return c === 'whoami' || c === 'sudo whoami';
          },
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
            windows: 'Tapez: Get-Acl $HOME',
          },
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^(get-acl|icacls)\s+/.test(c) || c === 'ls -la';
            return /^ls(\s+(-la|-al|-l|-a))?/.test(c);
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^(stop-process|spps|taskkill|get-process|gps|ps)(\s.*)?$/.test(c);
            return /^ps(\s+.*)?$/.test(c);
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /^get-process\s*\|/.test(c) || /^(get-process|gps|ps)\s/.test(c);
            if (env === 'macos') return /^ps\s+aux/.test(c) || /^top/.test(c);
            return /^ps\s+aux/.test(c) || /^top/.test(c);
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return c === 'get-job' || c === 'jobs';
            return c === 'jobs';
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /2>\s*(erreurs|errors|err)/.test(c) || /2>\$null/.test(c);
            return /2>/.test(c);
          },
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
          validate: (cmd, env) => {
            const c = cmd.trim().toLowerCase();
            if (env === 'windows') return /tee-object/.test(c) || /\|\s*tee/.test(c);
            return /\|\s*tee/.test(c);
          },
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
