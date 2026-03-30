import { useState } from 'react';
import { Search, Terminal, ChevronDown, ChevronRight } from 'lucide-react';

interface CommandEntry {
  command: string;
  syntax: string;
  description: string;
  example: string;
  category: string;
}

const commands: CommandEntry[] = [
  // Navigation
  { command: 'pwd', syntax: 'pwd', description: 'Affiche le répertoire de travail courant (chemin absolu)', example: '$ pwd\n/home/user', category: 'Navigation' },
  { command: 'ls', syntax: 'ls [options] [chemin]', description: 'Liste le contenu d\'un répertoire', example: '$ ls -la\ndrwxr-xr-x 2 user user 4096 documents', category: 'Navigation' },
  { command: 'cd', syntax: 'cd [chemin]', description: 'Change le répertoire courant. Sans argument, va dans ~', example: '$ cd documents\n$ cd ..\n$ cd ~', category: 'Navigation' },
  { command: 'tree', syntax: 'tree [chemin]', description: 'Affiche l\'arborescence de répertoires (si installé)', example: '$ tree\n.\n├── documents\n└── projets', category: 'Navigation' },

  // Fichiers
  { command: 'mkdir', syntax: 'mkdir [-p] répertoire', description: 'Crée un ou plusieurs répertoires. -p crée les parents si nécessaire', example: '$ mkdir mon-dossier\n$ mkdir -p projets/web/css', category: 'Fichiers & Dossiers' },
  { command: 'touch', syntax: 'touch fichier...', description: 'Crée un fichier vide ou met à jour sa date de modification', example: '$ touch fichier.txt\n$ touch a.txt b.txt', category: 'Fichiers & Dossiers' },
  { command: 'cp', syntax: 'cp [-r] source destination', description: 'Copie un fichier ou un répertoire (-r pour les dossiers)', example: '$ cp src.txt dst.txt\n$ cp -r dossier/ sauvegarde/', category: 'Fichiers & Dossiers' },
  { command: 'mv', syntax: 'mv source destination', description: 'Déplace ou renomme un fichier ou répertoire', example: '$ mv ancien.txt nouveau.txt\n$ mv fichier.txt Documents/', category: 'Fichiers & Dossiers' },
  { command: 'rm', syntax: 'rm [-rf] fichier...', description: 'Supprime des fichiers. -r pour les dossiers, -f pour forcer', example: '$ rm fichier.txt\n$ rm -r dossier/', category: 'Fichiers & Dossiers' },
  { command: 'find', syntax: 'find chemin [options]', description: 'Recherche des fichiers selon différents critères', example: '$ find . -name "*.txt"\n$ find / -type d -name "bin"', category: 'Fichiers & Dossiers' },

  // Lecture
  { command: 'cat', syntax: 'cat fichier...', description: 'Affiche le contenu d\'un ou plusieurs fichiers', example: '$ cat notes.txt\n$ cat a.txt b.txt > combined.txt', category: 'Lecture de fichiers' },
  { command: 'less', syntax: 'less fichier', description: 'Affiche un fichier page par page (q pour quitter)', example: '$ less fichier.log', category: 'Lecture de fichiers' },
  { command: 'head', syntax: 'head [-n N] fichier', description: 'Affiche les N premières lignes (10 par défaut)', example: '$ head -n 5 fichier.txt', category: 'Lecture de fichiers' },
  { command: 'tail', syntax: 'tail [-n N] [-f] fichier', description: 'Affiche les N dernières lignes. -f suit le fichier en temps réel', example: '$ tail -n 20 fichier.log\n$ tail -f access.log', category: 'Lecture de fichiers' },
  { command: 'grep', syntax: 'grep [-ni] motif fichier', description: 'Recherche des lignes correspondant à un motif', example: '$ grep "erreur" log.txt\n$ grep -n "TODO" code.js', category: 'Lecture de fichiers' },
  { command: 'wc', syntax: 'wc [-lwc] fichier', description: 'Compte les lignes (-l), mots (-w) et octets (-c)', example: '$ wc -l fichier.txt\n$ ls | wc -l', category: 'Lecture de fichiers' },

  // Permissions
  { command: 'chmod', syntax: 'chmod mode fichier', description: 'Change les permissions. Mode en octal (755) ou symbolique (+x)', example: '$ chmod +x script.sh\n$ chmod 644 fichier.txt\n$ chmod 755 dossier/', category: 'Permissions' },
  { command: 'chown', syntax: 'chown [-R] user:group fichier', description: 'Change le propriétaire et le groupe d\'un fichier', example: '$ chown user:user fichier.txt\n$ chown -R www-data /var/www', category: 'Permissions' },
  { command: 'umask', syntax: 'umask [mode]', description: 'Affiche ou définit le masque de permissions par défaut', example: '$ umask\n0022\n$ umask 027', category: 'Permissions' },

  // Processus
  { command: 'ps', syntax: 'ps [aux]', description: 'Liste les processus en cours. aux pour tous les processus', example: '$ ps\n$ ps aux\n$ ps aux | grep python', category: 'Processus' },
  { command: 'kill', syntax: 'kill [-signal] PID', description: 'Envoie un signal à un processus (15=SIGTERM, 9=SIGKILL)', example: '$ kill 1234\n$ kill -9 5678', category: 'Processus' },
  { command: 'top', syntax: 'top', description: 'Affiche les processus en temps réel avec leur utilisation ressources', example: '$ top', category: 'Processus' },
  { command: 'jobs', syntax: 'jobs', description: 'Affiche les tâches en arrière-plan du shell courant', example: '$ sleep 100 &\n$ jobs\n[1]+ Running sleep 100', category: 'Processus' },
  { command: 'bg', syntax: 'bg [%n]', description: 'Reprend une tâche suspendue en arrière-plan', example: '$ bg %1', category: 'Processus' },
  { command: 'fg', syntax: 'fg [%n]', description: 'Ramène une tâche en avant-plan', example: '$ fg %1', category: 'Processus' },

  // Redirection
  { command: '>', syntax: 'commande > fichier', description: 'Redirige la sortie vers un fichier (écrase le contenu)', example: '$ echo "Bonjour" > salut.txt\n$ ls > liste.txt', category: 'Redirection & Pipes' },
  { command: '>>', syntax: 'commande >> fichier', description: 'Ajoute la sortie à la fin d\'un fichier', example: '$ echo "Ligne 2" >> fichier.txt', category: 'Redirection & Pipes' },
  { command: '<', syntax: 'commande < fichier', description: 'Lit l\'entrée depuis un fichier', example: '$ sort < liste.txt', category: 'Redirection & Pipes' },
  { command: '|', syntax: 'commande1 | commande2', description: 'Connecte la sortie d\'une commande à l\'entrée de la suivante', example: '$ ls | grep ".txt"\n$ cat log | grep error | wc -l', category: 'Redirection & Pipes' },

  // Système
  { command: 'echo', syntax: 'echo [texte]', description: 'Affiche du texte dans le terminal', example: '$ echo "Bonjour"\n$ echo $HOME', category: 'Système' },
  { command: 'whoami', syntax: 'whoami', description: 'Affiche le nom de l\'utilisateur courant', example: '$ whoami\nuser', category: 'Système' },
  { command: 'date', syntax: 'date [format]', description: 'Affiche la date et l\'heure courantes', example: '$ date\nLun 30 mar 2026 10:00:00', category: 'Système' },
  { command: 'uname', syntax: 'uname [-a]', description: 'Affiche des informations sur le système', example: '$ uname -a\nLinux host 5.15.0 #1 SMP x86_64', category: 'Système' },
  { command: 'history', syntax: 'history [n]', description: 'Affiche l\'historique des commandes', example: '$ history\n  1  pwd\n  2  ls -la', category: 'Système' },
  { command: 'man', syntax: 'man commande', description: 'Affiche le manuel d\'une commande', example: '$ man ls\n$ man grep', category: 'Système' },
  { command: 'clear', syntax: 'clear', description: 'Efface l\'écran du terminal', example: '$ clear', category: 'Système' },
  { command: 'alias', syntax: 'alias [name=\'command\']', description: 'Crée un alias pour une commande', example: '$ alias ll=\'ls -la\'\n$ alias', category: 'Système' },
];

