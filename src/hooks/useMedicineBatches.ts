import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MedicineBatch {
  id: string;
  medicine_id: string;
  batch_number: string;
  expiry_date: string;
  stock: number;
  purchase_price: number;
  selling_price: number;
  created_at: string;
}

export interface BatchWithMedicine {
  id: string;
  medicine_id: string;
  medicine_name: string;
  batch_number: string;
  expiry_date: string;
  stock: number;
  days_to_expiry: number;
}

export const useMedicineBatches = (medicineId?: string) => {
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBatches = async () => {
    try {
      setLoading(true);
      // Use medicines table since we don't have a separate batches table
      let query = supabase
        .from('medicines')
        .select('id, name, batch_number, expiry_date, stock, price, mrp')
        .order('expiry_date', { ascending: true });

      if (medicineId) {
        query = query.eq('id', medicineId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform to batch format
      const batchData: MedicineBatch[] = (data || []).map((med: any) => ({
        id: med.id,
        medicine_id: med.id,
        batch_number: med.batch_number,
        expiry_date: med.expiry_date,
        stock: med.stock,
        purchase_price: med.price,
        selling_price: med.mrp,
        created_at: new Date().toISOString()
      }));
      
      setBatches(batchData);
    } catch (error) {
      console.error('Error fetching medicine batches:', error);
      toast({
        title: "Error",
        description: "Failed to fetch medicine batches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiringBatches = async (monthsAhead: number = 3): Promise<BatchWithMedicine[]> => {
    try {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + monthsAhead);
      
      const { data, error } = await supabase
        .from('medicines')
        .select('id, name, batch_number, expiry_date, stock')
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
        .order('expiry_date');

      if (error) throw error;

      const now = new Date();
      return (data || []).map((med: any) => {
        const expiryDate = new Date(med.expiry_date);
        const daysToExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: med.id,
          medicine_id: med.id,
          medicine_name: med.name,
          batch_number: med.batch_number,
          expiry_date: med.expiry_date,
          stock: med.stock,
          days_to_expiry: daysToExpiry
        };
      });
    } catch (error) {
      console.error('Error fetching expiring batches:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expiring batches",
        variant: "destructive",
      });
      return [];
    }
  };

  const updateBatchStock = async (batchId: string, newStock: number) => {
    try {
      const { error } = await supabase
        .from('medicines')
        .update({ stock: newStock })
        .eq('id', batchId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Batch stock updated successfully",
      });
      fetchBatches();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update batch stock",
        variant: "destructive",
      });
    }
  };

  const deleteBatch = async (batchId: string) => {
    try {
      const { error } = await supabase
        .from('medicines')
        .delete()
        .eq('id', batchId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Batch deleted successfully",
      });
      fetchBatches();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete batch",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [medicineId]);

  return { 
    batches, 
    loading, 
    refetch: fetchBatches,
    fetchExpiringBatches,
    updateBatchStock,
    deleteBatch
  };
};
