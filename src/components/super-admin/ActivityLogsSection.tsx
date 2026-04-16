import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Activity, Search, RefreshCw, Download, Calendar } from "lucide-react";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

interface AdminRegistration {
  user_id: string;
  email: string;
  full_name: string;
}

interface ActivityLogsSectionProps {
  registrations: AdminRegistration[];
}

export const ActivityLogsSection = ({ registrations }: ActivityLogsSectionProps) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("Error fetching audit logs:", error);
      } else {
        setLogs((data || []) as AuditLog[]);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAdminInfo = (userId: string | null) => {
    if (!userId) return { name: "System", email: "" };
    const reg = registrations.find(r => r.user_id === userId);
    return {
      name: reg?.full_name || userId.slice(0, 8),
      email: reg?.email || "",
    };
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      login: "bg-blue-100 text-blue-800",
      logout: "bg-gray-100 text-gray-800",
      create: "bg-green-100 text-green-800",
      update: "bg-yellow-100 text-yellow-800",
      delete: "bg-red-100 text-red-800",
      reset_admin_password: "bg-orange-100 text-orange-800",
      approve: "bg-green-100 text-green-800",
      reject: "bg-red-100 text-red-800",
      suspend: "bg-red-100 text-red-800",
    };
    const colorClass = colors[action.toLowerCase()] || "bg-gray-100 text-gray-800";
    return <Badge className={colorClass}>{action.replace(/_/g, " ")}</Badge>;
  };

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  const filteredLogs = logs.filter(log => {
    const info = getAdminInfo(log.user_id);
    const matchesSearch = 
      info.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      info.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(log.created_at) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDate = matchesDate && new Date(log.created_at) <= new Date(dateTo + "T23:59:59");
    }
    
    return matchesSearch && matchesAction && matchesDate;
  });

  const exportLogs = () => {
    const csvContent = [
      ["Date", "Time", "User", "Email", "Action", "Resource Type", "Resource ID", "IP Address"].join(","),
      ...filteredLogs.map(log => {
        const info = getAdminInfo(log.user_id);
        return [
          format(new Date(log.created_at), "yyyy-MM-dd"),
          format(new Date(log.created_at), "HH:mm:ss"),
          `"${info.name}"`,
          info.email,
          log.action,
          log.resource_type || "",
          log.resource_id || "",
          log.ip_address || "",
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Logs
            </CardTitle>
            <CardDescription>
              View all system activity and audit logs
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchLogs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportLogs}>
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
              placeholder="Search by user, action, or resource..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map(action => (
                <SelectItem key={action} value={action}>
                  {action.replace(/_/g, " ")}
                </SelectItem>
              ))}
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

        <div className="text-sm text-muted-foreground">
          Showing {filteredLogs.length} of {logs.length} logs
        </div>

        {/* Table */}
        <div className="max-h-[600px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => {
                const info = getAdminInfo(log.user_id);
                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{format(new Date(log.created_at), "dd MMM yyyy")}</p>
                        <p className="text-sm text-muted-foreground">{format(new Date(log.created_at), "HH:mm:ss")}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{info.name}</p>
                        {info.email && <p className="text-xs text-muted-foreground">{info.email}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      {log.resource_type && (
                        <div>
                          <p className="capitalize">{log.resource_type}</p>
                          {log.resource_id && (
                            <code className="text-xs bg-muted px-1 rounded">{log.resource_id.slice(0, 8)}</code>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.details ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded block max-w-[200px] truncate">
                          {JSON.stringify(log.details)}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">{log.ip_address || "-"}</code>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No activity logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
