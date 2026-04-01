import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ProgressProvider, useProgress } from '../app/context/ProgressContext';

// Reset progress storage between tests to avoid state bleed
const STORAGE_KEY = 'terminal-master-progress';
beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY);
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(ProgressProvider, null, children)
);

// ─── Initial state ────────────────────────────────────────────────────────────

describe('ProgressContext — initial state', () => {
  it('starts with zero completed lessons', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    expect(result.current.totalCompleted).toBe(0);
  });

  it('starts with 0% overall progress', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    expect(result.current.overallProgress).toBe(0);
  });

  it('reports lesson as not completed by default', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    expect(result.current.isLessonCompleted('any-module', 'any-lesson')).toBe(false);
  });
});

// ─── completeLesson ───────────────────────────────────────────────────────────

describe('ProgressContext — completeLesson', () => {
  it('marks a lesson as completed', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    act(() => { result.current.completeLesson('mod-1', 'lesson-1'); });
    expect(result.current.isLessonCompleted('mod-1', 'lesson-1')).toBe(true);
  });

  it('increments totalCompleted', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    act(() => { result.current.completeLesson('mod-1', 'lesson-1'); });
    expect(result.current.totalCompleted).toBe(1);
  });

  it('does not affect other lessons', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    act(() => { result.current.completeLesson('mod-1', 'lesson-1'); });
    expect(result.current.isLessonCompleted('mod-1', 'lesson-2')).toBe(false);
    expect(result.current.isLessonCompleted('mod-2', 'lesson-1')).toBe(false);
  });

  it('accumulates multiple completions', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    act(() => {
      result.current.completeLesson('mod-1', 'lesson-1');
      result.current.completeLesson('mod-1', 'lesson-2');
      result.current.completeLesson('mod-2', 'lesson-1');
    });
    expect(result.current.totalCompleted).toBe(3);
    expect(result.current.isLessonCompleted('mod-1', 'lesson-1')).toBe(true);
    expect(result.current.isLessonCompleted('mod-1', 'lesson-2')).toBe(true);
    expect(result.current.isLessonCompleted('mod-2', 'lesson-1')).toBe(true);
  });

  it('does not double-count a lesson completed twice', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    act(() => {
      result.current.completeLesson('mod-1', 'lesson-1');
      result.current.completeLesson('mod-1', 'lesson-1');
    });
    expect(result.current.totalCompleted).toBe(1);
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    act(() => { result.current.completeLesson('mod-1', 'lesson-1'); });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.completedLessons['mod-1/lesson-1']).toBe(true);
  });
});

// ─── resetProgress ────────────────────────────────────────────────────────────

describe('ProgressContext — resetProgress', () => {
  it('clears all completed lessons', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    act(() => {
      result.current.completeLesson('mod-1', 'lesson-1');
      result.current.completeLesson('mod-2', 'lesson-2');
    });
    act(() => { result.current.resetProgress(); });
    expect(result.current.totalCompleted).toBe(0);
    expect(result.current.isLessonCompleted('mod-1', 'lesson-1')).toBe(false);
  });

  it('clears localStorage on reset', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    act(() => { result.current.completeLesson('mod-1', 'lesson-1'); });
    act(() => { result.current.resetProgress(); });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(Object.keys(stored.completedLessons ?? {})).toHaveLength(0);
  });
});

// ─── getModuleProgress ────────────────────────────────────────────────────────

describe('ProgressContext — getModuleProgress', () => {
  it('returns 0 completed for a fresh module', () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    const { completed } = result.current.getModuleProgress('navigation');
    expect(completed).toBe(0);
  });
});
