/**
 * Tests for heatmap helpers — THI-234 Phase 9 (THI-77).
 */
import { describe, it, expect } from 'vitest';

import { buildHeatmapGrid, heatmapLevel, heatmapMax, HEATMAP_WEEKS } from '@/lib/admin/heatmap';

const TODAY = new Date('2026-06-04T12:00:00Z');

describe('buildHeatmapGrid', () => {
  it('returns exactly 52*7 cells', () => {
    expect(buildHeatmapGrid([], TODAY)).toHaveLength(HEATMAP_WEEKS * 7);
  });

  it('ends on today (UTC) and is ordered oldest-first', () => {
    const cells = buildHeatmapGrid([], TODAY);
    expect(cells[cells.length - 1].date).toBe('2026-06-04');
    const ascending = cells.every((c, i) => i === 0 || c.date > cells[i - 1].date);
    expect(ascending).toBe(true);
  });

  it('fills sparse RPC rows and defaults the rest to 0', () => {
    const cells = buildHeatmapGrid(
      [
        { day: '2026-06-04', completions: 9 },
        { day: '2026-06-01', completions: 3 },
      ],
      TODAY,
    );
    const byDate = new Map(cells.map((c) => [c.date, c.completions]));
    expect(byDate.get('2026-06-04')).toBe(9);
    expect(byDate.get('2026-06-01')).toBe(3);
    expect(byDate.get('2026-06-03')).toBe(0);
  });

  it('ignores days outside the 52-week window', () => {
    const cells = buildHeatmapGrid([{ day: '2020-01-01', completions: 99 }], TODAY);
    expect(cells.every((c) => c.completions === 0)).toBe(true);
  });
});

describe('heatmapLevel', () => {
  it('returns 0 for no activity or zero max', () => {
    expect(heatmapLevel(0, 10)).toBe(0);
    expect(heatmapLevel(5, 0)).toBe(0);
    expect(heatmapLevel(-2, 10)).toBe(0);
  });

  it('buckets by ratio to the busiest day', () => {
    expect(heatmapLevel(10, 10)).toBe(4); // 1.0  > 0.75
    expect(heatmapLevel(8, 10)).toBe(4); // 0.8  > 0.75
    expect(heatmapLevel(6, 10)).toBe(3); // 0.6  > 0.5
    expect(heatmapLevel(4, 10)).toBe(2); // 0.4  > 0.25
    expect(heatmapLevel(2, 10)).toBe(1); // 0.2
    expect(heatmapLevel(1, 10)).toBe(1);
  });
});

describe('heatmapMax', () => {
  it('returns the busiest day, 0 when empty', () => {
    expect(heatmapMax([])).toBe(0);
    expect(
      heatmapMax([
        { date: 'a', completions: 3 },
        { date: 'b', completions: 7 },
        { date: 'c', completions: 1 },
      ]),
    ).toBe(7);
  });
});
