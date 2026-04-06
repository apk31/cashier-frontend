import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { syncOfflineTransactions } from './lib/sync';
import { useAuthStore } from './store/authStore';
import { useOfflineTransactionStore } from './store/offlineTransactionStore';

import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import CashierPage from './pages/CashierPage';
import InventoryPage from './pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

// ─── Query Client ─────────────────────────────────────────────────────────────
// Key changes vs the previous config:
//   staleTime: 30_000   → data is considered fresh for 30 s, not 2 min.
//                         Changing date filters or navigating between tabs now
//                         triggers a refetch instead of serving stale cache.
//   refetchOnWindowFocus: true  → coming back to the browser tab refreshes data.
//   refetchOnReconnect: true    → reconnecting to the network triggers a refetch
//                                 (this happens AFTER syncOfflineTransactions clears
//                                  the local DB and invalidates all queries).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,          // 30 seconds — short enough to feel live
      refetchOnWindowFocus: true,  // refresh when user switches back to the tab
      refetchOnReconnect: true,    // refresh when network returns
    },
  },
});

// ─── Auth Guard ───────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function RequireRole({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { user } = useAuthStore();
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

// ─── App Content (inside QueryClientProvider so useQueryClient works) ─────────

function AppContent() {
  const { isAuthenticated } = useAuthStore();
  const qc = useQueryClient();
  const { loadFromDB, clearAll } = useOfflineTransactionStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Load any pending offline transactions into the in-memory store so the
    // Reports page can show them immediately without waiting for a sync.
    loadFromDB();

    // Attempt an initial sync (no-op when offline)
    syncOfflineTransactions(qc, clearAll);

    const handleOnline = () => {
      // When the network returns, sync first, then React Query refetches everything
      syncOfflineTransactions(qc, clearAll);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isAuthenticated, qc, loadFromDB, clearAll]);

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — all wrapped in AppLayout */}
      <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<CashierPage />} />
        <Route path="inventory" element={
          <RequireRole allowedRoles={['ADMIN', 'MANAGER']}>
            <InventoryPage />
          </RequireRole>
        } />
        <Route path="reports" element={
          <RequireRole allowedRoles={['ADMIN', 'MANAGER']}>
            <ReportsPage />
          </RequireRole>
        } />
        <Route path="settings" element={
          <RequireRole allowedRoles={['ADMIN', 'MANAGER']}>
            <SettingsPage />
          </RequireRole>
        } />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid rgba(99,102,241,0.3)',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#0f172a' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0f172a' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}