import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import '@/index.css';
import { Toaster } from '@/shared/ui/toaster';
import { SupabaseAuthProvider } from '@/contexts/SupabaseAuthContext';
import ErrorBoundary from '@/shared/components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <SupabaseAuthProvider>
          <App />
          <Toaster />
        </SupabaseAuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </>
);
