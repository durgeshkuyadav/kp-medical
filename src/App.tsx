import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import Purchases from "./pages/Purchases";
import Patients from "./pages/Patients";
import Invoices from "./pages/Invoices";
import Reports from "./pages/Reports";
import CashManagement from "./pages/CashManagement";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Suppliers from "./pages/Suppliers";
import InventoryReports from "./pages/InventoryReports";
import BatchTracking from "./pages/BatchTracking";
import SecurityDashboard from "./pages/SecurityDashboard";
import AdminAuth from "./pages/AdminAuth";
import Auth from "./pages/Auth";
import Subscription from "./pages/Subscription";
import SuperAdmin from "./pages/SuperAdmin";
import SuperAdminAuth from "./pages/SuperAdminAuth";
import AdminOnboarding from "./pages/AdminOnboarding";
import StockMovements from "./pages/StockMovements";
import Profile from "./pages/Profile";
import ManagerManagementPage from "./pages/ManagerManagementPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/admin-auth" element={<AdminAuth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/onboarding" element={<AdminOnboarding />} />
            <Route path="/super-admin" element={<SuperAdmin />} />
            <Route path="/super-admin-auth" element={<SuperAdminAuth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Index />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/inventory-reports" element={<InventoryReports />} />
            <Route path="/batch-tracking" element={<BatchTracking />} />
            <Route path="/cash" element={<CashManagement />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/security" element={<SecurityDashboard />} />
            <Route path="/stock-movements" element={<StockMovements />} />
            <Route path="/manager-management" element={<ManagerManagementPage />} />
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
