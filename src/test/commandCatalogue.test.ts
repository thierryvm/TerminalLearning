import { describe, it, expect } from 'vitest';
import {
  commandCatalogue,
  getCategoryById,
  getCommandById,
  getCommandsForEnvironment,
} from '../app/data/commandCatalogue';
import type { EnvironmentId } from '../app/types/curriculum';

describe('commandCatalogue', () => {
  describe('structure integrity', () => {
    it('should contain at least 8 categories', () => {
      expect(commandCatalogue.length).toBeGreaterThanOrEqual(8);
    });

    it('every category should have a unique id', () => {
      const ids = commandCatalogue.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every category should have a valid level (1-5)', () => {
      for (const cat of commandCatalogue) {
        expect(cat.level).toBeGreaterThanOrEqual(1);
        expect(cat.level).toBeLessThanOrEqual(5);
      }
    });

    it('every category should have at least one command', () => {
      for (const cat of commandCatalogue) {
        expect(cat.commands.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('every command should have a unique id across all categories', () => {
      const allIds: string[] = [];
      for (const cat of commandCatalogue) {
        for (const cmd of cat.commands) {
          allIds.push(cmd.id);
        }
      }
      expect(new Set(allIds).size).toBe(allIds.length);
    });

    it('every command should reference its parent category', () => {
      for (const cat of commandCatalogue) {
        for (const cmd of cat.commands) {
          expect(cmd.category).toBe(cat.id);
        }
      }
    });

    it('every command should have at least one compatible environment', () => {
      for (const cat of commandCatalogue) {
        for (const cmd of cat.commands) {
          expect(cmd.compatibility.length).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it('every command should have a non-empty summary', () => {
      for (const cat of commandCatalogue) {
        for (const cmd of cat.commands) {
          expect(cmd.summary.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('prerequisites consistency', () => {
    it('navigation should have no prerequisites', () => {
      const nav = getCategoryById('navigation');
      expect(nav?.prerequisites).toEqual([]);
    });

    it('level 2 categories should require at least one level 1 prerequisite', () => {
      const level2 = commandCatalogue.filter((c) => c.level === 2);
      for (const cat of level2) {
        expect(cat.prerequisites.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('prerequisites should not self-reference', () => {
      for (const cat of commandCatalogue) {
        expect(cat.prerequisites).not.toContain(cat.id);
      }
    });

    it('no category should be its own prerequisite', () => {
      for (const cat of commandCatalogue) {
        expect(cat.prerequisites).not.toContain(cat.id);
      }
    });
  });

  describe('getCategoryById', () => {
    it('should return navigation category', () => {
      const nav = getCategoryById('navigation');
      expect(nav).toBeDefined();
      expect(nav?.label).toBe('Navigation');
    });

    it('should return undefined for unknown id', () => {
      expect(getCategoryById('nonexistent')).toBeUndefined();
    });
  });

  describe('getCommandById', () => {
    it('should find pwd command', () => {
      const pwd = getCommandById('pwd');
      expect(pwd).toBeDefined();
      expect(pwd?.name).toBe('pwd');
      expect(pwd?.category).toBe('navigation');
    });

    it('should find chmod command in permissions', () => {
      const chmod = getCommandById('chmod');
      expect(chmod).toBeDefined();
      expect(chmod?.category).toBe('permissions');
      expect(chmod?.level).toBe(2);
    });

    it('should return undefined for unknown command', () => {
      expect(getCommandById('nonexistent')).toBeUndefined();
    });
  });

  describe('getCommandsForEnvironment', () => {
    it('should return linux-compatible navigation commands', () => {
      const cmds = getCommandsForEnvironment('navigation', 'linux');
      expect(cmds.length).toBeGreaterThanOrEqual(3);
      const ids = cmds.map((c) => c.id);
      expect(ids).toContain('pwd');
      expect(ids).toContain('ls');
      expect(ids).toContain('cd');
    });

    it('should return windows-compatible commands', () => {
      const cmds = getCommandsForEnvironment('navigation', 'windows');
      expect(cmds.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for unknown category', () => {
      expect(getCommandsForEnvironment('nonexistent', 'linux')).toEqual([]);
    });
  });

  describe('multi-environment variants', () => {
    it('ls should have Windows variants', () => {
      const ls = getCommandById('ls');
      expect(ls?.variants.length).toBeGreaterThanOrEqual(1);
      const winVariants = ls?.variants.filter((v: { environment: string }) => v.environment === 'windows');
      expect(winVariants?.length).toBeGreaterThanOrEqual(1);
    });

    it('cd should have no variants (works everywhere)', () => {
      const cd = getCommandById('cd');
      expect(cd?.variants).toEqual([]);
    });

    it('touch should have a PowerShell variant', () => {
      const touch = getCommandById('touch');
      const psVariant = touch?.variants.find((v: { shell?: string }) => v.shell === 'PowerShell');
      expect(psVariant).toBeDefined();
      expect(psVariant?.command).toContain('New-Item');
    });

    it('all variants should reference valid environments', () => {
      const validEnvs: EnvironmentId[] = ['linux', 'macos', 'windows', 'wsl'];
      for (const cat of commandCatalogue) {
        for (const cmd of cat.commands) {
          for (const variant of cmd.variants) {
            expect(validEnvs).toContain(variant.environment);
          }
        }
      }
    });
  });
});
