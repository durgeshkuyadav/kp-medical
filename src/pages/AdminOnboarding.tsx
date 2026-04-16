import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle2, Circle, Clock, Mail, Shield, CreditCard, 
  Settings, ArrowRight, Loader2, AlertTriangle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepStatus {
  emailVerified: boolean;
  adminApproved: boolean;
  subscriptionPaid: boolean;
  setupComplete: boolean;
}

interface Registration {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  email: string;
  full_name: string;
}

interface Subscription {
  id: string;
  is_active: boolean;
  plan: string;
  current_period_end: string;
}

const AdminOnboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    emailVerified: false,
    adminApproved: false,
    subscriptionPaid: false,
    setupComplete: false,
  });

  useEffect(() => {
    fetchOnboardingStatus();
  }, []);

  const fetchOnboardingStatus = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        navigate('/admin-auth');
        return;
      }

      setUser(currentUser);

      // Step 1: Email verified
      const emailVerified = !!currentUser.email_confirmed_at || !!currentUser.confirmed_at;

      // Step 2: Check admin registration status
      const { data: regData } = await supabase
        .from('admin_registrations')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      setRegistration(regData as Registration | null);
      const adminApproved = regData?.status === 'approved';

      // Step 3: Check subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('admin_id', currentUser.id)
        .maybeSingle();

      setSubscription(subData as Subscription | null);
      const subscriptionPaid = subData?.is_active === true;

      // Step 4: Setup complete (has shop settings for this admin)
      const { data: shopData } = await supabase
        .from('shop_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      const setupComplete = adminApproved && subscriptionPaid && !!shopData;

      setStepStatus({
        emailVerified: true,
        adminApproved,
        subscriptionPaid,
        setupComplete,
      });

      // If all steps complete, redirect to dashboard
      if (setupComplete) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (completed: boolean, pending: boolean = false) => {
    if (completed) {
      return <CheckCircle2 className="h-6 w-6 text-green-500" />;
    }
    if (pending) {
      return <Clock className="h-6 w-6 text-yellow-500" />;
    }
    return <Circle className="h-6 w-6 text-muted-foreground" />;
  };

  const steps = [
    {
      id: 'email',
      title: 'Email Verified',
      description: 'Your email address has been confirmed',
      icon: Mail,
      completed: stepStatus.emailVerified,
      pending: false,
    },
    {
      id: 'approval',
      title: 'Admin Approved',
      description: registration?.status === 'pending' 
        ? 'Waiting for super admin approval'
        : registration?.status === 'rejected'
        ? 'Your registration was rejected'
        : 'Your admin account has been approved',
      icon: Shield,
      completed: stepStatus.adminApproved,
      pending: registration?.status === 'pending',
      rejected: registration?.status === 'rejected',
    },
    {
      id: 'subscription',
      title: 'Subscription Active',
      description: stepStatus.subscriptionPaid 
        ? `${subscription?.plan} plan active`
        : 'Choose a subscription plan to continue',
      icon: CreditCard,
      completed: stepStatus.subscriptionPaid,
      pending: stepStatus.adminApproved && !stepStatus.subscriptionPaid,
    },
    {
      id: 'setup',
      title: 'Setup Complete',
      description: 'Configure your shop settings',
      icon: Settings,
      completed: stepStatus.setupComplete,
      pending: stepStatus.subscriptionPaid && !stepStatus.setupComplete,
    },
  ];

  const currentStepIndex = steps.findIndex(step => !step.completed);
  const currentStep = steps[currentStepIndex] || steps[steps.length - 1];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome, {registration?.full_name || user?.email}!
          </h1>
          <p className="text-muted-foreground">
            Complete the following steps to set up your admin account
          </p>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = index === currentStepIndex;
                const isRejected = (step as any).rejected;

                return (
                  <div key={step.id} className="relative">
                    {index < steps.length - 1 && (
                      <div 
                        className={cn(
                          "absolute left-3 top-12 w-0.5 h-8",
                          step.completed ? "bg-green-500" : "bg-muted"
                        )}
                      />
                    )}
                    
                    <div className={cn(
                      "flex items-start gap-4 p-4 rounded-lg transition-colors",
                      isActive && "bg-primary/5 border border-primary/20",
                      isRejected && "bg-destructive/5 border border-destructive/20"
                    )}>
                      <div className="flex-shrink-0">
                        {isRejected ? (
                          <AlertTriangle className="h-6 w-6 text-destructive" />
                        ) : (
                          getStepIcon(step.completed, step.pending)
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={cn(
                            "font-semibold",
                            step.completed && "text-green-600",
                            isRejected && "text-destructive"
                          )}>
                            {step.title}
                          </h3>
                          {step.completed && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              Complete
                            </Badge>
                          )}
                          {step.pending && !isRejected && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                              Pending
                            </Badge>
                          )}
                          {isRejected && (
                            <Badge variant="destructive">Rejected</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {step.description}
                        </p>
                      </div>

                      <div className="flex-shrink-0">
                        <StepIcon className={cn(
                          "h-5 w-5",
                          step.completed ? "text-green-500" : "text-muted-foreground"
                        )} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action Card */}
        <Card>
          <CardHeader>
            <CardTitle>Next Step</CardTitle>
            <CardDescription>
              {currentStep.id === 'email' && "Your email is being verified"}
              {currentStep.id === 'approval' && registration?.status === 'pending' && 
                "Please wait while your registration is being reviewed"}
              {currentStep.id === 'approval' && registration?.status === 'rejected' &&
                "Please contact support for more information"}
              {currentStep.id === 'subscription' && "Choose a subscription plan to activate your account"}
              {currentStep.id === 'setup' && "Configure your shop settings to complete setup"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStep.id === 'approval' && registration?.status === 'pending' && (
              <>
                <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">Awaiting Approval</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      An approval email was sent to the super admin. You'll receive an email once approved.
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    setResending(true);
                    try {
                      // Fetch registration with token
                      const { data: regData } = await supabase
                        .from('admin_registrations')
                        .select('*')
                        .eq('user_id', user?.id)
                        .single();
                      
                      if (regData) {
                        const { error } = await supabase.functions.invoke('send-admin-approval-email', {
                          body: {
                            adminEmail: regData.email,
                            adminName: regData.full_name,
                            phone: regData.phone,
                            userId: regData.user_id,
                            approvalToken: regData.approval_token
                          }
                        });
                        
                        if (error) throw error;
                        
                        toast({
                          title: "Email Sent",
                          description: "Approval request has been resent to the super admin.",
                        });
                      }
                    } catch (err: any) {
                      toast({
                        title: "Error",
                        description: err.message || "Failed to resend approval email",
                        variant: "destructive",
                      });
                    } finally {
                      setResending(false);
                    }
                  }}
                  className="w-full gap-2"
                  disabled={resending}
                >
                  {resending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Resend Approval Request
                    </>
                  )}
                </Button>
              </>
            )}

            {currentStep.id === 'approval' && registration?.status === 'rejected' && (
              <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Registration Rejected</p>
                  <p className="text-sm text-muted-foreground">
                    Please contact support at durgeshyadavalld@gmail.com for assistance.
                  </p>
                </div>
              </div>
            )}

            {currentStep.id === 'subscription' && (
              <Button onClick={() => navigate('/subscription')} className="w-full gap-2">
                Choose Subscription Plan
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {currentStep.id === 'setup' && (
              <Button onClick={() => navigate('/settings')} className="w-full gap-2">
                Configure Shop Settings
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {stepStatus.setupComplete && (
              <Button onClick={() => navigate('/')} className="w-full gap-2">
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            <Button variant="outline" onClick={fetchOnboardingStatus} className="w-full">
              Refresh Status
            </Button>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Need help? Contact support at durgeshyadavalld@gmail.com</p>
        </div>
      </div>
    </div>
  );
};

export default AdminOnboarding;