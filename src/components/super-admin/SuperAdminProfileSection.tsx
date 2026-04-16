import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Shield, Save } from "lucide-react";

interface AdminRegistration {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  shop_name: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  created_at: string;
}

interface Subscription {
  id: string;
  admin_id: string;
  is_active: boolean;
  payment_method: string | null;
  plan: "monthly" | "yearly";
}

export interface SuperAdminProfileSectionProps {
  registrations: AdminRegistration[];
  subscriptions: Subscription[];
}

export const SuperAdminProfileSection = ({ registrations, subscriptions }: SuperAdminProfileSectionProps) => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  const adminRows = useMemo(() => {
    return registrations.map((reg) => {
      const sub = subscriptions.find((s) => s.admin_id === reg.user_id);
      const paid = Boolean(sub?.payment_method && sub?.is_active);
      return {
        reg,
        sub,
        paid,
      };
    });
  }, [registrations, subscriptions]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        setEmail(user.email || "");

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .eq("user_id", user.id)
          .maybeSingle();

        setFullName(profile?.full_name || "");
        setPhone(profile?.phone || "");
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message || "Failed to load profile",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [toast]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: fullName || null,
            phone: phone || null,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert({
          user_id: user.id,
          full_name: fullName || null,
          phone: phone || null,
        });

        if (error) throw error;
      }

      toast({
        title: "Saved",
        description: "Super Admin profile updated.",
      });
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message || "Could not save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Super Admin Profile
          </CardTitle>
          <CardDescription>Update your profile details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value="super_admin" disabled />
            </div>
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registered Admins</CardTitle>
          <CardDescription>All registered admins/shops overview.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminRows.map(({ reg, sub, paid }) => (
                <TableRow key={reg.id}>
                  <TableCell className="font-medium">{reg.full_name}</TableCell>
                  <TableCell>{reg.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {reg.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {paid ? (
                      <Badge className="bg-green-100 text-green-800">Paid ({sub?.payment_method})</Badge>
                    ) : reg.status === "approved" ? (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(reg.created_at), "dd MMM yyyy")}</TableCell>
                </TableRow>
              ))}
              {adminRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No admins found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System-wide settings</CardTitle>
          <CardDescription>
            Tell me which settings you want here (subscription pricing, grace period, support email, etc.) and I’ll make them editable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No system settings configured yet.</p>
        </CardContent>
      </Card>
    </div>
  );
};
