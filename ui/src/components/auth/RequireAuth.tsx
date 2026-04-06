import { Navigate, useLocation } from 'react-router-dom';
import { useServiceStore } from '@/lib/store/service-store';

/**
 * Auth guard — redirects to /login if user is not authenticated.
 * Checks olympus_grid_email in localStorage (proxy for httpOnly cookie auth).
 * Wraps protected routes: /app/*, /onboarding
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isConnected = useServiceStore((s) => s.isOlympusGridConnected());
  const hasEmail = !!localStorage.getItem('olympus_grid_email');

  if (!isConnected && !hasEmail) {
    // Redirect to login, preserving the intended destination
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
