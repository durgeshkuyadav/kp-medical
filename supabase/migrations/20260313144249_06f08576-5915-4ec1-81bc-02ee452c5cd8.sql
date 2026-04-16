
-- Create rate limit tracking table
CREATE TABLE public.rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_rate_limit_log_lookup ON public.rate_limit_log (identifier, endpoint, created_at DESC);

-- Auto-cleanup: delete entries older than 1 hour
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_log()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.rate_limit_log WHERE created_at < now() - interval '1 hour';
$$;

-- Rate limit check function: returns true if rate limited
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier text,
  _endpoint text,
  _max_requests integer DEFAULT 10,
  _window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _count integer;
BEGIN
  -- Cleanup old entries periodically (1 in 100 chance)
  IF random() < 0.01 THEN
    PERFORM public.cleanup_rate_limit_log();
  END IF;

  -- Count requests in window
  SELECT COUNT(*) INTO _count
  FROM public.rate_limit_log
  WHERE identifier = _identifier
    AND endpoint = _endpoint
    AND created_at > now() - (_window_seconds || ' seconds')::interval;

  -- Log this request
  INSERT INTO public.rate_limit_log (identifier, endpoint) VALUES (_identifier, _endpoint);

  -- Return true if over limit
  RETURN _count >= _max_requests;
END;
$$;

-- Enable RLS but only allow service role access
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;
