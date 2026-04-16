import { useState, useMemo } from "react";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { RecentPatients } from "@/components/dashboard/RecentPatients";
import { DashboardPDFDownload } from "@/components/dashboard/DashboardPDF";
import { MedicineSearch } from "@/components/medicine/MedicineSearch";
import { NewSaleForm } from "@/components/sales/NewSaleForm";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { usePatients } from "@/hooks/usePatients";
import { useAuth } from "@/hooks/useAuth";
import { useSales } from "@/hooks/useSales";
import { useShopSettings } from "@/hooks/useShopSettings";
import { useMedicines } from "@/hooks/useMedicines";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search, ScanBarcode, Package, FlaskConical } from "lucide-react";

export default function Dashboard() {
  const { stats, chartData, loading: statsLoading } = useDashboardStats();
  const { patients, loading: patientsLoading } = usePatients();
  const { sales, refetch: refetchSales } = useSales();
  const { settings } = useShopSettings();
  const { isAdmin } = useAuth();
  const { medicines } = useMedicines();
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Quick search results for dashboard
  const quickSearchResults = useMemo(() => {
    if (!quickSearch.trim()) return [];
    const term = quickSearch.toLowerCase();
    const results = medicines.filter(m =>
      m.name.toLowerCase().includes(term) ||
      (m.generic_name || '').toLowerCase().includes(term) ||
      ((m as any).barcode || '').toLowerCase().includes(term)
    );
    // Deduplicate by name, pick highest stock
    const seen = new Map();
    results.forEach(m => {
      const existing = seen.get(m.name);
      if (!existing || m.stock > existing.stock) seen.set(m.name, m);
    });
    return Array.from(seen.values()).slice(0, 5);
  }, [medicines, quickSearch]);

  const getTotalStockByName = (name: string) =>
    medicines.filter(m => m.name === name).reduce((s, m) => s + m.stock, 0);

  const getAlternatives = (genericName: string | null, excludeName: string) => {
    if (!genericName) return [];
    return medicines.filter(m =>
      m.generic_name?.toLowerCase() === genericName.toLowerCase() && m.name !== excludeName
    );
  };

  // Prepare data for PDF
  const pdfStats = {
    todaySales: sales.filter(s => {
      const today = new Date().toISOString().split('T')[0];
      return s.created_at.startsWith(today);
    }).length,
    todayRevenue: stats.todaySales,
    lowStockItems: stats.lowStockItems,
    expiringItems: stats.expiringItems,
  };

  const recentSalesForPDF = sales.slice(0, 10).map(sale => ({
    invoice_number: sale.invoice_number || '',
    patient_name: sale.patient_name,
    total: sale.total,
    created_at: sale.created_at,
  }));


  const isLoading = statsLoading || patientsLoading;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-96 mt-2" />
          </div>
          <Skeleton className="h-12 w-48" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to {settings?.shop_name || 'Your Medical Shop'} Management System
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DashboardPDFDownload 
            stats={pdfStats} 
            recentSales={recentSalesForPDF} 
            shopName={settings?.shop_name || undefined}
          />
          <Button onClick={() => setIsNewSaleOpen(true)} className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            New Sale
          </Button>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Live data from database
            </p>
          </div>
        </div>
      </div>

      {/* Quick Medicine Search Bar */}
      <Card className="relative">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Quick search: medicine name, generic name, or barcode..."
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsScannerOpen(true)}
              title="Scan barcode"
            >
              <ScanBarcode className="h-5 w-5" />
            </Button>
          </div>

          {/* Quick Search Results */}
          {quickSearchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {quickSearchResults.map((med) => {
                const totalStock = getTotalStockByName(med.name);
                const alts = getAlternatives(med.generic_name, med.name);
                const isLow = totalStock <= (med.min_stock || 10);
                return (
                  <div key={med.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Package className="w-4 h-4 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{med.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {med.generic_name || 'N/A'} · {med.manufacturer || 'N/A'} · ₹{med.mrp}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {alts.length > 0 && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <FlaskConical className="w-3 h-3" />
                          {alts.length} alt{alts.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      <Badge variant={isLow ? 'destructive' : 'secondary'} className={!isLow ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}>
                        Stock: {totalStock}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {quickSearch.trim() && quickSearchResults.length === 0 && (
            <p className="text-sm text-muted-foreground mt-3 text-center">No medicines found for "{quickSearch}"</p>
          )}
        </CardContent>
      </Card>

      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(barcode) => setQuickSearch(barcode)}
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="medicines">Medicines</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          {/* Onboarding Checklist */}
          <OnboardingChecklist
            hasShopSettings={!!settings?.shop_name}
            hasMedicines={medicines.length > 0}
            hasPatients={patients.length > 0}
            hasSales={sales.length > 0}
            hasUpiId={!!settings?.upi_id}
          />

          {/* Stats Cards */}
          <StatsCards stats={stats} />

          {/* Charts and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SalesChart weeklyData={chartData} />
            <RecentPatients patients={patients.slice(0, 4)} />
          </div>

          {/* Database Status */}
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">
              {settings?.shop_name || 'Medical Shop'} Management System - Connected to Database
              <br />
              Real-time data synchronization active
            </p>
          </div>
        </TabsContent>

        <TabsContent value="medicines">
          <MedicineSearch />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin">
            <AdminPanel />
          </TabsContent>
        )}
      </Tabs>

      <NewSaleForm
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        onSuccess={() => {
          refetchSales();
          setIsNewSaleOpen(false);
        }}
      />
    </div>
  );
}