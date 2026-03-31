import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ProgressProvider } from './context/ProgressContext';
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <ProgressProvider>
      <RouterProvider router={router} />
      <Analytics />
    </ProgressProvider>
  );
}
