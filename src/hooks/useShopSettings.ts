import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getAdminId } from '@/hooks/useAdminId';

export interface ShopSettings {
  id: string;
  shop_name: string | null;
  logo_url: string | null;
  gst_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  drug_license_number: string | null;
  admin_id: string | null;
  upi_id: string | null;
}

export const useShopSettings = () => {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shop_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSettings(data as ShopSettings | null);
    } catch (error) {
      console.error('Error fetching shop settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updatedSettings: Partial<ShopSettings>) => {
    try {
      const adminId = await getAdminId();
      if (!adminId) throw new Error('Could not determine admin ID');

      if (!settings?.id) {
        const { data, error } = await supabase
          .from('shop_settings')
          .insert([{ ...updatedSettings, admin_id: adminId }])
          .select()
          .single();

        if (error) throw error;
        setSettings(data as ShopSettings);
      } else {
        const { data, error } = await supabase
          .from('shop_settings')
          .update(updatedSettings)
          .eq('id', settings.id)
          .select()
          .single();

        if (error) throw error;
        setSettings(data as ShopSettings);
      }

      toast({
        title: "Success",
        description: "Shop settings updated successfully",
      });
    } catch (error) {
      console.error('Error updating shop settings:', error);
      toast({
        title: "Error",
        description: "Failed to update shop settings",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, loading, updateSettings, refetch: fetchSettings };
};
