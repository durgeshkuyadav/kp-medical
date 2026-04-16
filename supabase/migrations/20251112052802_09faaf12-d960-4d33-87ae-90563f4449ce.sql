-- Create table for tracking failed login attempts
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  user_agent text,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text
);

-- Create table for audit log (sensitive actions)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view failed login attempts
CREATE POLICY "Only admins can view failed login attempts"
ON public.failed_login_attempts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert failed login attempts (for tracking)
CREATE POLICY "Only admins can insert failed login attempts"
ON public.failed_login_attempts
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON public.audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Authenticated staff can insert audit logs
CREATE POLICY "Authenticated staff can insert audit logs"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

-- Create index for better performance
CREATE INDEX idx_failed_login_attempts_attempted_at ON public.failed_login_attempts(attempted_at DESC);
CREATE INDEX idx_failed_login_attempts_email ON public.failed_login_attempts(email);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_action ON public.audit_log(action);