// Global styles, in order: VtWebGuiFramework 4 base sheet (fonts, reset, html 17px; via ./vt), framework-derived tokens,
// the hub's component and page styles, then the frame additions.
import './vt';
import './styles/tokens.scss';
import './styles/kit.scss';
import './styles/app.css';
import './styles/frame.scss';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router';
import { ApiError } from './api';
import { router } from './App';
import { ToastProvider } from './ui/kit';
import { createVtStore } from './vt/store';

// A118: searchable dropdowns load in their own small chunk, so the entry chunk stays inside its budget.
const SelectSearch = lazy(() => import('./ui/SelectSearch').then(m => ({ default: m.SelectSearch })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, refetchOnWindowFocus: true, retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2 }
  }
});

// The VtWebGuiFramework store (i18n, storage, app slices) must be ready before framework components render.
createVtStore().then(vtStore => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Provider store={vtStore}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RouterProvider router={router} />
            <Suspense fallback={null}><SelectSearch /></Suspense>
          </ToastProvider>
        </QueryClientProvider>
      </Provider>
    </StrictMode>
  );
}).catch((e: unknown) => {
  document.getElementById('root')!.textContent = `The user interface could not start: ${e instanceof Error ? e.message : String(e)}`;
});
