import { RouterProvider } from 'react-router';
import { Analytics } from '@vercel/analytics/react';
import { router } from './routes';
import { ProgressProvider } from './context/ProgressContext';

export default function App() {
  return (
    <ProgressProvider>
      <RouterProvider router={router} />
      <Analytics />
    </ProgressProvider>
  );
}
