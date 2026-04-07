import type { CategoryMeta, EnrichedCommand, EnvironmentId } from '../types/curriculum';

/**
 * Structured command catalogue for Terminal Learning.
 *
 * Source: terminal-learning-catalogue-commandes-v2.json
 * Each category contains enriched commands with multi-environment
 * variants, prerequisites, unlocking logic, and exercise ideas.
 *
 * Categories map 1:1 to curriculum modules via their `id`.
 */
export const commandCatalogue: CategoryMeta[] = [
  // ─── LEVEL 1 — FUNDAMENTALS ───────────────────────────────

  {
    id: 'navigation',
    label: 'Navigation',
    level: 1,
    prerequisites: [],
    unlocks: ['fichiers', 'lecture', 'search'],
    exerciseIdeas: [
      'Se déplacer dans une arborescence simple',
      'Revenir au dossier parent',
      'Lister les fichiers cachés',
      'Aller au dossier personnel',
    ],
    commands: [
      {
        id: 'pwd',
        name: 'pwd',
        category: 'navigation',
        level: 1,
        recommendedFor: ['linux', 'macos'],
        variants: [
          { environment: 'windows', command: 'Get-Location', shell: 'PowerShell' },
          { environment: 'windows', command: 'cd', shell: 'CMD' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'pwd',
        summary: 'Afficher le dossier courant',
        examples: ['pwd'],
        commonErrors: [],
      },
      {
        id: 'ls',
        name: 'ls',
        category: 'navigation',
        level: 1,
        recommendedFor: ['linux', 'macos'],
        variants: [
          { environment: 'windows', command: 'Get-ChildItem', shell: 'PowerShell' },
          { environment: 'windows', command: 'dir', shell: 'CMD' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'ls [options] [chemin]',
        summary: "Lister le contenu d'un dossier",
        examples: ['ls', 'ls -la'],
        commonErrors: ["Confondre ls et dir selon l'environnement"],
      },
      {
        id: 'cd',
        name: 'cd',
        category: 'navigation',
        level: 1,
        recommendedFor: ['linux', 'macos', 'windows'],
        variants: [],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'cd chemin',
        summary: 'Changer de dossier',
        examples: ['cd Documents', 'cd ..', 'cd ~'],
        commonErrors: ['Chemin relatif/absolu incorrect'],
      },
      {
        id: 'clear_cls',
        name: 'clear / cls',
        category: 'navigation',
        level: 1,
        recommendedFor: ['linux', 'macos', 'windows'],
        variants: [
          { environment: 'linux', command: 'clear' },
          { environment: 'macos', command: 'clear' },
          { environment: 'windows', command: 'cls' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'clear | cls',
        summary: 'Nettoyer le terminal',
        examples: ['clear', 'cls'],
        commonErrors: [],
      },
    ],
  },

  {
    id: 'fichiers',
    label: 'Fichiers & Dossiers',
    level: 1,
    prerequisites: ['navigation'],
    unlocks: ['permissions', 'git', 'docker'],
    exerciseIdeas: [
      'Créer une structure de projet',
      'Déplacer un fichier dans le bon dossier',
      'Renommer plusieurs fichiers',
      'Supprimer un fichier avec confirmation',
    ],
    commands: [
      {
        id: 'mkdir',
        name: 'mkdir',
        category: 'fichiers',
        level: 1,
        recommendedFor: ['linux', 'macos', 'windows'],
        variants: [],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'mkdir dossier',
        summary: 'Créer un dossier',
        examples: ['mkdir projet', 'mkdir -p projets/web/css'],
        commonErrors: [],
      },
      {
        id: 'touch',
        name: 'touch',
        category: 'fichiers',
        level: 1,
        recommendedFor: ['linux', 'macos'],
        variants: [
          { environment: 'windows', command: 'New-Item fichier.txt -ItemType File', shell: 'PowerShell' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'touch fichier.txt',
        summary: 'Créer un fichier vide',
        examples: ['touch notes.txt'],
        commonErrors: [],
      },
      {
        id: 'cp',
        name: 'cp / Copy-Item / copy',
        category: 'fichiers',
        level: 1,
        recommendedFor: ['linux', 'macos', 'windows'],
        variants: [
          { environment: 'linux', command: 'cp source dest' },
          { environment: 'macos', command: 'cp source dest' },
          { environment: 'windows', command: 'Copy-Item source dest', shell: 'PowerShell' },
          { environment: 'windows', command: 'copy source dest', shell: 'CMD' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'cp source destination',
        summary: 'Copier un fichier ou dossier',
        examples: ['cp a.txt b.txt', 'cp -r dossier backup/'],
        commonErrors: ['Oublier -r pour un dossier sous Unix'],
      },
      {
        id: 'mv',
        name: 'mv / Move-Item / move / ren',
        category: 'fichiers',
        level: 1,
        recommendedFor: ['linux', 'macos', 'windows'],
        variants: [
          { environment: 'linux', command: 'mv source dest' },
          { environment: 'macos', command: 'mv source dest' },
          { environment: 'windows', command: 'Move-Item source dest', shell: 'PowerShell' },
          { environment: 'windows', command: 'move source dest', shell: 'CMD' },
          { environment: 'windows', command: 'ren ancien nouveau', shell: 'CMD' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'mv source destination',
        summary: 'Déplacer ou renommer',
        examples: ['mv notes.txt archive/notes.txt'],
        commonErrors: [],
      },
      {
        id: 'rm',
        name: 'rm / Remove-Item / del',
        category: 'fichiers',
        level: 1,
        recommendedFor: ['linux', 'macos', 'windows'],
        variants: [
          { environment: 'linux', command: 'rm fichier.txt' },
          { environment: 'macos', command: 'rm fichier.txt' },
          { environment: 'windows', command: 'Remove-Item fichier.txt', shell: 'PowerShell' },
          { environment: 'windows', command: 'del fichier.txt', shell: 'CMD' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'rm fichier.txt',
        summary: 'Supprimer un fichier',
        examples: ['rm notes.txt', 'rm -r dossier/'],
        commonErrors: [
          'Confondre suppression fichier et dossier',
          'Utiliser rm -rf sans comprendre',
        ],
      },
    ],
  },

  {
    id: 'lecture',
    label: 'Lecture de fichiers',
    level: 1,
    prerequisites: ['navigation', 'fichiers'],
    unlocks: ['search', 'logs', 'ssh_vps'],
    exerciseIdeas: [
      'Lire un fichier long sans tout imprimer',
      "Afficher le début d'un log",
      'Suivre un log en direct',
    ],
    commands: [
      {
        id: 'cat',
        name: 'cat / Get-Content / type',
        category: 'lecture',
        level: 1,
        recommendedFor: ['linux', 'macos', 'windows'],
        variants: [
          { environment: 'linux', command: 'cat fichier.txt' },
          { environment: 'macos', command: 'cat fichier.txt' },
          { environment: 'windows', command: 'Get-Content fichier.txt', shell: 'PowerShell' },
          { environment: 'windows', command: 'type fichier.txt', shell: 'CMD' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'cat fichier.txt',
        summary: "Afficher le contenu d'un fichier",
        examples: ['cat notes.txt'],
        commonErrors: [],
      },
      {
        id: 'less_more',
        name: 'less / more',
        category: 'lecture',
        level: 1,
        recommendedFor: ['linux', 'macos', 'windows'],
        variants: [
          { environment: 'linux', command: 'less fichier.txt' },
          { environment: 'macos', command: 'less fichier.txt' },
          { environment: 'windows', command: 'more fichier.txt', shell: 'CMD' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'less fichier.txt',
        summary: 'Lire un fichier page par page',
        examples: ['less log.txt'],
        commonErrors: [],
      },
      {
        id: 'head_tail',
        name: 'head / tail',
        category: 'lecture',
        level: 1,
        recommendedFor: ['linux', 'macos'],
        variants: [
          { environment: 'windows', command: 'Get-Content fichier.txt -TotalCount 10', shell: 'PowerShell' },
          { environment: 'windows', command: 'Get-Content fichier.txt -Tail 10', shell: 'PowerShell' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'head -n 10 fichier.txt | tail -n 10 fichier.txt',
        summary: "Voir le début ou la fin d'un fichier",
        examples: ['head -n 5 notes.txt', 'tail -f app.log'],
        commonErrors: [],
      },
    ],
  },

  {
    id: 'search',
    label: 'Recherche & Inspection',
    level: 1,
    prerequisites: ['lecture'],
    unlocks: ['logs', 'processes', 'network'],
    exerciseIdeas: [
      'Trouver un fichier .txt',
      'Rechercher un mot dans plusieurs fichiers',
      "Compter les lignes d'un fichier",
    ],
    commands: [
      {
        id: 'grep',
        name: 'grep / Select-String',
        category: 'search',
        level: 1,
        recommendedFor: ['linux', 'macos', 'windows'],
        variants: [
          { environment: 'linux', command: 'grep motif fichier.txt' },
          { environment: 'macos', command: 'grep motif fichier.txt' },
          { environment: 'windows', command: 'Select-String -Pattern motif -Path fichier.txt', shell: 'PowerShell' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'grep motif fichier.txt',
        summary: 'Chercher un motif dans un fichier',
        examples: ['grep error app.log', 'grep -rn "TODO" src/'],
        commonErrors: ['Motif non cité', 'Mauvais chemin'],
      },
      {
        id: 'find',
        name: 'find / where',
        category: 'search',
        level: 1,
        recommendedFor: ['linux', 'macos', 'windows'],
        variants: [
          { environment: 'linux', command: "find . -name '*.txt'" },
          { environment: 'macos', command: "find . -name '*.txt'" },
          { environment: 'windows', command: 'where nomcommande', shell: 'CMD' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'find . -name motif',
        summary: 'Trouver des fichiers ou commandes',
        examples: ['find . -name notes.txt'],
        commonErrors: [],
      },
      {
        id: 'wc',
        name: 'wc',
        category: 'search',
        level: 1,
        recommendedFor: ['linux', 'macos'],
        variants: [
          {
            environment: 'windows',
            command: '(Get-Content fichier.txt | Measure-Object -Line -Word -Character)',
            shell: 'PowerShell',
          },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'wc fichier.txt',
        summary: 'Compter lignes, mots et caractères',
        examples: ['wc notes.txt', 'wc -l *.ts'],
        commonErrors: [],
      },
    ],
  },

  // ─── LEVEL 2 — DAILY USE ─────────────────────────────────

  {
    id: 'permissions',
    label: 'Permissions & Utilisateurs',
    level: 2,
    prerequisites: ['navigation', 'fichiers', 'lecture'],
    unlocks: ['shell_scripts', 'ssh_vps', 'docker', 'security_basics'],
    exerciseIdeas: [
      'Rendre un script exécutable',
      'Comprendre 755 et 644',
      'Voir qui possède un fichier',
      'Corriger des permissions incorrectes',
    ],
    commands: [
      {
        id: 'chmod',
        name: 'chmod',
        category: 'permissions',
        level: 2,
        recommendedFor: ['linux', 'macos'],
        variants: [
          { environment: 'windows', command: 'icacls fichier /grant User:F', shell: 'CMD' },
          { environment: 'windows', command: 'Set-Acl', shell: 'PowerShell' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'chmod mode fichier',
        summary: "Modifier les permissions d'un fichier",
        examples: ['chmod 755 script.sh', 'chmod +x script.sh'],
        commonErrors: ['Confondre octal et symbolique', 'Oublier -R pour un dossier'],
      },
      {
        id: 'chown',
        name: 'chown',
        category: 'permissions',
        level: 2,
        recommendedFor: ['linux', 'macos'],
        variants: [
          { environment: 'windows', command: 'icacls fichier /setowner User', shell: 'CMD' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'chown utilisateur:groupe fichier',
        summary: "Changer le propriétaire d'un fichier",
        examples: ['chown user:staff fichier.txt', 'chown -R www-data:www-data /var/www'],
        commonErrors: ['Oublier sudo', 'Mauvais format utilisateur:groupe'],
      },
      {
        id: 'whoami',
        name: 'whoami',
        category: 'permissions',
        level: 2,
        recommendedFor: ['linux', 'macos', 'windows'],
        variants: [],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'whoami',
        summary: "Afficher l'utilisateur courant",
        examples: ['whoami'],
        commonErrors: [],
      },
      {
        id: 'id',
        name: 'id',
        category: 'permissions',
        level: 2,
        recommendedFor: ['linux', 'macos'],
        variants: [
          { environment: 'windows', command: 'whoami /groups', shell: 'CMD' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'id [utilisateur]',
        summary: "Afficher l'identité et les groupes",
        examples: ['id', 'id root'],
        commonErrors: [],
      },
    ],
  },

  {
    id: 'processus',
    label: 'Processus & Tâches',
    level: 2,
    prerequisites: ['navigation', 'fichiers'],
    unlocks: ['ssh_vps', 'docker', 'sysadmin'],
    exerciseIdeas: [
      'Lister les processus',
      "Suivre l'activité CPU",
      'Arrêter un processus bloqué',
      "Gérer une tâche en arrière-plan",
    ],
    commands: [
      {
        id: 'ps',
        name: 'ps / tasklist / Get-Process',
        category: 'processus',
        level: 2,
        recommendedFor: ['linux', 'macos', 'windows'],
        variants: [
          { environment: 'linux', command: 'ps aux' },
          { environment: 'macos', command: 'ps aux' },
          { environment: 'windows', command: 'tasklist', shell: 'CMD' },
          { environment: 'windows', command: 'Get-Process', shell: 'PowerShell' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'ps [options]',
        summary: 'Lister les processus en cours',
        examples: ['ps', 'ps aux'],
        commonErrors: [],
      },
      {
        id: 'kill',
        name: 'kill / taskkill / Stop-Process',
        category: 'processus',
        level: 2,
        recommendedFor: ['linux', 'macos', 'windows'],
        variants: [
          { environment: 'linux', command: 'kill PID' },
          { environment: 'macos', command: 'kill PID' },
          { environment: 'windows', command: 'taskkill /PID 1234', shell: 'CMD' },
          { environment: 'windows', command: 'Stop-Process -Id 1234', shell: 'PowerShell' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'kill [signal] PID',
        summary: 'Arrêter un processus',
        examples: ['kill 1234', 'kill -9 1234'],
        commonErrors: ['Mauvais PID', 'Oublier sudo pour un processus système'],
      },
      {
        id: 'top_htop',
        name: 'top / htop',
        category: 'processus',
        level: 2,
        recommendedFor: ['linux', 'macos'],
        variants: [
          { environment: 'windows', command: 'tasklist', shell: 'CMD' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'top | htop',
        summary: "Monitorer l'activité système en temps réel",
        examples: ['top', 'htop'],
        commonErrors: [],
      },
    ],
  },

  {
    id: 'redirection',
    label: 'Pipes & Redirections',
    level: 2,
    prerequisites: ['navigation', 'fichiers', 'lecture'],
    unlocks: ['shell_scripts', 'logs_observability'],
    exerciseIdeas: [
      "Rediriger la sortie d'une commande vers un fichier",
      'Chaîner plusieurs commandes',
      'Séparer les erreurs',
      'Produire un petit rapport texte',
    ],
    commands: [
      {
        id: 'redirect_output',
        name: '> et >>',
        category: 'redirection',
        level: 2,
        recommendedFor: ['linux', 'macos', 'windows'],
        variants: [
          { environment: 'windows', command: 'Out-File', shell: 'PowerShell' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'commande > fichier | commande >> fichier',
        summary: 'Rediriger la sortie vers un fichier',
        examples: ['echo "hello" > output.txt', 'ls >> listing.txt'],
        commonErrors: ['Confondre > (écrase) et >> (ajoute)'],
      },
      {
        id: 'pipes',
        name: '|',
        category: 'redirection',
        level: 2,
        recommendedFor: ['linux', 'macos', 'windows'],
        variants: [],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'commande1 | commande2',
        summary: 'Chaîner les commandes entre elles',
        examples: ['ls | wc -l', 'cat log.txt | grep error', 'ps aux | grep node'],
        commonErrors: ['Confondre | et >'],
      },
      {
        id: 'tee',
        name: 'tee',
        category: 'redirection',
        level: 2,
        recommendedFor: ['linux', 'macos'],
        variants: [
          { environment: 'windows', command: 'Tee-Object', shell: 'PowerShell' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'commande | tee fichier',
        summary: 'Écrire dans un fichier ET afficher à l\'écran',
        examples: ['ls | tee listing.txt'],
        commonErrors: [],
      },
    ],
  },

  {
    id: 'archives',
    label: 'Archives & Compression',
    level: 2,
    prerequisites: ['fichiers'],
    unlocks: ['ssh_vps', 'docker'],
    exerciseIdeas: [
      'Créer une archive',
      'Extraire une archive',
      'Comparer zip et tar.gz',
    ],
    commands: [
      {
        id: 'tar',
        name: 'tar',
        category: 'archives',
        level: 2,
        recommendedFor: ['linux', 'macos'],
        variants: [
          { environment: 'windows', command: 'Compress-Archive', shell: 'PowerShell' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'tar [options] archive.tar.gz fichiers',
        summary: 'Créer ou extraire une archive tar',
        examples: ['tar -czf backup.tar.gz dossier/', 'tar -xzf backup.tar.gz'],
        commonErrors: ['Confondre -c (créer) et -x (extraire)', 'Oublier -z pour gzip'],
      },
      {
        id: 'zip_unzip',
        name: 'zip / unzip',
        category: 'archives',
        level: 2,
        recommendedFor: ['linux', 'macos', 'windows'],
        variants: [
          { environment: 'windows', command: 'Compress-Archive -Path src -DestinationPath dest.zip', shell: 'PowerShell' },
          { environment: 'windows', command: 'Expand-Archive -Path src.zip -DestinationPath dest', shell: 'PowerShell' },
        ],
        compatibility: ['linux', 'macos', 'windows'],
        syntax: 'zip archive.zip fichiers | unzip archive.zip',
        summary: 'Créer ou extraire une archive zip',
        examples: ['zip -r projet.zip dossier/', 'unzip projet.zip'],
        commonErrors: ['Oublier -r pour un dossier'],
      },
    ],
  },
];

// --- Helpers ---

export function getCategoryById(id: string): CategoryMeta | undefined {
  return commandCatalogue.find((c) => c.id === id);
}

export function getCommandById(commandId: string): EnrichedCommand | undefined {
  return commandCatalogue
    .flatMap((category) => category.commands)
    .find((cmd) => cmd.id === commandId);
}

export function getCommandsForEnvironment(
  categoryId: string,
  env: EnvironmentId,
): EnrichedCommand[] {
  const category = getCategoryById(categoryId);
  if (!category) return [];
  return category.commands.filter((c) => c.compatibility.includes(env));
}

export type { EnrichedCommand, EnvironmentId };
