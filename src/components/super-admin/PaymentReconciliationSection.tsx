import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  AlertTriangle, CheckCircle, XCircle, RefreshCw, 
  Download, IndianRupee, Scale
} from "lucide-react";

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
  status: "pending" | "approved" | "rejected" | "suspended";
}

interface Subscription {
  id: string;
  admin_id: string;
  plan: "monthly" | "yearly";
  is_active: boolean;
  payment_method: string | null;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  monthly_price: number;
  yearly_price: number;
}

interface ReconciliationIssue {
  type: "missing_payment" | "failed_payment" | "orphan_payment" | "amount_mismatch" | "inactive_with_payment";
  severity: "error" | "warning";
  subscriptionId?: string;
  paymentId?: string;
  adminName: string;
  adminEmail: string;
  details: string;
  amount?: number;
}

interface PaymentReconciliationSectionProps {
  registrations: AdminRegistration[];
  subscriptions: Subscription[];
}

export const PaymentReconciliationSection = ({ 
  registrations, 
  subscriptions 
}: PaymentReconciliationSectionProps) => {
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching payments:", error);
      } else {
        setPayments(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAdminInfo = (adminId: string) => {
    const reg = registrations.find(r => r.user_id === adminId);
    return {
      name: reg?.full_name || "Unknown",
      email: reg?.email || "",
      shop: reg?.shop_name || "",
    };
  };

  const issues = useMemo((): ReconciliationIssue[] => {
    const result: ReconciliationIssue[] = [];

    // Check for active subscriptions without any payment
    subscriptions.forEach(sub => {
      const info = getAdminInfo(sub.admin_id);
      const subPayments = payments.filter(p => p.subscription_id === sub.id);
      const successfulPayments = subPayments.filter(p => p.status === "completed");
      
      if (sub.is_active && sub.payment_method && successfulPayments.length === 0) {
        result.push({
          type: "missing_payment",
          severity: "error",
          subscriptionId: sub.id,
          adminName: info.name,
          adminEmail: info.email,
          details: `Active subscription with ${sub.payment_method} but no successful payment record found.`,
        });
      }

      // Check for amount mismatches
      const expectedAmount = sub.plan === "monthly" ? sub.monthly_price : sub.yearly_price;
      successfulPayments.forEach(payment => {
        if (payment.amount !== expectedAmount) {
          result.push({
            type: "amount_mismatch",
            severity: "warning",
            subscriptionId: sub.id,
            paymentId: payment.id,
            adminName: info.name,
            adminEmail: info.email,
            details: `Payment amount ₹${payment.amount} doesn't match expected ${sub.plan} price ₹${expectedAmount}.`,
            amount: payment.amount,
          });
        }
      });

      // Check for inactive subscriptions with recent successful payments
      if (!sub.is_active) {
        const recentPayment = successfulPayments.find(p => {
          const paymentDate = new Date(p.created_at);
          const daysSince = (Date.now() - paymentDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSince <= 30;
        });
        
        if (recentPayment) {
          result.push({
            type: "inactive_with_payment",
            severity: "error",
            subscriptionId: sub.id,
            paymentId: recentPayment.id,
            adminName: info.name,
            adminEmail: info.email,
            details: `Subscription is inactive but has a recent successful payment from ${format(new Date(recentPayment.created_at), "dd MMM yyyy")}.`,
            amount: recentPayment.amount,
          });
        }
      }
    });

    // Check for failed payments
    payments.filter(p => p.status === "failed").forEach(payment => {
      const sub = subscriptions.find(s => s.id === payment.subscription_id);
      const info = sub ? getAdminInfo(sub.admin_id) : { name: "Unknown", email: "" };
      result.push({
        type: "failed_payment",
        severity: "warning",
        subscriptionId: payment.subscription_id,
        paymentId: payment.id,
        adminName: info.name,
        adminEmail: info.email,
        details: `Failed payment of ₹${payment.amount} on ${format(new Date(payment.created_at), "dd MMM yyyy")}.`,
        amount: payment.amount,
      });
    });

    // Check for orphan payments (no matching subscription)
    payments.forEach(payment => {
      const sub = subscriptions.find(s => s.id === payment.subscription_id);
      if (!sub) {
        result.push({
          type: "orphan_payment",
          severity: "error",
          paymentId: payment.id,
          adminName: "Unknown",
          adminEmail: "",
          details: `Payment of ₹${payment.amount} has no matching subscription record.`,
          amount: payment.amount,
        });
      }
    });

    return result;
  }, [subscriptions, payments, registrations]);

  const stats = useMemo(() => {
    const totalRevenue = payments
      .filter(p => p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0);
    
    const failedPayments = payments.filter(p => p.status === "failed").length;
    const pendingPayments = payments.filter(p => p.status === "pending").length;
    const activeSubscriptions = subscriptions.filter(s => s.is_active).length;
    const paidSubscriptions = subscriptions.filter(s => s.payment_method && s.is_active).length;

    return {
      totalRevenue,
      failedPayments,
      pendingPayments,
      activeSubscriptions,
      paidSubscriptions,
      issueCount: issues.length,
      errorCount: issues.filter(i => i.severity === "error").length,
      warningCount: issues.filter(i => i.severity === "warning").length,
    };
  }, [payments, subscriptions, issues]);

  const exportReport = () => {
    const csvContent = [
      ["Type", "Severity", "Admin Name", "Admin Email", "Details", "Amount", "Subscription ID", "Payment ID"].join(","),
      ...issues.map(issue => [
        issue.type,
        issue.severity,
        `"${issue.adminName}"`,
        issue.adminEmail,
        `"${issue.details}"`,
        issue.amount || "",
        issue.subscriptionId || "",
        issue.paymentId || "",
      ].join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-reconciliation-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.paidSubscriptions}/{stats.activeSubscriptions}</p>
                <p className="text-sm text-muted-foreground">Paid / Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.failedPayments}</p>
                <p className="text-sm text-muted-foreground">Failed Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                stats.issueCount === 0 ? "bg-green-100" : "bg-yellow-100"
              }`}>
                <Scale className={`h-5 w-5 ${
                  stats.issueCount === 0 ? "text-green-600" : "text-yellow-600"
                }`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.issueCount}</p>
                <p className="text-sm text-muted-foreground">Issues Found</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues Alert */}
      {stats.errorCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Issues Found</AlertTitle>
          <AlertDescription>
            {stats.errorCount} critical issue(s) require immediate attention. Review the reconciliation report below.
          </AlertDescription>
        </Alert>
      )}

      {stats.issueCount === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>All Clear</AlertTitle>
          <AlertDescription>
            No reconciliation issues found. All payments match their subscriptions.
          </AlertDescription>
        </Alert>
      )}

      {/* Reconciliation Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Reconciliation Report
              </CardTitle>
              <CardDescription>
                Subscription vs payment history comparison
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchPayments}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {issues.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportReport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Issues
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {issues.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Issue Type</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {issue.severity === "error" ? (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Warning
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {issue.type.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{issue.adminName}</p>
                        <p className="text-xs text-muted-foreground">{issue.adminEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="text-sm">{issue.details}</p>
                    </TableCell>
                    <TableCell>
                      {issue.amount ? `₹${issue.amount.toLocaleString()}` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No issues found. All payments are properly reconciled.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
