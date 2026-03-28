import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { syncOfflineTransactions } from './lib/sync';
import { useAuthStore } from './store/authStore';

import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import CashierPage from './pages/CashierPage';
import InventoryPage from './pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 2, // 2 minutes
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

// ─── App ──────────────────────────────────────────────────────────────────────

function AppContent() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) syncOfflineTransactions();

    const handleOnline = () => {
      if (isAuthenticated) syncOfflineTransactions();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isAuthenticated]);

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — all wrapped in AppLayout */}
      <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<CashierPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
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