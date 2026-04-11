import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './styles/index.css';
import { initSentry } from './lib/sentry.ts';

initSentry();

// Inject PWA manifest — skip on Vercel preview deployments (they block static assets with 401)
if (!window.location.hostname.endsWith('.vercel.app')) {
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = '/manifest.webmanifest';
  document.head.appendChild(link);
}

createRoot(document.getElementById('root')!).render(<App />);
