import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserProfile } from "@/components/layout/UserProfile";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useShopSettings } from "@/hooks/useShopSettings";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { settings } = useShopSettings();

  const shopName = settings?.shop_name || "Medical Shop";
  const logoUrl = settings?.logo_url;
  const initials = shopName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 flex items-center justify-between px-6 border-b bg-card shadow-card">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={shopName} 
                    className="w-9 h-9 rounded-lg object-contain bg-muted p-0.5"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg gradient-medical flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{initials}</span>
                  </div>
                )}
                <div>
                  <h1 className="font-bold text-lg text-foreground">{shopName}</h1>
                  <p className="text-xs text-muted-foreground">Medical Shop Management</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <UserProfile />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
