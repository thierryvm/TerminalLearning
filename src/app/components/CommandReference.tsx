import { useMemo, useState } from 'react';
import { Search, Terminal, ChevronDown, ChevronRight, ExternalLink, BookOpen } from 'lucide-react';
import { useEnvironment } from '../context/EnvironmentContext';
import { commandCatalogue } from '../data/commandCatalogue';
import type { EnrichedCommand, EnvironmentId } from '../types/curriculum';
import { usePageSEO } from '../hooks/useLessonSEO';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { AiTutorPanel } from './ai/AiTutorPanel';
import { useUserRole } from '@/lib/hooks/useUserRole';

/**
 * Command reference page (/app/reference).
 *
 * SINGLE SOURCE OF TRUTH — this page derives its entire command list from
 * `commandCatalogue.ts` (the canonical catalogue). There is intentionally NO
 * local command array here: the two-sources divergence that used to exist
 * (a separate hardcoded list) is guarded against by
 * `src/test/commandReferenceSource.test.ts`. To add or edit a command, edit
 * the catalogue — it flows through here automatically.
 */

type SelectedEnv = Exclude<EnvironmentId, 'wsl'>;

interface FlatCommand extends EnrichedCommand {
  categoryLabel: string;
}

// Flatten the catalogue → one list with the parent category label attached.
const allCommands: FlatCommand[] = commandCatalogue.flatMap((cat) =>
  cat.commands.map((cmd) => ({ ...cmd, categoryLabel: cat.label })),
);

// Filter pills follow the catalogue order so new categories appear automatically.
const categories = ['Tous', ...commandCatalogue.map((c) => c.label)];

const categoryColors: Record<string, string> = {
  Navigation: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Fichiers & Dossiers': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'Lecture de fichiers': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'Recherche & Inspection': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  Système: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  'Permissions & Utilisateurs': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Processus & Tâches': 'text-red-400 bg-red-500/10 border-red-500/20',
  'Pipes & Redirections': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  'Archives & Compression': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  'Variables & Scripts': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'Réseau & SSH': 'text-sky-400 bg-sky-500/10 border-sky-500/20',
};

