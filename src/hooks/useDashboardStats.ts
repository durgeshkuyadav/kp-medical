import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DashboardStats {
  todaySales: number;
  weekSales: number;
  monthSales: number;
  totalPatients: number;
  lowStockItems: number;
  expiringItems: number;
  pendingOrders: number;
  cashInHand: number;
}

export interface SalesChartData {
  day: string;
  sales: number;
  patients: number;
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    weekSales: 0,
    monthSales: 0,
    totalPatients: 0,
    lowStockItems: 0,
    expiringItems: 0,
    pendingOrders: 0,
    cashInHand: 0,
  });
  const [chartData, setChartData] = useState<SalesChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const calculateStats = async () => {
    try {
      setLoading(true);
      
      // Get today's date bounds
      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      
      // Get week start (7 days ago)
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      
      // Get month start
      const monthStart = new Date();
      monthStart.setDate(1);

      // Fetch today's sales
      const { data: todaySalesData } = await supabase
        .from('sales')
        .select('total')
        .eq('status', 'completed')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      // Fetch week's sales
      const { data: weekSalesData } = await supabase
        .from('sales')
        .select('total')
        .eq('status', 'completed')
        .gte('created_at', weekStart.toISOString());

      // Fetch month's sales
      const { data: monthSalesData } = await supabase
        .from('sales')
        .select('total')
        .eq('status', 'completed')
        .gte('created_at', monthStart.toISOString());

      // Fetch total patients
      const { count: totalPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // Fetch low stock items
      const { data: medicines } = await supabase
        .from('medicines')
        .select('stock, min_stock, expiry_date');

      const lowStockItems = medicines?.filter(m => m.stock <= m.min_stock).length || 0;
      
      // Fetch expiring items (within 3 months)
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      const expiringItems = medicines?.filter(m => new Date(m.expiry_date) <= threeMonthsFromNow).length || 0;

      // Fetch pending orders
      const { count: pendingOrders } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Calculate totals
      const todaySales = todaySalesData?.reduce((sum, sale) => sum + parseFloat(sale.total.toString()), 0) || 0;
      const weekSales = weekSalesData?.reduce((sum, sale) => sum + parseFloat(sale.total.toString()), 0) || 0;
      const monthSales = monthSalesData?.reduce((sum, sale) => sum + parseFloat(sale.total.toString()), 0) || 0;

      // For cash in hand, we'll calculate from completed cash sales today
      const { data: cashSales } = await supabase
        .from('sales')
        .select('total')
        .eq('status', 'completed')
        .eq('payment_method', 'cash')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      const cashInHand = cashSales?.reduce((sum, sale) => sum + parseFloat(sale.total.toString()), 0) || 0;

      setStats({
        todaySales,
        weekSales,
        monthSales,
        totalPatients: totalPatients || 0,
        lowStockItems,
        expiringItems,
        pendingOrders: pendingOrders || 0,
        cashInHand,
      });

      // Generate chart data for last 7 days
      const chartDataPromises = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0)).toISOString();
        const dayEnd = new Date(date.setHours(23, 59, 59, 999)).toISOString();
        
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        chartDataPromises.push(
          supabase
            .from('sales')
            .select('total, patient_id')
            .eq('status', 'completed')
            .gte('created_at', dayStart)
            .lte('created_at', dayEnd)
            .then(({ data }) => ({
              day: dayName,
              sales: data?.reduce((sum, sale) => sum + parseFloat(sale.total.toString()), 0) || 0,
              patients: new Set(data?.map(sale => sale.patient_id)).size || 0
            }))
        );
      }

      const chartResults = await Promise.all(chartDataPromises);
      setChartData(chartResults);

    } catch (error) {
      console.error('Error calculating dashboard stats:', error);
      toast({
        title: "Error",
        description: "Failed to calculate dashboard statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateStats();
  }, []);

  return { stats, chartData, loading, refetch: calculateStats };
};