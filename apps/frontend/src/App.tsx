import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/layouts/DashboardLayout';
import AuthLayout from '@/layouts/AuthLayout';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import OverviewPage from '@/pages/dashboard/OverviewPage';
import FunctionsPage from '@/pages/dashboard/FunctionsPage';
import FunctionDetailPage from '@/pages/dashboard/FunctionDetailPage';
import DeployPage from '@/pages/dashboard/DeployPage';
import ApiKeysPage from '@/pages/dashboard/ApiKeysPage';
import LogsPage from '@/pages/dashboard/LogsPage';
import MetricsPage from '@/pages/dashboard/MetricsPage';
import SettingsPage from '@/pages/dashboard/SettingsPage';
import AdminPage from '@/pages/dashboard/AdminPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Dashboard routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<OverviewPage />} />
        <Route path="/dashboard/functions" element={<FunctionsPage />} />
        <Route path="/dashboard/functions/:id" element={<FunctionDetailPage />} />
        <Route path="/dashboard/deploy" element={<DeployPage />} />
        <Route path="/dashboard/api-keys" element={<ApiKeysPage />} />
        <Route path="/dashboard/logs" element={<LogsPage />} />
        <Route path="/dashboard/metrics" element={<MetricsPage />} />
        <Route path="/dashboard/settings" element={<SettingsPage />} />
        <Route
          path="/dashboard/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
