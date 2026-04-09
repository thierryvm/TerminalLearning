import { lazy } from 'react';
import { createBrowserRouter, redirect } from 'react-router';

// Route-level code splitting — each route loads its own JS chunk on demand.
// Layout stays eager: it's the /app shell and renders before any child route.
import { Layout } from './components/Layout';

const Landing = lazy(() =>
  import('./components/Landing').then(({ Landing }) => ({ default: Landing }))
);
const PrivacyPolicy = lazy(() =>
  import('./components/PrivacyPolicy').then(({ PrivacyPolicy }) => ({ default: PrivacyPolicy }))
);
const AuthCallback = lazy(() =>
  import('./components/auth/AuthCallback').then(({ AuthCallback }) => ({ default: AuthCallback }))
);
const Dashboard = lazy(() =>
  import('./components/Dashboard').then(({ Dashboard }) => ({ default: Dashboard }))
);
const LessonPage = lazy(() =>
  import('./components/LessonPage').then(({ LessonPage }) => ({ default: LessonPage }))
);
const CommandReference = lazy(() =>
  import('./components/CommandReference').then(({ CommandReference }) => ({ default: CommandReference }))
);
const NotFound = lazy(() =>
  import('./components/NotFound').then(({ NotFound }) => ({ default: NotFound }))
);

export const router = createBrowserRouter([
  // Public pages
  { path: '/', Component: Landing },
  { path: '/privacy', Component: PrivacyPolicy },
  { path: '/auth/callback', Component: AuthCallback },

  // App — all learning routes under /app
  {
    path: '/app',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'learn/:moduleId/:lessonId', Component: LessonPage },
      { path: 'reference', Component: CommandReference },
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
