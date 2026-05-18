import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { createBrowserRouter, redirect } from 'react-router';

// Stale chunk auto-recovery wrapper — when a new deployment invalidates old
// chunk hashes, users with the previous version still open trigger a failed
// dynamic import. The guard in main.tsx catches unhandledrejection events,
// but React Router 7 catches lazy() rejections BEFORE the browser fires
// unhandledrejection, so the guard never sees them and the user sees the
// default React Router error screen ("💿 Hey developer 👋").
//
// This wrapper intercepts the rejection at the source (before React Router
// receives it) and forces a hard reload once per session — same sessionStorage
// flag as main.tsx to prevent reload loops if the chunk failure is real
// (e.g. CDN outage, not just a deployment-cache mismatch).
const CHUNK_RELOAD_KEY = 'chunk-reload';

function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      const msg = String(err instanceof Error ? err.message : err ?? '');
      const isStaleChunk =
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed') ||
        msg.includes('is not a valid JavaScript MIME type') ||
        msg.includes('text/html');
      if (isStaleChunk && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
        window.location.reload();
        // Return a never-resolving promise — React stays in Suspense fallback
        // (PageLoader) while the page reloads, instead of throwing to the
        // React Router default ErrorBoundary.
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}

// Route-level code splitting — each route loads its own JS chunk on demand.
// Layout is lazy so that Sidebar → curriculum.ts is excluded from the main bundle,
// improving TBT/INP for Landing-page visitors who never enter /app.
const Layout = lazyWithRetry(() =>
  import('./components/Layout').then(({ Layout }) => ({ default: Layout }))
);

const Landing = lazyWithRetry(() =>
  import('./components/Landing').then(({ Landing }) => ({ default: Landing }))
);
const PrivacyPolicy = lazyWithRetry(() =>
  import('./components/PrivacyPolicy').then(({ PrivacyPolicy }) => ({ default: PrivacyPolicy }))
);
const AuthCallback = lazyWithRetry(() =>
  import('./components/auth/AuthCallback').then(({ AuthCallback }) => ({ default: AuthCallback }))
);
const Dashboard = lazyWithRetry(() =>
  import('./components/Dashboard').then(({ Dashboard }) => ({ default: Dashboard }))
);
const LessonPage = lazyWithRetry(() =>
  import('./components/LessonPage').then(({ LessonPage }) => ({ default: LessonPage }))
);
const CommandReference = lazyWithRetry(() =>
  import('./components/CommandReference').then(({ CommandReference }) => ({ default: CommandReference }))
);
const AiSettings = lazyWithRetry(() =>
  import('./components/AiSettings').then(({ AiSettings }) => ({ default: AiSettings }))
);
const ProfilePage = lazyWithRetry(() =>
  import('./components/ProfilePage').then(({ ProfilePage }) => ({ default: ProfilePage }))
);
const Changelog = lazyWithRetry(() =>
  import('./components/Changelog').then(({ Changelog }) => ({ default: Changelog }))
);
const Story = lazyWithRetry(() =>
  import('./components/Story').then(({ Story }) => ({ default: Story }))
);
const NotFound = lazyWithRetry(() =>
  import('./components/NotFound').then(({ NotFound }) => ({ default: NotFound }))
);

export const router = createBrowserRouter([
  // Public pages
  { path: '/', Component: Landing },
  { path: '/privacy', Component: PrivacyPolicy },
  { path: '/changelog', Component: Changelog },
  { path: '/story', Component: Story },
  { path: '/auth/callback', Component: AuthCallback },

  // App — all learning routes under /app
  {
    path: '/app',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'learn/:moduleId/:lessonId', Component: LessonPage },
      { path: 'reference', Component: CommandReference },
      { path: 'settings', Component: AiSettings },
      { path: 'profile', Component: ProfilePage },
    ],
  },

  // Backward-compatibility redirects (old routes without /app prefix)
  {
    path: '/learn/:moduleId/:lessonId',
    loader: ({ params }) => redirect(`/app/learn/${params.moduleId}/${params.lessonId}`),
  },
  {
    path: '/reference',
    loader: () => redirect('/app/reference'),
  },

  // Catch-all 404
  { path: '*', Component: NotFound },
]);
