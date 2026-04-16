import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, Eye, EyeOff, AlertTriangle, Mail } from 'lucide-react';
import { loginSchema } from '@/lib/validations';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);

  // Password reset states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Lock timer effect
  useEffect(() => {
    if (lockTimeRemaining > 0) {
      const timer = setInterval(() => {
        setLockTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockTimeRemaining]);

  const checkAccountLock = async (email: string) => {
    try {
      const { data, error } = await supabase.rpc('is_account_locked', { _email: email });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking account lock:', error);
      return false;
    }
  };

  const logFailedAttempt = async (email: string, reason: string) => {
    try {
      await supabase.functions.invoke('log-failed-login', {
        body: { email, reason, userAgent: navigator.userAgent }
      });
    } catch (error) {
      console.error('Error logging failed attempt:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate input
    try {
      loginSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    // Check if account is locked
    const locked = await checkAccountLock(email);
    if (locked) {
      setIsLocked(true);
      setLockTimeRemaining(15 * 60); // 15 minutes
      toast({
        title: "Account Locked",
        description: "Too many failed login attempts. Please try again in 15 minutes.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        await logFailedAttempt(email, error.message);
        
        // Check if account is now locked
        const nowLocked = await checkAccountLock(email);
        if (nowLocked) {
          setIsLocked(true);
          setLockTimeRemaining(15 * 60);
          toast({
            title: "Account Locked",
            description: "Too many failed login attempts. Please try again in 15 minutes.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      // Check if user has manager role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user?.id)
        .maybeSingle();

      if (roleError) throw roleError;

      if (!roleData) {
        await supabase.auth.signOut();
        toast({
          title: "Access Denied",
          description: "You don't have access. Please contact your administrator.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome back!",
        description: `Successfully logged in as ${roleData.role}.`,
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-secondary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-secondary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Manager Login</CardTitle>
          <CardDescription>
            Sign in to access the medical shop management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLocked && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Account Locked</p>
                <p className="text-sm text-muted-foreground">
                  Try again in {formatTime(lockTimeRemaining)}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="manager@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLocked}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLocked}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || isLocked}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-sm text-center">
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-muted-foreground"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot Password? Contact Admin
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          
          {resetSent ? (
            <div className="text-center py-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Password reset email sent! Check your inbox for instructions.
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSent(false);
                  setResetEmail('');
                }}
              >
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsResetting(true);
              try {
                const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                  redirectTo: `${window.location.origin}/auth`
                });
                if (error) throw error;
                setResetSent(true);
                toast({
                  title: "Password Reset Email Sent",
                  description: "Please check your email for password reset instructions",
                });
              } catch (error: any) {
                toast({
                  title: "Error",
                  description: error.message || "Failed to send reset email",
                  variant: "destructive",
                });
              } finally {
                setIsResetting(false);
              }
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email Address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowForgotPassword(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isResetting}>
                  {isResetting ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
