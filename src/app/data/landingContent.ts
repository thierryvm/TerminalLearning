import type { ComponentType } from 'react';
import {
  Terminal, BookOpen, Zap, Shield,
  ShieldCheck, Github, Infinity, Lock, CheckCircle2,
  Compass, FolderOpen, FileText, Cpu, GitMerge, GitBranch, GitFork, Globe,
  Monitor, Code2, Bot,
} from 'lucide-react';
import { commandCatalogue } from './commandCatalogue';
import { ENVIRONMENTS } from '../types/curriculum';
import type { SelectedEnvironment } from '../context/EnvironmentContext';

// ── Computed totals ───────────────────────────────────────────────────────────

/** Hardcoded — update when adding lessons. Source of truth: curriculum.ts. */
export const TOTAL_LESSONS = 64;
export const TOTAL_COMMANDS = commandCatalogue.reduce((sum, cat) => sum + cat.commands.length, 0);
export const ACTIVE_ENVIRONMENTS = ENVIRONMENTS.filter((e) => e.status === 'active');

// ── Features ──────────────────────────────────────────────────────────────────

export const FEATURES = [
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
    title: `${TOTAL_COMMANDS}+ commandes documentées`,
    description: 'Chaque commande avec syntaxe, exemples, erreurs courantes et variantes par environnement.',
    color: 'text-blue-400',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/5',
  },
  {
    icon: Zap,
    title: 'Progression sauvegardée',
    description: "Reprends exactement où tu t'es arrêté. Connexion optionnelle pour synchroniser entre appareils.",
    color: 'text-amber-400',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
  },
  {
    icon: Shield,
    title: '100% gratuit & open source',
    description: "Pas d'inscription obligatoire, pas de paywall, pas de tracking agressif. Juste apprendre.",
    color: 'text-purple-400',
    border: 'border-purple-500/20',
    bg: 'bg-purple-500/5',
  },
];

// ── Roadmap ───────────────────────────────────────────────────────────────────

export const ROADMAP_AVAILABLE = [
  '11 modules progressifs (navigation → IA pour dev)',
  'Terminal interactif avec validation',
  'Dashboard de progression',
  'Sauvegarde locale + cloud (optionnel)',
  `Référence enrichie (${TOTAL_COMMANDS}+ commandes)`,
  "Sélection d'environnement Linux / macOS / Windows",
  'Adaptation des commandes par OS',
  'Parcours guidé par niveaux',
  'Partage natif (Web Share API)',
  'Accessibilité mobile & clavier (WCAG 2.2 AAA, safe-area iOS, focus-visible)',
  'Sécurité durcie — endpoints LTI gated, rate limiting partagé, CSP SHA-256 (THI-133/134/135)',
  'Audit sécurité fresh — score 8.1/10, 0 critique (1 mai 2026)',
];

export const ROADMAP_IN_PROGRESS = [
  "Extension du curriculum — nouveaux modules & exercices",
  "Plus d'exercices pratiques & quiz par section",
  'Guide d\'installation PWA (iOS / Android / Desktop)',
  'Agent IA tuteur (BYOK OpenRouter — Phase 7b)',
  'Terminal Sentinel — audit sécurité automatisé',
  'LTI 1.3 — Phase 7c (RS256 JWK validation, persistence Supabase, grade passback)',
];

export const ROADMAP_PLANNED = [
  'Mode histoire narratif',
  'Multilingue (FR / NL / EN / DE) — Belgique tri-lingue',
  'Badges & Open Badges 3.0 (CEFR + EQF)',
  'Révisions intelligentes',
  'Dashboards par rôle — étudiant / professeur / formateur / institution / super-admin',
  'Parcours avancés (Docker, scripting, IA augmentée)',
];

// ── Supporters (Hall of Fame) ─────────────────────────────────────────────────

export const SUPPORTERS: string[] = [
  // Populated when Hall of Fame is active
];

// ── Trust badges ──────────────────────────────────────────────────────────────

// Points to the production URL intentionally — the badge is proof of the live site's rating.
const SECURITY_HEADERS_PROOF_URL = 'https://securityheaders.com/?q=https%3A%2F%2Fterminallearning.dev%2Fapp&followRedirects=on';

export const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'A+ Security Rating', href: SECURITY_HEADERS_PROOF_URL },
  { icon: Github, label: '100% Open Source', href: 'https://github.com/thierryvm/TerminalLearning' },
  { icon: Infinity, label: 'Free Forever', href: undefined },
  { icon: Lock, label: 'GDPR Compliant', href: undefined },
  { icon: CheckCircle2, label: '1000+ tests · CI verte', href: 'https://github.com/thierryvm/TerminalLearning/actions' },
] as const;

