import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { LiveCCTV } from './pages/LiveCCTV';
import { CameraManagement } from './pages/CameraManagement';
import { ImageUpload } from './pages/ImageUpload';
import { AlertsLog } from './pages/AlertsLog';
import { Analytics } from './pages/Analytics';
import { Reports } from './pages/Reports';
import { UserManagement } from './pages/UserManagement';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading VisionOps AI...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
          <div className="text-5xl">🔒</div>
          <h2 className="text-lg font-semibold text-slate-200">Access Restricted</h2>
          <p className="text-sm text-center">
            Your account role (<strong className="text-slate-300">{user.role}</strong>) does not have permission to access this page.
          </p>
        </div>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
};

// Public Route: redirect to dashboard if already logged in
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => (
  <Routes>
    {/* Public */}
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

    {/* Protected — all authenticated users */}
    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/cctv" element={<ProtectedRoute><LiveCCTV /></ProtectedRoute>} />
    <Route path="/alerts" element={<ProtectedRoute><AlertsLog /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

    {/* Protected — operators and admins */}
    <Route path="/upload" element={<ProtectedRoute roles={['admin', 'operator']}><ImageUpload /></ProtectedRoute>} />
    <Route path="/cameras" element={<ProtectedRoute roles={['admin', 'operator']}><CameraManagement /></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute roles={['admin', 'operator']}><Reports /></ProtectedRoute>} />

    {/* Protected — admin only */}
    <Route path="/users" element={<ProtectedRoute roles={['admin']}><UserManagement /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute roles={['admin']}><Settings /></ProtectedRoute>} />

    {/* Catch-all analytics for all authenticated */}
    <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />

    {/* 404 */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
