import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import type { AuditLog } from "@/pages/SecurityDashboard";

interface AuditLogsTableProps {
  auditLogs: AuditLog[];
  loading: boolean;
}

export function AuditLogsTable({ auditLogs, loading }: AuditLogsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Recent Activity</CardTitle>
        <CardDescription>
          Track your own administrative actions and sensitive operations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : auditLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit logs recorded</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.slice(0, 15).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.resource_type || "System"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(log.created_at), "MMM dd, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {log.details ? JSON.stringify(log.details).slice(0, 50) + "..." : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
