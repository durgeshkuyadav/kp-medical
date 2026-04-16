import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { SecurityStats } from "@/components/security/SecurityStats";
import { FailedLoginsTable } from "@/components/security/FailedLoginsTable";
import { AuditLogsTable } from "@/components/security/AuditLogsTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export interface FailedLogin {
  id: string;
  email: string;
  created_at: string;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  created_at: string;
  details: any;
  ip_address?: string;
}

export default function SecurityDashboard() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [failedLogins, setFailedLogins] = useState<FailedLogin[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin && user) {
      fetchSecurityData();
    }
  }, [isAdmin, user]);

  const fetchSecurityData = async () => {
    try {
      // Only fetch failed login attempts for the current admin's own email
      const userEmail = user?.email;
      
      const loginQuery = supabase
        .from("failed_login_attempts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (userEmail) {
        loginQuery.eq("email", userEmail);
      }

      const { data: loginData, error: loginError } = await loginQuery;
      if (loginError) throw loginError;
      setFailedLogins((loginData || []) as FailedLogin[]);

      // Fetch audit logs only for the current user
      const auditQuery = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (user?.id) {
        auditQuery.eq("user_id", user.id);
      }

      const { data: auditData, error: auditError } = await auditQuery;
      if (auditError) throw auditError;
      setAuditLogs((auditData || []) as AuditLog[]);
    } catch (error) {
      console.error("Error fetching security data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Access denied. Only administrators can view the security dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Dashboard</h1>
          <p className="text-muted-foreground">Monitor your account security and activity</p>
        </div>

        <SecurityStats failedLogins={failedLogins} auditLogs={auditLogs} />
        <FailedLoginsTable failedLogins={failedLogins} loading={loading} />
        <AuditLogsTable auditLogs={auditLogs} loading={loading} />
      </div>
    </MainLayout>
  );
}
