import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * Stale chunk auto-recovery — shared between the router (routes.ts), lazily
 * mounted sub-components (e.g. Landing's UserMenu/LoginModal/PWAInstallModal)
 * and the global guards in main.tsx.
 *
 * After a new deployment, old chunk hashes no longer exist on the CDN. A user
 * who kept a tab open before the deploy triggers a failed dynamic import when a
 * lazy chunk is finally requested (e.g. `UserMenu-D4jfd8IN.js`). Vercel's SPA
 * rewrite returns index.html (text/html) instead of the JS chunk, which strict
 * browsers reject as an invalid MIME type.
 *
 * Single source of truth for: the detection heuristic, the once-per-session
 * sessionStorage flag (prevents infinite reload loops if the failure is real —
 * CDN outage, not just a deploy-cache mismatch), and the `lazyWithRetry`
 * wrapper. Previously `lazyWithRetry` lived only in routes.ts, so sub-components
 * lazy-loaded with a plain `lazy()` (Landing's UserMenu) escaped the retry and
 * surfaced React Router's default error screen.
 */

export const STALE_CHUNK_RELOAD_KEY = 'chunk-reload';

/**
 * True when an error looks like a stale-chunk / failed dynamic import.
 * 'text/html' covers the Vercel SPA-rewrite case (index.html served for a
 * missing chunk). Broad on purpose — a false positive only costs one reload.
 */
export function isStaleChunkError(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err ?? '');
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('is not a valid JavaScript MIME type') ||
    msg.includes('text/html')
  );
}

/**
 * Force a single hard reload to fetch the new build, guarded once per session.
 * Returns true if a reload was triggered (caller should stop / stay pending).
 */
export function reloadOnceForStaleChunk(): boolean {
  if (sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY)) return false;
  sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, '1');
  window.location.reload();
  return true;
}

/**
 * `React.lazy` wrapper that auto-recovers from a stale-chunk failure. On a
 * stale-chunk error it reloads once and returns a never-resolving promise so
 * React stays in its Suspense fallback while the page reloads, instead of
 * throwing to the nearest (React Router default) error boundary.
 *
 * The `ComponentType<any>` bound mirrors React's own `lazy` signature — it is
 * required to preserve the wrapped component's prop types through inference
 * (a `<unknown>` bound collapses props to `IntrinsicAttributes`, breaking
 * callers that pass props, e.g. Landing's UserMenu/LoginModal).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors React.lazy's signature to preserve prop types
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (isStaleChunkError(err) && reloadOnceForStaleChunk()) {
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}
