import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  allergies: string | null;
  created_at: string;
  updated_at: string;
}

export const usePatients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPatients((data || []) as Patient[]);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({
        title: "Error",
        description: "Failed to fetch patients data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  return { patients, loading, refetch: fetchPatients };
};
