import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  total: number;
  status: string;
  order_date: string;
  expected_delivery_date: string | null;
  notes: string | null;
  created_at: string;
}

export const usePurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPOs = (data || []).map((po: any) => ({
        ...po,
        supplier_name: po.suppliers?.name || 'Unknown Supplier'
      }));

      setPurchaseOrders(formattedPOs);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch purchase orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  return { purchaseOrders, loading, refetch: fetchPurchaseOrders };
};
