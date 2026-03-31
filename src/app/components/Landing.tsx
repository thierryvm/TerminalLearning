import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Terminal, ChevronRight, Github, BookOpen, Zap, Shield, Heart, CheckCircle2, Clock, Star } from 'lucide-react';

const FEATURES = [
  {
    icon: Terminal,
    title: 'Émulateur terminal réel',
    description: 'Pratique les commandes dans un vrai terminal interactif — pas de la théorie, de la pratique.',
    color: 'text-emerald-400',
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/5',
  },
  {
    icon: BookOpen,
    title: '6 modules progressifs',
    description: 'Navigation, fichiers, lecture, permissions, processus, redirection — du débutant au confirmé.',
    color: 'text-blue-400',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/5',
  },
  {
    icon: Zap,
    title: 'Progression sauvegardée',
    description: 'Reprends exactement où tu t\'es arrêté. Tes accomplissements sont mémorisés localement.',
    color: 'text-amber-400',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
  },
  {
    icon: Shield,
    title: '100% gratuit & open source',
    description: 'Pas d\'inscription, pas de paywall, pas de tracking agressif. Juste apprendre.',
    color: 'text-purple-400',
    border: 'border-purple-500/20',
    bg: 'bg-purple-500/5',
  },
];

const ROADMAP = [
  { phase: 'Phase 0', label: 'Lancement public', status: 'done' },
  { phase: 'Phase 1', label: 'Landing + donations', status: 'current' },
  { phase: 'Phase 2', label: 'Analytics + monitoring', status: 'soon' },
  { phase: 'Phase 3', label: 'Comptes utilisateurs', status: 'future' },
  { phase: 'Phase 4', label: 'Admin panel sécurisé', status: 'future' },
];

const SUPPORTERS: string[] = [
  // Populated when Hall of Fame is active
];

