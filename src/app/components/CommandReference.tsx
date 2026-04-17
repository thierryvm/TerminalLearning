import { useState } from 'react';
import { Search, Terminal, ChevronDown, ChevronRight } from 'lucide-react';
import { useEnvironment } from '../context/EnvironmentContext';
import type { EnvId } from '../data/curriculum';
import { usePageSEO } from '../hooks/useLessonSEO';
import { Button } from './ui/button';

interface CommandEntry {
  /** Command name shown — can be overridden per env */
  command: string;
  commandByEnv?: Partial<Record<EnvId, string>>;
  syntax: string;
  syntaxByEnv?: Partial<Record<EnvId, string>>;
  description: string;
  descriptionByEnv?: Partial<Record<EnvId, string>>;
  example: string;
  exampleByEnv?: Partial<Record<EnvId, string>>;
  category: string;
  /** If set, this entry is hidden when the active env is in this list */
  hideOn?: EnvId[];
  /** If set, this entry is ONLY shown on these envs */
  showOnly?: EnvId[];
}

const commands: CommandEntry[] = [
  // ── Navigation ──────────────────────────────────────────────────────────────
  {
    command: 'pwd',
    commandByEnv: { windows: 'Get-Location' },
    syntax: 'pwd',
    syntaxByEnv: { windows: 'Get-Location  (alias: gl)' },
    description: 'Affiche le répertoire de travail courant (chemin absolu)',
    descriptionByEnv: { windows: 'Affiche le répertoire de travail courant (chemin complet Windows)' },
    example: '$ pwd\n/home/user',
    exampleByEnv: {
      windows: 'PS> Get-Location\nPath\n----\nC:\\Users\\user\n\nPS> gl    # alias court',
    },
    category: 'Navigation',
  },
  {
    command: 'ls',
    commandByEnv: { windows: 'Get-ChildItem' },
    syntax: 'ls [options] [chemin]',
    syntaxByEnv: { windows: 'Get-ChildItem [chemin]  (alias: dir, ls, gci)' },
    description: 'Liste le contenu d\'un répertoire',
    example: '$ ls -la\ndrwxr-xr-x 2 user user 4096 documents\n-rw-r--r-- 1 user user  145 notes.txt',
    exampleByEnv: {
      windows: 'PS> Get-ChildItem\nMode   LastWriteTime   Length Name\n----   -------------   ------ ----\nd----  04/09/2026      <DIR>  documents\n-a---  04/09/2026        145  notes.txt\n\nPS> dir -Force   # afficher les fichiers cachés',
      macos: '$ ls -la\ntotal 24\ndrwxr-xr-x  5 user  staff  160 Apr  9 17:00 .\n-rw-r--r--  1 user  staff  145 Apr  9 17:00 notes.txt',
    },
    category: 'Navigation',
  },
  {
    command: 'cd',
    commandByEnv: { windows: 'Set-Location' },
    syntax: 'cd [chemin]',
    syntaxByEnv: { windows: 'Set-Location [chemin]  (alias: cd, sl)' },
    description: 'Change le répertoire courant. Sans argument, retourne dans ~',
    descriptionByEnv: { windows: 'Change le répertoire courant. Sans argument, retourne dans C:\\Users\\user' },
    example: '$ cd documents\n$ cd ..\n$ cd ~\n$ cd -   # répertoire précédent',
    exampleByEnv: {
      windows: 'PS> Set-Location documents\nPS> cd ..       # fonctionne aussi\nPS> cd ~        # répertoire utilisateur\nPS> cd C:\\Windows\\System32',
    },
    category: 'Navigation',
  },
  {
    command: 'tree',
    syntax: 'tree [chemin]',
    description: 'Affiche l\'arborescence de répertoires',
    example: '$ tree\n.\n├── documents\n│   └── notes.txt\n└── projets',
    exampleByEnv: {
      windows: 'PS> tree /F\nC:\\Users\\user\n├── documents\n│   └── notes.txt\n└── projets\n\n# /F : afficher les fichiers (pas seulement les dossiers)',
    },
    category: 'Navigation',
  },

  // ── Fichiers & Dossiers ─────────────────────────────────────────────────────
  {
    command: 'mkdir',
    commandByEnv: { windows: 'New-Item -ItemType Directory' },
    syntax: 'mkdir [-p] répertoire',
    syntaxByEnv: { windows: 'New-Item -ItemType Directory nom  (alias: mkdir, md)' },
    description: 'Crée un ou plusieurs répertoires. -p crée les parents si nécessaire',
    descriptionByEnv: { windows: 'Crée un ou plusieurs répertoires (mkdir fonctionne aussi en PowerShell)' },
    example: '$ mkdir mon-dossier\n$ mkdir -p projets/web/css',
    exampleByEnv: {
      windows: 'PS> mkdir mon-dossier\nPS> New-Item -ItemType Directory -Path projets\\web\\css -Force\n# -Force crée les dossiers parents si nécessaire',
    },
    category: 'Fichiers & Dossiers',
  },
  {
    command: 'touch',
    commandByEnv: { windows: 'New-Item' },
    syntax: 'touch fichier...',
    syntaxByEnv: { windows: 'New-Item [-ItemType File] nom  (alias: ni)' },
    description: 'Crée un fichier vide ou met à jour sa date de modification',
    descriptionByEnv: { windows: 'Crée un nouveau fichier vide' },
    example: '$ touch fichier.txt\n$ touch a.txt b.txt',
    exampleByEnv: {
      windows: 'PS> New-Item fichier.txt\nPS> ni a.txt      # alias ni\nPS> ni a.txt, b.txt, c.txt   # plusieurs fichiers',
    },
    category: 'Fichiers & Dossiers',
  },
  {
    command: 'cp',
    commandByEnv: { windows: 'Copy-Item' },
    syntax: 'cp [-r] source destination',
    syntaxByEnv: { windows: 'Copy-Item source destination  (alias: cp, copy, cpi)' },
    description: 'Copie un fichier ou un répertoire (-r pour les dossiers)',
    descriptionByEnv: { windows: 'Copie un fichier ou répertoire (-Recurse pour les dossiers)' },
    example: '$ cp src.txt dst.txt\n$ cp -r dossier/ sauvegarde/',
    exampleByEnv: {
      windows: 'PS> Copy-Item notes.txt notes-backup.txt\nPS> Copy-Item -Recurse dossier\\ sauvegarde\\',
    },
    category: 'Fichiers & Dossiers',
  },
  {
    command: 'mv',
    commandByEnv: { windows: 'Move-Item' },
    syntax: 'mv source destination',
    syntaxByEnv: { windows: 'Move-Item source destination  (alias: mv, move, mi)' },
    description: 'Déplace ou renomme un fichier ou répertoire',
    example: '$ mv ancien.txt nouveau.txt\n$ mv fichier.txt Documents/',
    exampleByEnv: {
      windows: 'PS> Move-Item ancien.txt nouveau.txt\nPS> Move-Item fichier.txt Documents\\',
    },
    category: 'Fichiers & Dossiers',
  },
  {
    command: 'rm',
    commandByEnv: { windows: 'Remove-Item' },
    syntax: 'rm [-rf] fichier...',
    syntaxByEnv: { windows: 'Remove-Item [-Recurse -Force] fichier  (alias: rm, del, ri)' },
    description: 'Supprime des fichiers. -r pour les dossiers, -f pour forcer',
    descriptionByEnv: { windows: 'Supprime des fichiers. -Recurse pour les dossiers, -Force pour forcer' },
    example: '$ rm fichier.txt\n$ rm -r dossier/\n$ rm -rf dossier/',
    exampleByEnv: {
      windows: 'PS> Remove-Item fichier.txt\nPS> Remove-Item -Recurse dossier\\\nPS> del fichier.txt   # alias CMD classique',
    },
    category: 'Fichiers & Dossiers',
  },
  {
    command: 'find',
    commandByEnv: { windows: 'Get-ChildItem -Recurse' },
    syntax: 'find chemin [options]',
    syntaxByEnv: { windows: 'Get-ChildItem -Recurse [-Filter motif]' },
    description: 'Recherche des fichiers selon différents critères',
    descriptionByEnv: { windows: 'Recherche des fichiers récursivement avec filtres' },
    example: '$ find . -name "*.txt"\n$ find / -type d -name "bin"\n$ find . -mtime -7  # modifiés dans les 7 jours',
    exampleByEnv: {
      windows: 'PS> Get-ChildItem -Recurse -Filter "*.txt"\nPS> Get-ChildItem -Recurse -Directory -Filter "bin"\nPS> Get-ChildItem -Recurse | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-7) }',
    },
    category: 'Fichiers & Dossiers',
  },

  // ── Lecture de fichiers ─────────────────────────────────────────────────────
  {
    command: 'cat',
    commandByEnv: { windows: 'Get-Content' },
    syntax: 'cat fichier...',
    syntaxByEnv: { windows: 'Get-Content fichier  (alias: cat, gc, type)' },
    description: 'Affiche le contenu d\'un ou plusieurs fichiers',
    example: '$ cat notes.txt\n$ cat a.txt b.txt > combined.txt',
    exampleByEnv: {
      windows: 'PS> Get-Content notes.txt\nPS> cat notes.txt      # alias\nPS> gc a.txt, b.txt    # plusieurs fichiers',
    },
    category: 'Lecture de fichiers',
  },
  {
    command: 'less',
    syntax: 'less fichier',
    description: 'Affiche un fichier page par page (q pour quitter)',
    example: '$ less fichier.log',
    exampleByEnv: {
      windows: '# less n\'est pas natif Windows\n# Utilisez more.com :\nPS> more fichier.log\n# Ou via Git Bash / WSL2 :\n$ less fichier.log',
    },
    category: 'Lecture de fichiers',
  },
  {
    command: 'head',
    commandByEnv: { windows: 'Get-Content -TotalCount' },
    syntax: 'head [-n N] fichier',
    syntaxByEnv: { windows: 'Get-Content fichier -TotalCount N' },
    description: 'Affiche les N premières lignes (10 par défaut)',
    example: '$ head fichier.txt\n$ head -n 5 fichier.txt',
    exampleByEnv: {
      windows: 'PS> Get-Content fichier.txt -TotalCount 10\nPS> Get-Content fichier.txt -TotalCount 5',
    },
    category: 'Lecture de fichiers',
  },
  {
    command: 'tail',
    commandByEnv: { windows: 'Get-Content -Tail' },
    syntax: 'tail [-n N] [-f] fichier',
    syntaxByEnv: { windows: 'Get-Content fichier -Tail N [-Wait]' },
    description: 'Affiche les N dernières lignes. -f suit le fichier en temps réel',
    descriptionByEnv: { windows: 'Affiche les N dernières lignes. -Wait suit le fichier en temps réel (tail -f)' },
    example: '$ tail -n 20 fichier.log\n$ tail -f access.log',
    exampleByEnv: {
      windows: 'PS> Get-Content fichier.log -Tail 20\nPS> Get-Content access.log -Wait   # équivalent de tail -f',
    },
    category: 'Lecture de fichiers',
  },
  {
    command: 'grep',
    commandByEnv: { windows: 'Select-String' },
    syntax: 'grep [-ni] motif fichier',
    syntaxByEnv: { windows: 'Select-String [-CaseSensitive] motif fichier  (alias: sls)' },
    description: 'Recherche des lignes correspondant à un motif',
    example: '$ grep "erreur" log.txt\n$ grep -n "TODO" code.js\n$ grep -r "import" src/',
    exampleByEnv: {
      windows: 'PS> Select-String "erreur" log.txt\nPS> sls "TODO" code.js    # alias\nPS> Get-ChildItem -Recurse src\\ | Select-String "import"',
    },
    category: 'Lecture de fichiers',
  },
  {
    command: 'wc',
    commandByEnv: { windows: 'Measure-Object' },
    syntax: 'wc [-lwc] fichier',
    syntaxByEnv: { windows: 'Get-Content fichier | Measure-Object [-Line] [-Word]' },
    description: 'Compte les lignes (-l), mots (-w) et octets (-c)',
    descriptionByEnv: { windows: 'Compte les lignes, mots et caractères d\'un fichier ou d\'une sortie' },
    example: '$ wc -l fichier.txt\n$ ls | wc -l',
    exampleByEnv: {
      windows: 'PS> Get-Content fichier.txt | Measure-Object -Line\nPS> Get-ChildItem | Measure-Object   # compter les fichiers\nPS> (Get-Content fichier.txt | Measure-Object -Line).Lines',
    },
    category: 'Lecture de fichiers',
  },

  // ── Permissions ─────────────────────────────────────────────────────────────
  {
    command: 'chmod',
    commandByEnv: { windows: 'icacls / Set-ExecutionPolicy' },
    syntax: 'chmod mode fichier',
    syntaxByEnv: { windows: 'icacls fichier /grant user:(droits)' },
    description: 'Change les permissions. Mode en octal (755) ou symbolique (+x)',
    descriptionByEnv: { windows: 'Gère les ACL (Access Control Lists). Set-ExecutionPolicy pour les scripts PS1' },
    example: '$ chmod +x script.sh\n$ chmod 644 fichier.txt\n$ chmod 600 ~/.ssh/id_rsa',
    exampleByEnv: {
      windows: 'PS> icacls notes.txt /grant user:(R)\nPS> icacls notes.txt /deny Everyone:(W)\nPS> Set-ExecutionPolicy RemoteSigned   # autoriser scripts locaux',
    },
    category: 'Permissions',
  },
  {
    command: 'chown',
    commandByEnv: { windows: 'takeown / icacls /setowner' },
    syntax: 'chown [-R] user[:group] fichier',
    syntaxByEnv: { windows: 'takeown /f fichier  puis  icacls fichier /setowner user' },
    description: 'Change le propriétaire et le groupe d\'un fichier',
    descriptionByEnv: { windows: 'Prend possession d\'un fichier et change son propriétaire (requiert admin)' },
    example: '$ chown user:user fichier.txt\n$ sudo chown -R www-data /var/www',
    exampleByEnv: {
      windows: 'PS> takeown /f notes.txt\nPS> icacls notes.txt /setowner "BUILTIN\\Administrators"\nPS> takeown /f C:\\projets /r /d y   # récursif',
    },
    category: 'Permissions',
  },
  {
    command: 'sudo',
    commandByEnv: { windows: 'Start-Process -Verb RunAs' },
    syntax: 'sudo commande [args]',
    syntaxByEnv: { windows: 'Start-Process powershell -Verb RunAs' },
    description: 'Exécute une commande avec les droits root (superutilisateur)',
    descriptionByEnv: { windows: 'Lance un processus avec les droits Administrateur (Exécuter en tant qu\'admin)' },
    example: '$ sudo apt update\n$ sudo chmod 600 ~/.ssh/id_rsa\n$ sudo -i   # shell root',
    exampleByEnv: {
      windows: 'PS> Start-Process powershell -Verb RunAs\n# Ouvre un terminal administrateur\n\nPS> Start-Process notepad -ArgumentList "C:\\Windows\\hosts" -Verb RunAs',
      macos: '$ sudo brew install htop\n$ sudo dscacheutil -flushcache\n$ sudo -i   # shell root',
    },
    category: 'Permissions',
  },
  {
    command: 'umask',
    syntax: 'umask [mode]',
    description: 'Affiche ou définit le masque de permissions par défaut pour les nouveaux fichiers',
    example: '$ umask\n0022\n$ umask 027',
    exampleByEnv: {
      windows: '# umask n\'a pas d\'équivalent direct sur Windows\n# Les permissions des nouveaux fichiers sont héritées du dossier parent\n# Consultez la politique de sécurité locale : secpol.msc',
    },
    category: 'Permissions',
  },
  {
    command: 'Get-Acl',
    syntax: 'Get-Acl fichier',
    description: 'Affiche les permissions (ACL) d\'un fichier ou répertoire',
    example: 'PS> Get-Acl documents\\notes.txt\nPS> Get-Acl C:\\path | Format-List',
    showOnly: ['windows'],
    category: 'Permissions',
  },

  // ── Processus ───────────────────────────────────────────────────────────────
  {
    command: 'ps',
    commandByEnv: { windows: 'Get-Process' },
    syntax: 'ps [aux]',
    syntaxByEnv: { windows: 'Get-Process [nom]  (alias: gps, ps)' },
    description: 'Liste les processus en cours. aux pour tous les processus',
    descriptionByEnv: { windows: 'Liste les processus en cours avec utilisation mémoire et CPU' },
    example: '$ ps\n$ ps aux\n$ ps aux | grep node',
    exampleByEnv: {
      windows: 'PS> Get-Process\nPS> Get-Process node     # filtrer par nom\nPS> Get-Process | Sort-Object CPU -Descending | Select-Object -First 10',
    },
    category: 'Processus',
  },
  {
    command: 'kill',
    commandByEnv: { windows: 'Stop-Process' },
    syntax: 'kill [-signal] PID',
    syntaxByEnv: { windows: 'Stop-Process [-Id PID] [-Name nom] [-Force]  (alias: spps, kill)' },
    description: 'Envoie un signal à un processus (15=SIGTERM, 9=SIGKILL)',
    descriptionByEnv: { windows: 'Arrête un processus par son ID ou son nom' },
    example: '$ kill 1234\n$ kill -9 5678\n$ killall node',
    exampleByEnv: {
      windows: 'PS> Stop-Process -Id 1234\nPS> Stop-Process -Name node\nPS> Stop-Process -Name node -Force   # arrêt forcé\nPS> taskkill /IM node.exe /F',
    },
    category: 'Processus',
  },
  {
    command: 'top',
    commandByEnv: { windows: 'Get-Process | Sort-Object' },
    syntax: 'top',
    syntaxByEnv: { windows: 'Get-Process | Sort-Object CPU -Descending' },
    description: 'Affiche les processus en temps réel avec leur utilisation ressources',
    descriptionByEnv: { windows: 'Affiche les processus triés par consommation (pas de vue temps-réel native — utilisez le Gestionnaire des tâches)' },
    example: '$ top\n$ htop   # version améliorée',
    exampleByEnv: {
      windows: 'PS> Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name,CPU,WorkingSet\n# Pour une vue dynamique : ouvrez le Gestionnaire des tâches\nPS> Start-Process taskmgr',
      macos: '$ top\n$ top -o cpu   # trié par CPU\n$ htop         # via brew install htop',
    },
    category: 'Processus',
  },
  {
    command: 'jobs',
    commandByEnv: { windows: 'Get-Job' },
    syntax: 'jobs',
    syntaxByEnv: { windows: 'Get-Job' },
    description: 'Affiche les tâches en arrière-plan du shell courant',
    descriptionByEnv: { windows: 'Affiche les jobs PowerShell en arrière-plan' },
    example: '$ sleep 100 &\n$ jobs\n[1]+ Running    sleep 100 &',
    exampleByEnv: {
      windows: 'PS> $job = Start-Job { Start-Sleep 100 }\nPS> Get-Job\nId  Name  State\n--  ----  -----\n 1  Job1  Running',
    },
    category: 'Processus',
  },
  {
    command: 'bg',
    commandByEnv: { windows: 'Start-Job' },
    syntax: 'bg [%n]',
    syntaxByEnv: { windows: 'Start-Job { script }' },
    description: 'Reprend une tâche suspendue en arrière-plan (après Ctrl+Z)',
    descriptionByEnv: { windows: 'Lance un scriptblock en arrière-plan' },
    example: '# Ctrl+Z pour suspendre\n$ bg %1   # reprendre en arrière-plan\n$ jobs',
    exampleByEnv: {
      windows: 'PS> $j = Start-Job { npm run dev }\nPS> Receive-Job $j   # lire la sortie',
    },
    category: 'Processus',
  },
  {
    command: 'fg',
    commandByEnv: { windows: 'Receive-Job' },
    syntax: 'fg [%n]',
    syntaxByEnv: { windows: 'Receive-Job -Id n [-Wait]' },
    description: 'Ramène une tâche en avant-plan',
    descriptionByEnv: { windows: 'Récupère la sortie d\'un job (avec -Wait : attend la fin comme fg)' },
    example: '$ fg %1\n$ fg   # ramène le dernier job',
    exampleByEnv: {
      windows: 'PS> Receive-Job -Id 1 -Wait\n# Attend la fin du job et affiche sa sortie',
    },
    category: 'Processus',
  },

  // ── Redirection & Pipes ─────────────────────────────────────────────────────
  {
    command: '>',
    syntax: 'commande > fichier',
    description: 'Redirige la sortie vers un fichier (écrase le contenu existant)',
    example: '$ echo "Bonjour" > salut.txt\n$ ls > liste.txt',
    exampleByEnv: {
      windows: 'PS> "Bonjour" > salut.txt\nPS> Get-ChildItem > liste.txt\n# Même syntaxe qu\'en bash !',
    },
    category: 'Redirection & Pipes',
  },
  {
    command: '>>',
    syntax: 'commande >> fichier',
    description: 'Ajoute la sortie à la fin d\'un fichier (sans écraser)',
    example: '$ echo "Ligne 1" > fichier.txt\n$ echo "Ligne 2" >> fichier.txt',
    exampleByEnv: {
      windows: 'PS> "Ligne 1" > fichier.txt\nPS> "Ligne 2" >> fichier.txt\n# Même syntaxe qu\'en bash !',
    },
    category: 'Redirection & Pipes',
  },
  {
    command: '2>',
    syntax: 'commande 2> fichier',
    description: 'Redirige la sortie d\'erreur (stderr) vers un fichier',
    example: '$ ls inexistant 2> erreurs.log\n$ ls inexistant 2>/dev/null  # ignorer',
    exampleByEnv: {
      windows: 'PS> Get-Item inexistant 2> erreurs.log\nPS> Get-Item inexistant 2>$null   # ignorer l\'erreur\n# $null est l\'équivalent de /dev/null',
    },
    category: 'Redirection & Pipes',
  },
  {
    command: '2>&1',
    syntax: 'commande > fichier 2>&1',
    description: 'Fusionne stderr dans stdout — capture tout en un seul fichier',
    example: '$ npm run build > build.log 2>&1\n$ command 2>&1 | grep "Error"',
    exampleByEnv: {
      windows: 'PS> npm run build > build.log 2>&1\n# Même syntaxe en PowerShell !\nPS> command *>&1 | Select-String "Error"\n# *>&1 : tous les streams vers stdout',
    },
    category: 'Redirection & Pipes',
  },
  {
    command: '|',
    syntax: 'commande1 | commande2',
    description: 'Connecte la sortie d\'une commande à l\'entrée de la suivante (pipe)',
    example: '$ ls | grep ".txt"\n$ cat log | grep error | wc -l\n$ ps aux | sort -k3rn | head',
    exampleByEnv: {
      windows: 'PS> Get-ChildItem | Where-Object { $_.Name -like "*.txt" }\nPS> Get-Content log.txt | Select-String "error" | Measure-Object -Line\n# Les pipes PowerShell transmettent des objets, pas du texte !',
    },
    category: 'Redirection & Pipes',
  },
  {
    command: 'tee',
    commandByEnv: { windows: 'Tee-Object' },
    syntax: 'commande | tee [-a] fichier',
    syntaxByEnv: { windows: 'commande | Tee-Object -FilePath fichier' },
    description: 'Affiche la sortie dans le terminal ET la sauvegarde dans un fichier',
    example: '$ ls -la | tee liste.txt\n$ npm run build 2>&1 | tee build.log',
    exampleByEnv: {
      windows: 'PS> Get-ChildItem | Tee-Object -FilePath liste.txt\nPS> npm run build | Tee-Object -FilePath build.log',
    },
    category: 'Redirection & Pipes',
  },

  // ── Variables d'environnement ────────────────────────────────────────────────
  {
    command: 'export',
    commandByEnv: { windows: '$env:VAR = "value"' },
    syntax: 'export NOM=valeur',
    syntaxByEnv: { windows: '$env:NOM = "valeur"' },
    description: 'Définit une variable d\'environnement pour le shell et ses processus fils',
    descriptionByEnv: { windows: 'Définit une variable d\'environnement dans le scope PowerShell courant' },
    example: '$ export NODE_ENV=production\n$ export PATH=$PATH:/opt/bin\n$ export  # lister toutes les vars',
    exampleByEnv: {
      windows: 'PS> $env:NODE_ENV = "production"\nPS> $env:PATH += ";C:\\opt\\bin"\nPS> Get-ChildItem Env:   # lister toutes les vars',
    },
    category: 'Variables d\'environnement',
  },
  {
    command: 'env',
    commandByEnv: { windows: 'Get-ChildItem Env:' },
    syntax: 'env',
    syntaxByEnv: { windows: 'Get-ChildItem Env:  (ou $env:NOM pour une variable)' },
    description: 'Affiche toutes les variables d\'environnement actives',
    example: '$ env\n$ env | grep PATH',
    exampleByEnv: {
      windows: 'PS> Get-ChildItem Env:\nPS> Get-ChildItem Env: | Where-Object { $_.Name -like "PATH*" }\nPS> $env:PATH   # lire une variable spécifique',
    },
    category: 'Variables d\'environnement',
  },
  {
    command: 'printenv',
    syntax: 'printenv [NOM]',
    description: 'Affiche la valeur d\'une ou toutes les variables d\'environnement',
    example: '$ printenv PATH\n$ printenv USER\n$ printenv   # tout afficher',
    exampleByEnv: {
      windows: 'PS> $env:PATH    # lire une variable\nPS> echo $env:USERNAME\nPS> [Environment]::GetEnvironmentVariable("PATH")',
    },
    category: 'Variables d\'environnement',
    hideOn: ['windows'],
  },
  {
    command: 'source',
    commandByEnv: { windows: '. $PROFILE' },
    syntax: 'source ~/.bashrc  ou  . ~/.bashrc',
    syntaxByEnv: { windows: '. $PROFILE  (recharger le profil PowerShell)' },
    description: 'Recharge un fichier de configuration dans le shell courant',
    descriptionByEnv: { windows: 'Recharge le profil PowerShell sans redémarrer le terminal' },
    example: '$ source ~/.bashrc\n$ . ~/.zshrc\n$ source ~/.profile',
    exampleByEnv: {
      windows: 'PS> . $PROFILE\n# Recharge votre profil PowerShell\n# Equivalent de source ~/.bashrc',
      macos: '$ source ~/.zshrc\n$ . ~/.zshrc   # équivalent\n$ source ~/.profile',
    },
    category: 'Variables d\'environnement',
  },

  // ── Système ─────────────────────────────────────────────────────────────────
  {
    command: 'echo',
    commandByEnv: { windows: 'Write-Host / Write-Output' },
    syntax: 'echo [texte]',
    syntaxByEnv: { windows: 'Write-Host texte  ou  Write-Output texte  (echo fonctionne aussi)' },
    description: 'Affiche du texte dans le terminal. Supporte l\'interpolation $VAR',
    example: '$ echo "Bonjour"\n$ echo $HOME\n$ echo "User: $USER"',
    exampleByEnv: {
      windows: 'PS> Write-Host "Bonjour"\nPS> echo $env:USERNAME   # echo fonctionne\nPS> Write-Output "Home: $env:USERPROFILE"',
    },
    category: 'Système',
  },
  {
    command: 'whoami',
    syntax: 'whoami',
    description: 'Affiche le nom de l\'utilisateur courant',
    example: '$ whoami\nuser',
    exampleByEnv: {
      windows: 'PS> whoami\nDESKTOP-ABC\\user\n# whoami fonctionne aussi en PowerShell',
    },
    category: 'Système',
  },
  {
    command: 'date',
    commandByEnv: { windows: 'Get-Date' },
    syntax: 'date [+format]',
    syntaxByEnv: { windows: 'Get-Date [-Format "format"]' },
    description: 'Affiche la date et l\'heure courantes',
    example: '$ date\n$ date +"%Y-%m-%d %H:%M"',
    exampleByEnv: {
      windows: 'PS> Get-Date\nPS> Get-Date -Format "yyyy-MM-dd HH:mm"\nPS> (Get-Date).Year',
    },
    category: 'Système',
  },
  {
    command: 'uname',
    syntax: 'uname [-a]',
    description: 'Affiche des informations sur le système (noyau, architecture)',
    example: '$ uname\nLinux\n$ uname -a\nLinux host 5.15.0 #1 SMP x86_64 GNU/Linux',
    exampleByEnv: {
      macos: '$ uname\nDarwin\n$ uname -a\nDarwin MacBook.local 23.0.0 Darwin Kernel ARM64',
      windows: '# uname n\'existe pas nativement sur Windows\nPS> $PSVersionTable.OS\nPS> [System.Environment]::OSVersion.VersionString\nPS> (Get-ComputerInfo).WindowsProductName',
    },
    hideOn: ['windows'],
    category: 'Système',
  },
  {
    command: 'Get-ComputerInfo',
    syntax: 'Get-ComputerInfo',
    description: 'Affiche des informations détaillées sur le système Windows',
    example: 'PS> Get-ComputerInfo\nPS> (Get-ComputerInfo).WindowsProductName\nPS> $PSVersionTable.PSVersion',
    showOnly: ['windows'],
    category: 'Système',
  },
  {
    command: 'history',
    commandByEnv: { windows: 'Get-History' },
    syntax: 'history [n]',
    syntaxByEnv: { windows: 'Get-History  (alias: h, history)' },
    description: 'Affiche l\'historique des commandes',
    example: '$ history\n  1  pwd\n  2  ls -la\n$ history | grep git',
    exampleByEnv: {
      windows: 'PS> Get-History\nPS> Get-History | Select-String "git"\nPS> (Get-History)[-1]   # dernière commande',
    },
    category: 'Système',
  },
  {
    command: 'man',
    commandByEnv: { windows: 'Get-Help' },
    syntax: 'man commande',
    syntaxByEnv: { windows: 'Get-Help commande [-Examples] [-Full]' },
    description: 'Affiche le manuel détaillé d\'une commande',
    descriptionByEnv: { windows: 'Affiche l\'aide détaillée d\'une commande PowerShell' },
    example: '$ man ls\n$ man grep',
    exampleByEnv: {
      windows: 'PS> Get-Help Get-ChildItem\nPS> Get-Help Get-ChildItem -Examples\nPS> help ls   # alias court',
    },
    category: 'Système',
  },
  {
    command: 'clear',
    commandByEnv: { windows: 'Clear-Host' },
    syntax: 'clear',
    syntaxByEnv: { windows: 'Clear-Host  (alias: cls, clear)' },
    description: 'Efface l\'écran du terminal',
    example: '$ clear',
    exampleByEnv: {
      windows: 'PS> Clear-Host\nPS> cls   # alias CMD classique\nPS> clear  # fonctionne aussi',
    },
    category: 'Système',
  },
  {
    command: 'alias',
    commandByEnv: { windows: 'Set-Alias / New-Alias' },
    syntax: 'alias [nom=\'commande\']',
    syntaxByEnv: { windows: 'Set-Alias -Name nom -Value commande' },
    description: 'Crée un raccourci pour une commande',
    example: '$ alias ll=\'ls -la\'\n$ alias gs=\'git status\'\n$ alias   # lister tous les alias',
    exampleByEnv: {
      windows: 'PS> Set-Alias -Name ll -Value Get-ChildItem\nPS> New-Alias gs "git status"\nPS> Get-Alias   # lister tous les alias',
    },
    category: 'Système',
  },
  // macOS-specific
  {
    command: 'open',
    syntax: 'open fichier|dossier|URL',
    description: 'Ouvre un fichier, dossier ou URL avec l\'application par défaut',
    example: '$ open notes.txt\n$ open .\n$ open https://example.com',
    showOnly: ['macos'],
    category: 'Système',
  },
  {
    command: 'pbcopy / pbpaste',
    syntax: 'commande | pbcopy  /  pbpaste',
    description: 'Copie vers / colle depuis le presse-papiers système',
    example: '$ cat fichier.txt | pbcopy\n$ pbpaste > nouveau.txt',
    showOnly: ['macos'],
    category: 'Système',
  },
  {
    command: 'brew',
    syntax: 'brew install|update|list [paquet]',
    description: 'Homebrew — gestionnaire de paquets macOS',
    example: '$ brew install htop\n$ brew update\n$ brew list',
    showOnly: ['macos'],
    category: 'Système',
  },
  {
    command: 'winget',
    syntax: 'winget install|list [paquet]',
    description: 'Windows Package Manager — gestionnaire de paquets Windows',
    example: 'PS> winget install Git.Git\nPS> winget install Microsoft.VisualStudioCode\nPS> winget list',
    showOnly: ['windows'],
    category: 'Système',
  },
];

