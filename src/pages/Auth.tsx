import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

type AuthMode = 'login' | 'signup' | 'forgot';

interface InvitationData {
  id: string;
  email: string;
  role: string;
  tenant_id: string;
}

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(false);
  
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
  const invitationId = searchParams.get('invitation');

  // Check for invitation on load
  useEffect(() => {
    const loadInvitation = async () => {
      if (!invitationId) return;
      
      setLoadingInvitation(true);
      try {
        const { data, error } = await supabase
          .from('user_invitations')
          .select('id, email, role, tenant_id')
          .eq('id', invitationId)
          .is('accepted_at', null)
          .single();
        
        if (error || !data) {
          setError('This invitation is invalid or has expired.');
          return;
        }
        
        setInvitation(data as InvitationData);
        setEmail(data.email);
        setMode('signup');
      } catch (err) {
        console.error('Error loading invitation:', err);
        setError('Failed to load invitation.');
      } finally {
        setLoadingInvitation(false);
      }
    };
    
    loadInvitation();
  }, [invitationId]);

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const validateForm = (): boolean => {
    setError(null);
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setError(emailResult.error.errors[0].message);
      return false;
    }

    if (mode !== 'forgot') {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        setError(passwordResult.error.errors[0].message);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please try again.');
          } else {
            setError(error.message);
          }
        }
      } else if (mode === 'signup') {
        const { error, data } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered')) {
            setError('This email is already registered. Please sign in instead.');
          } else {
            setError(error.message);
          }
        } else {
          // If this is an invitation signup, mark it as accepted and assign role
          if (invitation && data?.user) {
            try {
              // Mark invitation as accepted
              await supabase
                .from('user_invitations')
                .update({ accepted_at: new Date().toISOString() })
                .eq('id', invitation.id);
              
              // Create user role
              await supabase
                .from('user_roles')
                .insert({
                  user_id: data.user.id,
                  role: invitation.role as 'salesperson' | 'admin' | 'superadmin' | 'distributor',
                  tenant_id: invitation.tenant_id,
                });
              
              // Create profile
              await supabase
                .from('profiles')
                .insert({
                  id: data.user.id,
                  email: invitation.email,
                });

              setSuccess('Account created successfully! You are now logged in.');
              // User is auto-logged in by Supabase, the useEffect will redirect
            } catch (roleError) {
              console.error('Error setting up user role:', roleError);
              setSuccess('Account created! Please log in to continue.');
            }
          } else {
            setSuccess('Check your email for a confirmation link to complete your registration.');
          }
        }
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          setSuccess('Password reset instructions have been sent to your email.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
  };

  if (loadingInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading invitation...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 pb-6">
            {mode === 'forgot' && (
              <button
                onClick={() => switchMode('login')}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 tracking-[-0.06em]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </button>
            )}
            <CardTitle className="text-2xl font-semibold tracking-[-0.06em]">
              {invitation ? 'Complete your registration' : (
                <>
                  {mode === 'login' && 'Welcome back'}
                  {mode === 'signup' && 'Create account'}
                  {mode === 'forgot' && 'Reset password'}
                </>
              )}
            </CardTitle>
            <CardDescription className="text-muted-foreground tracking-[-0.06em]">
              {invitation ? (
                `Set a password to join as a salesperson`
              ) : (
                <>
                  {mode === 'login' && 'Enter your credentials to access your account'}
                  {mode === 'signup' && 'Enter your details to get started'}
                  {mode === 'forgot' && 'We\'ll send you a reset link'}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm animate-fade-in">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="tracking-[-0.06em]">{error}</span>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-success/10 text-success text-sm animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="tracking-[-0.06em]">{success}</span>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium tracking-[-0.06em]">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 tracking-[-0.06em] transition-all focus:ring-2 focus:ring-primary/20"
                    disabled={loading || !!invitation}
                    required
                  />
                </div>
                {invitation && (
                  <p className="text-xs text-muted-foreground">
                    This email is pre-filled from your invitation
                  </p>
                )}
              </div>

              {/* Password Field */}
              {mode !== 'forgot' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium tracking-[-0.06em]">
                      Password
                    </Label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-xs text-primary hover:text-primary/80 transition-colors tracking-[-0.06em]"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 tracking-[-0.06em] transition-all focus:ring-2 focus:ring-primary/20"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full tracking-[-0.06em] transition-all hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {invitation ? 'Setting up account...' : (
                      <>
                        {mode === 'login' && 'Signing in...'}
                        {mode === 'signup' && 'Creating account...'}
                        {mode === 'forgot' && 'Sending...'}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {invitation ? 'Complete Registration' : (
                      <>
                        {mode === 'login' && 'Sign in'}
                        {mode === 'signup' && 'Create account'}
                        {mode === 'forgot' && 'Send reset link'}
                      </>
                    )}
                  </>
                )}
              </Button>

              {/* Mode Switch - hide when in invitation mode */}
              {mode !== 'forgot' && !invitation && (
                <div className="text-center text-sm text-muted-foreground tracking-[-0.06em]">
                  {mode === 'login' ? (
                    <>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('signup')}
                        className="text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className="text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6 tracking-[-0.06em]">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
