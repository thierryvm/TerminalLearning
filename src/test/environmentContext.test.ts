import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ENV_META,
  sanitiseEnv,
  type SelectedEnvironment,
} from '../app/context/EnvironmentContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

describe('ENV_META', () => {
  it('defines metadata for all three active environments', () => {
    const envs: SelectedEnvironment[] = ['linux', 'macos', 'windows'];
    for (const env of envs) {
      expect(ENV_META[env]).toBeDefined();
      expect(ENV_META[env].id).toBe(env);
      expect(ENV_META[env].label).toBeTruthy();
      expect(ENV_META[env].shell).toBeTruthy();
      expect(ENV_META[env].promptPreview).toBeTruthy();
    }
  });

  it('linux prompt contains $ character', () => {
    expect(ENV_META.linux.promptPreview).toMatch(/\$$/);
  });

  it('macos prompt contains % character', () => {
    expect(ENV_META.macos.promptPreview).toMatch(/%/);
  });

  it('windows prompt starts with PS', () => {
    expect(ENV_META.windows.promptPreview).toMatch(/^PS /);
  });

  it('all envs have color, borderColor and bgColor', () => {
    for (const meta of Object.values(ENV_META)) {
      expect(meta.color).toBeTruthy();
      expect(meta.borderColor).toBeTruthy();
      expect(meta.bgColor).toBeTruthy();
    }
  });
});

// ─── sanitiseEnv ──────────────────────────────────────────────────────────────

describe('sanitiseEnv', () => {
  it('accepts valid environments', () => {
    expect(sanitiseEnv('linux')).toBe('linux');
    expect(sanitiseEnv('macos')).toBe('macos');
    expect(sanitiseEnv('windows')).toBe('windows');
  });

  it('normalises uppercase input', () => {
    expect(sanitiseEnv('Linux')).toBe('linux');
    expect(sanitiseEnv('MACOS')).toBe('macos');
    expect(sanitiseEnv('WINDOWS')).toBe('windows');
  });

  it('trims whitespace', () => {
    expect(sanitiseEnv('  linux  ')).toBe('linux');
  });

  it('rejects wsl (future only) and defaults to linux', () => {
    expect(sanitiseEnv('wsl')).toBe('linux');
  });

  it('rejects arbitrary strings and defaults to linux', () => {
    expect(sanitiseEnv('android')).toBe('linux');
    expect(sanitiseEnv('')).toBe('linux');
    expect(sanitiseEnv('__proto__')).toBe('linux');
    expect(sanitiseEnv('<script>')).toBe('linux');
  });

  it('rejects injection attempts', () => {
    // Security: ensure no prototype pollution or injection survives
    const malicious = [
      'constructor',
      '__proto__',
      'toString',
      'linux; rm -rf /',
      'linux\n--',
    ];
    for (const attempt of malicious) {
      const result = sanitiseEnv(attempt);
      expect(['linux', 'macos', 'windows']).toContain(result);
    }
  });
});

// ─── localStorage persistence (mocked) ───────────────────────────────────────

describe('EnvironmentContext storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('VALID_ENVS contains exactly the three active environments', () => {
    // Indirectly tested via sanitiseEnv — wsl is rejected, others accepted
    expect(sanitiseEnv('linux')).toBe('linux');
    expect(sanitiseEnv('macos')).toBe('macos');
    expect(sanitiseEnv('windows')).toBe('windows');
    expect(sanitiseEnv('wsl')).toBe('linux'); // future only
  });

  it('sanitiseEnv handles localStorage-stored values safely', () => {
    // Simulate reading a tampered localStorage value
    const tampered = '"; DROP TABLE users; --';
    expect(sanitiseEnv(tampered)).toBe('linux');
  });
});