const categories = [
  'Tous', 'Navigation', 'Fichiers & Dossiers', 'Lecture de fichiers',
  'Permissions', 'Processus', 'Redirection & Pipes', "Variables d'environnement", 'Système',
];

const categoryColors: Record<string, string> = {
  'Navigation': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Fichiers & Dossiers': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'Lecture de fichiers': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'Permissions': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Processus': 'text-red-400 bg-red-500/10 border-red-500/20',
  'Redirection & Pipes': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  "Variables d'environnement": 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'Système': 'text-gray-400 bg-gray-500/10 border-gray-500/20',
};

const ENV_LABELS: Record<string, { label: string; color: string }> = {
  linux: { label: 'Linux / bash', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  macos: { label: 'macOS / zsh', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  windows: { label: 'Windows / PowerShell', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
};

export function CommandReference() {
  const { selectedEnv } = useEnvironment();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [expanded, setExpanded] = useState<string | null>(null);

  usePageSEO({
    title: 'Référence des commandes — Terminal Learning',
    description: 'Référence complète de 27+ commandes terminal : syntaxe, exemples, variantes Linux / macOS / Windows. Navigation, fichiers, permissions, réseau, Git.',
    path: '/app/reference',
  });

  // Resolve per-env fields
  const resolve = <T,>(base: T, byEnv?: Partial<Record<string, T>>): T =>
    byEnv?.[selectedEnv] ?? base;

  // Filter: respect hideOn / showOnly, then search + category
  const filtered = commands.filter((cmd) => {
    if (cmd.hideOn?.includes(selectedEnv)) return false;
    if (cmd.showOnly && !cmd.showOnly.includes(selectedEnv)) return false;
    const displayCmd = resolve(cmd.command, cmd.commandByEnv);
    const displayDesc = resolve(cmd.description, cmd.descriptionByEnv);
    const matchesSearch =
      !search ||
      displayCmd.toLowerCase().includes(search.toLowerCase()) ||
      displayDesc.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'Tous' || cmd.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const grouped = filtered.reduce<Record<string, CommandEntry[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  const envMeta = ENV_LABELS[selectedEnv] ?? ENV_LABELS.linux;

  return (
    <div className="min-h-full bg-[#0d1117] text-[#e6edf3] p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Terminal size={22} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-[#e6edf3]">Référence des commandes</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${envMeta.color}`}>
                {envMeta.label}
              </span>
              <p className="text-[#8b949e] text-sm">{filtered.length} commandes</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
          <input
            type="text"
            placeholder="Rechercher une commande..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#161b22] border border-[#30363d] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#e6edf3] placeholder-[#8b949e] outline-none focus:border-[#58a6ff] transition-colors font-mono"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        {categories.map((cat) => (
          <Button
            key={cat}
            type="button"
            variant={activeCategory === cat ? 'tl-filter-pill-active' : 'tl-filter-pill'}
            size="tl-filter-pill-size"
            onClick={() => setActiveCategory(cat)}
            aria-pressed={activeCategory === cat}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Commands by category */}
      {Object.entries(grouped).map(([category, cmds]) => (
        <div key={category} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs px-2.5 py-1 rounded-full border ${categoryColors[category] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/20'}`}>
              {category}
            </span>
            <span className="text-xs text-[#8b949e]">{cmds.length}</span>
          </div>

          <div className="space-y-2">
            {cmds.map((cmd) => {
              const key = `${category}-${cmd.command}`;
              const isOpen = expanded === key;
              const displayCmd = resolve(cmd.command, cmd.commandByEnv);
              const displaySyntax = resolve(cmd.syntax, cmd.syntaxByEnv);
              const displayDesc = resolve(cmd.description, cmd.descriptionByEnv);
              const displayExample = resolve(cmd.example, cmd.exampleByEnv);

              return (
                <div
                  key={key}
                  className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden hover:border-[#58a6ff]/30 transition-colors cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : key)}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <code className="text-emerald-400 font-mono text-sm shrink-0 w-24 truncate">{displayCmd}</code>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#c9d1d9] text-sm truncate">{displayDesc}</p>
                      {!isOpen && (
                        <p className="text-[#8b949e] text-xs font-mono truncate mt-0.5">{displaySyntax}</p>
                      )}
                    </div>
                    {isOpen ? (
                      <ChevronDown size={16} className="text-[#8b949e] shrink-0" />
                    ) : (
                      <ChevronRight size={16} className="text-[#8b949e] shrink-0" />
                    )}
                  </div>

                  {isOpen && (
                    <div className="border-t border-[#30363d] px-4 py-3 space-y-3">
                      <div>
                        <p className="text-xs text-[#8b949e] mb-1">Syntaxe</p>
                        <code className="text-blue-300 font-mono text-sm">{displaySyntax}</code>
                      </div>
                      <div>
                        <p className="text-xs text-[#8b949e] mb-1">Description</p>
                        <p className="text-[#c9d1d9] text-sm">{displayDesc}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8b949e] mb-1">Exemple</p>
                        <pre className="bg-[#0d1117] rounded-lg p-3 overflow-x-auto text-sm max-w-full">
                          {displayExample.split('\n').map((line, i) => (
                            <div key={i}>
                              {line.startsWith('$') ? (
                                <>
                                  <span className="text-emerald-400">$</span>
                                  <span className="text-[#e6edf3]">{line.slice(1)}</span>
                                </>
                              ) : line.startsWith('PS>') ? (
                                <>
                                  <span className="text-cyan-400">PS&gt;</span>
                                  <span className="text-[#e6edf3]">{line.slice(3)}</span>
                                </>
                              ) : line.startsWith('#') ? (
                                <span className="text-[#8b949e]">{line}</span>
                              ) : (
                                <span className="text-[#a5d6ff]">{line}</span>
                              )}
                            </div>
                          ))}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-[#8b949e]">
          <Search size={32} className="mx-auto mb-3 opacity-30" />
          <p>Aucune commande trouvée pour &ldquo;{search}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
