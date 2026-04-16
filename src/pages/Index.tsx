import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "./Dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, LogIn, Pill } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) {
        setCheckingRole(false);
        return;
      }

      // Check if user is super admin
      const { data: isSuperAdmin } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'super_admin'
      });

      if (isSuperAdmin) {
        navigate('/super-admin', { replace: true });
        return;
      }
      
      setCheckingRole(false);
    };

    if (!loading) {
      checkSuperAdmin();
    }
  }, [user, loading, navigate]);

  // Show loading while checking role
  if (loading || (user && checkingRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show login options if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-primary rounded-xl">
                <Pill className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-3">
              Medical Shop Management
            </h1>
            <p className="text-muted-foreground text-lg">
              Complete Medical Shop Management System
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Admin Login Card */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center">
                <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Admin Portal</CardTitle>
                <CardDescription>
                  For system administrators to manage the entire shop, create manager accounts, and configure settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    Create and manage manager accounts
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    Configure shop settings
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    View security dashboard
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    Full system access
                  </li>
                </ul>
                <Link to="/admin-auth" className="block">
                  <Button className="w-full gap-2" size="lg">
                    <LogIn className="w-4 h-4" />
                    Admin Login / Register
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Manager Login Card */}
            <Card className="border-2 hover:border-secondary/50 transition-colors">
              <CardHeader className="text-center">
                <div className="mx-auto p-4 bg-secondary/10 rounded-full w-fit mb-4">
                  <Users className="w-8 h-8 text-secondary-foreground" />
                </div>
                <CardTitle className="text-2xl">Manager Portal</CardTitle>
                <CardDescription>
                  For shop managers to handle daily operations, sales, inventory, and customer management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                    Process sales and billing
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                    Manage inventory stock
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                    Handle patient records
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                    Generate invoices
                  </li>
                </ul>
                <Link to="/auth" className="block">
                  <Button variant="secondary" className="w-full gap-2" size="lg">
                    <LogIn className="w-4 h-4" />
                    Manager Login
                  </Button>
                </Link>
                <p className="text-xs text-center text-muted-foreground">
                  Manager accounts are created by Admin
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Medical Shop Management. All rights reserved.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show dashboard if authenticated (regular admin/manager)
  return (
    <MainLayout>
      <Dashboard />
    </MainLayout>
  );
};

export default Index;