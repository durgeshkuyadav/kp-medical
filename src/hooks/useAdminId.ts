import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAdminId = () => {
  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if this user is a manager (has mapping)
      const { data: mapping } = await supabase
        .from('manager_admin_mapping')
        .select('admin_id')
        .eq('manager_id', user.id)
        .maybeSingle();

      setAdminId(mapping?.admin_id || user.id);
    };

    fetchAdminId();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchAdminId();
    });

    return () => subscription.unsubscribe();
  }, []);

  return adminId;
};

export const getAdminId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: mapping } = await supabase
    .from('manager_admin_mapping')
    .select('admin_id')
    .eq('manager_id', user.id)
    .maybeSingle();

  return mapping?.admin_id || user.id;
};
