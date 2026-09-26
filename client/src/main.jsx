import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import App from './App';
import './index.css';

// Suppress unhandled errors from browser extensions / Web Vitals scripts
if (typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (event) => {
      if (
        event.message?.includes("Cannot read properties of undefined (reading 'startTime')") ||
        event.message?.includes('reportAllChanges') ||
        (event.filename && (event.filename.includes('VM') || event.filename.includes('extension')))
      ) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    },
    true
  );

  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason?.message?.includes("Cannot read properties of undefined (reading 'startTime')") ||
      event.reason?.message?.includes('reportAllChanges')
    ) {
      event.preventDefault();
    }
  });
}

// ─── Server pre-warm ping ─────────────────────────────────────────────────────
(function prewarmServer() {
  try {
    const base = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '') || '';
    const url = base ? `${base}/health` : '/api/health';
    fetch(url, { method: 'GET', cache: 'no-store' }).catch(() => {/* silent */});
  } catch (_) {}
})();

// Register Service Worker for PWA capabilities & push notifications
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('✅ Service Worker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('⚠️ Service Worker registration notice:', err);
      });
  });
}

// Initialize theme state from localStorage (default to dark mode)
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  document.documentElement.classList.remove('dark');
} else {
  document.documentElement.classList.add('dark');
}

// Configure TanStack Query Client for ZERO-LOADING Instant Caching UI
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 15,
      gcTime: 1000 * 60 * 60 * 24,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      placeholderData: (previousData) => previousData,
      retry: 1,
    },
  },
});

// Synchronous localStorage pre-seed
const preSeedCache = (localKey, queryKey) => {
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && (Array.isArray(parsed) ? parsed.length > 0 : Object.keys(parsed).length > 0)) {
        queryClient.setQueryData(queryKey, parsed);
      }
    }
  } catch (_) {}
};

preSeedCache('CONVERGE_TICKETS_MANAGEMENT_CACHE_V2', ['tickets']);
preSeedCache('CONVERGE_TICKETS_MAIN_CACHE_V2',       ['tickets']);
preSeedCache('CONVERGE_INSTALLATION_REQUESTS_CACHE', ['installation-requests']);
preSeedCache('CONVERGE_TECH_DASHBOARD_CACHE',        ['dashboard', 'technician']);
preSeedCache('CONVERGE_ADMIN_DASHBOARD_CACHE',       ['dashboard', 'admin']);

const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'CONVERGE_TANSTACK_QUERY_CACHE',
  throttleTime: 1000,
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
    >
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <App />
            <Toaster
              position="top-right"
              gutter={10}
              toastOptions={{
                duration: 3500,
                style: {
                  background: 'rgba(11, 19, 41, 0.94)',
                  color: '#f8fafc',
                  border: '1px solid rgba(6, 182, 212, 0.35)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 20px 0 rgba(6, 182, 212, 0.15)',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  padding: '12px 18px',
                  maxWidth: '420px',
                },
                success: {
                  duration: 3500,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#070b1e',
                  },
                  style: {
                    background: 'rgba(6, 24, 38, 0.95)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 25px 0 rgba(16, 185, 129, 0.25)',
                  },
                },
                error: {
                  duration: 4500,
                  iconTheme: {
                    primary: '#f43f5e',
                    secondary: '#070b1e',
                  },
                  style: {
                    background: 'rgba(30, 10, 20, 0.95)',
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 25px 0 rgba(244, 63, 94, 0.25)',
                  },
                },
                loading: {
                  iconTheme: {
                    primary: '#38bdf8',
                    secondary: '#070b1e',
                  },
                  style: {
                    background: 'rgba(11, 19, 41, 0.95)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 25px 0 rgba(56, 189, 248, 0.2)',
                  },
                },
              }}
            />
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  </React.StrictMode>
);
