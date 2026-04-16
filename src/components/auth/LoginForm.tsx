import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Stethoscope, AlertCircle } from 'lucide-react';
import { AdminRegistration } from './AdminRegistration';
import { PasswordResetDialog } from './PasswordResetDialog';
import { checkAdminExists } from '@/services/userService';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showAdminRegistration, setShowAdminRegistration] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'manager' | null>(null);
  const { signIn } = useAuth();

  // Check if admin exists on component mount
  useEffect(() => {
    checkIfAdminExists();
  }, []);

  const checkIfAdminExists = async () => {
    try {
      const adminExists = await checkAdminExists();
      if (!adminExists) {
        setShowAdminRegistration(true);
      }
    } catch (error) {
      console.error('Error checking admin existence:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signIn(email, password);
    } catch (error) {
      // Error is handled in useAuth hook
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert('Please enter your email first');
      return;
    }

    // For demo purposes, assume manager if email contains 'manager'
    // In production, this would query the user_profiles table
    if (email.toLowerCase().includes('manager')) {
      setUserRole('manager');
      setShowForgotPassword(true);
    } else {
      setUserRole('admin');
      setShowPasswordReset(true);
    }
  };

  const handleAdminRegistrationComplete = () => {
    setShowAdminRegistration(false);
  };

  if (showAdminRegistration) {
    return <AdminRegistration onRegistrationComplete={handleAdminRegistrationComplete} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-medical">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full gradient-medical flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Medical Shop Management</CardTitle>
          <CardDescription>
            Sign in to access the management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showForgotPassword ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {userRole === 'manager' 
                  ? 'Please contact your Admin to change your password.'
                  : 'Please contact system administrator for password reset.'
                }
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={handleForgotPassword}
              >
                Forgot Password?
              </Button>
            </form>
          )}
          {showForgotPassword && (
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => {
                setShowForgotPassword(false);
                setUserRole(null);
              }}
            >
              Back to Login
            </Button>
          )}
        </CardContent>
      </Card>

      <PasswordResetDialog
        open={showPasswordReset}
        onOpenChange={setShowPasswordReset}
        userEmail={email}
      />
    </div>
  );
}