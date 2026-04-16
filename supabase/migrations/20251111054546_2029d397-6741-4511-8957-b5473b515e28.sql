-- Add permission checks to SECURITY DEFINER functions to prevent unauthorized access

-- Update increment_batch_stock to verify permissions
CREATE OR REPLACE FUNCTION public.increment_batch_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  batch_record RECORD;
BEGIN
  -- Verify caller has appropriate role
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)) THEN
    RAISE EXCEPTION 'Insufficient permissions to modify inventory';
  END IF;

  -- Try to find existing batch
  SELECT * INTO batch_record
  FROM public.medicine_batches
  WHERE medicine_id = NEW.medicine_id 
    AND batch_number = NEW.batch_number
    AND expiry_date = NEW.expiry_date;
  
  IF FOUND THEN
    -- Update existing batch
    UPDATE public.medicine_batches
    SET 
      stock = stock + NEW.quantity,
      updated_at = now()
    WHERE id = batch_record.id;
  ELSE
    -- Create new batch
    INSERT INTO public.medicine_batches (
      medicine_id,
      batch_number,
      expiry_date,
      stock,
      purchase_price,
      supplier_id,
      grn_id
    ) VALUES (
      NEW.medicine_id,
      NEW.batch_number,
      NEW.expiry_date,
      NEW.quantity,
      NEW.price,
      (SELECT supplier_id FROM public.goods_received_notes WHERE id = NEW.grn_id),
      NEW.grn_id
    );
  END IF;
  
  -- Update medicine total stock
  UPDATE public.medicines
  SET 
    stock = (
      SELECT COALESCE(SUM(stock), 0)
      FROM public.medicine_batches
      WHERE medicine_id = NEW.medicine_id
    ),
    updated_at = now()
  WHERE id = NEW.medicine_id;
  
  RETURN NEW;
END;
$function$;

-- Update decrement_batch_stock to verify permissions
CREATE OR REPLACE FUNCTION public.decrement_batch_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  remaining_qty INTEGER := NEW.quantity;
  batch_record RECORD;
BEGIN
  -- Verify caller has appropriate role
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)) THEN
    RAISE EXCEPTION 'Insufficient permissions to modify inventory';
  END IF;

  -- Use FEFO (First Expiry First Out) logic
  FOR batch_record IN 
    SELECT id, stock, expiry_date
    FROM public.medicine_batches
    WHERE medicine_id = NEW.medicine_id AND stock > 0
    ORDER BY expiry_date ASC, created_at ASC
  LOOP
    IF remaining_qty <= 0 THEN
      EXIT;
    END IF;
    
    IF batch_record.stock >= remaining_qty THEN
      -- This batch has enough stock
      UPDATE public.medicine_batches
      SET stock = stock - remaining_qty,
          updated_at = now()
      WHERE id = batch_record.id;
      
      -- Record which batch was used (store the first/primary batch used)
      IF NEW.batch_id IS NULL THEN
        UPDATE public.sale_items
        SET batch_id = batch_record.id
        WHERE id = NEW.id;
      END IF;
      
      remaining_qty := 0;
    ELSE
      -- Use all stock from this batch and continue
      remaining_qty := remaining_qty - batch_record.stock;
      
      UPDATE public.medicine_batches
      SET stock = 0,
          updated_at = now()
      WHERE id = batch_record.id;
      
      -- Record the first batch used
      IF NEW.batch_id IS NULL THEN
        UPDATE public.sale_items
        SET batch_id = batch_record.id
        WHERE id = NEW.id;
      END IF;
    END IF;
  END LOOP;
  
  -- Check if we had insufficient stock
  IF remaining_qty > 0 THEN
    RAISE EXCEPTION 'Insufficient stock for medicine: %. Short by % units', NEW.medicine_name, remaining_qty;
  END IF;
  
  -- Update medicine total stock
  UPDATE public.medicines
  SET stock = (
    SELECT COALESCE(SUM(stock), 0)
    FROM public.medicine_batches
    WHERE medicine_id = NEW.medicine_id
  ),
  updated_at = now()
  WHERE id = NEW.medicine_id;
  
  RETURN NEW;
