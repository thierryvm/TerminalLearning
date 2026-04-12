// Pure permission helpers for RBAC.
// No DB calls — use these to gate UI and validate client-side access.
// Server-side enforcement is handled by RLS policies in migration 005_rbac_roles.sql.
// Tested in src/test/rbac.test.ts

import type { UserRole } from '../app/types/database';

export type { UserRole };

/** Returns true for roles with global or institution-level admin access. */
export function isAdmin(role: UserRole): boolean {
  return role === 'super_admin' || role === 'institution_admin';
}

/** Returns true for roles that can approve or revoke teacher status. */
export function canApproveTeachers(role: UserRole): boolean {
  return role === 'super_admin' || role === 'institution_admin';
}

/** Returns true for roles that can create and manage classes. */
export function canManageClasses(role: UserRole): boolean {
  return role === 'teacher' || role === 'institution_admin' || role === 'super_admin';
}

/** Returns true for roles that can view student progress data. */
export function canViewStudentProgress(role: UserRole): boolean {
  return role === 'teacher' || role === 'institution_admin' || role === 'super_admin';
}

/** Returns true for roles that can access the admin panel (Phase 9). */
export function canAccessAdminPanel(role: UserRole): boolean {
  return role === 'super_admin' || role === 'institution_admin';
}

/** Returns true if the user is in the pending teacher verification state. */
export function isPendingTeacher(role: UserRole): boolean {
  return role === 'pending_teacher';
}

/** Returns true for active teacher role (not pending). */
export function isTeacher(role: UserRole): boolean {
  return role === 'teacher';
}

/** Returns true only for the global super administrator. */
export function isSuperAdmin(role: UserRole): boolean {
  return role === 'super_admin';
}

/**
 * Returns true if the user can enroll students in a class.
 * Note: teachers must also own the class — this only checks the role.
 */
export function canEnrollStudents(role: UserRole): boolean {
  return role === 'teacher' || role === 'institution_admin' || role === 'super_admin';
}

/**
 * Returns true if the given role is allowed to request teacher verification.
 * Only regular students can transition to pending_teacher.
 */
export function canRequestTeacherRole(role: UserRole): boolean {
  return role === 'student';
}

/**
 * Returns a human-readable label for a role.
 * Used in UI components — French labels match the app's language.
 */
export function roleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    super_admin:       'Super administrateur',
    institution_admin: 'Administrateur institution',
    teacher:           'Enseignant',
    pending_teacher:   'Enseignant (en attente)',
    student:           'Étudiant',
  };
  return labels[role];
}
