import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Activity, Lock } from "lucide-react";
import type { FailedLogin, AuditLog } from "@/pages/SecurityDashboard";

interface SecurityStatsProps {
  failedLogins: FailedLogin[];
  auditLogs: AuditLog[];
}

export function SecurityStats({ failedLogins, auditLogs }: SecurityStatsProps) {
  const recentFailedLogins = failedLogins.filter(
    (login) => new Date(login.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length;

  const sensitiveActions = auditLogs.filter((log) =>
    ["user_created", "user_deleted", "role_changed", "password_reset", "sensitive_data_viewed"].includes(log.action)
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Failed Logins (24h)</CardTitle>
          <Lock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{recentFailedLogins}</div>
          <p className="text-xs text-muted-foreground">Your account only</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Failed Attempts</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{failedLogins.length}</div>
          <p className="text-xs text-muted-foreground">Your account history</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Your Actions</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{sensitiveActions.length}</div>
          <p className="text-xs text-muted-foreground">Sensitive operations</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Status</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <Badge variant="outline" className="text-success border-success">
              Secure
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">All systems operational</p>
        </CardContent>
      </Card>
    </div>
  );
}
