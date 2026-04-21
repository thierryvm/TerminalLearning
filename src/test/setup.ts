import 'vitest/globals';
import '@testing-library/jest-dom';

// localStorage polyfill for jsdom environments where it is not fully available
const makeLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() { return Object.keys(store).length; },
  };
};

Object.defineProperty(globalThis, 'localStorage', {
  value: makeLocalStorage(),
  writable: true,
});

// IntersectionObserver polyfill — jsdom does not implement it.
if (typeof window !== 'undefined' && !('IntersectionObserver' in globalThis)) {
  class MockIntersectionObserver {
    constructor(private cb: IntersectionObserverCallback) {}
    observe(el: Element) {
      // Immediately report as intersecting so scroll-reveal components render in tests
      this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, 'IntersectionObserver', { value: MockIntersectionObserver });
}

// window.matchMedia polyfill — jsdom does not implement it.
// Guard required: node-environment tests (e.g. rbac.integration.test.ts) share this setupFile.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
