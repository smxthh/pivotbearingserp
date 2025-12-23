import { Navigate } from 'react-router-dom';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

export function RoleBasedRoute({ children, allowedRoles }: RoleBasedRouteProps) {
  const { loading, hasRole, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasRole) {
    return <Navigate to="/pending" replace />;
  }

  if (!role || (!allowedRoles.includes(role) && role !== 'superadmin')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
