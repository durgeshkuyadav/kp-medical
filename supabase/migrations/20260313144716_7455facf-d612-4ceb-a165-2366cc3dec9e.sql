
-- Fix 1: Remove dangerous public-access policy on admin_registrations
DROP POLICY IF EXISTS "Service role can manage all registrations" ON public.admin_registrations;

-- Fix 2: Remove dangerous public-access policy on tenant_schemas
DROP POLICY IF EXISTS "Service role can manage schemas" ON public.tenant_schemas;

-- Fix 3: Drop orphaned shop_settings policy
DROP POLICY IF EXISTS "Everyone can view shop settings" ON public.shop_settings;