const categories = ['Tous', 'Navigation', 'Fichiers & Dossiers', 'Lecture de fichiers', 'Permissions', 'Processus', 'Redirection & Pipes', 'Système'];

const categoryColors: Record<string, string> = {
  'Navigation': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Fichiers & Dossiers': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'Lecture de fichiers': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'Permissions': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Processus': 'text-red-400 bg-red-500/10 border-red-500/20',
  'Redirection & Pipes': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  'Système': 'text-gray-400 bg-gray-500/10 border-gray-500/20',
};

export function CommandReference() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = commands.filter((cmd) => {
    const matchesSearch =
      !search ||
      cmd.command.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'Tous' || cmd.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const grouped = filtered.reduce<Record<string, CommandEntry[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

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
            <p className="text-[#8b949e] text-sm">{commands.length} commandes essentielles</p>
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
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              activeCategory === cat
                ? 'bg-[#e6edf3] text-[#0d1117] border-[#e6edf3]'
                : 'text-[#8b949e] border-[#30363d] hover:border-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-xs text-[#8b949e] mb-4">{filtered.length} commande{filtered.length !== 1 ? 's' : ''}</p>

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
              return (
                <div
                  key={key}
                  className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden hover:border-[#58a6ff]/30 transition-colors cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : key)}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <code className="text-emerald-400 font-mono text-sm shrink-0 w-20">{cmd.command}</code>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#c9d1d9] text-sm truncate">{cmd.description}</p>
                      {!isOpen && (
                        <p className="text-[#8b949e] text-xs font-mono truncate mt-0.5">{cmd.syntax}</p>
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
                        <code className="text-blue-300 font-mono text-sm">{cmd.syntax}</code>
                      </div>
                      <div>
                        <p className="text-xs text-[#8b949e] mb-1">Description</p>
                        <p className="text-[#c9d1d9] text-sm">{cmd.description}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8b949e] mb-1">Exemple</p>
                        <pre className="bg-[#0d1117] rounded-lg p-3 overflow-x-auto text-sm">
                          {cmd.example.split('\n').map((line, i) => (
                            <div key={i}>
                              {line.startsWith('$') ? (
                                <>
                                  <span className="text-emerald-400">$</span>
                                  <span className="text-[#e6edf3]">{line.slice(1)}</span>
                                </>
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
          <p>Aucune commande trouvée pour "{search}"</p>
        </div>
      )}
    </div>
  );
}
