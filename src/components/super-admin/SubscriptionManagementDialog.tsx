import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, CreditCard, Clock, Play, Pause, 
  PlusCircle, RefreshCw, AlertTriangle, CheckCircle
} from 'lucide-react';
import { format, addDays, addMonths, addYears } from 'date-fns';

interface Subscription {
  id: string;
  admin_id: string;
  plan: 'monthly' | 'yearly';
  is_active: boolean;
  current_period_start: string;
  current_period_end: string;
  grace_period_end: string | null;
  payment_method: string | null;
  created_at: string;
}

interface AdminRegistration {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  shop_name: string | null;
}

interface SubscriptionManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription | null;
  registration: AdminRegistration | null;
  onUpdate: () => void;
}

export const SubscriptionManagementDialog = ({
  open,
  onOpenChange,
  subscription,
  registration,
  onUpdate
}: SubscriptionManagementDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [extendDays, setExtendDays] = useState('30');
  const [extendType, setExtendType] = useState<'days' | 'months' | 'years'>('days');
  const [newPlan, setNewPlan] = useState<'monthly' | 'yearly'>('monthly');

  if (!subscription || !registration) return null;

  const handleExtendSubscription = async () => {
    setLoading(true);
    try {
      const currentEnd = new Date(subscription.current_period_end);
      let newEnd: Date;

      const amount = parseInt(extendDays);
      switch (extendType) {
        case 'months':
          newEnd = addMonths(currentEnd, amount);
          break;
        case 'years':
          newEnd = addYears(currentEnd, amount);
          break;
        default:
          newEnd = addDays(currentEnd, amount);
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({
          current_period_end: newEnd.toISOString(),
          is_active: true,
          grace_period_end: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (error) throw error;

      toast({
        title: "Subscription Extended",
        description: `Subscription extended to ${format(newEnd, 'dd MMM yyyy')}`,
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to extend subscription",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    setLoading(true);
    try {
      const newStatus = !subscription.is_active;
      
      const updateData: any = {
        is_active: newStatus,
        updated_at: new Date().toISOString()
      };

      // If pausing, set grace period end to 7 days from now
      if (!newStatus) {
        updateData.grace_period_end = addDays(new Date(), 7).toISOString();
      } else {
        // If reactivating, clear grace period
        updateData.grace_period_end = null;
      }

      const { error } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', subscription.id);

      if (error) throw error;

      toast({
        title: newStatus ? "Subscription Activated" : "Subscription Paused",
        description: newStatus 
          ? "The subscription is now active"
          : "The subscription has been paused with a 7-day grace period",
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          plan: newPlan,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (error) throw error;

      toast({
        title: "Plan Changed",
        description: `Subscription plan changed to ${newPlan}`,
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change plan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetGracePeriod = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          grace_period_end: addDays(new Date(), 7).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (error) throw error;

      toast({
        title: "Grace Period Reset",
        description: "Grace period extended by 7 days from today",
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset grace period",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Manage Subscription
          </DialogTitle>
        </DialogHeader>

        {/* Current Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Shop</p>
                <p className="font-medium">{registration.shop_name || registration.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <Badge variant="outline" className="capitalize mt-1">{subscription.plan}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  {subscription.is_active ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />Inactive
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expires</p>
                <p className="font-medium">{format(new Date(subscription.current_period_end), 'dd MMM yyyy')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="extend" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="extend">
              <PlusCircle className="h-4 w-4 mr-1" />
              Extend
            </TabsTrigger>
            <TabsTrigger value="toggle">
              {subscription.is_active ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {subscription.is_active ? 'Pause' : 'Resume'}
            </TabsTrigger>
            <TabsTrigger value="plan">
              <RefreshCw className="h-4 w-4 mr-1" />
              Change Plan
            </TabsTrigger>
            <TabsTrigger value="grace">
              <Clock className="h-4 w-4 mr-1" />
              Grace Period
            </TabsTrigger>
          </TabsList>

          {/* Extend Tab */}
          <TabsContent value="extend" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Extend Subscription</CardTitle>
                <CardDescription>Add more time to the current subscription period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="extendAmount">Amount</Label>
                    <Input
                      id="extendAmount"
                      type="number"
                      min="1"
                      value={extendDays}
                      onChange={(e) => setExtendDays(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Unit</Label>
                    <Select value={extendType} onValueChange={(v) => setExtendType(v as any)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="years">Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">New expiry date will be:</p>
                  <p className="font-semibold text-lg">
                    {format(
                      extendType === 'months' 
                        ? addMonths(new Date(subscription.current_period_end), parseInt(extendDays) || 0)
                        : extendType === 'years'
                        ? addYears(new Date(subscription.current_period_end), parseInt(extendDays) || 0)
                        : addDays(new Date(subscription.current_period_end), parseInt(extendDays) || 0),
                      'dd MMM yyyy'
                    )}
                  </p>
                </div>
                <Button onClick={handleExtendSubscription} disabled={loading} className="w-full">
                  {loading ? 'Extending...' : 'Extend Subscription'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Toggle Tab */}
          <TabsContent value="toggle" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {subscription.is_active ? 'Pause Subscription' : 'Resume Subscription'}
                </CardTitle>
                <CardDescription>
                  {subscription.is_active 
                    ? 'Temporarily suspend access to the shop. A 7-day grace period will be applied.'
                    : 'Reactivate the subscription and restore access.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscription.is_active ? (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800">Warning</p>
                        <p className="text-sm text-yellow-700">
                          Pausing the subscription will restrict the shop owner's access to the system.
                          They will have a 7-day grace period to resolve any issues.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-800">Ready to Resume</p>
                        <p className="text-sm text-green-700">
                          Resuming the subscription will restore full access to the shop owner.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <Button 
                  onClick={handleToggleActive} 
                  disabled={loading}
                  variant={subscription.is_active ? "destructive" : "default"}
                  className="w-full"
                >
                  {loading ? 'Processing...' : subscription.is_active ? 'Pause Subscription' : 'Resume Subscription'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Change Plan Tab */}
          <TabsContent value="plan" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Change Plan</CardTitle>
                <CardDescription>Switch between monthly and yearly billing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Plan</Label>
                  <Select value={newPlan} onValueChange={(v) => setNewPlan(v as any)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly (₹999/month)</SelectItem>
                      <SelectItem value="yearly">Yearly (₹9,999/year)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 p-4 rounded-lg border-2 border-muted">
                    <p className="text-sm text-muted-foreground">Current Plan</p>
                    <p className="font-semibold capitalize">{subscription.plan}</p>
                  </div>
                  <div className="flex items-center">→</div>
                  <div className="flex-1 p-4 rounded-lg border-2 border-primary bg-primary/5">
                    <p className="text-sm text-muted-foreground">New Plan</p>
                    <p className="font-semibold capitalize">{newPlan}</p>
                  </div>
                </div>
                <Button 
                  onClick={handleChangePlan} 
                  disabled={loading || newPlan === subscription.plan}
                  className="w-full"
                >
                  {loading ? 'Changing...' : 'Change Plan'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grace Period Tab */}
          <TabsContent value="grace" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Manage Grace Period</CardTitle>
                <CardDescription>Reset or extend the grace period for this subscription</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Current Grace Period End</p>
                    <p className="font-semibold">
                      {subscription.grace_period_end 
                        ? format(new Date(subscription.grace_period_end), 'dd MMM yyyy')
                        : 'Not set'}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm text-muted-foreground">New Grace Period End</p>
                    <p className="font-semibold">{format(addDays(new Date(), 7), 'dd MMM yyyy')}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Resetting the grace period will give the shop owner an additional 7 days from today 
                  to renew their subscription before access is suspended.
                </p>
                <Button onClick={handleResetGracePeriod} disabled={loading} variant="outline" className="w-full">
                  {loading ? 'Resetting...' : 'Reset Grace Period (+ 7 Days)'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
