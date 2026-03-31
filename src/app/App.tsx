import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ProgressProvider } from './context/ProgressContext';

export default function App() {
  return (
    <ProgressProvider>
      <RouterProvider router={router} />
    </ProgressProvider>
  );
}