/** Landing page — public entry point at "/" */
export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className="border-b border-[#30363d]/50 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Terminal size={18} className="text-emerald-400" />
          </div>
          <span className="font-mono text-[#e6edf3] text-sm">Terminal Learning</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/thierryvm/TerminalLearning"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
            aria-label="GitHub"
          >
            <Github size={18} />
          </a>
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] text-sm font-medium transition-colors"
          >
            Commencer <ChevronRight size={14} />
          </button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        {/* Glow background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <div className="w-[600px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Gratuit · Open Source · Pour débutants
          </span>

          <h1 className="text-4xl md:text-6xl font-bold text-[#e6edf3] leading-tight mb-6">
            Maîtrise le terminal{' '}
            <span className="text-emerald-400">pas à pas</span>
          </h1>

          <p className="text-[#8b949e] text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Un environnement interactif pour apprendre les commandes du terminal.
            Pratique réelle, progression sauvegardée, aucune inscription requise.
          </p>

          {/* Terminal preview card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative max-w-xl mx-auto mb-10 rounded-xl border border-[#30363d] bg-[#161b22] overflow-hidden shadow-2xl shadow-black/50"
          >
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#30363d] bg-[#0d1117]">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 text-xs text-[#8b949e] font-mono">terminal-learning ~ bash</span>
            </div>
            <div className="p-5 text-left space-y-2 font-mono text-sm">
              <div className="text-[#8b949e]">
                <span className="text-emerald-400">user@terminal</span>
                <span className="text-[#8b949e]">:</span>
                <span className="text-blue-400">~</span>
                <span className="text-[#8b949e]">$ </span>
                <span className="text-[#e6edf3]">ls -la</span>
              </div>
              <div className="text-[#8b949e] space-y-0.5">
                <div>total 48</div>
                <div><span className="text-blue-400">drwxr-xr-x</span> documents/ <span className="text-emerald-400">✓</span></div>
                <div><span className="text-blue-400">drwxr-xr-x</span> projets/   <span className="text-emerald-400">✓</span></div>
                <div><span className="text-amber-400">-rw-r--r--</span> script.sh</div>
              </div>
              <div>
                <span className="text-emerald-400">user@terminal</span>
                <span className="text-[#8b949e]">:</span>
                <span className="text-blue-400">~</span>
                <span className="text-[#8b949e]">$ </span>
                <span className="text-[#e6edf3] animate-pulse">▋</span>
              </div>
            </div>
          </motion.div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => navigate('/app')}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] font-semibold text-base transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20"
            >
              <Terminal size={18} />
              Commencer l'apprentissage
              <ChevronRight size={16} />
            </button>

            {/* Donation CTA — disabled until RIZIV authorization obtained */}
            <a
              href="https://github.com/sponsors/thierryvm"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl border border-[#30363d] hover:border-[#8b949e] text-[#8b949e] hover:text-[#e6edf3] font-medium text-base transition-all"
              aria-label="Soutenir le projet sur GitHub Sponsors"
            >
              <Heart size={16} className="text-pink-400" />
              Soutenir le projet
            </a>
          </div>
        </motion.div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-center text-[#e6edf3] mb-2">Pourquoi Terminal Learning ?</h2>
          <p className="text-[#8b949e] text-center mb-10">Conçu pour les débutants qui veulent apprendre en faisant.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.08 }}
                  className={`p-5 rounded-xl border ${f.border} ${f.bg} backdrop-blur-sm`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg bg-[#0d1117]/60 border ${f.border}`}>
                      <Icon size={18} className={f.color} />
                    </div>
                    <div>
                      <h3 className="text-[#e6edf3] font-medium mb-1">{f.title}</h3>
                      <p className="text-[#8b949e] text-sm leading-relaxed">{f.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ── ROADMAP ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[#30363d]/50">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-center text-[#e6edf3] mb-2">Roadmap publique</h2>
          <p className="text-[#8b949e] text-center mb-10">Ce que nous construisons, et ce qui vient ensuite.</p>

          <div className="max-w-lg mx-auto space-y-3">
            {ROADMAP.map((item) => (
              <div key={item.phase} className="flex items-center gap-4 p-4 rounded-xl border border-[#30363d] bg-[#161b22]">
                <div className="shrink-0">
                  {item.status === 'done' && <CheckCircle2 size={18} className="text-emerald-400" />}
                  {item.status === 'current' && <span className="w-4 h-4 flex items-center justify-center"><span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" /></span>}
                  {item.status === 'soon' && <Clock size={18} className="text-amber-400" />}
                  {item.status === 'future' && <div className="w-4 h-4 rounded-full border-2 border-[#30363d]" />}
                </div>
                <div className="flex-1">
                  <span className="text-xs text-[#8b949e] font-mono">{item.phase}</span>
                  <p className={`text-sm font-medium ${item.status === 'done' ? 'text-[#e6edf3]' : item.status === 'current' ? 'text-emerald-400' : 'text-[#8b949e]'}`}>
                    {item.label}
                  </p>
                </div>
                {item.status === 'done' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">live</span>
                )}
                {item.status === 'current' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono">en cours</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── ABOUT ───────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[#30363d]/50">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#30363d] text-[#8b949e] text-xs font-mono mb-6">
            <Star size={12} className="text-amber-400" /> Projet bénévole · Belgique
          </div>
          <h2 className="text-2xl font-bold text-[#e6edf3] mb-4">À propos du projet</h2>
          <p className="text-[#8b949e] leading-relaxed mb-4">
            Terminal Learning est un projet open source créé avec passion pour rendre
            l'apprentissage du terminal accessible à tous. L'application restera
            <strong className="text-[#e6edf3]"> toujours gratuite</strong> — sans publicité,
            sans données vendues, sans friction.
          </p>
          <p className="text-[#8b949e] leading-relaxed mb-8">
            Si l'application t'a été utile, tu peux soutenir le développement. Chaque contribution
            aide à couvrir les frais d'hébergement et de maintenance.
          </p>
          <a
            href="https://github.com/sponsors/thierryvm"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#30363d] hover:border-pink-500/40 hover:bg-pink-500/5 text-[#8b949e] hover:text-[#e6edf3] transition-all text-sm"
          >
            <Heart size={16} className="text-pink-400" />
            Soutenir sur GitHub Sponsors
          </a>
        </motion.div>
      </section>

      {/* ── HALL OF FAME ────────────────────────────────────────── */}
      {SUPPORTERS.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[#30363d]/50">
          <h2 className="text-2xl font-bold text-center text-[#e6edf3] mb-8">
            🏆 Hall of Fame
          </h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {SUPPORTERS.map((name) => (
              <span key={name} className="px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400 text-sm font-mono">
                {name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-[#30363d]/50 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[#8b949e] text-sm font-mono">
            <Terminal size={14} className="text-emerald-400" />
            Terminal Learning · MIT License
          </div>
          <div className="flex items-center gap-6 text-sm text-[#8b949e]">
            <button onClick={() => navigate('/app')} className="hover:text-[#e6edf3] transition-colors">Application</button>
            <a href="https://github.com/thierryvm/TerminalLearning" target="_blank" rel="noopener noreferrer" className="hover:text-[#e6edf3] transition-colors">GitHub</a>
            <button onClick={() => navigate('/privacy')} className="hover:text-[#e6edf3] transition-colors">Confidentialité</button>
          </div>
          <p className="text-[#8b949e] text-xs">
            Fait avec <Heart size={10} className="inline text-pink-400" /> en Belgique
          </p>
        </div>
      </footer>
    </div>
  );
}
