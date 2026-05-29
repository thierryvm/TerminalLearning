import { createBrowserRouter, redirect } from 'react-router';
import { lazyWithRetry } from './lib/lazyWithRetry';

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
const AdminPanel = lazyWithRetry(() =>
  import('./components/AdminPanel').then(({ AdminPanel }) => ({ default: AdminPanel }))
);
const InstitutionAdminPanel = lazyWithRetry(() =>
  import('./components/InstitutionAdminPanel').then(({ InstitutionAdminPanel }) => ({ default: InstitutionAdminPanel }))
);
const TeacherDashboard = lazyWithRetry(() =>
  import('./components/TeacherDashboard').then(({ TeacherDashboard }) => ({ default: TeacherDashboard }))
);
const JoinClass = lazyWithRetry(() =>
  import('./components/JoinClass').then(({ JoinClass }) => ({ default: JoinClass }))
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
      { path: 'admin', Component: AdminPanel },
      { path: 'institution', Component: InstitutionAdminPanel },
      { path: 'teacher', Component: TeacherDashboard },
      { path: 'join', Component: JoinClass },
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
