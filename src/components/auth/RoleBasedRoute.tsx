import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { useUserPermissions, ROUTE_TO_RESOURCE } from '@/hooks/useUserPermissions';
import { Loader2 } from 'lucide-react';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

/**
 * Get the resource key for a given path.
 * Handles exact matches and prefix matches for dynamic routes.
 * e.g., /parties/new or /parties/123 will match /parties
 */
function getResourceKeyForPath(pathname: string): string | null {
  // Try exact match first
  if (ROUTE_TO_RESOURCE[pathname]) {
    return ROUTE_TO_RESOURCE[pathname];
  }

  // For dynamic routes, check if path starts with a known route
  // Sort by length descending to match more specific routes first
  const sortedRoutes = Object.keys(ROUTE_TO_RESOURCE)
    .filter(route => route !== '/' && route !== '/dashboard') // Exclude root routes
    .sort((a, b) => b.length - a.length);

  for (const route of sortedRoutes) {
    if (pathname.startsWith(route + '/') || pathname === route) {
      return ROUTE_TO_RESOURCE[route];
    }
  }

  return null;
}

/**
 * Enhanced RoleBasedRoute that checks:
 * 1. User's role against allowedRoles
 * 2. For admin users, also checks dynamic permissions from user_permissions table
 * 
 * Superadmin bypasses all permission checks.
 * Salesperson only uses role-based access (no dynamic permissions).
 */
export function RoleBasedRoute({ children, allowedRoles }: RoleBasedRouteProps) {
  const location = useLocation();
  const { loading, hasRole, role } = useAuth();
  const { hasAccess, isLoading: permissionsLoading, isSuperadmin, hasAnyPermissions } = useUserPermissions();

  // Show loading while auth or permissions are loading
  if (loading || (role === 'admin' && permissionsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No role assigned - redirect to pending
  if (!hasRole) {
    return <Navigate to="/pending" replace />;
  }

  // Superadmin has access to everything
  if (isSuperadmin) {
    return <>{children}</>;
  }

  // Check role-based access first
  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // For admin users, also check dynamic permissions
  if (role === 'admin') {
    // Get the resource key for the current route (handles dynamic routes)
    const resourceKey = getResourceKeyForPath(location.pathname);

    // If this route has a resource key mapping, check permission
    if (resourceKey) {
      // Check if admin has no permissions at all
      if (!hasAnyPermissions) {
        return <Navigate to="/access-denied" replace />;
      }

      // Check specific resource permission
      if (!hasAccess(resourceKey)) {
        return <Navigate to="/access-denied" replace />;
      }
    }
  }

  return <>{children}</>;
}
