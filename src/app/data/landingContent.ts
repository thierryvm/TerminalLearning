import type { ComponentType } from 'react';
import {
  Terminal, BookOpen, Zap, Shield,
  ShieldCheck, Github, Infinity, Lock,
  Compass, FolderOpen, FileText, Cpu, GitMerge, GitBranch, GitFork, Globe,
  Monitor,
} from 'lucide-react';
import { curriculum } from './curriculum';
import { commandCatalogue } from './commandCatalogue';
import { ENVIRONMENTS } from '../types/curriculum';
import type { SelectedEnvironment } from '../context/EnvironmentContext';

// ── Computed totals ───────────────────────────────────────────────────────────

export const TOTAL_LESSONS = curriculum.reduce((sum, mod) => sum + mod.lessons.length, 0);
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
  '10 modules progressifs (navigation → GitHub)',
  'Terminal interactif avec validation',
  'Dashboard de progression',
  'Sauvegarde locale + cloud (optionnel)',
  `Référence enrichie (${TOTAL_COMMANDS}+ commandes)`,
  "Sélection d'environnement Linux / macOS / Windows",
  'Adaptation des commandes par OS',
  'Parcours guidé par niveaux',
  'Partage natif (Web Share API)',
];

export const ROADMAP_IN_PROGRESS = [
  "Extension du curriculum — nouveaux modules & exercices",
  "Plus d'exercices pratiques & quiz par section",
  'Guide d\'installation PWA (iOS / Android / Desktop)',
  'Agent IA tuteur (BYOK)',
  'Terminal Sentinel — audit sécurité automatisé',
];

export const ROADMAP_PLANNED = [
  'Mode histoire narratif',
  'Multilingue (EN / NL)',
  'Badges et défis',
  'Révisions intelligentes',
  'Parcours avancés (Docker, scripting, IA)',
];

// ── Supporters (Hall of Fame) ─────────────────────────────────────────────────

export const SUPPORTERS: string[] = [
  // Populated when Hall of Fame is active
];

// ── Trust badges ──────────────────────────────────────────────────────────────

export const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'A+ Security Rating', href: undefined },
  { icon: Github, label: '100% Open Source', href: 'https://github.com/thierryvm/TerminalLearning' },
  { icon: Infinity, label: 'Free Forever', href: undefined },
  { icon: Lock, label: 'GDPR Compliant', href: undefined },
] as const;

// ── Module icons map ──────────────────────────────────────────────────────────

export const MODULE_ICONS: Record<string, ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  Compass,
  FolderOpen,
  FileText,
  Shield,
  Cpu,
  GitMerge,
  GitBranch,
  GitFork,
  Globe,
};

// ── Level badge styles ────────────────────────────────────────────────────────

export const LEVEL_BADGE: Record<number, { label: string; text: string; border: string; bg: string }> = {
  1: { label: 'Niveau 1', text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  2: { label: 'Niveau 2', text: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
};

// ── Stats bar ─────────────────────────────────────────────────────────────────

export const STATS = [
  { value: String(curriculum.length), label: 'Modules', icon: BookOpen },
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
