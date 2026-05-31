import { curriculum } from '../data/curriculum';
import type { Module } from '../data/curriculum';

/**
 * Module unlocking logic for Terminal Learning.
 *
 * A module is unlocked when ALL of its prerequisites are completed.
 * Modules with no prerequisites (e.g. "navigation") are always unlocked.
 *
 * **Sticky access (THI-309)**: a module the learner has already entered — i.e.
 * completed at least one of its lessons — stays unlocked forever, even if a
 * prerequisite module later gains a new lesson and drops below 100%. Without
 * this, inserting a lesson into an early module (e.g. `command-anatomy` added
 * to Navigation) retroactively re-locks every downstream module for existing
 * users who had already progressed — a trust-breaking regression. The strict
 * 100%-of-prerequisites gate is preserved for modules the learner has NOT yet
 * touched, so the pedagogical sequence still holds for newcomers.
 *
 * This module is stateless — it takes completed/started module IDs as input
 * and returns unlock status. The actual progress state lives in
 * ProgressContext.
 */

/**
 * Check if a single module is unlocked.
 *
 * @param completedModuleIds Modules with ALL lessons completed (satisfy prereqs).
 * @param startedModuleIds   Modules with ≥1 lesson completed (sticky-unlocked).
 */
export function isModuleUnlocked(
  moduleId: string,
  completedModuleIds: Set<string>,
  startedModuleIds: Set<string> = new Set(),
): boolean {
  const mod = curriculum.find((m) => m.id === moduleId);
  if (!mod) return false;

  // Sticky: already entered → stays accessible regardless of prerequisite drift.
  if (startedModuleIds.has(moduleId)) return true;

  const prerequisites = mod.prerequisites ?? [];

  // No prerequisites = always unlocked
  if (prerequisites.length === 0) return true;

  // All prerequisites must be completed
  return prerequisites.every((prereqId) => completedModuleIds.has(prereqId));
}

/** Get all unlocked module IDs given completed + started module IDs. */
export function getUnlockedModules(
  completedModuleIds: Set<string>,
  startedModuleIds: Set<string> = new Set(),
): string[] {
  return curriculum
    .filter((mod) => isModuleUnlocked(mod.id, completedModuleIds, startedModuleIds))
    .map((mod) => mod.id);
}

/** Get all locked module IDs given completed + started module IDs. */
export function getLockedModules(
  completedModuleIds: Set<string>,
  startedModuleIds: Set<string> = new Set(),
): string[] {
  return curriculum
    .filter((mod) => !isModuleUnlocked(mod.id, completedModuleIds, startedModuleIds))
    .map((mod) => mod.id);
}

/** Get the next recommended module (first unlocked but not yet completed). */
export function getNextRecommendedModule(
  completedModuleIds: Set<string>,
  startedModuleIds: Set<string> = new Set(),
): Module | null {
  const unlocked = curriculum.filter(
    (mod) =>
      isModuleUnlocked(mod.id, completedModuleIds, startedModuleIds) &&
      !completedModuleIds.has(mod.id),
  );
  return unlocked[0] ?? null;
}

/** Get missing prerequisites for a locked module. */
export function getMissingPrerequisites(
  moduleId: string,
  completedModuleIds: Set<string>,
): string[] {
  const mod = curriculum.find((m) => m.id === moduleId);
  if (!mod) return [];

  const prerequisites = mod.prerequisites ?? [];
  return prerequisites.filter((prereqId) => !completedModuleIds.has(prereqId));
}

/**
 * Get the full unlock tree: for each module, its status and missing prereqs.
 * Useful for the dashboard/sidebar to show lock states.
 */
export interface ModuleUnlockStatus {
  moduleId: string;
  title: string;
  color: string;
  iconName: string;
  unlocked: boolean;
  completed: boolean;
  missingPrerequisites: string[];
  /** Human-readable names of missing prerequisites */
  missingPrerequisiteLabels: string[];
  level: number;
}

export function getModuleUnlockTree(
  completedModuleIds: Set<string>,
  startedModuleIds: Set<string> = new Set(),
): ModuleUnlockStatus[] {
  return curriculum.map((mod) => {
    const missing = getMissingPrerequisites(mod.id, completedModuleIds);
    return {
      moduleId: mod.id,
      title: mod.title,
      color: mod.color,
      iconName: mod.iconName,
      unlocked: isModuleUnlocked(mod.id, completedModuleIds, startedModuleIds),
      completed: completedModuleIds.has(mod.id),
      missingPrerequisites: missing,
      missingPrerequisiteLabels: missing.map(
        (id) => curriculum.find((m) => m.id === id)?.title ?? id,
      ),
      level: mod.level ?? 1,
    };
  });
}
