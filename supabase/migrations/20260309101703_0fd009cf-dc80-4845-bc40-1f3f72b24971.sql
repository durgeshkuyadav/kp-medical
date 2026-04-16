
-- Fix admin_registrations: remove any overly permissive SELECT policies and ensure only owner + super_admin can read
-- First drop any existing public/anon select policies
DO $$
BEGIN
  -- Drop policies that might be too open
  BEGIN
    DROP POLICY IF EXISTS "Anyone can view registrations" ON public.admin_registrations;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DROP POLICY IF EXISTS "Public can view registrations" ON public.admin_registrations;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Also fix the audit_log insert policy to require auth instead of true
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_log;
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
