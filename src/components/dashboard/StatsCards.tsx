import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  AlertTriangle, 
  Clock,
  ShoppingBag,
  Wallet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardStats } from "@/hooks/useDashboardStats";

interface StatsCardsProps {
  stats: DashboardStats;
}

const statCards = [
  {
    title: "Today's Sales",
    key: 'todaySales' as keyof DashboardStats,
    icon: ShoppingBag,
    format: 'currency',
    gradient: 'gradient-primary',
    textColor: 'text-primary-foreground',
  },
  {
    title: "Weekly Sales",
    key: 'weekSales' as keyof DashboardStats,
    icon: TrendingUp,
    format: 'currency',
    gradient: 'gradient-success',
    textColor: 'text-success-foreground',
  },
  {
    title: "Total Patients",
    key: 'totalPatients' as keyof DashboardStats,
    icon: Users,
    format: 'number',
    gradient: 'gradient-medical',
    textColor: 'text-white',
  },
  {
    title: "Cash in Hand",
    key: 'cashInHand' as keyof DashboardStats,
    icon: Wallet,
    format: 'currency',
    gradient: 'bg-success',
    textColor: 'text-success-foreground',
  },
];

const alertCards = [
  {
    title: "Low Stock Items",
    key: 'lowStockItems' as keyof DashboardStats,
    icon: Package,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/20',
  },
  {
    title: "Expiring Soon",
    key: 'expiringItems' as keyof DashboardStats,
    icon: Clock,
    color: 'text-danger',
    bgColor: 'bg-danger/10',
    borderColor: 'border-danger/20',
  },
  {
    title: "Pending Orders",
    key: 'pendingOrders' as keyof DashboardStats,
    icon: AlertTriangle,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/20',
  },
];

export function StatsCards({ stats }: StatsCardsProps) {
  const formatValue = (value: number, format: string) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
      }).format(value);
    }
    return value.toLocaleString('en-IN');
  };

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const value = stats[card.key] as number;
          const Icon = card.icon;
          
          return (
            <Card key={card.title} className="relative overflow-hidden border-0 shadow-card transition-smooth hover:shadow-medical animate-fade-in">
              <div className={`absolute inset-0 ${card.gradient}`} />
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${card.textColor} opacity-90`}>
                      {card.title}
                    </p>
                    <p className={`text-2xl font-bold ${card.textColor} mt-2`}>
                      {formatValue(value, card.format)}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg bg-white/20 ${card.textColor}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {alertCards.map((card) => {
          const value = stats[card.key] as number;
          const Icon = card.icon;
          
          return (
            <Card key={card.title} className={`${card.bgColor} ${card.borderColor} border transition-smooth hover:shadow-card animate-fade-in`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </p>
                    <p className={`text-2xl font-bold ${card.color} mt-2`}>
                      {value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${card.bgColor} ${card.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                {value > 0 && (
                  <Badge variant="outline" className={`mt-2 ${card.color} border-current`}>
                    Needs Attention
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}