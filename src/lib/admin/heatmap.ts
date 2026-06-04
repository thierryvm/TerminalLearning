/**
 * Heatmap helpers — THI-234 Phase 9 (THI-77 student activity heatmap).
 *
 * Pure + deterministic transforms turning the `admin_activity_heatmap` RPC rows
 * (sparse daily counts) into a fixed 52-week grid for a GitHub-style rendering.
 * Extracted from the widget so the date-walking + bucketing logic is unit-tested
 * without rendering React.
 */
import type { HeatmapDay } from '@/lib/hooks/useAdminAnalytics';

export interface HeatmapCell {
  /** ISO date (YYYY-MM-DD, UTC). */
  date: string;
  completions: number;
}

export const HEATMAP_WEEKS = 52;
const HEATMAP_DAYS = HEATMAP_WEEKS * 7; // 364

/**
 * Build a fixed 52-week (364-day) grid ending on `today`, oldest day first.
 * RPC rows are sparse (only days with activity) — every other day is filled with
 * `completions: 0`. UTC throughout to avoid TZ drift between the DB (date_trunc)
 * and the client.
 */
export function buildHeatmapGrid(days: HeatmapDay[], today: Date = new Date()): HeatmapCell[] {
  const byDate = new Map<string, number>();
  for (const d of days) byDate.set(d.day, d.completions);

  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const cells: HeatmapCell[] = [];
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, completions: byDate.get(key) ?? 0 });
  }
  return cells;
}

/**
 * GitHub-style 0–4 intensity level, relative to the busiest day in the window.
 * Level 0 = no activity; 1–4 scale by ratio to `max` so the palette adapts to
 * the project's real volume (no hardcoded thresholds that would wash out on a
 * low-traffic platform).
 */
export function heatmapLevel(completions: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (completions <= 0 || max <= 0) return 0;
  const ratio = completions / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

/** Largest single-day completions in the set (0 when empty). */
export function heatmapMax(cells: HeatmapCell[]): number {
  return cells.reduce((m, c) => (c.completions > m ? c.completions : m), 0);
}
