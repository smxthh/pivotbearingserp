import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: boolean;
}

export function ProtectedRoute({ children, requireRole = true }: ProtectedRouteProps) {
  const { user, loading, hasRole, isLoggingOut } = useAuth();
  const location = useLocation();

  // If logging out, redirect directly to auth - no loading, no pending
  if (isLoggingOut) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground tracking-[-0.06em]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If role is required and user doesn't have one, redirect to pending page
  if (requireRole && !hasRole && location.pathname !== '/pending') {
    return <Navigate to="/pending" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
