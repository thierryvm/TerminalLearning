/**
 * Model actually used for a provider (`resolveModel`), kept in sync with the
 * learner's stored choice.
 *
 * `resolveModel` is re-read on every render (one localStorage read), and the
 * `storage` event re-renders the component when the choice changes in
 * another tab (the event never fires in the tab that wrote the value; that
 * tab re-renders on its own).
 */
import { useCallback, useSyncExternalStore } from 'react';
import { MODEL_KEY_PREFIX, type Provider } from '@/lib/ai/keyManager';
import { resolveModel } from '@/lib/ai/providers';

/** True for a `storage` event that can change a stored model choice. */
export function isModelChoiceStorageEvent(e: StorageEvent): boolean {
  // `key === null` means `localStorage.clear()` in another tab.
  return e.key === null || e.key.startsWith(MODEL_KEY_PREFIX);
}

/** Calls `onChange` when another tab changes a stored model choice. */
export function subscribeToModelChoice(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: StorageEvent) => {
    if (isModelChoiceStorageEvent(e)) onChange();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export function useResolvedModel(provider: Provider): string {
  const getSnapshot = useCallback(() => resolveModel(provider), [provider]);
  return useSyncExternalStore(subscribeToModelChoice, getSnapshot, getSnapshot);
}
