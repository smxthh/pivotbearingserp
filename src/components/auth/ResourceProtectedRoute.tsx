import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserPermissions, ROUTE_TO_RESOURCE } from '@/hooks/useUserPermissions';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw } from 'lucide-react';

interface ResourceProtectedRouteProps {
    children: React.ReactNode;
    resourceKey?: string; // Optional - if not provided, will be derived from current route
    fallback?: React.ReactNode;
}

/**
 * Route wrapper that checks if user has permission to access the resource.
 * 
 * Usage:
 * <ResourceProtectedRoute resourceKey="page:ledger">
 *   <LedgerPage />
 * </ResourceProtectedRoute>
 * 
 * Or without explicit resourceKey (derives from current route):
 * <ResourceProtectedRoute>
 *   <LedgerPage />
 * </ResourceProtectedRoute>
 */
export function ResourceProtectedRoute({
    children,
    resourceKey,
    fallback,
}: ResourceProtectedRouteProps) {
    const location = useLocation();
    const { isSuperadmin, role } = useAuth();
    const { hasAccess, isLoading, hasAnyPermissions } = useUserPermissions();

    // Derive resource key from current route if not provided
    const effectiveResourceKey = resourceKey || ROUTE_TO_RESOURCE[location.pathname];

    // Superadmin always has access
    if (isSuperadmin) {
        return <>{children}</>;
    }

    // Show loading state
    if (isLoading) {
        return (
            fallback || (
                <div className="flex items-center justify-center min-h-[400px]">
                    <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
            )
        );
    }

    // If user is admin but has no permissions at all, show contact superadmin message
    if (role === 'admin' && !hasAnyPermissions) {
        return <Navigate to="/access-denied" replace />;
    }

    // Check if user has access to this resource
    if (effectiveResourceKey && !hasAccess(effectiveResourceKey)) {
        return <Navigate to="/access-denied" replace />;
    }

    return <>{children}</>;
}

/**
 * HOC version for wrapping components
 */
export function withResourceProtection<P extends object>(
    Component: React.ComponentType<P>,
    resourceKey: string
) {
    return function ProtectedComponent(props: P) {
        return (
            <ResourceProtectedRoute resourceKey={resourceKey}>
                <Component {...props} />
            </ResourceProtectedRoute>
        );
    };
}
