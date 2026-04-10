import { describe, it, expect } from 'vitest';
import {
  isModuleUnlocked,
  getUnlockedModules,
  getLockedModules,
  getNextRecommendedModule,
  getMissingPrerequisites,
  getModuleUnlockTree,
} from '../app/lib/unlocking';

describe('unlocking logic', () => {
  describe('isModuleUnlocked', () => {
    it('navigation should always be unlocked (no prerequisites)', () => {
      expect(isModuleUnlocked('navigation', new Set())).toBe(true);
    });

    it('fichiers should be locked without navigation completed', () => {
      expect(isModuleUnlocked('fichiers', new Set())).toBe(false);
    });

    it('fichiers should be unlocked with navigation completed', () => {
      expect(isModuleUnlocked('fichiers', new Set(['navigation']))).toBe(true);
    });

    it('permissions should require navigation + fichiers + lecture', () => {
      expect(isModuleUnlocked('permissions', new Set(['navigation']))).toBe(false);
      expect(isModuleUnlocked('permissions', new Set(['navigation', 'fichiers']))).toBe(false);
      expect(
        isModuleUnlocked('permissions', new Set(['navigation', 'fichiers', 'lecture'])),
      ).toBe(true);
    });

    it('should return false for unknown module', () => {
      expect(isModuleUnlocked('nonexistent', new Set())).toBe(false);
    });
  });

  describe('getUnlockedModules', () => {
    it('with no progress, only navigation should be unlocked', () => {
      const unlocked = getUnlockedModules(new Set());
      expect(unlocked).toContain('navigation');
      expect(unlocked).not.toContain('fichiers');
      expect(unlocked).not.toContain('permissions');
    });

    it('completing navigation unlocks fichiers', () => {
      const unlocked = getUnlockedModules(new Set(['navigation']));
      expect(unlocked).toContain('navigation');
      expect(unlocked).toContain('fichiers');
    });

    it('completing all level 1 unlocks level 2 modules', () => {
      const completed = new Set(['navigation', 'fichiers', 'lecture']);
      const unlocked = getUnlockedModules(completed);
      expect(unlocked).toContain('permissions');
      expect(unlocked).toContain('redirection');
    });
  });

  describe('getLockedModules', () => {
    it('with no progress, most modules should be locked', () => {
      const locked = getLockedModules(new Set());
      expect(locked.length).toBeGreaterThan(0);
      expect(locked).toContain('fichiers');
      expect(locked).toContain('permissions');
      expect(locked).not.toContain('navigation');
    });
  });

  describe('getNextRecommendedModule', () => {
    it('with no progress, should recommend navigation', () => {
      const next = getNextRecommendedModule(new Set());
      expect(next?.id).toBe('navigation');
    });

    it('with navigation completed, should recommend fichiers', () => {
      const next = getNextRecommendedModule(new Set(['navigation']));
      expect(next?.id).toBe('fichiers');
    });

    it('with all modules completed, should return null', () => {
      const allModuleIds = new Set([
        'navigation',
        'fichiers',
        'lecture',
        'permissions',
        'processus',
        'redirection',
        'variables',
        'reseau',
      ]);
      const next = getNextRecommendedModule(allModuleIds);
      expect(next).toBeNull();
    });
  });

  describe('getMissingPrerequisites', () => {
    it('navigation should have no missing prerequisites', () => {
      expect(getMissingPrerequisites('navigation', new Set())).toEqual([]);
    });

    it('permissions with only navigation completed should list fichiers and lecture', () => {
      const missing = getMissingPrerequisites('permissions', new Set(['navigation']));
      expect(missing).toContain('fichiers');
      expect(missing).toContain('lecture');
      expect(missing).not.toContain('navigation');
    });

    it('should return empty for unknown module', () => {
      expect(getMissingPrerequisites('nonexistent', new Set())).toEqual([]);
    });
  });

  describe('getModuleUnlockTree', () => {
    it('should return status for every module in curriculum', () => {
      const tree = getModuleUnlockTree(new Set());
      expect(tree.length).toBeGreaterThanOrEqual(6);
    });

    it('should mark navigation as unlocked and not completed with empty progress', () => {
      const tree = getModuleUnlockTree(new Set());
      const nav = tree.find((m) => m.moduleId === 'navigation');
      expect(nav?.unlocked).toBe(true);
      expect(nav?.completed).toBe(false);
      expect(nav?.missingPrerequisites).toEqual([]);
      expect(nav?.title).toBe('Navigation');
      expect(nav?.color).toBeTruthy();
    });

    it('should mark fichiers as locked with empty progress and include labels', () => {
      const tree = getModuleUnlockTree(new Set());
      const fichiers = tree.find((m) => m.moduleId === 'fichiers');
      expect(fichiers?.unlocked).toBe(false);
      expect(fichiers?.missingPrerequisites).toContain('navigation');
      expect(fichiers?.missingPrerequisiteLabels).toContain('Navigation');
    });

    it('should include level for each module', () => {
      const tree = getModuleUnlockTree(new Set());
      for (const mod of tree) {
        expect(mod.level).toBeGreaterThanOrEqual(1);
        expect(mod.level).toBeLessThanOrEqual(5);
      }
    });
  });
});
