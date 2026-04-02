import { RouterProvider } from 'react-router';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Sentry } from '../lib/sentry';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { ProgressProvider } from './context/ProgressContext';

function FallbackUI() {
  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-[#e6edf3] font-mono">
      <div className="text-center space-y-4">
        <p className="text-[#f85149] text-lg">Une erreur inattendue s'est produite.</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded px-4 py-2 transition-colors"
        >
          Recharger la page
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={<FallbackUI />}>
      <AuthProvider>
        <ProgressProvider>
          <RouterProvider router={router} />
          <Analytics />
          <SpeedInsights />
        </ProgressProvider>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  );
}
