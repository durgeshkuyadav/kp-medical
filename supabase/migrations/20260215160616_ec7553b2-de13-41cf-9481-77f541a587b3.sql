
-- Add admin_id to shop_settings for tenant isolation
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS admin_id uuid;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Admins can insert shop_settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Admins can update shop_settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Anyone can view shop_settings" ON public.shop_settings;

-- Create tenant-isolated RLS policies
CREATE POLICY "Tenant users can view shop_settings"
ON public.shop_settings FOR SELECT
TO authenticated
USING (admin_id = get_current_admin_id());

CREATE POLICY "Tenant users can insert shop_settings"
ON public.shop_settings FOR INSERT
TO authenticated
WITH CHECK (admin_id = get_current_admin_id());

CREATE POLICY "Tenant users can update shop_settings"
ON public.shop_settings FOR UPDATE
TO authenticated
USING (admin_id = get_current_admin_id());
