import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import '@fontsource-variable/inter';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/400-italic.css';
import './styles/index.css';
import { initSentry } from './lib/sentry.ts';

initSentry();

createRoot(document.getElementById('root')!).render(<App />);
