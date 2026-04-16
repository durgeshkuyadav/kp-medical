-- Create batch_transfers table for tracking batch adjustments
CREATE TABLE IF NOT EXISTS public.batch_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_batch_id UUID REFERENCES public.medicine_batches(id) ON DELETE CASCADE,
  to_batch_id UUID REFERENCES public.medicine_batches(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  reason TEXT,
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('adjustment', 'correction', 'expired_disposal', 'damaged', 'transfer')),
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock_audits table
CREATE TABLE IF NOT EXISTS public.stock_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock_audit_items table
CREATE TABLE IF NOT EXISTS public.stock_audit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.stock_audits(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.medicine_batches(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  batch_number TEXT NOT NULL,
  system_stock INTEGER NOT NULL,
  physical_stock INTEGER NOT NULL,
  discrepancy INTEGER GENERATED ALWAYS AS (physical_stock - system_stock) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create batch_profitability view
CREATE OR REPLACE VIEW public.batch_profitability AS
SELECT 
  mb.id as batch_id,
  mb.medicine_id,
  m.name as medicine_name,
  mb.batch_number,
  mb.expiry_date,
  mb.stock as remaining_stock,
  mb.purchase_price,
  m.price as selling_price,
  (m.price - mb.purchase_price) as margin_per_unit,
  CASE 
    WHEN mb.purchase_price > 0 
    THEN ((m.price - mb.purchase_price) / mb.purchase_price * 100)
    ELSE 0 
  END as margin_percentage,
  COALESCE(
    (SELECT SUM(si.quantity) 
     FROM public.sale_items si 
     WHERE si.batch_id = mb.id), 
    0
  ) as total_sold,
  COALESCE(
    (SELECT SUM(si.total) 
     FROM public.sale_items si 
     WHERE si.batch_id = mb.id), 
    0
  ) as total_revenue,
  COALESCE(
    (SELECT SUM(si.quantity) * mb.purchase_price
     FROM public.sale_items si 
     WHERE si.batch_id = mb.id), 
    0
  ) as total_cost,
  COALESCE(
    (SELECT SUM(si.total) - SUM(si.quantity) * mb.purchase_price
     FROM public.sale_items si 
     WHERE si.batch_id = mb.id), 
    0
  ) as total_profit
FROM public.medicine_batches mb
JOIN public.medicines m ON m.id = mb.medicine_id;

-- Enable RLS on new tables
ALTER TABLE public.batch_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_audit_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for batch_transfers
CREATE POLICY "Authenticated staff can view batch transfers"
ON public.batch_transfers FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated staff can insert batch transfers"
ON public.batch_transfers FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Only admins can delete batch transfers"
ON public.batch_transfers FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for stock_audits
CREATE POLICY "Authenticated staff can view stock audits"
ON public.stock_audits FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated staff can insert stock audits"
ON public.stock_audits FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated staff can update stock audits"
ON public.stock_audits FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Only admins can delete stock audits"
ON public.stock_audits FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for stock_audit_items
CREATE POLICY "Authenticated staff can view stock audit items"
ON public.stock_audit_items FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated staff can insert stock audit items"
ON public.stock_audit_items FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated staff can update stock audit items"
ON public.stock_audit_items FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_batch_transfers_medicine_id ON public.batch_transfers(medicine_id);
CREATE INDEX IF NOT EXISTS idx_batch_transfers_created_at ON public.batch_transfers(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_audits_status ON public.stock_audits(status);
CREATE INDEX IF NOT EXISTS idx_stock_audit_items_audit_id ON public.stock_audit_items(audit_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_items_batch_id ON public.stock_audit_items(batch_id);

-- Function to apply audit adjustments
CREATE OR REPLACE FUNCTION public.apply_audit_adjustments(audit_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  audit_item RECORD;
BEGIN
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
$$;