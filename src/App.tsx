import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { LanguageProvider } from './i18n/LanguageContext';
import { useAuthStore } from './stores/authStore';
import { LoginScreen } from './components/login/LoginScreen';
import { AppShell } from './components/layout/AppShell';
import { DataStoreProvider } from './components/layout/DataStoreProvider';
import { LoadingSpinner } from './components/shared/LoadingSpinner';
import { AnimatedBackground } from './components/layout/AnimatedBackground';

// Lazy load pages
const DashboardPage = lazy(() =>
  import('./components/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const MasterUsersPage = lazy(() =>
  import('./components/users/MasterUsersPage').then((m) => ({ default: m.MasterUsersPage }))
);
const TransactionsPage = lazy(() =>
  import('./components/transactions/TransactionsPage').then((m) => ({ default: m.TransactionsPage }))
);
const DeletedAccountsPage = lazy(() =>
  import('./components/deleted/DeletedAccountsPage').then((m) => ({ default: m.DeletedAccountsPage }))
);
const WatchlistPage = lazy(() =>
  import('./components/watchlist/WatchlistPage').then((m) => ({ default: m.WatchlistPage }))
);
const WatchlistFolderPage = lazy(() =>
  import('./components/watchlist/WatchlistFolderPage').then((m) => ({ default: m.WatchlistFolderPage }))
);
const LiveRadarPage = lazy(() =>
  import('./components/radar/LiveRadarPage').then((m) => ({ default: m.LiveRadarPage }))
);
const ArenaRoomsPage = lazy(() =>
  import('./components/arena/ArenaRoomsPage').then((m) => ({ default: m.ArenaRoomsPage }))
);
const RoomLogsPage = lazy(() =>
  import('./components/roomLogs/RoomLogsPage').then((m) => ({ default: m.RoomLogsPage }))
);
const ReferralsPage = lazy(() =>
  import('./components/referrals/ReferralsPage').then((m) => ({ default: m.ReferralsPage }))
);
const SettingsPage = lazy(() =>
  import('./components/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const PurchaseOrdersPage = lazy(() =>
  import('./components/purchases/PurchaseOrdersPage').then((m) => ({ default: m.PurchaseOrdersPage }))
);

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    const unsubscribe = checkAuth();
    return () => {
      unsubscribe();
    };
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center overflow-hidden bg-black">
        <AnimatedBackground />
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AnimatedBackground />
        <LoginScreen />
      </>
    );
  }

  return (
    <DataStoreProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route
            index
            element={
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="users"
            element={
              <Suspense fallback={<PageLoader />}>
                <MasterUsersPage />
              </Suspense>
            }
          />
          <Route
            path="transactions"
            element={
              <Suspense fallback={<PageLoader />}>
                <TransactionsPage />
              </Suspense>
            }
          />
          <Route
            path="deleted"
            element={
              <Suspense fallback={<PageLoader />}>
                <DeletedAccountsPage />
              </Suspense>
            }
          />
          <Route
            path="watchlist"
            element={
              <Suspense fallback={<PageLoader />}>
                <WatchlistPage />
              </Suspense>
            }
          />
          <Route
            path="watchlist/:folderId"
            element={
              <Suspense fallback={<PageLoader />}>
                <WatchlistFolderPage />
              </Suspense>
            }
          />
          <Route
            path="radar"
            element={
              <Suspense fallback={<PageLoader />}>
                <LiveRadarPage />
              </Suspense>
            }
          />
          <Route
            path="arena-rooms"
            element={
              <Suspense fallback={<PageLoader />}>
                <ArenaRoomsPage />
              </Suspense>
            }
          />
          <Route
            path="room-logs"
            element={
              <Suspense fallback={<PageLoader />}>
                <RoomLogsPage />
              </Suspense>
            }
          />
          <Route
            path="referrals"
            element={
              <Suspense fallback={<PageLoader />}>
                <ReferralsPage />
              </Suspense>
            }
          />
          <Route
            path="purchase-orders"
            element={
              <Suspense fallback={<PageLoader />}>
                <PurchaseOrdersPage />
              </Suspense>
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <SettingsPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </DataStoreProvider>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </LanguageProvider>
  );
}