// Per-OS metadata. `lit` is used when the command supports the OS, `dim` when not.
const OS_META: Record<SelectedEnv, { short: string; label: string; lit: string }> = {
  linux: { short: 'Linux', label: 'Linux / bash', lit: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  macos: { short: 'macOS', label: 'macOS / zsh', lit: 'text-violet-300 bg-violet-500/15 border-violet-500/30' },
  windows: { short: 'Win', label: 'Windows / PowerShell', lit: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30' },
};
const OS_DIM = 'text-[var(--github-text-secondary)]/40 bg-transparent border-[var(--github-border-primary)]';
const OS_ORDER: SelectedEnv[] = ['linux', 'macos', 'windows'];

/** Resolve the command string to show for a given environment. */
function commandForEnv(cmd: EnrichedCommand, env: SelectedEnv): { command: string; shell?: string } {
  const variant = cmd.variants.find((v) => v.environment === env);
  if (variant) return { command: variant.command, shell: variant.shell };
  // No env-specific variant → the canonical (Unix) form. `name` may bundle
  // alternatives ("echo / Write-Output"); the first token is the native command.
  return { command: cmd.name.split(' / ')[0] };
}

function highlightExampleLine(line: string, i: number) {
  if (line.startsWith('$')) {
    return (
      <div key={i}>
        <span className="text-emerald-400">$</span>
        <span className="text-[var(--github-text-primary)]">{line.slice(1)}</span>
      </div>
    );
  }
  if (line.startsWith('PS>')) {
    return (
      <div key={i}>
        <span className="text-cyan-400">PS&gt;</span>
        <span className="text-[var(--github-text-primary)]">{line.slice(3)}</span>
      </div>
    );
  }
  if (line.startsWith('#')) {
    return (
      <div key={i} className="text-[var(--github-text-secondary)]">
        {line}
      </div>
    );
  }
  return (
    <div key={i} className="text-[#a5d6ff]">
      {line}
    </div>
  );
}

export function CommandReference() {
  const { selectedEnv } = useEnvironment();
  const { role } = useUserRole();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [expanded, setExpanded] = useState<string | null>(null);

  usePageSEO({
    title: 'Référence des commandes — Terminal Learning',
    description:
      'Référence complète de 59 commandes terminal : compatibilité et variantes par OS (Linux / macOS / Windows PowerShell), syntaxe, exemples et erreurs courantes. Navigation, fichiers, permissions, réseau, Git.',
    path: '/app/reference',
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allCommands.filter((cmd) => {
      // Only show commands available on the selected OS (replaces hideOn/showOnly).
      if (!cmd.compatibility.includes(selectedEnv)) return false;
      const matchesCategory = activeCategory === 'Tous' || cmd.categoryLabel === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      const envCmd = commandForEnv(cmd, selectedEnv).command.toLowerCase();
      return (
        cmd.name.toLowerCase().includes(q) ||
        cmd.summary.toLowerCase().includes(q) ||
        cmd.syntax.toLowerCase().includes(q) ||
        envCmd.includes(q)
      );
    });
  }, [search, activeCategory, selectedEnv]);

  const grouped = useMemo(
    () =>
      filtered.reduce<Record<string, FlatCommand[]>>((acc, cmd) => {
        (acc[cmd.categoryLabel] ??= []).push(cmd);
        return acc;
      }, {}),
    [filtered],
  );

  const envMeta = OS_META[selectedEnv] ?? OS_META.linux;

  return (
    // md:pr-32 reserves the FAB clear zone (cf. Dashboard).
    <div className="min-h-full bg-[var(--github-bg)] text-[var(--github-text-primary)] p-6 lg:p-8 md:pr-32">
      {/* AI tutor panel — surfaced on the command reference too because it's
          a natural place to ask "how does X compare to Y?" follow-up questions. */}
      <AiTutorPanel lang="fr" role={role} />
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Terminal size={22} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-[var(--github-text-primary)]">Référence des commandes</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${envMeta.lit}`}>{envMeta.label}</span>
              <p className="text-[var(--github-text-secondary)] text-sm">
                {filtered.length} commande{filtered.length > 1 ? 's' : ''} sur votre environnement
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--github-text-secondary)]" />
          <Input
            type="text"
            placeholder="Rechercher une commande..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)] rounded-xl pl-9 pr-4 py-2.5 text-base md:text-sm text-[var(--github-text-primary)] placeholder-[#8b949e] outline-none focus:border-[#58a6ff] transition-colors font-mono"
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
            <span
              className={`text-xs px-2.5 py-1 rounded-full border ${categoryColors[category] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/20'}`}
            >
              {category}
            </span>
            <span className="text-xs text-[var(--github-text-secondary)]">{cmds.length}</span>
          </div>

          <div className="space-y-2">
            {cmds.map((cmd) => {
              const key = `${category}-${cmd.id}`;
              const isOpen = expanded === key;
              const envCmd = commandForEnv(cmd, selectedEnv);

              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  className="bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)] rounded-xl overflow-hidden hover:border-[#58a6ff]/30 focus-visible:border-[#58a6ff] focus-visible:outline-none transition-colors cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpanded(isOpen ? null : key);
                    }
                  }}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <code className="text-emerald-400 font-mono text-sm shrink-0 w-28 truncate">{envCmd.command}</code>
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--github-text-primary)] text-sm truncate">{cmd.summary}</p>
                      {!isOpen && (
                        <p className="text-[var(--github-text-secondary)] text-xs font-mono truncate mt-0.5">
                          {cmd.syntax}
                        </p>
                      )}
                    </div>
                    {/* OS compatibility badges — at a glance, which OS supports this */}
                    <div className="hidden sm:flex items-center gap-1 shrink-0">
                      {OS_ORDER.map((os) => {
                        const supported = cmd.compatibility.includes(os);
                        return (
                          <span
                            key={os}
                            className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${supported ? OS_META[os].lit : OS_DIM}`}
                            title={supported ? `Disponible sur ${OS_META[os].label}` : `Indisponible sur ${OS_META[os].short}`}
                          >
                            {OS_META[os].short}
                          </span>
                        );
                      })}
                    </div>
                    {isOpen ? (
                      <ChevronDown size={16} className="text-[var(--github-text-secondary)] shrink-0" />
                    ) : (
                      <ChevronRight size={16} className="text-[var(--github-text-secondary)] shrink-0" />
                    )}
                  </div>

                  {isOpen && (
                    <div className="border-t border-[var(--github-border-primary)] px-4 py-3 space-y-3">
                      {/* The command as it's written on the user's current OS */}
                      <div>
                        <p className="text-xs text-[var(--github-text-secondary)] mb-1">
                          Sur votre environnement ({envMeta.label})
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-emerald-300 font-mono text-sm bg-[var(--github-bg)] rounded px-2 py-1">
                            {envCmd.command}
                          </code>
                          {envCmd.shell && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--github-border-primary)] text-[var(--github-text-secondary)]">
                              {envCmd.shell}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Compatibility + recommended OS badges */}
                      <div className="flex flex-wrap gap-4">
                        <div>
                          <p className="text-xs text-[var(--github-text-secondary)] mb-1">Compatibilité</p>
                          <div className="flex items-center gap-1.5">
                            {OS_ORDER.map((os) => {
                              const supported = cmd.compatibility.includes(os);
                              return (
                                <span
                                  key={os}
                                  className={`text-[11px] px-2 py-0.5 rounded-full border ${supported ? OS_META[os].lit : OS_DIM}`}
                                >
                                  {OS_META[os].short}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        {cmd.recommendedFor.length > 0 && (
                          <div>
                            <p className="text-xs text-[var(--github-text-secondary)] mb-1">Recommandé pour</p>
                            <div className="flex items-center gap-1.5">
                              {cmd.recommendedFor
                                .filter((os): os is SelectedEnv => os !== 'wsl')
                                .map((os) => (
                                  <span key={os} className={`text-[11px] px-2 py-0.5 rounded-full border ${OS_META[os].lit}`}>
                                    {OS_META[os].short}
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-xs text-[var(--github-text-secondary)] mb-1">Syntaxe</p>
                        <code className="text-blue-300 font-mono text-sm">{cmd.syntax}</code>
                      </div>

                      <div>
                        <p className="text-xs text-[var(--github-text-secondary)] mb-1">Description</p>
                        <p className="text-[var(--github-text-primary)] text-sm">{cmd.summary}</p>
                      </div>

                      {cmd.examples.length > 0 && (
                        <div>
                          <p className="text-xs text-[var(--github-text-secondary)] mb-1">Exemples</p>
                          <pre className="bg-[var(--github-bg)] rounded-lg p-3 overflow-x-auto text-sm max-w-full font-mono">
                            {cmd.examples.map((ex, i) => highlightExampleLine(ex, i))}
                          </pre>
                        </div>
                      )}

                      {/* Full per-OS variants — the multi-OS picture in one place */}
                      {cmd.variants.length > 0 && (
                        <div>
                          <p className="text-xs text-[var(--github-text-secondary)] mb-1">Variantes par système</p>
                          <div className="space-y-1">
                            {cmd.variants.map((v, i) => (
                              <div key={`${v.environment}-${i}`} className="flex items-center gap-2 flex-wrap text-sm">
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${v.environment !== 'wsl' ? OS_META[v.environment as SelectedEnv].lit : OS_DIM}`}
                                >
                                  {v.environment !== 'wsl' ? OS_META[v.environment as SelectedEnv].short : 'WSL'}
                                </span>
                                <code className="text-[#a5d6ff] font-mono">{v.command}</code>
                                {v.shell && (
                                  <span className="text-[10px] text-[var(--github-text-secondary)]">({v.shell})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {cmd.commonErrors.length > 0 && (
                        <div>
                          <p className="text-xs text-[var(--github-text-secondary)] mb-1">Erreurs courantes</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            {cmd.commonErrors.map((err, i) => (
                              <li key={i} className="text-[var(--github-text-secondary)] text-sm">
                                {err}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {cmd.officialDocs && cmd.officialDocs.length > 0 && (
                        <div>
                          <p className="text-xs text-[var(--github-text-secondary)] mb-1 flex items-center gap-1">
                            <BookOpen size={12} aria-hidden="true" />
                            Sources officielles
                          </p>
                          <ul className="space-y-0.5">
                            {cmd.officialDocs.map((doc, i) => (
                              <li key={i}>
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`${doc.label} (ouvre dans un nouvel onglet)`}
                                  className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--github-bg)] focus-visible:ring-emerald-500/50 rounded"
                                >
                                  {doc.label}
                                  <ExternalLink size={12} aria-hidden="true" />
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-[var(--github-text-secondary)]">
          <Search size={32} className="mx-auto mb-3 opacity-30" />
          <p>Aucune commande trouvée pour &ldquo;{search}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
