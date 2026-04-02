import { createBrowserRouter, redirect } from 'react-router';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { LessonPage } from './components/LessonPage';
import { CommandReference } from './components/CommandReference';
import { Landing } from './components/Landing';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { NotFound } from './components/NotFound';
import { AuthCallback } from './components/auth/AuthCallback';

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
