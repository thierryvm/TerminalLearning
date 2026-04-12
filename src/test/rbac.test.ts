import { describe, it, expect } from 'vitest';
import {
  isAdmin,
  canApproveTeachers,
  canManageClasses,
  canViewStudentProgress,
  canAccessAdminPanel,
  isPendingTeacher,
  isTeacher,
  isSuperAdmin,
  canEnrollStudents,
  canRequestTeacherRole,
  roleLabel,
  type UserRole,
} from '../lib/rbac';

const ALL_ROLES: UserRole[] = ['super_admin', 'institution_admin', 'teacher', 'pending_teacher', 'student'];

// ─── isAdmin ─────────────────────────────────────────────────────────────────

describe('isAdmin', () => {
  it('returns true for super_admin', () => expect(isAdmin('super_admin')).toBe(true));
  it('returns true for institution_admin', () => expect(isAdmin('institution_admin')).toBe(true));
  it('returns false for teacher', () => expect(isAdmin('teacher')).toBe(false));
  it('returns false for pending_teacher', () => expect(isAdmin('pending_teacher')).toBe(false));
  it('returns false for student', () => expect(isAdmin('student')).toBe(false));
});

// ─── canApproveTeachers ───────────────────────────────────────────────────────

describe('canApproveTeachers', () => {
  it('super_admin can approve', () => expect(canApproveTeachers('super_admin')).toBe(true));
  it('institution_admin can approve', () => expect(canApproveTeachers('institution_admin')).toBe(true));
  it('teacher cannot approve', () => expect(canApproveTeachers('teacher')).toBe(false));
  it('pending_teacher cannot approve', () => expect(canApproveTeachers('pending_teacher')).toBe(false));
  it('student cannot approve', () => expect(canApproveTeachers('student')).toBe(false));
});

// ─── canManageClasses ─────────────────────────────────────────────────────────

describe('canManageClasses', () => {
  it('teacher can manage classes', () => expect(canManageClasses('teacher')).toBe(true));
  it('institution_admin can manage classes', () => expect(canManageClasses('institution_admin')).toBe(true));
  it('super_admin can manage classes', () => expect(canManageClasses('super_admin')).toBe(true));
  it('pending_teacher cannot manage classes', () => expect(canManageClasses('pending_teacher')).toBe(false));
  it('student cannot manage classes', () => expect(canManageClasses('student')).toBe(false));
});

// ─── canViewStudentProgress ───────────────────────────────────────────────────

describe('canViewStudentProgress', () => {
  it('teacher can view progress', () => expect(canViewStudentProgress('teacher')).toBe(true));
  it('institution_admin can view progress', () => expect(canViewStudentProgress('institution_admin')).toBe(true));
  it('super_admin can view progress', () => expect(canViewStudentProgress('super_admin')).toBe(true));
  it('student cannot view other progress', () => expect(canViewStudentProgress('student')).toBe(false));
  it('pending_teacher cannot view progress', () => expect(canViewStudentProgress('pending_teacher')).toBe(false));
});

// ─── canAccessAdminPanel ──────────────────────────────────────────────────────

describe('canAccessAdminPanel', () => {
  it('super_admin can access admin panel', () => expect(canAccessAdminPanel('super_admin')).toBe(true));
  it('institution_admin can access admin panel', () => expect(canAccessAdminPanel('institution_admin')).toBe(true));
  it('teacher cannot access admin panel', () => expect(canAccessAdminPanel('teacher')).toBe(false));
  it('pending_teacher cannot access admin panel', () => expect(canAccessAdminPanel('pending_teacher')).toBe(false));
  it('student cannot access admin panel', () => expect(canAccessAdminPanel('student')).toBe(false));
});

// ─── isPendingTeacher ─────────────────────────────────────────────────────────

describe('isPendingTeacher', () => {
  it('returns true only for pending_teacher', () => {
    expect(isPendingTeacher('pending_teacher')).toBe(true);
    for (const role of ALL_ROLES.filter(r => r !== 'pending_teacher')) {
      expect(isPendingTeacher(role)).toBe(false);
    }
  });
});

// ─── isTeacher ───────────────────────────────────────────────────────────────

describe('isTeacher', () => {
  it('returns true only for teacher', () => {
    expect(isTeacher('teacher')).toBe(true);
    expect(isTeacher('pending_teacher')).toBe(false);
    expect(isTeacher('super_admin')).toBe(false);
    expect(isTeacher('institution_admin')).toBe(false);
    expect(isTeacher('student')).toBe(false);
  });
});

// ─── isSuperAdmin ─────────────────────────────────────────────────────────────

describe('isSuperAdmin', () => {
  it('returns true only for super_admin', () => {
    expect(isSuperAdmin('super_admin')).toBe(true);
    for (const role of ALL_ROLES.filter(r => r !== 'super_admin')) {
      expect(isSuperAdmin(role)).toBe(false);
    }
  });
});

// ─── canEnrollStudents ────────────────────────────────────────────────────────

describe('canEnrollStudents', () => {
  it('teacher can enroll students', () => expect(canEnrollStudents('teacher')).toBe(true));
  it('institution_admin can enroll', () => expect(canEnrollStudents('institution_admin')).toBe(true));
  it('super_admin can enroll', () => expect(canEnrollStudents('super_admin')).toBe(true));
  it('student cannot enroll others', () => expect(canEnrollStudents('student')).toBe(false));
  it('pending_teacher cannot enroll', () => expect(canEnrollStudents('pending_teacher')).toBe(false));
});

// ─── canRequestTeacherRole ────────────────────────────────────────────────────

describe('canRequestTeacherRole', () => {
  it('student can request teacher role', () => expect(canRequestTeacherRole('student')).toBe(true));
  it('pending_teacher cannot request again', () => expect(canRequestTeacherRole('pending_teacher')).toBe(false));
  it('teacher cannot request (already is one)', () => expect(canRequestTeacherRole('teacher')).toBe(false));
  it('institution_admin cannot request', () => expect(canRequestTeacherRole('institution_admin')).toBe(false));
  it('super_admin cannot request', () => expect(canRequestTeacherRole('super_admin')).toBe(false));
});

// ─── roleLabel ────────────────────────────────────────────────────────────────

describe('roleLabel', () => {
  it('returns French label for each role', () => {
    expect(roleLabel('super_admin')).toBe('Super administrateur');
    expect(roleLabel('institution_admin')).toBe('Administrateur institution');
    expect(roleLabel('teacher')).toBe('Enseignant');
    expect(roleLabel('pending_teacher')).toBe('Enseignant (en attente)');
    expect(roleLabel('student')).toBe('Étudiant');
  });

  it('covers all roles', () => {
    for (const role of ALL_ROLES) {
      expect(roleLabel(role)).toBeTruthy();
    }
  });
});
