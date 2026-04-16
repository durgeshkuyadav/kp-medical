import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { useSales } from "@/hooks/useSales";
import { useMedicines } from "@/hooks/useMedicines";
import { usePatients } from "@/hooks/usePatients";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { TrendingUp, Package, Users, IndianRupee, AlertTriangle, XCircle } from "lucide-react";
import { ReactNode } from "react";

// --- New Reusable StatCard Component ---
interface StatCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  iconBgClass?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, iconBgClass = "bg-primary/10" }) => (
  <Card className="p-6">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-lg ${iconBgClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  </Card>
);
// --- End Reusable StatCard Component ---


const Reports = () => {
  const { sales } = useSales();
  const { medicines } = useMedicines();
  const { patients } = usePatients();

  const now = new Date();
  const currentMonth = format(now, "MMMM yyyy");
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  const monthlySales = sales.filter(s => {
    const date = new Date(s.created_at);
    return date >= monthStart && date <= monthEnd;
  });

  const yearlySales = sales.filter(s => {
    const date = new Date(s.created_at);
    return date >= yearStart && date <= yearEnd;
  });

  const monthlyRevenue = monthlySales.reduce((sum, s) => sum + s.total, 0);
  const yearlyRevenue = yearlySales.reduce((sum, s) => sum + s.total, 0);
  const totalInventoryValue = medicines.reduce((sum, m) => sum + (m.stock * Number(m.price)), 0);

  // New Low Stock and Out of Stock calculations
  const lowStockItems = medicines.filter(m => m.stock > 0 && m.stock <= m.min_stock).length;
  const outOfStockItems = medicines.filter(m => m.stock === 0).length;
  const totalStockCount = medicines.reduce((sum, m) => sum + m.stock, 0);


  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            View detailed analytics and business insights
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          
          {/* 1. Monthly Revenue with Date Context */}
          <StatCard
            icon={<IndianRupee className="h-6 w-6 text-primary" />}
            title={`${format(now, "MMMM")} Revenue`}
            value={`₹${monthlyRevenue.toFixed(2)}`}
          />

          {/* 2. Yearly Revenue */}
          <StatCard
            icon={<TrendingUp className="h-6 w-6 text-primary" />}
            title={`${format(now, "yyyy")} Revenue`}
            value={`₹${yearlyRevenue.toFixed(2)}`}
          />

          {/* 3. Inventory Value */}
          <StatCard
            icon={<Package className="h-6 w-6 text-primary" />}
            title="Total Inventory Value"
            value={`₹${totalInventoryValue.toFixed(2)}`}
          />

          {/* 4. Total Patients */}
          <StatCard
            icon={<Users className="h-6 w-6 text-primary" />}
            title="Total Patients"
            value={patients.length}
          />
        </div>

        {/* --- Sales Summaries --- */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Monthly Sales Summary for {currentMonth}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">{monthlySales.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Sale Value</p>
                <p className="text-2xl font-bold">
                  ₹{monthlySales.length > 0 ? (monthlyRevenue / monthlySales.length).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Yearly Sales Summary for {format(now, "yyyy")}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">{yearlySales.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Sale Value</p>
                <p className="text-2xl font-bold">
                  ₹{yearlySales.length > 0 ? (yearlyRevenue / yearlySales.length).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* --- Inventory Summary with Critical Stock --- */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Inventory Summary</h2>
          <div className="grid grid-cols-4 gap-4">
            
            {/* 1. Total Medicines */}
            <StatCard
                icon={<Package className="h-6 w-6 text-primary" />}
                title="Total Medicines"
                value={medicines.length}
            />

            {/* 2. Total Stock Units */}
            <StatCard
                icon={<div className="font-bold text-primary text-xl">#</div>}
                title="Total Stock Units"
                value={totalStockCount}
            />
            
            {/* 3. Low Stock Items (Warning) */}
            <StatCard
                icon={<AlertTriangle className="h-6 w-6 text-amber-500" />}
                title="Low Stock Items"
                value={lowStockItems}
                iconBgClass="bg-amber-500/10"
            />
            
            {/* 4. Out of Stock Items (Critical) */}
            <StatCard
                icon={<XCircle className="h-6 w-6 text-red-500" />}
                title="Out of Stock Items"
                value={outOfStockItems}
                iconBgClass="bg-red-500/10"
            />
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Reports;