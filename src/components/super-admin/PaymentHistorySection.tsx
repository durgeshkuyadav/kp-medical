import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Search, Download, IndianRupee, Calendar, CreditCard } from 'lucide-react';

interface PaymentHistory {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_id: string | null;
  status: string;
  created_at: string;
}

interface AdminRegistration {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  shop_name: string | null;
}

interface Subscription {
  id: string;
  admin_id: string;
  plan: string;
}

interface PaymentHistorySectionProps {
  registrations: AdminRegistration[];
  subscriptions: Subscription[];
}

export const PaymentHistorySection = ({ registrations, subscriptions }: PaymentHistorySectionProps) => {
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      // Super admin needs to query payment_history through subscriptions
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
      } else {
        setPayments(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAdminInfo = (subscriptionId: string) => {
    const sub = subscriptions.find(s => s.id === subscriptionId);
    if (!sub) return { name: 'Unknown', email: '', shop: '' };
    const reg = registrations.find(r => r.user_id === sub.admin_id);
    return {
      name: reg?.full_name || 'Unknown',
      email: reg?.email || '',
      shop: reg?.shop_name || ''
    };
  };

  const getSubscriptionPlan = (subscriptionId: string) => {
    const sub = subscriptions.find(s => s.id === subscriptionId);
    return sub?.plan || 'Unknown';
  };

  const filteredPayments = payments.filter(payment => {
    const adminInfo = getAdminInfo(payment.subscription_id);
    const matchesSearch = 
      adminInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adminInfo.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adminInfo.shop.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(payment.created_at) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDate = matchesDate && new Date(payment.created_at) <= new Date(dateTo + 'T23:59:59');
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalAmount = filteredPayments.reduce((sum, p) => p.status === 'completed' ? sum + p.amount : sum, 0);

  const exportPayments = () => {
    const csvContent = [
      ['Date', 'Admin Name', 'Shop', 'Email', 'Amount', 'Currency', 'Plan', 'Payment Method', 'Transaction ID', 'Status'].join(','),
      ...filteredPayments.map(p => {
        const info = getAdminInfo(p.subscription_id);
        return [
          format(new Date(p.created_at), 'yyyy-MM-dd HH:mm'),
          `"${info.name}"`,
          `"${info.shop}"`,
          info.email,
          p.amount,
          p.currency,
          getSubscriptionPlan(p.subscription_id),
          p.payment_method,
          p.transaction_id || '',
          p.status
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>All payment transactions from medical shops</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              <span className="font-semibold">₹{totalAmount.toLocaleString()}</span>
              <span className="text-sm">Total Revenue</span>
            </div>
            <Button variant="outline" size="sm" onClick={exportPayments}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, shop, or transaction ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]"
            />
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Admin / Shop</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((payment) => {
              const info = getAdminInfo(payment.subscription_id);
              return (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{format(new Date(payment.created_at), 'dd MMM yyyy')}</p>
                      <p className="text-sm text-muted-foreground">{format(new Date(payment.created_at), 'HH:mm')}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{info.name}</p>
                      <p className="text-sm text-muted-foreground">{info.shop || info.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {getSubscriptionPlan(payment.subscription_id)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">
                      {payment.currency === 'INR' ? '₹' : payment.currency}{payment.amount.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="capitalize">{payment.payment_method}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {payment.transaction_id || '-'}
                    </code>
                  </TableCell>
                  <TableCell>
                    {payment.status === 'completed' ? (
                      <Badge className="bg-green-100 text-green-800">Completed</Badge>
                    ) : payment.status === 'pending' ? (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
                    ) : (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredPayments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No payment records found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
