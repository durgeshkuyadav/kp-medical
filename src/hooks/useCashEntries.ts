import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CashEntry {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string | null;
  category: string | null;
  created_at: string;
}


export const useCashEntries = () => {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('cash_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries((data || []) as CashEntry[]);
    } catch (error) {
      console.error('Error fetching cash entries:', error);
      toast({
        title: "Error",
        description: "Failed to fetch cash entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('cash_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Entry deleted successfully",
      });

      fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  return { entries, loading, refetch: fetchEntries, deleteEntry };
};