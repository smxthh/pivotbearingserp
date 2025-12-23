import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function PendingVerification() {
  const { user, signOut, refreshRole, hasRole, role } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-redirect if role is found - go back to intended page or dashboard
  useEffect(() => {
    if (hasRole && role) {
      const from = (location.state as any)?.from || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [hasRole, role, navigate, location]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshRole();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // If role exists, show redirecting message
  if (hasRole && role) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground tracking-[-0.06em]">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center animate-pulse">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-semibold text-foreground text-center tracking-[-0.06em] mb-2">
            Pending Verification
          </h1>

          {/* Description */}
          <p className="text-muted-foreground text-center text-sm mb-6 leading-relaxed">
            Your account has been created successfully. Please wait while an administrator assigns your role.
          </p>

          {/* User Info */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <p className="text-xs text-muted-foreground mb-1">Logged in as</p>
            <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 mb-6">
            <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
              Once your role is assigned, you'll have access to the application features based on your permissions.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="w-full h-11 tracking-[-0.06em] transition-all duration-200"
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Checking...' : 'Check Status'}
            </Button>

            <Button
              onClick={signOut}
              variant="ghost"
              className="w-full h-11 text-muted-foreground hover:text-foreground tracking-[-0.06em] transition-all duration-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          Contact your administrator if you need immediate access.
        </p>
      </div>
    </div>
  );
}
