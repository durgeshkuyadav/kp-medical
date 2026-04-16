
-- Fix 1: Remove dangerous public-access policy on subscriptions
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- Fix 2: Restrict manager_admin_mapping INSERT to admin role only
DROP POLICY IF EXISTS "Admins can insert mappings" ON public.manager_admin_mapping;
CREATE POLICY "Admins can insert mappings"
ON public.manager_admin_mapping FOR INSERT
TO authenticated
WITH CHECK (admin_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Add UNIQUE constraint on manager_id to prevent duplicate mappings
ALTER TABLE public.manager_admin_mapping ADD CONSTRAINT unique_manager_id UNIQUE (manager_id);

-- Fix 4: Add super admin read access to audit_log
CREATE POLICY "Super admin can view all audit logs"
ON public.audit_log FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix 5: Harden get_current_admin_id to use LIMIT 1
CREATE OR REPLACE FUNCTION public.get_current_admin_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT admin_id FROM public.manager_admin_mapping WHERE manager_id = auth.uid() LIMIT 1),
    auth.uid()
  )
$$;
