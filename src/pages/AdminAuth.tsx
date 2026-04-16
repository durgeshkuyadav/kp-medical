import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Eye, EyeOff, AlertTriangle, Mail } from 'lucide-react';
import { loginSchema, adminRegistrationSchema } from '@/lib/validations';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const AdminAuth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);

  // Registration state
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regShopName, setRegShopName] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  // Password reset states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/onboarding');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/onboarding');
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
    setLoginErrors({});

    // Validate input
    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setLoginErrors(errors);
        return;
      }
    }

    // Check if account is locked
    const locked = await checkAccountLock(loginEmail);
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

    setIsLoggingIn(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        await logFailedAttempt(loginEmail, error.message);
        
        // Check if account is now locked
        const nowLocked = await checkAccountLock(loginEmail);
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

      // Prevent managers from using admin portal
      const { data: roleRow, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user?.id)
        .maybeSingle();

      if (roleError) throw roleError;

      if (roleRow?.role === 'manager') {
        await supabase.auth.signOut();
        toast({
          title: "Access Denied",
          description: "Please use the manager login.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome!",
        description: "Checking your account status...",
      });
      navigate('/onboarding');
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegErrors({});

    // Validate input
    try {
      adminRegistrationSchema.parse({
        email: regEmail,
        password: regPassword,
        confirmPassword: regConfirmPassword,
        fullName: regFullName,
        phone: regPhone || undefined,
        shopName: regShopName || undefined,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setRegErrors(errors);
        return;
      }
    }

    setIsRegistering(true);

    try {
      // Use the edge function which runs with service role (bypasses RLS)
      const { data: fnData, error: fnError } = await supabase.functions.invoke('register-admin', {
        body: {
          email: regEmail,
          password: regPassword,
          fullName: regFullName,
          phone: regPhone || null,
          shopName: regShopName || null,
        }
      });

      if (fnError) {
        let serverMsg = '';
        try {
          if (fnError.context && typeof fnError.context.json === 'function') {
            const body = await fnError.context.json();
            serverMsg = body?.error || '';
          }
        } catch { /* ignore */ }
        if (!serverMsg && fnData && typeof fnData === 'object' && 'error' in fnData) {
          serverMsg = (fnData as any).error;
        }
        throw new Error(serverMsg || fnError.message || 'Registration failed');
      }

      if (fnData && typeof fnData === 'object' && 'error' in fnData) {
        throw new Error((fnData as any).error);
      }

      toast({
        title: "Registration Submitted",
        description: "Your registration is pending approval. Please check your email for verification.",
      });

      // Sign in the user after successful registration
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: regEmail,
        password: regPassword,
      });

      if (!signInError) {
        navigate('/onboarding');
      }
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create admin account",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Admin Portal</CardTitle>
          <CardDescription>
            Login or register as an administrator
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

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={isLocked}
                  />
                  {loginErrors.email && (
                    <p className="text-sm text-destructive">{loginErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={isLocked}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {loginErrors.password && (
                    <p className="text-sm text-destructive">{loginErrors.password}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoggingIn || isLocked}>
                  {isLoggingIn ? 'Signing in...' : 'Sign In'}
                </Button>

                <div className="flex justify-between text-sm">
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-muted-foreground"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot Password?
                  </Button>
                  <a href="/auth" className="text-primary hover:underline">
                    Manager Login
                  </a>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Full Name *</Label>
                  <Input
                    id="reg-name"
                    placeholder="John Doe"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                  />
                  {regErrors.fullName && (
                    <p className="text-sm text-destructive">{regErrors.fullName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email *</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                  {regErrors.email && (
                    <p className="text-sm text-destructive">{regErrors.email}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">Phone</Label>
                    <Input
                      id="reg-phone"
                      placeholder="9876543210"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                    />
                    {regErrors.phone && (
                      <p className="text-sm text-destructive">{regErrors.phone}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-shop">Shop Name</Label>
                    <Input
                      id="reg-shop"
                      placeholder="My Medical Shop"
                      value={regShopName}
                      onChange={(e) => setRegShopName(e.target.value)}
                    />
                    {regErrors.shopName && (
                      <p className="text-sm text-destructive">{regErrors.shopName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder="Min 8 chars with letter & number"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                    >
                      {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {regErrors.password && (
                    <p className="text-sm text-destructive">{regErrors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-confirm">Confirm Password *</Label>
                  <Input
                    id="reg-confirm"
                    type="password"
                    placeholder="Confirm your password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                  />
                  {regErrors.confirmPassword && (
                    <p className="text-sm text-destructive">{regErrors.confirmPassword}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isRegistering}>
                  {isRegistering ? 'Creating Account...' : 'Create Admin Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-center">
            <a href="/auth" className="text-primary hover:underline text-sm">
              Manager Login
            </a>
          </div>
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
                  redirectTo: `${window.location.origin}/admin-auth`
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

export default AdminAuth;
