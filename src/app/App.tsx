import { Suspense } from 'react';
import { RouterProvider } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Sentry } from '../lib/sentry';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { ProgressProvider } from './context/ProgressContext';
import { EnvironmentProvider } from './context/EnvironmentContext';
import { PageLoader } from './components/PageLoader';
import { Button } from './components/ui/button';

function FallbackUI() {
  return (
    <div className="min-h-dvh bg-[#0d1117] flex items-center justify-center text-[#e6edf3] font-mono">
      <div className="text-center space-y-4">
        <p className="text-[#f85149] text-lg">Une erreur inattendue s'est produite.</p>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="text-sm text-emerald-400 hover:text-emerald-300 hover:bg-transparent bg-transparent border-emerald-500/30"
        >
          Recharger la page
        </Button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
    <Sentry.ErrorBoundary fallback={<FallbackUI />}>
      <AuthProvider>
        <EnvironmentProvider>
          <ProgressProvider>
            <Suspense fallback={<PageLoader />}>
              <RouterProvider router={router} />
            </Suspense>
            <Analytics />
            <SpeedInsights />
          </ProgressProvider>
        </EnvironmentProvider>
      </AuthProvider>
    </Sentry.ErrorBoundary>
    </HelmetProvider>
  );
}
