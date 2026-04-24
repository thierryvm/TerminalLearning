import { useEffect } from 'react';

declare global {
  interface Window {
    __CSP_NONCE__?: string;
  }
}

/**
 * Read CSP nonce from meta tag injected by Edge Function.
 * Stores it in window.__CSP_NONCE__ for inline styles.
 */
export function useCspNonce(): string | null {
  useEffect(() => {
    const metaTag = document.querySelector('meta[name="csp-nonce"]');
    if (metaTag) {
      const nonce = metaTag.getAttribute('content');
      if (nonce) {
        window.__CSP_NONCE__ = nonce;
      }
    }
  }, []);

  return (typeof window !== 'undefined' && window.__CSP_NONCE__) || null;
}
