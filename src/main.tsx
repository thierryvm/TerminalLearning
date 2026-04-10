import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './styles/index.css';
import { initSentry } from './lib/sentry.ts';

initSentry();

createRoot(document.getElementById('root')!).render(<App />);
