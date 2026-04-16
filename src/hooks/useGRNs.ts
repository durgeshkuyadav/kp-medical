import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GRN {
  id: string;
  grn_number: string;
  supplier_id: string;
  supplier_name: string;
  total: number;
  received_date: string;
  notes: string | null;
  created_at: string;
}

export const useGRNs = () => {
  const [grns, setGrns] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchGRNs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('goods_received_notes')
        .select(`
          *,
          suppliers (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedGRNs = (data || []).map((grn: any) => ({
        ...grn,
        supplier_name: grn.suppliers?.name || 'Unknown Supplier'
      }));

      setGrns(formattedGRNs);
    } catch (error) {
      console.error('Error fetching GRNs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch GRNs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGRNs();
  }, []);

  return { grns, loading, refetch: fetchGRNs };
};
