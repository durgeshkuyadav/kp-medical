-- Fix invoice number generation to prevent duplicates using sequence
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  prefix TEXT := 'INV';
  seq_val INTEGER;
BEGIN
  -- Use sequence to ensure unique numbers
  seq_val := nextval('invoice_number_seq');
  new_number := prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(seq_val::TEXT, 4, '0');
  RETURN new_number;
END;
$$;