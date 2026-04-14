import { createContext, startTransition, useCallback, useContext, useState, type ReactNode } from 'react';
import type { EnvironmentId } from '../types/curriculum';

// ─── Types ────────────────────────────────────────────────────────────────────

/** The three actively selectable environments (WSL is future-only). */
export type SelectedEnvironment = Exclude<EnvironmentId, 'wsl'>;

interface EnvironmentContextValue {
  /** Currently selected environment — persisted to localStorage. */
  selectedEnv: SelectedEnvironment;
  /** Change the active environment. Persists immediately. */
  setEnvironment: (env: SelectedEnvironment) => void;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'tl-environment';
const VALID_ENVS: SelectedEnvironment[] = ['linux', 'macos', 'windows'];

function isValidEnv(value: unknown): value is SelectedEnvironment {
  return typeof value === 'string' && (VALID_ENVS as string[]).includes(value);
}

/** Load persisted env from localStorage, defaulting to 'linux'. */
function loadEnvironment(): SelectedEnvironment {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isValidEnv(raw)) return raw;
  } catch {
    // localStorage unavailable (SSR / private browsing edge case)
  }
  return 'linux';
}

/** Persist env to localStorage. No-op on failure (private browsing etc.). */
function saveEnvironment(env: SelectedEnvironment): void {
  try {
    localStorage.setItem(STORAGE_KEY, env);
  } catch {
    // Silently ignore — app still works without persistence
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const EnvironmentContext = createContext<EnvironmentContextValue | null>(null);

/**
 * @component EnvironmentProvider
 * @description Provides the selected terminal environment (Linux / macOS / Windows)
 * across the entire app. Persists the choice to localStorage.
 *
 * Security: this context only stores a string enum value — no user data,
 * no commands, no sensitive information.
 */
export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [selectedEnv, setSelectedEnvState] = useState<SelectedEnvironment>(loadEnvironment);

  const setEnvironment = useCallback((env: SelectedEnvironment) => {
    if (!isValidEnv(env)) return; // Guard against invalid values
    // Wrap the cascade re-render (Landing 610 lines + TerminalPreview + Sidebar
    // consumers) in a transition so the click handler returns immediately.
    // Measured: drops INP from ~515ms to ~10ms on CPU 4x throttling. (THI-90)
    startTransition(() => setSelectedEnvState(env));
    saveEnvironment(env); // localStorage write stays synchronous — cheap & must persist before next interaction
  }, []);

  return (
    <EnvironmentContext.Provider value={{ selectedEnv, setEnvironment }}>
      {children}
    </EnvironmentContext.Provider>
  );
}

/**
 * @hook useEnvironment
 * @description Returns the active environment and a setter.
 * Must be used inside <EnvironmentProvider>.
 */
export function useEnvironment(): EnvironmentContextValue {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) throw new Error('useEnvironment must be used inside <EnvironmentProvider>');
  return ctx;
}

// ─── Env metadata helpers ─────────────────────────────────────────────────────

export interface EnvMeta {
  id: SelectedEnvironment;
  label: string;
  shell: string;
  /** Terminal prompt preview string */
  promptPreview: string;
  /** Icon character / label for the OS */
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
}

export const ENV_META: Record<SelectedEnvironment, EnvMeta> = {
  linux: {
    id: 'linux',
    label: 'Linux',
    shell: 'bash / zsh',
    promptPreview: 'user@machine:~$',
    icon: 'Tux',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    bgColor: 'bg-amber-500/10',
  },
  macos: {
    id: 'macos',
    label: 'macOS',
    shell: 'zsh',
    promptPreview: 'machine ~ %',
    icon: '',
    color: 'text-violet-400',
    borderColor: 'border-violet-500/40',
    bgColor: 'bg-violet-500/10',
  },
  windows: {
    id: 'windows',
    label: 'Windows',
    shell: 'PowerShell / CMD',
    promptPreview: 'PS C:\\Users\\user>',
    icon: '⊞',
    color: 'text-sky-400',
    borderColor: 'border-sky-500/40',
    bgColor: 'bg-sky-500/10',
  },
};

/** Sanitise and validate any user-provided environment string. */
export function sanitiseEnv(raw: string): SelectedEnvironment {
  const trimmed = raw.trim().toLowerCase();
  return isValidEnv(trimmed) ? trimmed : 'linux';
}
