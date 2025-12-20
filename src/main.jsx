import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';
import { SupabaseAuthProvider } from '@/contexts/SupabaseAuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <ErrorBoundary>
      <BrowserRouter>
        <SupabaseAuthProvider>
          <App />
          <Toaster />
        </SupabaseAuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </>
);
