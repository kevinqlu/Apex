import { Navigate, Outlet } from 'react-router';
import { useAuth } from './AuthProvider';

// This only decides what to show. The server checks the session on every request.
export function ProtectedRoute() {
  const { state } = useAuth();
  if (state.status === 'loading')
    return (
      <p className="page-status" role="status">
        Loading…
      </p>
    );
  if (state.status === 'signed-out') return <Navigate to="/login" replace />;
  return <Outlet />;
}
