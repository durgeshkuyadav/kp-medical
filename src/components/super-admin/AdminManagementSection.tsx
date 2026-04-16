import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  Users, Shield, Key, Ban, CheckCircle, AlertTriangle, 
  RefreshCw, Search, Eye, EyeOff
} from "lucide-react";

interface AdminRegistration {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  shop_name: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  created_at: string;
  approved_at: string | null;
}

interface Subscription {
  id: string;
  admin_id: string;
  is_active: boolean;
  payment_method: string | null;
  plan: "monthly" | "yearly";
  current_period_end: string;
}

interface AdminManagementSectionProps {
  registrations: AdminRegistration[];
  subscriptions: Subscription[];
  onRefresh: () => void;
}

export const AdminManagementSection = ({ 
  registrations, 
  subscriptions, 
  onRefresh 
}: AdminManagementSectionProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Password reset dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminRegistration | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  const approvedAdmins = registrations.filter(r => 
    r.status === "approved" || r.status === "suspended"
  );

  const filteredAdmins = approvedAdmins.filter(admin =>
    admin.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.shop_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSuspend = async (admin: AdminRegistration) => {
    setProcessing(admin.id);
    try {
      const { error } = await supabase
        .from("admin_registrations")
        .update({ status: "suspended" })
        .eq("id", admin.id);

      if (error) throw error;

      // Deactivate subscription
      await supabase
        .from("subscriptions")
        .update({ is_active: false })
        .eq("admin_id", admin.user_id);

      toast({
        title: "Admin Suspended",
        description: `${admin.full_name} has been suspended.`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to suspend admin",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReactivate = async (admin: AdminRegistration) => {
    setProcessing(admin.id);
    try {
      const { error } = await supabase
        .from("admin_registrations")
        .update({ status: "approved" })
        .eq("id", admin.id);

      if (error) throw error;

      // Reactivate subscription if exists and not expired
      const sub = subscriptions.find(s => s.admin_id === admin.user_id);
      if (sub && new Date(sub.current_period_end) > new Date()) {
        await supabase
          .from("subscriptions")
          .update({ is_active: true })
          .eq("admin_id", admin.user_id);
      }

      toast({
        title: "Admin Reactivated",
        description: `${admin.full_name} has been reactivated.`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate admin",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const openResetDialog = (admin: AdminRegistration) => {
    setSelectedAdmin(admin);
    setNewPassword("");
    setShowPassword(false);
    setResetDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedAdmin || !newPassword) return;
    
    if (newPassword.length < 8) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    setResetting(true);
    try {
      const { error } = await supabase.functions.invoke("reset-admin-password", {
        body: { adminId: selectedAdmin.user_id, newPassword },
      });

      if (error) throw error;

      toast({
        title: "Password Reset",
        description: `Password has been reset for ${selectedAdmin.full_name}.`,
      });
      setResetDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  const getStatusBadge = (status: string, sub: Subscription | undefined) => {
    if (status === "suspended") {
      return <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Suspended</Badge>;
    }
    if (sub?.is_active) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
    }
    return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Inactive</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Admin Management
              </CardTitle>
              <CardDescription>
                Manage admin accounts, suspend/reactivate, and reset passwords
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or shop..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdmins.map((admin) => {
                const sub = subscriptions.find(s => s.admin_id === admin.user_id);
                return (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{admin.full_name}</p>
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{admin.shop_name || "-"}</TableCell>
                    <TableCell>{getStatusBadge(admin.status, sub)}</TableCell>
                    <TableCell>
                      {sub ? (
                        <div>
                          <Badge variant="outline" className="capitalize">{sub.plan}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Expires: {format(new Date(sub.current_period_end), "dd MMM yyyy")}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No subscription</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {admin.approved_at 
                        ? format(new Date(admin.approved_at), "dd MMM yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openResetDialog(admin)}
                          disabled={processing === admin.id}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        {admin.status === "approved" ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleSuspend(admin)}
                            disabled={processing === admin.id}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleReactivate(admin)}
                            disabled={processing === admin.id}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredAdmins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No admins found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Password Reset Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Reset Admin Password
            </DialogTitle>
            <DialogDescription>
              Reset the password for {selectedAdmin?.full_name} ({selectedAdmin?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={resetting || !newPassword}>
              {resetting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
