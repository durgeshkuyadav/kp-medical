-- Create stock_movements table for tracking stock changes
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  grn_id UUID REFERENCES public.goods_received_notes(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'purchase', 'adjustment', 'return')),
  quantity_before INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reference_number TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view stock_movements"
ON public.stock_movements FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert stock_movements"
ON public.stock_movements FOR INSERT
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_stock_movements_medicine_id ON public.stock_movements(medicine_id);
CREATE INDEX idx_stock_movements_sale_id ON public.stock_movements(sale_id);
CREATE INDEX idx_stock_movements_created_at ON public.stock_movements(created_at DESC);

-- Function for atomic stock deduction with concurrency safety
CREATE OR REPLACE FUNCTION public.deduct_stock_atomic(
  p_medicine_id UUID,
  p_quantity INTEGER,
  p_sale_id UUID,
  p_reference_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_medicine_name TEXT;
BEGIN
  -- Lock the row for update to prevent concurrent modifications
  SELECT stock, name INTO v_current_stock, v_medicine_name
  FROM public.medicines
  WHERE id = p_medicine_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Medicine not found');
  END IF;

  IF v_current_stock < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('Insufficient stock for %s. Available: %s, Requested: %s', v_medicine_name, v_current_stock, p_quantity)
    );
  END IF;

  v_new_stock := v_current_stock - p_quantity;

  -- Update stock
  UPDATE public.medicines
  SET stock = v_new_stock, updated_at = now()
  WHERE id = p_medicine_id;

  -- Log the movement
  INSERT INTO public.stock_movements (
    medicine_id, sale_id, movement_type, 
    quantity_before, quantity_change, quantity_after,
    reference_number
  ) VALUES (
    p_medicine_id, p_sale_id, 'sale',
    v_current_stock, -p_quantity, v_new_stock,
    p_reference_number
  );

  RETURN jsonb_build_object(
    'success', true, 
    'quantity_before', v_current_stock,
    'quantity_after', v_new_stock
  );
END;
$$;

-- Function to process entire sale with rollback on failure
CREATE OR REPLACE FUNCTION public.process_sale_stock(
  p_sale_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_result JSONB;
  v_invoice_number TEXT;
BEGIN
  -- Get invoice number for reference
  SELECT invoice_number INTO v_invoice_number FROM public.sales WHERE id = p_sale_id;

  -- Process each sale item
  FOR v_item IN 
    SELECT medicine_id, quantity, medicine_name 
    FROM public.sale_items 
    WHERE sale_id = p_sale_id AND medicine_id IS NOT NULL
  LOOP
    v_result := public.deduct_stock_atomic(
      v_item.medicine_id, 
      v_item.quantity, 
      p_sale_id,
      v_invoice_number
    );

    IF NOT (v_result->>'success')::boolean THEN
      -- Raise exception to trigger rollback
      RAISE EXCEPTION '%', v_result->>'error';
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'message', 'Stock deducted successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;