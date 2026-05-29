import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './styles/index.css';
import { initSentry } from './lib/sentry.ts';
import { isStaleChunkError, reloadOnceForStaleChunk } from './app/lib/lazyWithRetry.ts';

initSentry();

// Stale chunk guards — after a new deployment, old chunk hashes no longer exist.
// Vercel's SPA rewrite returns index.html (text/html) instead of the JS chunk,
// which strict browsers reject as an invalid MIME type. Three complementary
// layers, all sharing the same once-per-session sessionStorage flag (so at most
// one reload happens regardless of which layer fires first):
//   1. lazyWithRetry()      — per-component, keeps Suspense fallback (routes + Landing sub-components)
//   2. vite:preloadError     — Vite's official hook for failed dynamic imports (catch-all, even unwrapped lazies)
//   3. unhandledrejection    — last-resort net for rejections that escape the above

// (2) Vite fires this when it fails to load a dynamic import (official API).
// preventDefault() suppresses the throw so React Router never shows its default
// error screen; we reload to fetch the fresh build.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadOnceForStaleChunk();
});

// (3) Last-resort: rejections not already handled by the layers above.
window.addEventListener('unhandledrejection', (event) => {
  if (isStaleChunkError(event.reason)) {
    reloadOnceForStaleChunk();
  }
});

// Inject PWA manifest — skip on Vercel preview deployments (they block static assets with 401)
if (!window.location.hostname.endsWith('.vercel.app')) {
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = '/manifest.webmanifest';
  document.head.appendChild(link);
}

createRoot(document.getElementById('root')!).render(<App />);
