/**
 * LTI 1.3 Replay Protection — Nonce Store (THI-131 Phase 7c Auth MVP)
 *
 * In-memory store of recently-seen JWT IDs (`jti`). Rejects a `jti` that has
 * already been observed within the TTL window.
 *
 * **Best-effort fast path only.** The canonical guarantee against replay is the
 * `UNIQUE(jti)` constraint on the `lti_launches` table (Supabase). This store
 * is the first line of defense — it short-circuits before hitting the DB and
 * survives within a warm Vercel Function instance, but a cold-start loses it.
 *
 * Design notes:
 * - TTL = 10 minutes (≥ JWT exp window for LTI 1.3, typically 5 min)
 * - Capacity bounded — opportunistic cleanup runs on insert (no setInterval to
 *   stay compatible with Vercel Fluid Compute graceful shutdown).
 * - Atomic check-and-set via Map (single-threaded JS — no race on a single
 *   function instance; cross-instance replay caught by the DB UNIQUE).
 */

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_MAX_ENTRIES = 10_000;
const CLEANUP_INTERVAL_MS = 60 * 1000; // run cleanup at most once per minute

export interface NonceStoreOptions {
  ttlMs?: number;
  maxEntries?: number;
}

export interface NonceStore {
  /**
   * Try to record a `jti`. Returns `true` if accepted (first time seen within TTL),
   * `false` if collision (replay detected).
   */
  remember(jti: string, now?: number): boolean;

  /** Number of currently-tracked entries (for tests + observability). */
  size(): number;

  /** Reset the store (tests only). */
  clear(): void;
}

interface Entry {
  expiresAt: number;
}

export function createNonceStore(options: NonceStoreOptions = {}): NonceStore {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const map = new Map<string, Entry>();
  let lastCleanupAt = 0;

  function maybeCleanup(now: number): void {
    if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
    lastCleanupAt = now;
    for (const [key, entry] of map) {
      if (entry.expiresAt <= now) map.delete(key);
    }
  }

  function evictOldestIfNeeded(): void {
    if (map.size < maxEntries) return;
    // Drop the oldest entry (FIFO via insertion order — Map preserves it).
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) map.delete(oldestKey);
  }

  return {
    remember(jti, now = Date.now()) {
      if (!jti || typeof jti !== 'string') {
        // Defensive: caller should validate, but never accept empty jti as "fresh"
        return false;
      }

      maybeCleanup(now);

      const existing = map.get(jti);
      if (existing && existing.expiresAt > now) {
        // Replay detected.
        return false;
      }

      evictOldestIfNeeded();
      map.set(jti, { expiresAt: now + ttlMs });
      return true;
    },

    size() {
      return map.size;
    },

    clear() {
      map.clear();
      lastCleanupAt = 0;
    },
  };
}

/**
 * Process-wide singleton store. Use this in `api/lti/launch.ts`. Tests should
 * call `createNonceStore()` directly to get an isolated instance.
 */
let _defaultStore: NonceStore | null = null;
export function getDefaultNonceStore(): NonceStore {
  if (!_defaultStore) _defaultStore = createNonceStore();
  return _defaultStore;
}

/** Test helper — reset the singleton between tests. */
export function _resetDefaultNonceStoreForTests(): void {
  _defaultStore = null;
}
