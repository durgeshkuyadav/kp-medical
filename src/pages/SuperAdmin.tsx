import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, Users, CreditCard, CheckCircle, XCircle, Clock, 
  RefreshCw, AlertTriangle, LogOut, Store, Eye, Settings, History, User,
  Activity, Scale
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { format } from 'date-fns';
import { ShopDetailDialog } from '@/components/super-admin/ShopDetailDialog';
import { ExportButtons } from '@/components/super-admin/ExportButtons';
import { SubscriptionManagementDialog } from '@/components/super-admin/SubscriptionManagementDialog';
import { PaymentHistorySection } from '@/components/super-admin/PaymentHistorySection';
import { RegistrationFilters } from '@/components/super-admin/RegistrationFilters';
import { SuperAdminProfileSection } from '@/components/super-admin/SuperAdminProfileSection';
import { AdminManagementSection } from '@/components/super-admin/AdminManagementSection';
import { ActivityLogsSection } from '@/components/super-admin/ActivityLogsSection';
import { PaymentReconciliationSection } from '@/components/super-admin/PaymentReconciliationSection';

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
  monthly_price: number;
  yearly_price: number;
}

const SuperAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<AdminRegistration[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRegistration, setSelectedRegistration] = useState<AdminRegistration | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    checkSuperAdminAccess();
    fetchData();
  }, []);

  const checkSuperAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/super-admin-auth');
      return;
    }

    const { data: isSuperAdmin, error } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'super_admin'
    });

    if (error || !isSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "Only super admin can access this page",
        variant: "destructive",
      });
      navigate('/');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: regData, error: regError } = await supabase
        .from('admin_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (regError) throw regError;
      setRegistrations(regData || []);

      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subError) throw subError;
      setSubscriptions(subData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (registration: AdminRegistration) => {
    setProcessingId(registration.id);
    try {
      const { error } = await supabase.functions.invoke('approve-admin', {
        body: { 
          token: registration.approval_token,
          action: 'approve'
        }
      });

      if (error) throw error;

      toast({
        title: "Admin Approved",
        description: `${registration.full_name} has been approved`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve admin",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (registration: AdminRegistration) => {
    setProcessingId(registration.id);
    try {
      const { error } = await supabase.functions.invoke('approve-admin', {
        body: { 
          token: registration.approval_token,
          action: 'reject',
          reason: 'Rejected by super admin'
        }
      });

      if (error) throw error;

      toast({
        title: "Admin Rejected",
        description: `${registration.full_name} has been rejected`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject admin",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspend = async (registration: AdminRegistration) => {
    setProcessingId(registration.id);
    try {
      const { error } = await supabase
        .from('admin_registrations')
        .update({ status: 'suspended' })
        .eq('id', registration.id);

      if (error) throw error;

      await supabase
        .from('subscriptions')
        .update({ is_active: false })
        .eq('admin_id', registration.user_id);

      toast({
        title: "Admin Suspended",
        description: `${registration.full_name} has been suspended`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to suspend admin",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

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

  const clearFilters = () => {
    setStatusFilter('all');
    setPaymentFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const filteredRegistrations = registrations.filter(reg => {
    // Search filter
    const matchesSearch = 
      reg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.shop_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
    
    // Payment filter
    const sub = subscriptions.find(s => s.admin_id === reg.user_id);
    let matchesPayment = true;
    if (paymentFilter === 'paid') {
      matchesPayment = sub?.payment_method && sub?.is_active ? true : false;
    } else if (paymentFilter === 'pending') {
      matchesPayment = reg.status === 'approved' && (!sub?.payment_method || !sub?.is_active);
    } else if (paymentFilter === 'none') {
      matchesPayment = !sub;
    }
    
    // Date filter
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(reg.created_at) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDate = matchesDate && new Date(reg.created_at) <= new Date(dateTo + 'T23:59:59');
    }
    
    return matchesSearch && matchesStatus && matchesPayment && matchesDate;
  });

  const pendingCount = registrations.filter(r => r.status === 'pending').length;
  const approvedCount = registrations.filter(r => r.status === 'approved').length;
  const activeSubsCount = subscriptions.filter(s => s.is_active).length;
  const paidCount = subscriptions.filter(s => s.payment_method && s.is_active).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-card rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage all registered medical shops</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <ThemeToggle />
            <Button 
              variant="destructive" 
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/super-admin-auth');
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{approvedCount}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{paidCount}</p>
                  <p className="text-sm text-muted-foreground">Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeSubsCount}</p>
                  <p className="text-sm text-muted-foreground">Active Subs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Store className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{registrations.length}</p>
                  <p className="text-sm text-muted-foreground">Total Shops</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="registrations" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="registrations">
              <Store className="h-4 w-4 mr-2" />
              Medical Shops
            </TabsTrigger>
            <TabsTrigger value="admins">
              <Users className="h-4 w-4 mr-2" />
              Admin Management
            </TabsTrigger>
            <TabsTrigger value="subscriptions">
              <CreditCard className="h-4 w-4 mr-2" />
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="payments">
              <History className="h-4 w-4 mr-2" />
              Payment History
            </TabsTrigger>
            <TabsTrigger value="reconciliation">
              <Scale className="h-4 w-4 mr-2" />
              Reconciliation
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Activity className="h-4 w-4 mr-2" />
              Activity Logs
            </TabsTrigger>
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registrations">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Registered Medical Shops</CardTitle>
                    <CardDescription>View and manage all registered medical shops</CardDescription>
                  </div>
                  <ExportButtons registrations={filteredRegistrations} />
                </div>
              </CardHeader>
              <CardContent>
                <RegistrationFilters
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                  paymentFilter={paymentFilter}
                  onPaymentChange={setPaymentFilter}
                  dateFrom={dateFrom}
                  onDateFromChange={setDateFrom}
                  dateTo={dateTo}
                  onDateToChange={setDateTo}
                  onClearFilters={clearFilters}
                />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Shop Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistrations.map((reg) => {
                      const sub = subscriptions.find(s => s.admin_id === reg.user_id);
                      const hasPayment = sub?.payment_method && sub?.is_active;
                      return (
                        <TableRow key={reg.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium">{reg.full_name}</TableCell>
                          <TableCell>{reg.email}</TableCell>
                          <TableCell>{reg.shop_name || '-'}</TableCell>
                          <TableCell>{reg.phone || '-'}</TableCell>
                          <TableCell>{getStatusBadge(reg.status)}</TableCell>
                          <TableCell>
                            {reg.status === 'approved' ? (
                              hasPayment ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Paid ({sub?.payment_method})
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Pending Payment
                                </Badge>
                              )
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{format(new Date(reg.created_at), 'dd MMM yyyy')}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedRegistration(reg);
                                  setDetailDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {reg.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(reg)}
                                    disabled={processingId === reg.id}
                                  >
                                    {processingId === reg.id ? '...' : 'Approve'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleReject(reg)}
                                    disabled={processingId === reg.id}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              {reg.status === 'approved' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSuspend(reg)}
                                  disabled={processingId === reg.id}
                                >
                                  Suspend
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredRegistrations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No registrations found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle>Subscriptions</CardTitle>
                <CardDescription>View all subscription details</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admin</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Period Start</TableHead>
                      <TableHead>Period End</TableHead>
                      <TableHead>Grace Period</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => {
                      const reg = registrations.find(r => r.user_id === sub.admin_id);
                      return (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{reg?.full_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">{reg?.email || sub.admin_id.slice(0, 8)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{sub.plan}</Badge>
                          </TableCell>
                          <TableCell>
                            {sub.is_active ? (
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            ) : (
                              <Badge variant="destructive">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="capitalize">{sub.payment_method || '-'}</TableCell>
                          <TableCell>{format(new Date(sub.current_period_start), 'dd MMM yyyy')}</TableCell>
                          <TableCell>{format(new Date(sub.current_period_end), 'dd MMM yyyy')}</TableCell>
                          <TableCell>
                            {sub.grace_period_end 
                              ? format(new Date(sub.grace_period_end), 'dd MMM yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSubscription(sub);
                                setSelectedRegistration(reg || null);
                                setSubscriptionDialogOpen(true);
                              }}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {subscriptions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No subscriptions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admins">
            <AdminManagementSection
              registrations={registrations}
              subscriptions={subscriptions}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentHistorySection 
              registrations={registrations} 
              subscriptions={subscriptions} 
            />
          </TabsContent>

          <TabsContent value="reconciliation">
            <PaymentReconciliationSection
              registrations={registrations}
              subscriptions={subscriptions}
            />
          </TabsContent>

          <TabsContent value="logs">
            <ActivityLogsSection registrations={registrations} />
          </TabsContent>

          <TabsContent value="profile">
            <SuperAdminProfileSection registrations={registrations} subscriptions={subscriptions} />
          </TabsContent>
        </Tabs>

        {/* Shop Detail Dialog */}
        <ShopDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          registration={selectedRegistration}
          subscription={subscriptions.find(s => s.admin_id === selectedRegistration?.user_id) || null}
        />

        {/* Subscription Management Dialog */}
        <SubscriptionManagementDialog
          open={subscriptionDialogOpen}
          onOpenChange={setSubscriptionDialogOpen}
          subscription={selectedSubscription}
          registration={selectedRegistration}
          onUpdate={fetchData}
        />
      </div>
    </div>
  );
};

export default SuperAdmin;
