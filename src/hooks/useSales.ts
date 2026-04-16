import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Sale {
  id: string;
  invoice_number: string | null;
  patient_id: string | null;
  patient_name: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  total: number;
  discount: number;
  payment_method: 'cash' | 'card' | 'upi';
  status: string;
  created_at: string;
}

export const useSales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSales = async () => {
    try {
      setLoading(true);
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            medicine_name,
            quantity,
            price,
            total
          )
        `)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      const formattedSales: Sale[] = (salesData || []).map((sale: any) => ({
        id: sale.id,
        invoice_number: sale.invoice_number,
        patient_id: sale.patient_id,
        patient_name: sale.patient_name,
        items: (sale.sale_items || []).map((item: any) => ({
          id: item.id,
          name: item.medicine_name,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        })),
        total: sale.total,
        discount: sale.discount || 0,
        payment_method: sale.payment_method as 'cash' | 'card' | 'upi',
        status: sale.status,
        created_at: sale.created_at
      }));

      setSales(formattedSales);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sales data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  return { sales, loading, refetch: fetchSales };
};
