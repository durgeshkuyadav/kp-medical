import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Eye, EyeOff, Mail, ArrowLeft, UserPlus } from 'lucide-react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8).max(100);

// The designated super admin email - only this email can sign up as super admin
const SUPER_ADMIN_EMAIL = 'durgeshyadavalld@gmail.com';

const SuperAdminAuth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  
  // Password reset states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Check if user is already logged in as super admin
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data } = await supabase.rpc('has_role', { 
          _user_id: session.user.id, 
          _role: 'super_admin' 
        });
        if (data) {
          navigate('/super-admin');
        }
      }
    });
  }, [navigate]);

  const ensureSuperAdminRole = async () => {
    const { error } = await supabase.functions.invoke('ensure-super-admin');
    if (error) throw error;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate input
    try {
      emailSchema.parse(email);
    } catch {
      setErrors((prev) => ({ ...prev, email: 'Invalid email address' }));
      return;
    }

    try {
      passwordSchema.parse(password);
    } catch {
      setErrors((prev) => ({ ...prev, password: 'Password must be at least 8 characters' }));
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error('Unable to authenticate user');

      // Check if user has super_admin role
      const { data: roleData, error: roleError } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'super_admin',
      });

      if (roleError) throw roleError;

      // If role missing but email is the designated super admin, grant it server-side
      if (!roleData && email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        try {
          await ensureSuperAdminRole();
        } catch {
          // fall through to access denied
        }

        const { data: roleData2 } = await supabase.rpc('has_role', {
          _user_id: userId,
          _role: 'super_admin',
        });

        if (roleData2) {
          toast({
            title: 'Welcome Super Admin!',
            description: 'Successfully logged in.',
          });
          navigate('/super-admin');
          return;
        }
      }

      if (!roleData) {
        await supabase.auth.signOut();
        toast({
          title: 'Access Denied',
          description: "You don't have super admin access.",
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Welcome Super Admin!',
        description: 'Successfully logged in.',
      });
      navigate('/super-admin');
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid login credentials',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate email is the designated super admin email
    if (email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      setErrors({ email: 'Only the designated super admin email can sign up here' });
      toast({
        title: 'Access Denied',
        description: 'This signup is restricted to the designated super admin only.',
        variant: 'destructive',
      });
      return;
    }

    // Validate input
    try {
      emailSchema.parse(email);
    } catch {
      setErrors((prev) => ({ ...prev, email: 'Invalid email address' }));
      return;
    }

    try {
      passwordSchema.parse(password);
    } catch {
      setErrors((prev) => ({ ...prev, password: 'Password must be at least 8 characters' }));
      return;
    }

    if (password !== confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/super-admin-auth`,
        },
      });

      if (error) throw error;

      // If auto-confirm is enabled, we should have a session and can grant role immediately.
      if (data.session) {
        try {
          await ensureSuperAdminRole();
        } catch {
          // ignore - will be retried on login
        }

        toast({
          title: 'Account Created!',
          description: 'Super admin account created and activated.',
        });
        navigate('/super-admin');
        return;
      }

      toast({
        title: 'Account Created!',
        description: 'Your account is created. Please log in to continue.',
      });

      // Auto-switch to login tab
      setActiveTab('login');
      setConfirmPassword('');
    } catch (error: any) {
      if (error.message?.includes('already registered')) {
        toast({
          title: 'Account Exists',
          description: 'This email is already registered. Please log in instead.',
          variant: 'destructive',
        });
        setActiveTab('login');
      } else {
        toast({
          title: 'Signup Failed',
          description: error.message || 'Failed to create account',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(resetEmail);
    } catch {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/super-admin-auth?reset=true`
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
  };

  // Handle password reset callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reset') === 'true') {
      // User came from password reset link
      toast({
        title: "Password Reset",
        description: "You can now set a new password in your profile settings after logging in.",
      });
    }
  }, [toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Super Admin Access</CardTitle>
          <CardDescription>
            Secure access for system administrators only
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">First Time Setup</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="superadmin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In as Super Admin'}
                </Button>

                <div className="text-sm text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-muted-foreground"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot Password?
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <UserPlus className="h-4 w-4 inline mr-1" />
                  First time setup for the designated super admin only. This creates your initial super admin account.
                </p>
              </div>
              
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder={SUPER_ADMIN_EMAIL}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Super Admin Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
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
            <form onSubmit={handleForgotPassword} className="space-y-4">
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

export default SuperAdminAuth;
