-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix search_path for get_failed_attempts_count function
CREATE OR REPLACE FUNCTION public.get_failed_attempts_count(_email TEXT, _window_minutes INTEGER DEFAULT 15)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.failed_login_attempts
  WHERE email = _email
    AND created_at > (now() - (_window_minutes || ' minutes')::INTERVAL)
$$;

-- Fix search_path for is_account_locked function
CREATE OR REPLACE FUNCTION public.is_account_locked(_email TEXT, _max_attempts INTEGER DEFAULT 5, _window_minutes INTEGER DEFAULT 15)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_failed_attempts_count(_email, _window_minutes) >= _max_attempts
$$;