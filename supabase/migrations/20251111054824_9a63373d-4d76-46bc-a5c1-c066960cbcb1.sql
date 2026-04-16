-- Restrict invoice_counter access to authenticated staff only
-- Drop the public read policy
DROP POLICY IF EXISTS "Everyone can view invoice counter" ON public.invoice_counter;

-- Create restrictive policy for viewing invoice counter
CREATE POLICY "Authenticated staff can view invoice counter"
ON public.invoice_counter
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

-- The existing policy for modifications already exists and is correct
-- "Authenticated staff can modify invoice counter" allows INSERT/UPDATE/DELETE

-- Update the generate_invoice_number function to be more secure
-- This function already exists but we'll ensure it's properly secured
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_year INTEGER;
  current_counter INTEGER;
  invoice_prefix TEXT;
  new_invoice_number TEXT;
BEGIN
  -- Verify caller has appropriate role
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)) THEN
    RAISE EXCEPTION 'Insufficient permissions to generate invoice numbers';
  END IF;

  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get invoice prefix from settings
  SELECT COALESCE(
    (SELECT invoice_prefix FROM public.shop_settings LIMIT 1),
    'INV'
  ) INTO invoice_prefix;
  
  -- Get or create counter for current year with row-level locking to prevent race conditions
  INSERT INTO public.invoice_counter (year, counter)
  VALUES (current_year, 1)
  ON CONFLICT (year) 
  DO UPDATE SET counter = invoice_counter.counter + 1
  RETURNING counter INTO current_counter;
  
  -- Format: INV-2025-001
  new_invoice_number := invoice_prefix || '-' || current_year || '-' || LPAD(current_counter::TEXT, 3, '0');
  
  RETURN new_invoice_number;
END;
$function$;