import { curriculum } from '../data/curriculum';
import type { Module } from '../data/curriculum';

/**
 * Module unlocking logic for Terminal Learning.
 *
 * A module is unlocked when ALL of its prerequisites are completed.
 * Modules with no prerequisites (e.g. "navigation") are always unlocked.
 *
 * This module is stateless — it takes completed module IDs as input
 * and returns unlock status. The actual progress state lives in
 * ProgressContext.
 */

/** Check if a single module is unlocked given a set of completed module IDs. */
export function isModuleUnlocked(
  moduleId: string,
  completedModuleIds: Set<string>,
): boolean {
  const mod = curriculum.find((m) => m.id === moduleId);
  if (!mod) return false;

  const prerequisites = mod.prerequisites ?? [];

  // No prerequisites = always unlocked
  if (prerequisites.length === 0) return true;

  // All prerequisites must be completed
  return prerequisites.every((prereqId) => completedModuleIds.has(prereqId));
}

/** Get all unlocked module IDs given a set of completed module IDs. */
export function getUnlockedModules(
  completedModuleIds: Set<string>,
): string[] {
  return curriculum
    .filter((mod) => isModuleUnlocked(mod.id, completedModuleIds))
    .map((mod) => mod.id);
}

/** Get all locked module IDs given a set of completed module IDs. */
export function getLockedModules(
  completedModuleIds: Set<string>,
): string[] {
  return curriculum
    .filter((mod) => !isModuleUnlocked(mod.id, completedModuleIds))
    .map((mod) => mod.id);
}

/** Get the next recommended module (first unlocked but not yet completed). */
export function getNextRecommendedModule(
  completedModuleIds: Set<string>,
): Module | null {
  const unlocked = curriculum.filter(
    (mod) =>
      isModuleUnlocked(mod.id, completedModuleIds) &&
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
  unlocked: boolean;
  completed: boolean;
  missingPrerequisites: string[];
  level: number;
}

export function getModuleUnlockTree(
  completedModuleIds: Set<string>,
): ModuleUnlockStatus[] {
  return curriculum.map((mod) => ({
    moduleId: mod.id,
    unlocked: isModuleUnlocked(mod.id, completedModuleIds),
    completed: completedModuleIds.has(mod.id),
    missingPrerequisites: getMissingPrerequisites(mod.id, completedModuleIds),
    level: mod.level ?? 1,
  }));
}
