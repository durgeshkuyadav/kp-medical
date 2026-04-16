import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { canAccessApp, isPending, loading: subLoading } = useSubscription();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading || subLoading) return;

    if (!user) {
      navigate('/');
      return;
    }

    // If admin user, check subscription status
    if (isAdmin) {
      if (isPending) {
        navigate('/subscription');
        return;
      }
      if (!canAccessApp) {
        navigate('/subscription');
        return;
      }
    }

    setChecked(true);
  }, [user, authLoading, subLoading, isAdmin, canAccessApp, isPending, navigate]);

  if (authLoading || subLoading || !checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}