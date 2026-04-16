import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Check, CreditCard, Crown, Zap, AlertTriangle, Clock } from 'lucide-react';

interface Subscription {
  id: string;
  admin_id: string;
  plan: 'monthly' | 'yearly';
  is_active: boolean;
  current_period_start: string;
  current_period_end: string;
  grace_period_end: string | null;
}

interface AdminRegistration {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
}

const Subscription = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [registration, setRegistration] = useState<AdminRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [processing, setProcessing] = useState(false);
  const [processingMethod, setProcessingMethod] = useState<'razorpay' | 'stripe' | null>(null);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/admin-auth');
        return;
      }

      // Fetch registration status
      const { data: regData } = await supabase
        .from('admin_registrations')
        .select('id, status')
        .eq('user_id', user.id)
        .maybeSingle();

      setRegistration(regData as AdminRegistration | null);

      // Fetch subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('admin_id', user.id)
        .maybeSingle();

      setSubscription(subData as Subscription | null);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpayPayment = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (processing) return;
    setProcessing(true);
    setProcessingMethod('razorpay');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { plan: selectedPlan, userId: user.id }
      });

      if (orderError) throw orderError;

      // Load Razorpay script if not already loaded
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      
      const openRazorpay = () => {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Medical Shop Pro',
          description: `${selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} Subscription`,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            // Verify payment
            const { error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.id,
                plan: selectedPlan,
              }
            });

            if (verifyError) {
              toast({
                title: "Payment Verification Failed",
                description: verifyError.message,
                variant: "destructive",
              });
              setProcessing(false);
              setProcessingMethod(null);
              return;
            }

            // Initialize tenant schema
            await supabase.functions.invoke('create-tenant-schema', {
              body: { adminId: user.id }
            });

            toast({
              title: "Payment Successful!",
              description: "Your subscription has been activated.",
            });

            navigate('/dashboard');
          },
          modal: {
            ondismiss: () => {
              setProcessing(false);
              setProcessingMethod(null);
            }
          },
          prefill: {
            email: user.email,
          },
          theme: {
            color: '#6366f1',
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (response: any) => {
          toast({
            title: "Payment Failed",
            description: response.error.description,
            variant: "destructive",
          });
          setProcessing(false);
          setProcessingMethod(null);
        });
        rzp.open();
      };

      if (existingScript) {
        openRazorpay();
      } else {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        script.onload = openRazorpay;
        script.onerror = () => {
          toast({
            title: "Error",
            description: "Failed to load Razorpay. Please try again.",
            variant: "destructive",
          });
          setProcessing(false);
          setProcessingMethod(null);
        };
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message,
        variant: "destructive",
      });
      setProcessing(false);
      setProcessingMethod(null);
    }
  };

  const handleStripePayment = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (processing) return;
    setProcessing(true);
    setProcessingMethod('stripe');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const MONTHLY_PRICE = 599;
      const YEARLY_PRICE = 6999;

      // Calculate subscription dates - extend from current expiry if renewing
      const now = new Date();
      let startDate = now;
      
      // If renewing, extend from current end date
      if (subscription?.current_period_end && new Date(subscription.current_period_end) > now) {
        startDate = new Date(subscription.current_period_end);
      }
      
      const endDate = new Date(startDate);
      if (selectedPlan === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      // Check for existing active subscription to prevent duplicates
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id, is_active')
        .eq('admin_id', user.id)
        .maybeSingle();

      if (existingSub) {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            plan: selectedPlan,
            is_active: true,
            current_period_start: now.toISOString(),
            current_period_end: endDate.toISOString(),
            payment_method: 'stripe',
            grace_period_end: null,
            monthly_price: MONTHLY_PRICE,
            yearly_price: YEARLY_PRICE,
          })
          .eq('id', existingSub.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert({
            admin_id: user.id,
            plan: selectedPlan,
            is_active: true,
            current_period_start: now.toISOString(),
            current_period_end: endDate.toISOString(),
            payment_method: 'stripe',
            monthly_price: MONTHLY_PRICE,
            yearly_price: YEARLY_PRICE,
          });

        if (error) throw error;
      }

      // Assign admin role if not exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!existingRole) {
        await supabase.from('user_roles').insert({
          user_id: user.id,
          role: 'admin',
        });
      }

      await supabase.functions.invoke('create-tenant-schema', {
        body: { adminId: user.id }
      });

      toast({
        title: "Payment Successful!",
        description: "Your subscription has been activated.",
      });

      navigate('/');
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setProcessingMethod(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (registration?.status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-warning" />
            </div>
            <CardTitle>Approval Pending</CardTitle>
            <CardDescription>
              Your admin registration is pending approval. You will receive an email once your account is approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              This usually takes 24-48 hours. Please check your email for updates.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (registration?.status === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-destructive/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Registration Rejected</CardTitle>
            <CardDescription>
              Unfortunately, your admin registration was not approved. Please contact support for more information.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isInGracePeriod = subscription?.grace_period_end && new Date(subscription.grace_period_end) > new Date();

  // Updated pricing
  const MONTHLY_PRICE = 599;
  const YEARLY_PRICE = 6999;
  const MONTHLY_SAVINGS = (MONTHLY_PRICE * 12) - YEARLY_PRICE;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground">
            Unlock all features with our flexible subscription plans
          </p>
          {isInGracePeriod && (
            <div className="mt-4 p-4 bg-warning/10 rounded-lg inline-flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="text-warning font-medium">
                Your subscription expired. You have until {new Date(subscription!.grace_period_end!).toLocaleDateString()} to renew.
              </span>
            </div>
          )}
        </div>

        {/* Plan Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-muted p-1 rounded-lg inline-flex">
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`px-6 py-2 rounded-md transition-colors ${
                selectedPlan === 'monthly' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={`px-6 py-2 rounded-md transition-colors ${
                selectedPlan === 'yearly' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground'
              }`}
            >
              Yearly
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                Save ₹{MONTHLY_SAVINGS.toLocaleString()}
              </Badge>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Monthly Plan */}
          <Card className={`relative ${selectedPlan === 'monthly' ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-6 w-6 text-primary" />
                <CardTitle>Monthly</CardTitle>
              </div>
              <CardDescription>Perfect for getting started</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">₹{MONTHLY_PRICE}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {[
                  'Full access to all features',
                  'Unlimited medicines & patients',
                  'Sales & inventory management',
                  'Manager accounts',
                  'Reports & analytics',
                  'Email support'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Yearly Plan */}
          <Card className={`relative ${selectedPlan === 'yearly' ? 'ring-2 ring-primary' : ''}`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                <Crown className="h-3 w-3 mr-1" />
                Best Value
              </Badge>
            </div>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-6 w-6 text-primary" />
                <CardTitle>Yearly</CardTitle>
              </div>
              <CardDescription>Save ₹{MONTHLY_SAVINGS.toLocaleString()} with annual billing</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">₹{YEARLY_PRICE.toLocaleString()}</span>
                <span className="text-muted-foreground">/year</span>
                <p className="text-sm text-muted-foreground mt-1">
                  That's just ₹{Math.round(YEARLY_PRICE / 12)}/month
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {[
                  'Everything in Monthly plan',
                  'Priority support',
                  'Early access to new features',
                  'Custom reports',
                  'Data backup & recovery',
                  'Dedicated account manager'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Payment Buttons */}
        <div className="mt-12 max-w-md mx-auto">
          <h3 className="text-center text-lg font-semibold mb-4">
            Pay ₹{selectedPlan === 'monthly' ? MONTHLY_PRICE : YEARLY_PRICE.toLocaleString()}
          </h3>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4 hover:border-primary transition-colors">
              <p className="text-sm text-muted-foreground mb-3">International Cards (Visa, Mastercard)</p>
              <Button
                className="w-full h-12 text-lg"
                onClick={handleStripePayment}
                disabled={processing}
                type="button"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                {processing && processingMethod === 'stripe' ? 'Processing...' : 'Pay with Stripe'}
              </Button>
            </div>
            
            <div className="border rounded-lg p-4 hover:border-primary transition-colors">
              <p className="text-sm text-muted-foreground mb-3">UPI, Net Banking, Indian Cards</p>
              <Button
                className="w-full h-12 text-lg"
                onClick={handleRazorpayPayment}
                disabled={processing}
                type="button"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                {processing && processingMethod === 'razorpay' ? 'Processing...' : 'Pay with Razorpay'}
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Secure payment. Cancel anytime. 7-day grace period after expiry.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Subscription;