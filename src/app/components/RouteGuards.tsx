import { Navigate, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { useAppState } from '../state/AppState';
import type { UserRole } from '../types';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-2xl font-semibold text-gray-900 mb-2">Loading workspace</div>
        <p className="text-gray-600">Checking your session and syncing shared data.</p>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { authReady, isAuthenticated } = useAppState();

  if (!authReady) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export function RequireRole({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const { currentRole } = useAppState();

  return (
    <RequireAuth>
      {currentRole === role ? children : <Navigate to="/role-selection" replace />}
    </RequireAuth>
  );
}

export function PublicOnly({ children }: { children: ReactNode }) {
  const { authReady, isAuthenticated } = useAppState();

  if (!authReady) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
