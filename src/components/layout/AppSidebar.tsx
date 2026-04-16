import {
  Activity,
  BarChart3,
  Bell,
  FileText,
  Home,
  Package,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  PackagePlus,
  TrendingUp,
  Building2,
  Layers,
  Shield,
  History,
  UserCog,
  ChevronDown,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useShopSettings } from "@/hooks/useShopSettings";
import { useMedicines } from "@/hooks/useMedicines";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

const dailyOps = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Sales", url: "/sales", icon: BarChart3 },
  { title: "Invoices", url: "/invoices", icon: FileText },
  { title: "Patients", url: "/patients", icon: Users },
];

const inventoryItems = [
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Batch Tracking", url: "/batch-tracking", icon: Layers },
  { title: "Stock Movements", url: "/stock-movements", icon: History },
  { title: "Inventory Reports", url: "/inventory-reports", icon: TrendingUp },
];

const procurementItems = [
  { title: "Purchases", url: "/purchases", icon: PackagePlus },
  { title: "Suppliers", url: "/suppliers", icon: Building2 },
];

const managementItems = [
  { title: "Cash Management", url: "/cash", icon: Wallet },
  { title: "Reports", url: "/reports", icon: Activity },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Security", url: "/security", icon: Shield },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { settings } = useShopSettings();
  const { lowStockMedicines, expiringMedicines } = useMedicines();
  const currentPath = location.pathname;

  const alertCount = lowStockMedicines.length + expiringMedicines.length;

  const shopName = settings?.shop_name || "Medical Shop";
  const logoUrl = settings?.logo_url;
  const initials = shopName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground shadow-medical font-medium" 
      : "hover:bg-accent hover:text-accent-foreground transition-smooth";

  const isInGroup = (items: { url: string }[]) =>
    items.some((i) => currentPath === i.url);

  const adminItems = isAdmin
    ? [{ title: "Manager Management", url: "/manager-management", icon: UserCog }]
    : [];

  const renderMenuItems = (items: { title: string; url: string; icon: any }[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild tooltip={item.title}>
            <NavLink to={item.url} className={getNavCls}>
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.title}</span>
              {item.title === "Alerts" && alertCount > 0 && state === "expanded" && (
                <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px]">
                  {alertCount}
                </Badge>
              )}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  const renderGroup = (label: string, items: { title: string; url: string; icon: any }[]) => (
    <Collapsible defaultOpen={isInGroup(items)} className="group/collapsible">
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2 cursor-pointer flex items-center justify-between hover:text-foreground">
            {state === "expanded" ? label : null}
            {state === "expanded" && (
              <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-180" />
            )}
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            {renderMenuItems(items)}
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-gradient-to-b from-card via-card to-accent/40 dark:from-[hsl(222,22%,12%)] dark:via-[hsl(222,20%,10%)] dark:to-[hsl(200,30%,12%)] border-r">
        {/* Shop branding */}
        <div className="px-3 py-4 border-b border-border">
          <div className="flex items-center gap-2 overflow-hidden">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={shopName} 
                className="w-8 h-8 rounded-lg object-contain bg-muted p-0.5 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg gradient-medical flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-xs">{initials}</span>
              </div>
            )}
            {state === "expanded" && (
              <span className="font-semibold text-sm text-foreground truncate">{shopName}</span>
            )}
          </div>
        </div>

        {renderGroup("Daily Operations", dailyOps)}
        {renderGroup("Inventory & Stock", inventoryItems)}
        {renderGroup("Procurement", procurementItems)}

        {adminItems.length > 0 && renderGroup("Admin", adminItems)}

        {renderGroup("Management", managementItems)}
      </SidebarContent>
    </Sidebar>
  );
}
