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

// Suppress unhandled errors from browser extensions / Web Vitals scripts (e.g. reportAllChanges / VM scripts)
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
// Render free tier sleeps after ~15 min of inactivity. Fire a silent GET to
// /api/health as soon as the JS bundle loads so the server is warm by the time
// the user finishes typing their credentials and hits Login.
(function prewarmServer() {
  try {
    const base = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '') || '';
    const url = base ? `${base}/health` : '/api/health';
    fetch(url, { method: 'GET', cache: 'no-store' }).catch(() => {/* silent — server may still be sleeping */});
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
      staleTime: 1000 * 60 * 15, // 15 minutes fresh cache — zero loading spinners!
      gcTime: 1000 * 60 * 60 * 24, // 24 hours persistent local storage retention
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Serve cached data immediately without blocking UI
      placeholderData: (previousData) => previousData, // Instant smooth transitions between pages & filters
      retry: 1,
    },
  },
});

// ─── Synchronous localStorage pre-seed ────────────────────────────────────────
// PersistQueryClientProvider restores the TanStack cache asynchronously,
// which creates a brief window where data is missing (shows loader / zeros).
// By seeding the queryClient synchronously here, data is available IMMEDIATELY
// on hard refresh — before any component mounts or any effect fires.
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

// Persist query cache to localStorage for instant offline access and zero-loading reloads
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
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'rgba(15, 23, 42, 0.95)',
                  color: '#f8fafc',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: '12px',
                  fontSize: '13px',
                },
              }}
            />
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  </React.StrictMode>
);
