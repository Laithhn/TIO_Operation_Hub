// Global styles, in order: VtWebGuiFramework base sheet (fonts, reset; via ./vt), framework-derived tokens,
// the hub's component and page styles, then the frame additions.
import './vt';
import './styles/tokens.scss';
import './styles/kit.scss';
import './styles/app.css';
import './styles/frame.scss';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ApiError } from './api';
import { router } from './App';
import { ToastProvider } from './ui/kit';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, refetchOnWindowFocus: true, retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2 }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>
);
