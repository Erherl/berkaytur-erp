/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { useAppStore } from './store';
import { Loader2 } from 'lucide-react';

// Lazy loading all dashboard submodules for optimized performance & code splitting
const Login = lazy(() => import('./features/auth/Login'));
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard'));
const ManagerDashboard = lazy(() => import('./features/manager/ManagerDashboard'));
const CoordinatorDashboard = lazy(() => import('./features/coordinator/CoordinatorDashboard'));
const ParentDashboard = lazy(() => import('./features/parent/ParentDashboard'));
const DriverDashboard = lazy(() => import('./features/driver/DriverDashboard'));
const HostessDashboard = lazy(() => import('./features/hostess/HostessDashboard'));
const AccountingDashboard = lazy(() => import('./features/accounting/AccountingDashboard'));

import WelcomeOverlay from './components/WelcomeOverlay';
import ForcePasswordChange from './components/ForcePasswordChange';
const GlobalSearch = lazy(() => import('./components/GlobalSearch'));

/**
 * Universal elegant loading indicator for lazy bundles
 */
function DashboardLoadingFallback() {
  return (
    <div id="dashboard-loading-skeleton" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500 animate-pulse">Sistem modülleri yükleniyor, lütfen bekleyin...</p>
      </div>
    </div>
  );
}

export default function App() {
  const currentUser = useAppStore(state => state.currentUser);
  const checkDocumentExpiries = useAppStore(state => state.checkDocumentExpiries);
  const verifySession = useAppStore(state => state.verifySession);
  const [welcomed, setWelcomed] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        await verifySession();
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        setSessionChecking(false);
      }
    }
    checkSession();
  }, [verifySession]);

  useEffect(() => {
    checkDocumentExpiries();
  }, [checkDocumentExpiries]);

  if (sessionChecking) {
    return <DashboardLoadingFallback />;
  }

  if (!currentUser) {
    if (welcomed) setWelcomed(false);
    return (
      <Suspense fallback={<DashboardLoadingFallback />}>
        <Login />
      </Suspense>
    );
  }

  // Force password change on first login
  if (currentUser.mustChangePassword) {
    return <ForcePasswordChange />;
  }

  // Show premium welcome overlay before showing the dashboard
  if (!welcomed) {
    return <WelcomeOverlay onDismiss={() => setWelcomed(true)} />;
  }

  // Switch dashboards based on user role
  const renderDashboard = () => {
    switch (currentUser.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'manager':
        return <ManagerDashboard />;
      case 'coordinator':
        return <CoordinatorDashboard />;
      case 'accounting':
        return <AccountingDashboard />;
      case 'parent':
        return <ParentDashboard />;
      case 'driver':
        return <DriverDashboard />;
      case 'hostess':
        return <HostessDashboard />;
      default:
        return <Login />;
    }
  };

  return (
    <Suspense fallback={<DashboardLoadingFallback />}>
      {renderDashboard()}
      <GlobalSearch />
    </Suspense>
  );
}
