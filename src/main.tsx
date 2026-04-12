import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './styles/index.css';
import { initSentry } from './lib/sentry.ts';

initSentry();

// Stale chunk guard — after a new deployment, old chunk hashes no longer exist.
// Vercel's SPA rewrite returns index.html (text/html) instead of the JS chunk,
// which Mobile Safari (nosniff-strict) rejects as an invalid MIME type.
// Detect this and force a hard reload to fetch the new build — once only per
// session (sessionStorage flag) to prevent infinite reload loops.
window.addEventListener('unhandledrejection', (event) => {
  const msg: string = (event.reason as { message?: string })?.message ?? '';
  const isStaleChunk =
    msg.includes('text/html') ||
    msg.includes('is not a valid JavaScript MIME type') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed');
  if (isStaleChunk && !sessionStorage.getItem('chunk-reload')) {
    sessionStorage.setItem('chunk-reload', '1');
    window.location.reload();
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
