import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getAdminId } from '@/hooks/useAdminId';

export interface Medicine {
  id: string;
  name: string;
  generic_name: string | null;
  manufacturer: string | null;
  category: string | null;
  stock: number;
  min_stock: number;
  price: number;
  mrp: number;
  expiry_date: string;
  batch_number: string;
  hsn_code: string | null;
  gst_rate: number;
  supplier_id: string | null;
}

export const useMedicines = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('medicines')
        .select('*')
        .order('name');

      if (error) throw error;
      setMedicines((data || []) as Medicine[]);
    } catch (error) {
      console.error('Error fetching medicines:', error);
      toast({
        title: "Error",
        description: "Failed to fetch medicines data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLowStockMedicines = () => {
    return medicines.filter(medicine => medicine.stock <= medicine.min_stock);
  };

  const getExpiringMedicines = () => {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    
    return medicines.filter(medicine => {
      const expiryDate = new Date(medicine.expiry_date);
      return expiryDate <= threeMonthsFromNow;
    });
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const addMedicine = async (medicineData: Omit<Medicine, 'id'>) => {
    try {
      const adminId = await getAdminId();
      const { data, error } = await supabase
        .from('medicines')
        .insert([{ ...medicineData, admin_id: adminId } as any])
        .select()
        .single();

      if (error) throw error;

      setMedicines(prev => [...prev, data as Medicine]);
      
      toast({
        title: "Success",
        description: "Medicine added successfully",
      });
    } catch (error) {
      console.error('Error adding medicine:', error);
      toast({
        title: "Error",
        description: "Failed to add medicine",
        variant: "destructive",
      });
      throw error;
    }
  };

  return { 
    medicines, 
    loading, 
    refetch: fetchMedicines,
    lowStockMedicines: getLowStockMedicines(),
    expiringMedicines: getExpiringMedicines(),
    addMedicine
  };
};
