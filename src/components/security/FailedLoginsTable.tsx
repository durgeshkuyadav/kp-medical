import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { maskEmail, maskIP } from "@/lib/maskData";
import { MaskToggle } from "@/components/ui/MaskToggle";
import type { FailedLogin } from "@/pages/SecurityDashboard";

interface FailedLoginsTableProps {
  failedLogins: FailedLogin[];
  loading: boolean;
}

export function FailedLoginsTable({ failedLogins, loading }: FailedLoginsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Failed Login Attempts</CardTitle>
        <CardDescription>
          Failed login attempts on your account — only visible to you
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : failedLogins.length === 0 ? (
          <p className="text-sm text-muted-foreground">No failed login attempts recorded for your account</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedLogins.slice(0, 10).map((login) => (
                  <TableRow key={login.id}>
                    <TableCell className="font-medium">
                      <MaskToggle maskedValue={maskEmail(login.email)} originalValue={login.email} />
                    </TableCell>
                    <TableCell>
                      {format(new Date(login.created_at), "MMM dd, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{login.reason || "Unknown"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <MaskToggle maskedValue={maskIP(login.ip_address)} originalValue={login.ip_address || 'N/A'} />
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
