import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  User, Mail, Phone, Store, Calendar, CheckCircle, 
  XCircle, Clock, AlertTriangle, CreditCard, MapPin, FileText
} from 'lucide-react';
import { format } from 'date-fns';

interface AdminRegistration {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  shop_name: string | null;
  shop_address: string | null;
  drug_license_number: string | null;
  gst_number: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  approval_token: string | null;
  created_at: string;
  approved_at: string | null;
  rejection_reason?: string | null;
  approved_by?: string | null;
}

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

interface ShopDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registration: AdminRegistration | null;
  subscription: Subscription | null;
}

export const ShopDetailDialog = ({ 
  open, 
  onOpenChange, 
  registration, 
  subscription 
}: ShopDetailDialogProps) => {
  if (!registration) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'suspended':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Suspended</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Shop Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{registration.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(registration.status)}</div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{registration.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{registration.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shop Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Store className="h-4 w-4" />
                Shop Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <Store className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Shop Name</p>
                    <p className="font-medium">{registration.shop_name || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{registration.shop_address || 'Not provided'}</p>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Drug License Number</p>
                    <p className="font-medium">{registration.drug_license_number || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">GST Number</p>
                    <p className="font-medium">{registration.gst_number || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Registration Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Registration Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Registered On</p>
                  <p className="font-medium">{format(new Date(registration.created_at), 'dd MMM yyyy, hh:mm a')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approved On</p>
                  <p className="font-medium">
                    {registration.approved_at 
                      ? format(new Date(registration.approved_at), 'dd MMM yyyy, hh:mm a')
                      : 'Not yet approved'}
                  </p>
                </div>
              </div>
              {registration.approved_by && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Approved By</p>
                    <p className="font-medium">{registration.approved_by}</p>
                  </div>
                </>
              )}
              {registration.rejection_reason && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Rejection Reason</p>
                    <p className="font-medium text-destructive">{registration.rejection_reason}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Subscription Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Subscription Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Plan</p>
                      <Badge variant="outline" className="capitalize mt-1">{subscription.plan}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="mt-1">
                        {subscription.is_active ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Period Start</p>
                      <p className="font-medium">{format(new Date(subscription.current_period_start), 'dd MMM yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Period End</p>
                      <p className="font-medium">{format(new Date(subscription.current_period_end), 'dd MMM yyyy')}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Method</p>
                      <p className="font-medium capitalize">{subscription.payment_method || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Grace Period End</p>
                      <p className="font-medium">
                        {subscription.grace_period_end 
                          ? format(new Date(subscription.grace_period_end), 'dd MMM yyyy')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No subscription found</p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
