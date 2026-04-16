import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Subscription {
  id: string;
  admin_id: string;
  plan: 'monthly' | 'yearly';
  monthly_price: number;
  yearly_price: number;
  current_period_start: string;
  current_period_end: string;
  grace_period_end: string | null;
  is_active: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
  payment_method: 'stripe' | 'razorpay' | null;
  created_at: string;
  updated_at: string;
}

export interface AdminRegistration {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  shop_name: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  approval_token: string;
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [registration, setRegistration] = useState<AdminRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSubscription = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('admin_id', userId)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data as Subscription | null);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const fetchRegistration = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_registrations')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setRegistration(data as AdminRegistration | null);
    } catch (error) {
      console.error('Error fetching registration:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await Promise.all([
          fetchSubscription(user.id),
          fetchRegistration(user.id)
        ]);
      }
      setLoading(false);
    };

    loadData();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchSubscription(session.user.id);
        fetchRegistration(session.user.id);
      } else {
        setSubscription(null);
        setRegistration(null);
      }
    });

    return () => authSub.unsubscribe();
  }, []);

  const isApproved = registration?.status === 'approved';
  const isPending = registration?.status === 'pending';
  const isRejected = registration?.status === 'rejected';
  const isSuspended = registration?.status === 'suspended';
  
  const isSubscriptionActive = subscription?.is_active || false;
  const isInGracePeriod = subscription?.grace_period_end 
    ? new Date(subscription.grace_period_end) > new Date() 
    : false;
  
  const canAccessApp = isApproved && (isSubscriptionActive || isInGracePeriod);

  const checkAccess = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('is_admin_active', { _user_id: userId });
      if (error) throw error;
      return Boolean(data);
    } catch (error) {
      console.error('Error checking access:', error);
      return false;
    }
  };

  return {
    subscription,
    registration,
    loading,
    isApproved,
    isPending,
    isRejected,
    isSuspended,
    isSubscriptionActive,
    isInGracePeriod,
    canAccessApp,
    checkAccess,
    refetch: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await Promise.all([
          fetchSubscription(user.id),
          fetchRegistration(user.id)
        ]);
      }
    }
  };
};