// ── Module icons map ──────────────────────────────────────────────────────────

export const MODULE_ICONS: Record<string, ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  Compass,
  FolderOpen,
  FileText,
  Shield,
  Cpu,
  Code2,
  GitMerge,
  GitBranch,
  GitFork,
  Globe,
  Bot,
};

// ── Level badge styles ────────────────────────────────────────────────────────

export const LEVEL_BADGE: Record<1 | 2 | 3 | 4 | 5, { label: string; text: string; border: string; bg: string }> = {
  1: { label: 'Niveau 1', text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  2: { label: 'Niveau 2', text: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
  3: { label: 'Niveau 3', text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  4: { label: 'Niveau 4', text: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10' },
  5: { label: 'Niveau 5', text: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10' },
};

// ── Module previews — lightweight summary for the Landing page ────────────────
// Keep in sync with curriculum.ts when adding/removing modules or lessons.

export interface ModulePreview {
  id: string;
  title: string;
  description: string;
  iconName: string;
  color: string;
  level: 1 | 2 | 3 | 4 | 5;
  firstLessonId: string;
  lessonCount: number;
}

export const MODULE_PREVIEWS: ModulePreview[] = [
  { id: 'navigation', title: 'Navigation', description: 'Maîtrisez vos déplacements dans le système de fichiers', iconName: 'Compass', color: '#22c55e', level: 1, firstLessonId: 'orientation', lessonCount: 5 },
  { id: 'fichiers', title: 'Fichiers & Dossiers', description: 'Créez, copiez, déplacez et supprimez fichiers et répertoires', iconName: 'FolderOpen', color: '#3b82f6', level: 1, firstLessonId: 'mkdir', lessonCount: 5 },
  { id: 'lecture', title: 'Lecture de fichiers', description: 'Affichez, recherchez et analysez le contenu des fichiers', iconName: 'FileText', color: '#a855f7', level: 1, firstLessonId: 'cat', lessonCount: 4 },
  { id: 'permissions', title: 'Permissions', description: "Contrôlez l'accès aux fichiers et répertoires", iconName: 'Shield', color: '#f59e0b', level: 2, firstLessonId: 'comprendre-permissions', lessonCount: 5 },
  { id: 'processus', title: 'Processus', description: "Gérez les programmes en cours d'exécution", iconName: 'Cpu', color: '#ef4444', level: 2, firstLessonId: 'ps', lessonCount: 4 },
  { id: 'redirection', title: 'Redirection & Pipes', description: 'Chaînez les commandes et redirigez les flux de données', iconName: 'GitMerge', color: '#06b6d4', level: 2, firstLessonId: 'redirection-sortie', lessonCount: 4 },
  { id: 'variables', title: 'Variables & Scripts', description: "Maîtrisez les variables d'environnement, les fichiers de config et l'automatisation", iconName: 'Code2', color: '#f59e0b', level: 3, firstLessonId: 'env-vars', lessonCount: 6 },
  { id: 'reseau', title: 'Réseau & SSH', description: 'Testez la connectivité, effectuez des requêtes HTTP et connectez-vous à des serveurs distants', iconName: 'Globe', color: '#06b6d4', level: 3, firstLessonId: 'ping', lessonCount: 6 },
  { id: 'git', title: 'Git Fondamentaux', description: "Maîtrisez le contrôle de version avec Git — l'outil indispensable de tout développeur professionnel", iconName: 'GitBranch', color: '#f97316', level: 4, firstLessonId: 'git-init', lessonCount: 7 },
  { id: 'github-collaboration', title: 'GitHub & Collaboration', description: 'Synchronisez avec des dépôts distants, ouvrez des Pull Requests et collaborez comme en entreprise', iconName: 'GitFork', color: '#8b5cf6', level: 4, firstLessonId: 'git-remote', lessonCount: 6 },
  { id: 'ia-dev', title: "L'IA comme outil dev", description: "Maîtrisez l'IA comme amplificateur de vos compétences — du prompt au déploiement", iconName: 'Bot', color: '#a78bfa', level: 5, firstLessonId: 'ia-dev-intro', lessonCount: 12 },
];

// ── Stats bar ─────────────────────────────────────────────────────────────────

export const STATS = [
  { value: String(MODULE_PREVIEWS.length), label: 'Modules', icon: BookOpen },
  { value: String(TOTAL_LESSONS), label: 'Leçons', icon: FileText },
  { value: `${TOTAL_COMMANDS}+`, label: 'Commandes', icon: Terminal },
  { value: String(ACTIVE_ENVIRONMENTS.length), label: 'Environnements', icon: Monitor },
];

// ── Competency levels per environment (hero section) ─────────────────────────

export const ENV_LEVELS: Record<SelectedEnvironment, {
  level: number;
  label: string;
  description: string;
  commands: string[];
  color: string;
  bg: string;
  border: string;
}[]> = {
  linux: [
    {
      level: 1,
      label: 'Navigation & fichiers',
      description: "Tu te déplaces, crées, copies et lis des fichiers — tu n'es plus perdu dans un terminal.",
      commands: ['pwd', 'ls', 'ls -la', 'cd', 'mkdir', 'touch', 'cp', 'mv', 'rm', 'cat', 'less', 'echo'],
      color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20',
    },
    {
      level: 2,
      label: 'Système & recherche',
      description: 'Tu surveilles les processus, filtres les contenus et chaînes les commandes — usage développeur quotidien.',
      commands: ['chmod', 'chown', 'ps aux', 'grep', 'grep -r', 'find', 'kill', 'killall', '|', '>', '>>', 'wc -l'],
      color: 'text-blue-400', bg: 'bg-blue-500/5', border: 'border-blue-500/20',
    },
    {
      level: 3,
      label: 'Automatisation & réseau',
      description: 'Tu scripts, te connectes à distance et déploies — workflows de professionnel Linux.',
      commands: ['ssh', 'scp', 'curl', 'wget', 'git', 'bash script.sh', 'export', 'env', 'tar -czf', 'cron', 'systemctl'],
      color: 'text-purple-400', bg: 'bg-purple-500/5', border: 'border-purple-500/20',
    },
  ],
  macos: [
    {
      level: 1,
      label: 'Navigation & fichiers',
      description: 'Tu te déplaces dans le système de fichiers macOS et ouvres des apps depuis le terminal.',
      commands: ['pwd', 'ls', 'ls -la', 'cd', 'mkdir', 'touch', 'cp', 'mv', 'rm', 'cat', 'open', 'echo'],
      color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20',
    },
    {
      level: 2,
      label: 'Système & outils macOS',
      description: 'Tu contrôles les processus, searches dans les fichiers et utilises les outils natifs macOS.',
      commands: ['chmod', 'ps aux', 'grep', 'grep -r', 'find', 'kill', '|', '>', 'open -a', 'pbcopy', 'pbpaste', 'defaults read'],
      color: 'text-violet-400', bg: 'bg-violet-500/5', border: 'border-violet-500/20',
    },
    {
      level: 3,
      label: 'Homebrew & automatisation',
      description: 'Tu gères les packages, configures le système et automatises tes workflows macOS.',
      commands: ['brew install', 'brew update', 'brew list', 'ssh', 'git', 'launchctl', 'caffeinate', 'defaults write', 'xcode-select', 'curl', 'xargs'],
      color: 'text-purple-400', bg: 'bg-purple-500/5', border: 'border-purple-500/20',
    },
  ],
  windows: [
    {
      level: 1,
      label: 'Navigation & fichiers',
      description: 'Tu navigues dans PowerShell, crées et lis des fichiers — les bases solides de Windows.',
      commands: ['Get-Location', 'Set-Location', 'Get-ChildItem', 'dir', 'mkdir', 'New-Item', 'Get-Content', 'Copy-Item', 'Move-Item', 'Remove-Item', 'Write-Host', 'Clear-Host'],
      color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20',
    },
    {
      level: 2,
      label: 'Système & recherche',
      description: 'Tu gères les processus, services, filtres les données et rediriges les flux PowerShell.',
      commands: ['Get-Process', 'Stop-Process', 'Get-Service', 'Start-Service', 'Select-String', 'Where-Object', '|', 'Out-File', 'Set-ExecutionPolicy', 'Get-Acl', 'tasklist', 'netstat'],
      color: 'text-sky-400', bg: 'bg-sky-500/5', border: 'border-sky-500/20',
    },
    {
      level: 3,
      label: 'Développeur & automatisation',
      description: "Tu installes des outils, scriptes des tâches et maîtrises l'environnement développeur Windows.",
      commands: ['winget install', 'Invoke-WebRequest', 'ssh', 'git', '$env:PATH', 'Set-Item env:', 'Start-Job', 'Get-EventLog', 'Register-ScheduledTask', 'Invoke-Expression', 'New-PSDrive'],
      color: 'text-purple-400', bg: 'bg-purple-500/5', border: 'border-purple-500/20',
    },
  ],
};
