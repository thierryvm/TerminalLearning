import { describe, it, expect } from 'vitest';
import { mergeProgress, getDelta, type RemoteLesson } from '../app/lib/progressSync';

function remote(lessons: Array<{ id: string; completed: boolean }>): RemoteLesson[] {
  return lessons.map(({ id, completed }) => ({
    user_id: 'user-1',
    lesson_id: id,
    completed,
    completed_at: completed ? new Date().toISOString() : null,
    score: null,
  }));
}

describe('mergeProgress', () => {
  it('local wins when local=true, remote=false', () => {
    const local = { 'nav/pwd': true };
    const result = mergeProgress(local, remote([{ id: 'nav/pwd', completed: false }]));
    expect(result['nav/pwd']).toBe(true);
  });

  it('remote wins when remote=true, local=false', () => {
    const local = { 'nav/pwd': false };
    const result = mergeProgress(local, remote([{ id: 'nav/pwd', completed: true }]));
    expect(result['nav/pwd']).toBe(true);
  });

  it('no change when both equal (both true)', () => {
    const local = { 'nav/pwd': true };
    const result = mergeProgress(local, remote([{ id: 'nav/pwd', completed: true }]));
    expect(result['nav/pwd']).toBe(true);
  });

  it('preserves local lessons absent from remote', () => {
    const local = { 'nav/pwd': true, 'nav/ls': true };
    const result = mergeProgress(local, remote([{ id: 'nav/pwd', completed: true }]));
    expect(result['nav/ls']).toBe(true);
  });

  it('empty remote returns local unchanged', () => {
    const local = { 'nav/pwd': true };
    const result = mergeProgress(local, []);
    expect(result).toEqual(local);
  });
});

describe('getDelta', () => {
  it('returns lessons completed locally but absent from remote', () => {
    const local = { 'nav/pwd': true, 'nav/ls': true };
    const delta = getDelta(local, remote([{ id: 'nav/pwd', completed: true }]));
    expect(delta).toEqual(['nav/ls']);
  });

  it('returns empty array when all local lessons are synced', () => {
    const local = { 'nav/pwd': true };
    const delta = getDelta(local, remote([{ id: 'nav/pwd', completed: true }]));
    expect(delta).toEqual([]);
  });

  it('returns all lessons when remote is empty', () => {
    const local = { 'nav/pwd': true, 'nav/ls': true };
    const delta = getDelta(local, []);
    expect(delta.sort()).toEqual(['nav/ls', 'nav/pwd']);
  });

  it('ignores locally false lessons', () => {
    const local = { 'nav/pwd': false };
    const delta = getDelta(local, []);
    expect(delta).toEqual([]);
  });

  it('ignores remote lessons that are not completed', () => {
    const local = { 'nav/pwd': true };
    const delta = getDelta(local, remote([{ id: 'nav/pwd', completed: false }]));
    expect(delta).toEqual(['nav/pwd']);
  });
});