END;
$function$;

-- Update apply_audit_adjustments to verify permissions
CREATE OR REPLACE FUNCTION public.apply_audit_adjustments(audit_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  audit_item RECORD;
BEGIN
  -- Verify caller has appropriate role
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)) THEN
    RAISE EXCEPTION 'Insufficient permissions to apply audit adjustments';
  END IF;

  -- Check if audit exists and is completed
  IF NOT EXISTS (
    SELECT 1 FROM public.stock_audits 
    WHERE id = audit_id_param AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Audit not found or not completed';
  END IF;

  -- Apply adjustments for each item with discrepancy
  FOR audit_item IN 
    SELECT * FROM public.stock_audit_items 
    WHERE audit_id = audit_id_param AND discrepancy != 0
  LOOP
    -- Update batch stock
    UPDATE public.medicine_batches
    SET stock = audit_item.physical_stock,
        updated_at = now()
    WHERE id = audit_item.batch_id;
    
    -- Create audit log entry
    INSERT INTO public.batch_transfers (
      to_batch_id,
      medicine_id,
      quantity,
      reason,
      transfer_type,
      performed_by
    ) VALUES (
      audit_item.batch_id,
      audit_item.medicine_id,
      audit_item.discrepancy,
      'Stock audit adjustment: ' || audit_item.notes,
      'adjustment',
      (SELECT performed_by FROM public.stock_audits WHERE id = audit_id_param)
    );
  END LOOP;
  
  -- Update medicine total stock for all affected medicines
  UPDATE public.medicines m
  SET stock = (
    SELECT COALESCE(SUM(stock), 0)
    FROM public.medicine_batches
    WHERE medicine_id = m.id
  ),
  updated_at = now()
  WHERE id IN (
    SELECT DISTINCT medicine_id 
    FROM public.stock_audit_items 
    WHERE audit_id = audit_id_param
  );
END;
$function$;

-- Drop the existing batch_profitability view and recreate it with admin-only access through a security definer function
DROP VIEW IF EXISTS public.batch_profitability;

-- Create a security definer function to get batch profitability (admin only)
CREATE OR REPLACE FUNCTION public.get_batch_profitability()
RETURNS TABLE (
  batch_number text,
  medicine_name text,
  expiry_date date,
  medicine_id uuid,
  batch_id uuid,
  remaining_stock integer,
  purchase_price numeric,
  selling_price numeric,
  margin_per_unit numeric,
  margin_percentage numeric,
  total_sold bigint,
  total_revenue numeric,
  total_cost numeric,
  total_profit numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Only admins can view profitability data
  SELECT 
    mb.batch_number,
    m.name as medicine_name,
    mb.expiry_date,
    m.id as medicine_id,
    mb.id as batch_id,
    mb.stock as remaining_stock,
    mb.purchase_price,
    m.price as selling_price,
    (m.price - mb.purchase_price) as margin_per_unit,
    CASE 
      WHEN mb.purchase_price > 0 THEN 
        ((m.price - mb.purchase_price) / mb.purchase_price * 100)
      ELSE 0
    END as margin_percentage,
    COALESCE(COUNT(si.id), 0) as total_sold,
    COALESCE(SUM(si.total), 0) as total_revenue,
    COALESCE(SUM(si.quantity * mb.purchase_price), 0) as total_cost,
    COALESCE(SUM(si.total - (si.quantity * mb.purchase_price)), 0) as total_profit
  FROM public.medicine_batches mb
  JOIN public.medicines m ON m.id = mb.medicine_id
  LEFT JOIN public.sale_items si ON si.batch_id = mb.id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  GROUP BY mb.id, mb.batch_number, m.name, mb.expiry_date, m.id, mb.stock, mb.purchase_price, m.price
  ORDER BY mb.expiry_date DESC;
$$;