import type { CommandExample, EnvironmentId } from '../types/curriculum';

/**
 * Explained examples for /app/reference, keyed by command id (commandCatalogue).
 *
 * Every example is something a learner can type as is. Paths use the practice
 * terminal's files (~/documents/notes.txt, ~/documents/rapport.md,
 * ~/projets/README.md, ~/projets/script.sh), so an example tried in a lesson
 * terminal works instead of failing on a made-up file name.
 * `src/test/commandReference.test.ts` replays each one through the engine.
 *
 * An example without `environments` is shown on every OS the command supports;
 * Windows learners get PowerShell forms instead of bash ones where they differ.
 */

const UNIX: EnvironmentId[] = ['linux', 'macos'];
const WIN: EnvironmentId[] = ['windows'];
const LINUX: EnvironmentId[] = ['linux'];
const MACOS: EnvironmentId[] = ['macos'];

export const COMMAND_EXAMPLES: Record<string, CommandExample[]> = {
  // ─── Navigation ───────────────────────────────────────────
  pwd: [
    { command: 'pwd', explanation: 'Affiche le chemin complet du dossier où tu te trouves. Sous PowerShell, pwd est un raccourci de Get-Location.' },
    { command: 'Get-Location', explanation: 'La forme PowerShell complète : même résultat que pwd.', environments: WIN },
  ],
  ls: [
    { command: 'ls', explanation: 'Liste les fichiers et dossiers visibles du dossier courant.', environments: UNIX },
    { command: 'ls -la', explanation: '-l affiche le détail (droits, propriétaire, taille, date) et -a ajoute les fichiers cachés, ceux dont le nom commence par un point.', environments: UNIX },
    { command: 'ls documents', explanation: 'Liste le contenu d\'un autre dossier sans t\'y déplacer.', environments: UNIX },
    { command: 'Get-ChildItem', explanation: 'Liste le contenu du dossier courant. ls et dir sont des raccourcis de cette commande.', environments: WIN },
    { command: 'Get-ChildItem -Force', explanation: 'Ajoute les fichiers cachés. ls -la, lui, ne fonctionne pas dans PowerShell.', environments: WIN },
    { command: 'Get-ChildItem documents', explanation: 'Liste le contenu d\'un autre dossier sans t\'y déplacer.', environments: WIN },
  ],
  cd: [
    { command: 'cd documents', explanation: 'Entre dans le dossier documents, situé dans le dossier courant (chemin relatif).' },
    { command: 'cd ..', explanation: 'Remonte d\'un niveau, vers le dossier parent.' },
    { command: 'cd ~', explanation: 'Revient à ton dossier personnel, où que tu sois.' },
    { command: 'cd /tmp', explanation: 'Un chemin qui commence par / est absolu : il part de la racine du système, quel que soit le dossier courant.', environments: UNIX },
    { command: 'cd -', explanation: 'Revient au dossier où tu étais juste avant.', environments: UNIX },
    { command: 'cd C:\\Users\\user\\projets', explanation: 'Un chemin qui commence par la lettre du disque est absolu. PowerShell accepte aussi / comme séparateur.', environments: WIN },
  ],
  clear_cls: [
    { command: 'clear', explanation: 'Efface l\'écran. Les commandes précédentes restent accessibles avec la flèche du haut.', environments: UNIX },
    { command: 'cls', explanation: 'Efface l\'écran de PowerShell (raccourci de Clear-Host ; clear fonctionne aussi).', environments: WIN },
  ],
  tree: [
    { command: 'tree', explanation: 'Dessine l\'arborescence du dossier courant. Souvent à installer d\'abord : sudo apt install tree ou brew install tree.', environments: UNIX },
    { command: 'tree -L 2', explanation: 'Limite le dessin à deux niveaux de profondeur, pour les gros dossiers.', environments: UNIX },
    { command: 'tree', explanation: 'Dessine l\'arborescence des dossiers seulement.', environments: WIN },
    { command: 'tree /F', explanation: '/F ajoute les fichiers dans l\'arborescence.', environments: WIN },
  ],

  // ─── Fichiers & Dossiers ──────────────────────────────────
  mkdir: [
    { command: 'mkdir archives', explanation: 'Crée le dossier archives dans le dossier courant.' },
    { command: 'mkdir -p projets/web/css', explanation: '-p crée aussi les dossiers intermédiaires manquants (web, puis css), sans erreur s\'ils existent déjà.', environments: UNIX },
    { command: 'mkdir projets\\web\\css', explanation: 'PowerShell crée tout seul les dossiers intermédiaires manquants.', environments: WIN },
  ],
  touch: [
    { command: 'touch todo.txt', explanation: 'Crée un fichier vide. S\'il existe déjà, touch met seulement à jour sa date de modification.', environments: UNIX },
    { command: 'New-Item todo.txt -ItemType File', explanation: 'Crée un fichier vide. PowerShell n\'a pas de touch, et New-Item refuse d\'écraser un fichier qui existe déjà.', environments: WIN },
  ],
  cp: [
    { command: 'cp documents/notes.txt documents/notes-copie.txt', explanation: 'Copie un fichier sous un nouveau nom.', environments: UNIX },
    { command: 'cp documents/notes.txt projets/', explanation: 'Quand la destination est un dossier existant, le fichier y est copié sous son nom d\'origine.', environments: UNIX },
    { command: 'cp -r documents sauvegarde', explanation: '-r (récursif) copie un dossier avec tout son contenu. Sans -r, cp refuse de copier un dossier.', environments: UNIX },
    { command: 'Copy-Item documents\\notes.txt documents\\notes-copie.txt', explanation: 'Copie un fichier sous un nouveau nom. cp et copy sont des raccourcis de Copy-Item.', environments: WIN },
    { command: 'Copy-Item documents sauvegarde -Recurse', explanation: '-Recurse copie le dossier avec son contenu. Sans lui, PowerShell ne crée qu\'un dossier vide.', environments: WIN },
  ],
  mv: [
    { command: 'mv documents/rapport.md documents/rapport-final.md', explanation: 'Renomme un fichier : mv sert à la fois à déplacer et à renommer.', environments: UNIX },
    { command: 'mv documents/notes.txt projets/', explanation: 'Déplace le fichier dans le dossier projets, en gardant son nom.', environments: UNIX },
    { command: 'Move-Item documents\\rapport.md documents\\rapport-final.md', explanation: 'Renomme un fichier. mv et move sont des raccourcis de Move-Item.', environments: WIN },
    { command: 'Move-Item documents\\notes.txt projets\\', explanation: 'Déplace le fichier dans le dossier projets, en gardant son nom.', environments: WIN },
  ],
  rm: [
    { command: 'rm documents/rapport.md', explanation: 'Supprime le fichier définitivement : le terminal n\'a pas de corbeille.', environments: UNIX },
    { command: 'rm -r downloads', explanation: '-r supprime un dossier et tout ce qu\'il contient. Relis la commande avant d\'appuyer sur Entrée.', environments: UNIX },
    { command: 'Remove-Item documents\\rapport.md', explanation: 'Supprime le fichier définitivement, sans passer par la corbeille.', environments: WIN },
    { command: 'Remove-Item downloads -Recurse', explanation: '-Recurse supprime un dossier et tout ce qu\'il contient.', environments: WIN },
  ],

  // ─── Lecture de fichiers ──────────────────────────────────
  cat: [
    { command: 'cat documents/notes.txt', explanation: 'Affiche tout le contenu du fichier d\'un coup. Idéal pour les fichiers courts.', environments: UNIX },
    { command: 'cat -n documents/notes.txt', explanation: '-n numérote les lignes.', environments: UNIX },
    { command: 'Get-Content documents\\notes.txt', explanation: 'Affiche le contenu du fichier. cat et type sont des raccourcis de Get-Content.', environments: WIN },
  ],
  less_more: [
    { command: 'less documents/notes.txt', explanation: 'Affiche le fichier page par page : flèches ou Espace pour avancer, / pour chercher un mot, q pour quitter.', environments: UNIX },
    { command: 'more documents\\notes.txt', explanation: 'Affiche le fichier page par page : Espace pour avancer, q pour quitter.', environments: WIN },
  ],
  head_tail: [
    { command: 'head -n 3 documents/notes.txt', explanation: 'Affiche les 3 premières lignes. Sans -n, head en montre 10.', environments: UNIX },
    { command: 'tail -n 2 documents/notes.txt', explanation: 'Affiche les 2 dernières lignes. Avec -f, tail continue d\'afficher les lignes ajoutées au fichier, pratique pour suivre un journal (Ctrl+C pour arrêter).', environments: UNIX },
    { command: 'Get-Content documents\\notes.txt -TotalCount 3', explanation: 'Affiche les 3 premières lignes.', environments: WIN },
    { command: 'Get-Content documents\\notes.txt -Tail 2', explanation: 'Affiche les 2 dernières lignes. Ajoute -Wait pour suivre le fichier en direct.', environments: WIN },
  ],

  // ─── Recherche & Inspection ───────────────────────────────
  grep: [
    { command: 'grep Apprendre documents/notes.txt', explanation: 'Affiche les lignes qui contiennent le mot. grep distingue majuscules et minuscules : apprendre ne trouverait rien.', environments: UNIX },
    { command: 'grep -i fin documents/notes.txt', explanation: '-i ignore la casse : la ligne « Fin du fichier » est trouvée.', environments: UNIX },
    { command: 'grep -rn bash documents', explanation: '-r cherche dans tous les fichiers du dossier et -n ajoute le numéro de chaque ligne trouvée.', environments: UNIX },
    { command: 'Select-String -Pattern Apprendre -Path documents\\notes.txt', explanation: 'L\'équivalent PowerShell de grep. Attention : Select-String ignore la casse par défaut (-CaseSensitive pour la respecter).', environments: WIN },
  ],
  find: [
    { command: 'find . -name "*.txt"', explanation: 'Cherche, depuis le dossier courant (.) et dans tous ses sous-dossiers, les fichiers dont le nom finit par .txt. Les guillemets empêchent le shell de remplacer * trop tôt.', environments: UNIX },
    { command: 'find . -type d', explanation: 'Liste uniquement les dossiers.', environments: UNIX },
    { command: 'Get-ChildItem -Recurse -Filter *.txt', explanation: 'L\'équivalent PowerShell : cherche les fichiers .txt dans le dossier courant et tous ses sous-dossiers.', environments: WIN },
  ],
  wc: [
    { command: 'wc documents/notes.txt', explanation: 'Compte les lignes, les mots et les octets du fichier, dans cet ordre.', environments: UNIX },
    { command: 'wc -l documents/notes.txt', explanation: '-l ne compte que les lignes.', environments: UNIX },
    { command: 'ls | wc -l', explanation: 'Avec un pipe, wc compte ce qu\'une autre commande produit : ici, le nombre d\'éléments du dossier.', environments: UNIX },
    { command: '(Get-Content documents\\notes.txt).Count', explanation: 'Nombre de lignes du fichier : Get-Content renvoie une liste de lignes, .Count les compte.', environments: WIN },
  ],

  // ─── Système ──────────────────────────────────────────────
  echo: [
    { command: 'echo "Bonjour"', explanation: 'Affiche le texte. Les guillemets gardent les espaces tels quels.' },
    { command: 'echo $HOME', explanation: 'Affiche la valeur d\'une variable : le $ demande au shell de la remplacer par son contenu.', environments: UNIX },
    { command: 'echo "Utilisateur : $USER"', explanation: 'Entre guillemets doubles, les variables sont remplacées. Entre guillemets simples, elles restent écrites telles quelles.', environments: UNIX },
    { command: 'echo $env:USERPROFILE', explanation: 'Dans PowerShell, les variables d\'environnement s\'écrivent $env:NOM.', environments: WIN },
  ],
  date: [
    { command: 'date', explanation: 'Affiche la date et l\'heure actuelles.', environments: UNIX },
    { command: 'date +"%Y-%m-%d %H:%M"', explanation: 'Choisit le format : année-mois-jour heure:minute, pratique pour nommer un fichier de sauvegarde.', environments: UNIX },
    { command: 'Get-Date', explanation: 'Affiche la date et l\'heure actuelles.', environments: WIN },
    { command: 'Get-Date -Format "yyyy-MM-dd HH:mm"', explanation: 'Choisit le format. Attention à la casse : MM pour les mois, mm pour les minutes.', environments: WIN },
  ],
  uname: [
    { command: 'uname', explanation: 'Affiche le nom du système : Linux, ou Darwin sur macOS.' },
    { command: 'uname -a', explanation: 'Toutes les informations : système, nom de la machine, version du noyau, architecture.' },
  ],
  getcomputerinfo: [
    { command: 'Get-ComputerInfo', explanation: 'Liste des centaines d\'informations sur Windows et la machine. Peut prendre quelques secondes.' },
    { command: '(Get-ComputerInfo).WindowsProductName', explanation: 'Les parenthèses exécutent d\'abord la commande, puis le point lit une seule propriété : ici, l\'édition de Windows.' },
    { command: '$PSVersionTable.PSVersion', explanation: 'Affiche la version de PowerShell.' },
  ],
  history: [
    { command: 'history', explanation: 'Affiche les commandes tapées précédemment, numérotées.', environments: UNIX },
    { command: 'history | grep cd', explanation: 'Retrouve une ancienne commande en filtrant l\'historique.', environments: UNIX },
    { command: 'Get-History', explanation: 'Affiche les commandes tapées dans cette session PowerShell (history est un raccourci).', environments: WIN },
  ],
  man: [
    { command: 'man ls', explanation: 'Ouvre le manuel de ls : flèches pour défiler, / pour chercher, q pour quitter.', environments: UNIX },
    { command: 'man grep', explanation: 'Chaque commande a son manuel : la section OPTIONS liste tout ce qu\'on peut ajouter.', environments: UNIX },
    { command: 'Get-Help Get-ChildItem', explanation: 'Aide d\'une commande PowerShell.', environments: WIN },
    { command: 'Get-Help Get-ChildItem -Examples', explanation: 'Seulement des exemples prêts à l\'emploi : souvent le plus utile.', environments: WIN },
  ],
  alias: [
    { command: 'alias ll=\'ls -la\'', explanation: 'Crée un raccourci : taper ll lancera ls -la. Il disparaît à la fermeture du terminal, sauf si tu l\'ajoutes dans ~/.bashrc ou ~/.zshrc.', environments: UNIX },
    { command: 'alias', explanation: 'Liste les raccourcis définis.', environments: UNIX },
    { command: 'Set-Alias -Name np -Value notepad', explanation: 'Crée un raccourci PowerShell. Il ne peut pas contenir d\'options : pour l\'équivalent de ls -la, il faut écrire une fonction.', environments: WIN },
    { command: 'Get-Alias', explanation: 'Liste les raccourcis : on y découvre que ls, cat ou cd sont des raccourcis de commandes PowerShell.', environments: WIN },
  ],
  open: [
    { command: 'open documents/notes.txt', explanation: 'Ouvre le fichier avec l\'application par défaut, comme un double-clic dans le Finder.' },
    { command: 'open .', explanation: 'Ouvre le dossier courant dans le Finder.' },
    { command: 'open https://terminallearning.dev', explanation: 'Ouvre l\'adresse dans le navigateur par défaut.' },
  ],
  pbcopy_pbpaste: [
    { command: 'cat documents/notes.txt | pbcopy', explanation: 'Copie le contenu du fichier dans le presse-papiers, prêt à être collé ailleurs.' },
    { command: 'pbpaste > copie.txt', explanation: 'Colle le contenu du presse-papiers dans un nouveau fichier.' },
  ],
  brew: [
    { command: 'brew install tree', explanation: 'Installe un programme : Homebrew le télécharge et le rend disponible dans le terminal.' },
    { command: 'brew update', explanation: 'Met à jour la liste des programmes disponibles. Pour mettre à jour ceux qui sont installés : brew upgrade.' },
    { command: 'brew list', explanation: 'Liste les programmes installés avec Homebrew.' },
  ],
  winget: [
    { command: 'winget search vscode', explanation: 'Cherche un logiciel dans le catalogue et affiche son identifiant.' },
    { command: 'winget install Git.Git', explanation: 'Installe un logiciel à partir de son identifiant exact.' },
    { command: 'winget list', explanation: 'Liste les logiciels installés sur la machine.' },
  ],

  // ─── Permissions & Utilisateurs ───────────────────────────
  chmod: [
    { command: 'chmod +x projets/script.sh', explanation: 'Rend le script exécutable. Sans ce droit, ./script.sh répond « Permission denied ».', environments: UNIX },
    { command: 'chmod 644 documents/notes.txt', explanation: 'Notation octale : 6 (lecture + écriture) pour toi, 4 (lecture seule) pour le groupe et pour les autres.', environments: UNIX },
    { command: 'chmod go-r projets/.env', explanation: 'Retire la lecture au groupe (g) et aux autres (o). Utile pour un fichier qui contient des mots de passe.', environments: UNIX },
    { command: 'icacls documents\\notes.txt', explanation: 'Affiche les droits du fichier. Windows ne gère pas les droits avec rwx mais avec des listes d\'accès (ACL).', environments: WIN },
  ],
  chown: [
    { command: 'sudo chown user:user documents/notes.txt', explanation: 'Change le propriétaire et le groupe du fichier (propriétaire:groupe). Il faut presque toujours sudo.', environments: UNIX },
    { command: 'sudo chown -R user:user projets', explanation: '-R applique le changement au dossier et à tout son contenu.', environments: UNIX },
    { command: 'icacls documents\\notes.txt /setowner user', explanation: 'Change le propriétaire du fichier sous Windows (dans un terminal administrateur).', environments: WIN },
  ],
  whoami: [
    { command: 'whoami', explanation: 'Affiche le nom de l\'utilisateur connecté. Utile avant une commande sensible, ou après sudo.' },
  ],
  id: [
    { command: 'id', explanation: 'Affiche ton identifiant (uid), ton groupe principal et tous les groupes dont tu fais partie.', environments: UNIX },
    { command: 'id -Gn', explanation: 'Seulement les noms de tes groupes.', environments: UNIX },
    { command: 'whoami /groups', explanation: 'Liste les groupes de ton compte Windows.', environments: WIN },
  ],
  sudo: [
    { command: 'sudo apt update', explanation: 'Lance la commande en administrateur (root). Le terminal demande ton mot de passe, qui ne s\'affiche pas pendant que tu le tapes.', environments: LINUX },
    { command: 'sudo whoami', explanation: 'Répond root : la commande tourne bien en administrateur.', environments: UNIX },
    { command: 'Start-Process powershell -Verb RunAs', explanation: 'Ouvre un nouveau PowerShell en administrateur, après une confirmation de Windows. Windows 11 propose aussi une commande sudo, à activer dans les paramètres.', environments: WIN },
  ],
  umask: [
    { command: 'umask', explanation: 'Affiche le masque actuel : les droits retirés d\'office aux nouveaux fichiers. 022 est la valeur la plus courante.' },
    { command: 'umask 027', explanation: 'Les nouveaux fichiers ne seront plus lisibles par les autres utilisateurs. Valable jusqu\'à la fermeture du terminal.' },
  ],
  getacl: [
    { command: 'Get-Acl documents\\notes.txt', explanation: 'Affiche le propriétaire et les droits d\'accès du fichier.' },
    { command: 'Get-Acl documents\\notes.txt | Format-List', explanation: 'Format-List affiche chaque propriété sur sa propre ligne : plus lisible.' },
  ],

  // ─── Processus & Tâches ───────────────────────────────────
  ps: [
    { command: 'ps', explanation: 'Liste les processus lancés depuis ce terminal.', environments: UNIX },
    { command: 'ps aux', explanation: 'Tous les processus de la machine, avec leur propriétaire, leur numéro (PID) et leur usage du processeur et de la mémoire.', environments: UNIX },
    { command: 'Get-Process', explanation: 'Liste les processus en cours, avec leur numéro (Id) et leur mémoire.', environments: WIN },
    { command: 'tasklist', explanation: 'La commande Windows classique, qui fonctionne aussi dans PowerShell.', environments: WIN },
  ],
  kill: [
    { command: 'kill 1234', explanation: 'Demande au processus n° 1234 de s\'arrêter proprement (signal TERM). Son numéro se trouve avec ps.', environments: UNIX },
    { command: 'kill -9 1234', explanation: 'Force l\'arrêt immédiat (signal KILL), sans laisser le programme sauvegarder. En dernier recours.', environments: UNIX },
    { command: 'Stop-Process -Id 1234', explanation: 'Arrête le processus n° 1234. Son numéro se trouve avec Get-Process.', environments: WIN },
    { command: 'Stop-Process -Name notepad', explanation: 'Arrête un programme par son nom plutôt que par son numéro.', environments: WIN },
  ],
  top_htop: [
    { command: 'top', explanation: 'Tableau de bord en direct des processus, triés par usage du processeur. q pour quitter.', environments: UNIX },
    { command: 'htop', explanation: 'Une version plus lisible et colorée de top, souvent à installer (apt install htop, brew install htop).', environments: UNIX },
    { command: 'tasklist', explanation: 'Liste les processus. Pour une vue en direct, ouvre le Gestionnaire des tâches (Ctrl+Maj+Échap).', environments: WIN },
  ],
  jobs: [
    { command: 'sleep 100 &', explanation: 'Le & lance la commande en arrière-plan : le terminal te rend la main tout de suite.', environments: UNIX },
    { command: 'jobs', explanation: 'Liste les tâches en arrière-plan de ce terminal, avec leur numéro.', environments: UNIX },
    { command: 'Start-Job { Start-Sleep 100 }', explanation: 'Lance le bloc de commandes entre accolades en arrière-plan.', environments: WIN },
    { command: 'Get-Job', explanation: 'Liste les tâches en arrière-plan et leur état.', environments: WIN },
  ],
  bg: [
    { command: 'bg %1', explanation: 'Relance en arrière-plan la tâche n° 1, par exemple après l\'avoir mise en pause avec Ctrl+Z.', environments: UNIX },
    { command: 'Start-Job { Start-Sleep 100 }', explanation: 'PowerShell n\'a pas de bg : on lance directement la tâche en arrière-plan.', environments: WIN },
  ],
  fg: [
    { command: 'fg %1', explanation: 'Ramène la tâche n° 1 au premier plan : elle reprend le contrôle du terminal.', environments: UNIX },
    { command: 'fg', explanation: 'Sans numéro, ramène la dernière tâche lancée.', environments: UNIX },
    { command: 'Receive-Job -Id 1 -Wait', explanation: 'Attend la fin de la tâche n° 1 et affiche son résultat.', environments: WIN },
  ],

  // ─── Pipes & Redirections ─────────────────────────────────
  redirect_output: [
    { command: 'echo "Bonjour" > salut.txt', explanation: '> envoie la sortie dans un fichier au lieu de l\'écran. Le fichier est créé, ou écrasé s\'il existait.' },
    { command: 'echo "Encore" >> salut.txt', explanation: '>> ajoute à la fin du fichier sans effacer ce qu\'il contient.' },
    { command: 'ls > liste.txt', explanation: 'Enregistre la liste des fichiers dans liste.txt.', environments: UNIX },
    { command: 'Get-ChildItem | Out-File liste.txt', explanation: 'Out-File est la forme longue de > dans PowerShell.', environments: WIN },
  ],
  pipes: [
    { command: 'ls | wc -l', explanation: 'Le | envoie la sortie de ls à wc, qui compte les lignes.', environments: UNIX },
    { command: 'cat documents/notes.txt | grep Pratiquer', explanation: 'Filtre le contenu du fichier pour ne garder que la ligne qui contient « Pratiquer ».', environments: UNIX },
    { command: 'ps aux | grep bash', explanation: 'Cherche un programme précis dans la longue liste des processus.', environments: UNIX },
    { command: 'Get-Content documents\\notes.txt | Select-String Pratiquer', explanation: 'Dans PowerShell, le pipe transporte des objets : ici, les lignes du fichier, filtrées par Select-String.', environments: WIN },
  ],
  tee: [
    { command: 'ls | tee liste.txt', explanation: 'Affiche la sortie à l\'écran ET l\'écrit dans liste.txt, comme un raccord en T de plomberie.', environments: UNIX },
    { command: 'ls | tee -a liste.txt', explanation: '-a ajoute au fichier au lieu de l\'écraser.', environments: UNIX },
    { command: 'Get-ChildItem | Tee-Object liste.txt', explanation: 'L\'équivalent PowerShell de tee.', environments: WIN },
  ],
  redirect_stderr: [
    { command: 'ls inexistant 2> erreurs.txt', explanation: '2> envoie les messages d\'erreur dans un fichier. Les résultats normaux, eux, restent à l\'écran.', environments: UNIX },
    { command: 'ls inexistant 2>/dev/null', explanation: '/dev/null est un trou noir : le message d\'erreur disparaît.', environments: UNIX },
    { command: 'Get-ChildItem inexistant 2>$null', explanation: 'Dans PowerShell, $null joue le rôle de /dev/null.', environments: WIN },
  ],
  redirect_stderr_stdout: [
    { command: 'ls documents inexistant > tout.txt 2>&1', explanation: 'Envoie la sortie normale ET les erreurs dans le même fichier. L\'ordre compte : > d\'abord, 2>&1 ensuite.', environments: UNIX },
    { command: 'ls inexistant 2>&1 | grep inexistant', explanation: 'Fait passer les erreurs dans le pipe, pour pouvoir les filtrer comme du texte normal.', environments: UNIX },
    { command: 'Get-ChildItem inexistant *> tout.txt', explanation: '*> redirige tous les flux de PowerShell (sortie, erreurs, avertissements) vers le fichier.', environments: WIN },
  ],

  // ─── Archives & Compression ───────────────────────────────
  tar: [
    { command: 'tar -czf sauvegarde.tar.gz documents', explanation: 'Crée (c) une archive compressée (z) dans le fichier (f) sauvegarde.tar.gz, avec le dossier documents.' },
    { command: 'tar -tzf sauvegarde.tar.gz', explanation: 'Liste (t) le contenu de l\'archive sans l\'extraire.' },
    { command: 'tar -xzf sauvegarde.tar.gz', explanation: 'Extrait (x) l\'archive dans le dossier courant. Windows 10 et 11 incluent aussi tar.' },
  ],
  zip_unzip: [
    { command: 'zip -r documents.zip documents', explanation: '-r inclut le dossier et tout son contenu dans l\'archive.', environments: UNIX },
    { command: 'unzip documents.zip', explanation: 'Extrait l\'archive dans le dossier courant.', environments: UNIX },
    { command: 'Compress-Archive -Path documents -DestinationPath documents.zip', explanation: 'Crée une archive .zip avec le dossier documents.', environments: WIN },
    { command: 'Expand-Archive documents.zip -DestinationPath extrait', explanation: 'Extrait l\'archive dans le dossier extrait.', environments: WIN },
  ],

  // ─── Variables & Scripts ──────────────────────────────────
  export: [
    { command: 'export EDITOR=nano', explanation: 'Crée une variable d\'environnement, transmise aux programmes lancés depuis ce terminal. Pas d\'espace autour du =.', environments: UNIX },
    { command: 'export PATH="$PATH:$HOME/bin"', explanation: 'Ajoute un dossier au PATH, la liste des dossiers où le shell cherche les commandes. $PATH au début garde les dossiers déjà présents.', environments: UNIX },
    { command: 'echo $EDITOR', explanation: 'Vérifie la valeur de la variable.', environments: UNIX },
    { command: '$env:EDITOR = "notepad"', explanation: 'Crée une variable d\'environnement pour cette session PowerShell. Ici, les espaces autour du = sont permis.', environments: WIN },
    { command: '$env:Path += ";C:\\outils"', explanation: 'Ajoute un dossier au PATH. Sous Windows, les dossiers sont séparés par ; et non par :.', environments: WIN },
  ],
  env: [
    { command: 'env', explanation: 'Liste toutes les variables d\'environnement et leur valeur.', environments: UNIX },
    { command: 'env | grep HOME', explanation: 'Ne garde que les lignes qui parlent de HOME.', environments: UNIX },
    { command: 'Get-ChildItem Env:', explanation: 'Liste toutes les variables d\'environnement : PowerShell les présente comme un disque nommé Env:.', environments: WIN },
    { command: '$env:USERNAME', explanation: 'Affiche une seule variable.', environments: WIN },
  ],
  source: [
    { command: 'source ~/.bashrc', explanation: 'Relit ta configuration dans le terminal actuel : un alias ou une variable que tu viens d\'ajouter s\'applique tout de suite, sans rouvrir le terminal.', environments: LINUX },
    { command: '. ~/.bashrc', explanation: 'Le point suivi d\'une espace est un raccourci de source.', environments: LINUX },
    { command: 'source ~/.zshrc', explanation: 'Même chose pour zsh, le shell par défaut de macOS.', environments: MACOS },
    { command: '. $PROFILE', explanation: 'Recharge ton profil PowerShell, l\'équivalent de ~/.bashrc.', environments: WIN },
  ],
  run_script: [
    { command: 'cd projets', explanation: 'Le script de l\'exemple se trouve dans le dossier projets.' },
    { command: 'chmod +x script.sh', explanation: 'Donne le droit d\'exécution au script. Une seule fois suffit.', environments: UNIX },
    { command: './script.sh', explanation: 'Lance le script du dossier courant. Le ./ est obligatoire : par sécurité, le shell ne cherche pas les commandes dans le dossier courant.', environments: UNIX },
    { command: 'bash script.sh', explanation: 'Lance le script avec bash, même sans droit d\'exécution.', environments: UNIX },
    { command: 'Set-Content bonjour.ps1 \'Write-Output "Bonjour"\'', explanation: 'Crée un petit script PowerShell : les scripts Windows finissent par .ps1.', environments: WIN },
    { command: '.\\bonjour.ps1', explanation: 'Lance le script. Si Windows refuse, autorise tes scripts une fois pour toutes : Set-ExecutionPolicy -Scope CurrentUser RemoteSigned.', environments: WIN },
  ],
  crontab: [
    { command: 'crontab -l', explanation: 'Liste tes tâches planifiées.', environments: UNIX },
    { command: 'crontab -e', explanation: 'Ouvre l\'éditeur pour ajouter une tâche. Une ligne comme 0 9 * * 1-5 ~/sauvegarde.sh lance le script à 9 h, du lundi au vendredi.', environments: UNIX },
    { command: 'Get-ScheduledTask', explanation: 'Liste les tâches planifiées de Windows, l\'équivalent de cron.', environments: WIN },
  ],
  printenv: [
    { command: 'printenv', explanation: 'Liste toutes les variables d\'environnement.' },
    { command: 'printenv HOME', explanation: 'Affiche une seule variable. Ici, pas de $ devant le nom.' },
  ],

  // ─── Réseau & SSH ─────────────────────────────────────────
  ping: [
    { command: 'ping -c 4 google.com', explanation: 'Envoie 4 paquets et mesure le temps de réponse. Sans -c, Linux et macOS continuent jusqu\'à Ctrl+C.', environments: UNIX },
    { command: 'ping -c 4 8.8.8.8', explanation: 'On peut viser une adresse IP. Si l\'IP répond mais pas le nom de domaine, le problème vient du DNS.', environments: UNIX },
    { command: 'ping google.com', explanation: 'Windows envoie 4 paquets par défaut, puis s\'arrête.', environments: WIN },
    { command: 'ping -n 10 google.com', explanation: 'Sous Windows, -n choisit le nombre de paquets (et non -c).', environments: WIN },
  ],
  curl: [
    { command: 'curl https://api.github.com', explanation: 'Télécharge la réponse d\'une adresse et l\'affiche dans le terminal.' },
    { command: 'curl -I https://example.com', explanation: '-I ne demande que les en-têtes de la réponse : code de statut, type de contenu, taille.' },
    { command: 'curl -L -o page.html https://example.com', explanation: '-o enregistre la réponse dans un fichier et -L suit les redirections.' },
    { command: 'Invoke-WebRequest -Uri https://api.github.com', explanation: 'La commande PowerShell équivalente, qui renvoie un objet avec le code de statut, les en-têtes et le contenu.', environments: WIN },
  ],
  wget: [
    { command: 'wget https://example.com/fichier.zip', explanation: 'Télécharge le fichier dans le dossier courant.', environments: LINUX },
    { command: 'wget -O archive.zip https://example.com/fichier.zip', explanation: '-O choisit le nom du fichier enregistré.', environments: LINUX },
    { command: 'wget -c https://example.com/fichier.zip', explanation: '-c reprend un téléchargement interrompu au lieu de tout recommencer.', environments: LINUX },
    { command: 'curl -O https://example.com/fichier.zip', explanation: 'macOS n\'a pas wget par défaut : curl -O télécharge le fichier sous son nom d\'origine.', environments: MACOS },
    { command: 'Invoke-WebRequest -Uri https://example.com/fichier.zip -OutFile fichier.zip', explanation: '-OutFile enregistre le fichier. Sans lui, la réponse est seulement affichée.', environments: WIN },
  ],
  dns: [
    { command: 'nslookup google.com', explanation: 'Demande à ton serveur DNS l\'adresse IP qui correspond au nom de domaine.' },
    { command: 'dig +short google.com', explanation: 'Réponse courte : seulement les adresses IP.', environments: UNIX },
    { command: 'dig @1.1.1.1 google.com', explanation: 'Pose la question à un serveur DNS précis (ici celui de Cloudflare), pour comparer avec le tien.', environments: UNIX },
    { command: 'Resolve-DnsName google.com', explanation: 'L\'équivalent PowerShell, plus détaillé que nslookup.', environments: WIN },
  ],
  ssh: [
    { command: 'ssh user@serveur.example.com', explanation: 'Ouvre une session sur une machine distante, au nom de l\'utilisateur user. Tape exit pour revenir.' },
    { command: 'ssh -p 2222 user@serveur.example.com', explanation: '-p (minuscule) choisit le port, quand le serveur n\'écoute pas sur le port 22 habituel.' },
    { command: 'ssh-keygen -t ed25519 -C "moi@example.com"', explanation: 'Crée une paire de clés. La clé privée ne quitte jamais ta machine ; la clé publique (.pub) se dépose sur les serveurs.' },
    { command: 'ssh-copy-id user@serveur.example.com', explanation: 'Dépose ta clé publique sur le serveur : tu t\'y connecteras ensuite sans mot de passe.', environments: UNIX },
  ],
  scp: [
    { command: 'scp documents/notes.txt user@serveur.example.com:/home/user/', explanation: 'Copie un fichier vers une machine distante. Le : sépare le nom du serveur du chemin sur ce serveur.' },
    { command: 'scp -r documents user@serveur.example.com:/home/user/', explanation: '-r copie un dossier entier.' },
    { command: 'scp -P 2222 documents/notes.txt user@serveur.example.com:/home/user/', explanation: '-P (majuscule) choisit le port, alors que ssh utilise -p minuscule.' },
    { command: 'scp user@serveur.example.com:/home/user/rapport.pdf .', explanation: 'Dans l\'autre sens : récupère un fichier distant dans le dossier courant (.).' },
  ],

  // ─── Git Fondamentaux ─────────────────────────────────────
  git_init: [
    { command: 'git init', explanation: 'Transforme le dossier courant en dépôt Git : un dossier caché .git apparaît pour stocker l\'historique.' },
    { command: 'git init mon-projet', explanation: 'Crée le dossier mon-projet et l\'initialise directement.' },
  ],
  git_config: [
    { command: 'git config --global user.name "Alice Martin"', explanation: 'Ton nom, inscrit dans chacun de tes commits. --global : valable pour tous tes dépôts.' },
    { command: 'git config --global user.email "alice@example.com"', explanation: 'Ton adresse, inscrite dans chaque commit. Sur GitHub, elle relie tes commits à ton compte.' },
    { command: 'git config --list', explanation: 'Affiche la configuration active.' },
  ],
  git_add: [
    { command: 'git add README.md', explanation: 'Place le fichier dans la zone de préparation : il fera partie du prochain commit.' },
    { command: 'git add .', explanation: 'Prépare tous les changements du dossier courant. Vérifie d\'abord avec git status ce qui va partir.' },
  ],
  git_commit: [
    { command: 'git commit -m "feat: ajoute la page contact"', explanation: 'Enregistre les changements préparés, avec un message qui dit ce qui change.' },
    { command: 'git commit -am "fix: corrige le lien du menu"', explanation: '-a prépare d\'abord les fichiers déjà suivis et modifiés. Les fichiers nouveaux, eux, demandent toujours un git add.' },
  ],
  git_status: [
    { command: 'git status', explanation: 'Montre ta branche et l\'état des fichiers : modifiés, préparés pour le commit, ou pas encore suivis.' },
    { command: 'git status -s', explanation: 'Version courte : une ligne par fichier (M modifié, A ajouté, ?? pas suivi).' },
  ],
  git_log: [
    { command: 'git log', explanation: 'L\'historique complet des commits, du plus récent au plus ancien. q pour quitter.' },
    { command: 'git log --oneline', explanation: 'Un commit par ligne : identifiant court et message.' },
    { command: 'git log --graph --oneline --all', explanation: 'Dessine toutes les branches et leurs fusions.' },
  ],
  git_diff: [
    { command: 'git diff', explanation: 'Les changements pas encore préparés avec git add.' },
    { command: 'git diff --staged', explanation: 'Les changements préparés, ceux qui partiront dans le prochain commit.' },
    { command: 'git diff main feature/login', explanation: 'Compare deux branches.' },
  ],
  gitignore: [
    { command: 'echo "node_modules/" >> .gitignore', explanation: 'Ajoute une règle au fichier .gitignore : Git ignorera tout le dossier node_modules.' },
    { command: 'echo "*.log" >> .gitignore', explanation: '* remplace n\'importe quel texte : tous les fichiers qui finissent par .log sont ignorés.' },
    { command: 'cat .gitignore', explanation: 'Affiche les règles : une par ligne.', environments: UNIX },
    { command: 'Get-Content .gitignore', explanation: 'Affiche les règles : une par ligne.', environments: WIN },
  ],
  git_branch: [
    { command: 'git branch', explanation: 'Liste les branches ; l\'étoile marque celle où tu te trouves.' },
    { command: 'git branch feature/contact', explanation: 'Crée la branche, sans t\'y déplacer.' },
    { command: 'git switch feature/contact', explanation: 'Bascule sur la branche.' },
    { command: 'git switch -c feature/menu', explanation: 'Crée la branche et bascule dessus en une seule commande.' },
  ],
  git_merge: [
    { command: 'git merge feature/login', explanation: 'Intègre dans ta branche actuelle les commits de feature/login.' },
    { command: 'git merge --no-ff feature/login', explanation: 'Crée toujours un commit de fusion, même quand Git pourrait simplement avancer ta branche : l\'historique garde la trace de la branche.' },
  ],

  // ─── GitHub & Collaboration ───────────────────────────────
  git_remote: [
    { command: 'git remote -v', explanation: 'Liste les dépôts distants et leurs adresses.' },
    { command: 'git remote add upstream https://github.com/alice/mon-projet.git', explanation: 'Relie ton dépôt à un autre dépôt distant, sous le nom upstream. Le premier s\'appelle en général origin.' },
  ],
  git_push: [
    { command: 'git push -u origin main', explanation: 'Premier envoi : publie la branche main et la relie à origin. Ensuite, git push suffit.' },
    { command: 'git push', explanation: 'Envoie tes nouveaux commits vers la branche distante reliée.' },
  ],
  git_pull: [
    { command: 'git pull', explanation: 'Récupère les nouveaux commits du dépôt distant et les fusionne dans ta branche.' },
    { command: 'git pull origin main', explanation: 'Précise le dépôt distant et la branche à récupérer.' },
  ],
  git_fetch: [
    { command: 'git fetch', explanation: 'Télécharge les nouveautés du dépôt distant sans toucher à tes fichiers : tu décides ensuite quoi fusionner.' },
    { command: 'git fetch origin', explanation: 'Précise le dépôt distant à interroger.' },
  ],
  git_clone: [
    { command: 'git clone https://github.com/alice/mon-projet.git', explanation: 'Copie le dépôt complet, avec tout son historique, dans un nouveau dossier mon-projet.' },
    { command: 'git clone git@github.com:alice/mon-projet.git', explanation: 'Même chose par SSH : il faut une clé SSH ajoutée à ton compte GitHub.' },
  ],
  git_rebase: [
    { command: 'git rebase main', explanation: 'Rejoue tes commits par-dessus la dernière version de main, pour un historique en ligne droite.' },
    { command: 'git rebase -i HEAD~3', explanation: 'Mode interactif : réordonne, fusionne ou renomme tes 3 derniers commits.' },
  ],
  git_cherry_pick: [
    { command: 'git cherry-pick a1b2c3d', explanation: 'Copie un seul commit, repéré par son identifiant (git log --oneline), dans ta branche actuelle.' },
    { command: 'git cherry-pick a1b2c3d..e4f5a6b', explanation: 'Copie une série de commits. Attention : le premier de la plage (a1b2c3d) n\'est pas inclus.' },
  ],
};

/**
 * Commands the practice terminal does not simulate yet, per environment. The
 * reference says so, so a learner who tries one in a lesson knows why it fails.
 * `commandReference.test.ts` keeps this list in sync with the engine.
 */
export const NOT_SIMULATED: Record<string, EnvironmentId[]> = {
  tree: ['linux', 'macos', 'windows'],
  less_more: ['linux', 'macos', 'windows'],
  find: ['linux', 'macos', 'windows'],
  getcomputerinfo: ['windows'],
  alias: ['linux', 'macos', 'windows'],
  id: ['linux', 'macos', 'windows'],
  umask: ['linux', 'macos'],
  jobs: ['linux', 'macos', 'windows'],
  bg: ['linux', 'macos', 'windows'],
  fg: ['linux', 'macos', 'windows'],
  tar: ['linux', 'macos', 'windows'],
  zip_unzip: ['linux', 'macos', 'windows'],
};
