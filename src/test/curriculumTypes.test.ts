import { describe, it, expect } from 'vitest';
import {
  ENVIRONMENTS,
  LEVELS,
  ROADMAP_PRIORITIES,
  getLevelById,
  getActiveEnvironments,
} from '../app/types/curriculum';
import { curriculum } from '../app/data/curriculum';
import { commandCatalogue } from '../app/data/commandCatalogue';

describe('curriculum types', () => {
  describe('ENVIRONMENTS', () => {
    it('should have 4 environments', () => {
      expect(ENVIRONMENTS.length).toBe(4);
    });

    it('should have linux, macos, windows as active', () => {
      const active = getActiveEnvironments();
      const ids = active.map((e) => e.id);
      expect(ids).toContain('linux');
      expect(ids).toContain('macos');
      expect(ids).toContain('windows');
    });

    it('WSL should be marked as future', () => {
      const wsl = ENVIRONMENTS.find((e) => e.id === 'wsl');
      expect(wsl?.status).toBe('future');
    });
  });

  describe('LEVELS', () => {
    it('should have 5 levels', () => {
      expect(LEVELS.length).toBe(5);
    });

    it('levels should be ordered 1 to 5', () => {
      for (let i = 0; i < LEVELS.length; i++) {
        expect(LEVELS[i].id).toBe(i + 1);
      }
    });

    it('getLevelById should return the correct level', () => {
      const level1 = getLevelById(1);
      expect(level1.label).toBe('Fondamentaux absolus');
      const level4 = getLevelById(4);
      expect(level4.label).toBe('Avancé guidé');
    });
  });

  describe('curriculum modules with metadata', () => {
    it('every module should have a level', () => {
      for (const mod of curriculum) {
        expect(mod.level).toBeDefined();
        expect(mod.level).toBeGreaterThanOrEqual(1);
        expect(mod.level).toBeLessThanOrEqual(5);
      }
    });

    it('every module should have prerequisites array', () => {
      for (const mod of curriculum) {
        expect(mod.prerequisites).toBeDefined();
        expect(Array.isArray(mod.prerequisites)).toBe(true);
      }
    });

    it('every module should have unlocks array', () => {
      for (const mod of curriculum) {
        expect(mod.unlocks).toBeDefined();
        expect(Array.isArray(mod.unlocks)).toBe(true);
      }
    });

    it('navigation should be level 1 with no prerequisites', () => {
      const nav = curriculum.find((m) => m.id === 'navigation');
      expect(nav?.level).toBe(1);
      expect(nav?.prerequisites).toEqual([]);
    });

    it('permissions should be level 2', () => {
      const perms = curriculum.find((m) => m.id === 'permissions');
      expect(perms?.level).toBe(2);
    });

    it('no module should list itself as a prerequisite', () => {
      for (const mod of curriculum) {
        expect(mod.prerequisites).not.toContain(mod.id);
      }
    });

    it('prerequisites should not be empty strings', () => {
      for (const mod of curriculum) {
        for (const prereq of mod.prerequisites ?? []) {
          expect(prereq.length).toBeGreaterThan(0);
        }
      }
    });

    it('total lessons should be 19', () => {
      const total = curriculum.reduce((acc, mod) => acc + mod.lessons.length, 0);
      expect(total).toBe(19);
    });
  });

  describe('consistency guard: catalogue ↔ curriculum', () => {
    it('every curriculum module with prerequisites should match its catalogue counterpart', () => {
      for (const mod of curriculum) {
        const catEntry = commandCatalogue.find((c) => c.id === mod.id);
        if (catEntry && mod.prerequisites) {
          expect(mod.prerequisites).toEqual(catEntry.prerequisites);
        }
      }
    });

    it('every curriculum module level should match its catalogue counterpart', () => {
      for (const mod of curriculum) {
        const catEntry = commandCatalogue.find((c) => c.id === mod.id);
        if (catEntry && mod.level) {
          expect(mod.level).toBe(catEntry.level);
        }
      }
    });

    it('ROADMAP_PRIORITIES p0 IDs should all exist in catalogue or curriculum', () => {
      const allIds = new Set([
        ...commandCatalogue.map((c) => c.id),
        ...curriculum.map((m) => m.id),
      ]);
      for (const id of ROADMAP_PRIORITIES.p0) {
        expect(allIds.has(id)).toBe(true);
      }
    });
  });
});
