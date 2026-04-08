// --- Environments ---

export type EnvironmentId = 'linux' | 'macos' | 'windows' | 'wsl';

export interface Environment {
  id: EnvironmentId;
  label: string;
  status: 'active' | 'future';
}

export const ENVIRONMENTS: Environment[] = [
  { id: 'linux', label: 'Linux', status: 'active' },
  { id: 'macos', label: 'macOS', status: 'active' },
  { id: 'windows', label: 'Windows', status: 'active' },
  { id: 'wsl', label: 'WSL', status: 'future' },
];

// --- Levels ---

export type LevelId = 1 | 2 | 3 | 4 | 5;

export interface Level {
  id: LevelId;
  label: string;
  description: string;
}

export const LEVELS: Level[] = [
  { id: 1, label: 'Fondamentaux absolus', description: 'Comprendre le terminal, naviguer, manipuler les fichiers' },
  { id: 2, label: 'Utilisation quotidienne', description: 'Permissions, processus, redirections, archives' },
  { id: 3, label: 'Intermédiaire', description: 'Réseau, variables, éditeurs, gestion de paquets' },
  { id: 4, label: 'Avancé guidé', description: 'Git, scripts shell, SSH/VPS, Docker' },
  { id: 5, label: 'Spécialisations futures', description: 'Admin système, sécurité, DevOps, workflow avancé' },
];

// --- Command variant (per environment) ---

export interface CommandVariant {
  environment: EnvironmentId;
  command: string;
  shell?: string; // e.g. 'PowerShell', 'CMD'
}

// --- Enriched command (for reference + lessons) ---

export interface EnrichedCommand {
  id: string;
  name: string;
  category: string; // references Module.id
  level: LevelId;
  recommendedFor: EnvironmentId[];
  variants: CommandVariant[];
  compatibility: EnvironmentId[];
  syntax: string;
  summary: string;
  examples: string[];
  commonErrors: string[];
}

// --- Category metadata (prerequisites & unlocking) ---

export interface CategoryMeta {
  id: string;
  label: string;
  level: LevelId;
  prerequisites: string[]; // category IDs that must be completed first
  unlocks: string[]; // category IDs unlocked after completion
  exerciseIdeas: string[];
  commands: EnrichedCommand[];
}

// --- Roadmap priorities ---

export type RoadmapTier = 'p0' | 'p1' | 'p2' | 'p3';

export const ROADMAP_PRIORITIES: Record<RoadmapTier, string[]> = {
  p0: ['navigation', 'fichiers', 'lecture', 'search', 'permissions', 'processus', 'redirection'],
  p1: ['network', 'variables_shell', 'terminal_editors', 'archives', 'package_managers'],
  p2: ['git', 'shell_scripts', 'ssh_vps', 'docker'],
  p3: ['logs_observability', 'sysadmin', 'security_basics', 'advanced_workflows'],
};

// --- Helper to get level by ID ---

export function getLevelById(id: LevelId): Level {
  return LEVELS[id - 1];
}

// --- Helper to get active environments ---

export function getActiveEnvironments(): Environment[] {
  return ENVIRONMENTS.filter((e) => e.status === 'active');
}
