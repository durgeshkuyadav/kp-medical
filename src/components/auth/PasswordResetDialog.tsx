import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export function PasswordResetDialog({ open, onOpenChange, userEmail }: PasswordResetDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { requestPasswordResetOTP } = useAuth();

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await requestPasswordResetOTP(userEmail);
      onOpenChange(false);
    } catch (error) {
      // Error handled in useAuth
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            We will send a password reset link to your email
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleRequestOTP} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={userEmail} disabled />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Sending...' : 'Send Password Reset Link'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}