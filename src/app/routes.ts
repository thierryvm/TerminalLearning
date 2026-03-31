import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { LessonPage } from './components/LessonPage';
import { CommandReference } from './components/CommandReference';
import { Landing } from './components/Landing';
import { PrivacyPolicy } from './components/PrivacyPolicy';

export const router = createBrowserRouter([
  // Public landing
  { path: '/', Component: Landing },
  { path: '/privacy', Component: PrivacyPolicy },

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
]);
