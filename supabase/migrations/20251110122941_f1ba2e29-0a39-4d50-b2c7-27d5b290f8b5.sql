-- Create medicine_batches table for batch-wise tracking
CREATE TABLE IF NOT EXISTS public.medicine_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  grn_id UUID REFERENCES public.goods_received_notes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_medicine_batch UNIQUE(medicine_id, batch_number)
);

-- Enable RLS
ALTER TABLE public.medicine_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medicine_batches
CREATE POLICY "Authenticated staff can view medicine batches"
ON public.medicine_batches
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Authenticated staff can insert medicine batches"
ON public.medicine_batches
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Authenticated staff can update medicine batches"
ON public.medicine_batches
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Only admins can delete medicine batches"
ON public.medicine_batches
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add batch_id to sale_items to track which batch was used
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.medicine_batches(id) ON DELETE SET NULL;

-- Create function to increment batch stock (replaces old increment_medicine_stock)
CREATE OR REPLACE FUNCTION public.increment_batch_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  batch_record RECORD;
BEGIN
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
$$;

-- Create function to decrement batch stock using FEFO
CREATE OR REPLACE FUNCTION public.decrement_batch_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_qty INTEGER := NEW.quantity;
  batch_record RECORD;
BEGIN
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
$$;

-- Drop old trigger and create new one for GRN items
DROP TRIGGER IF EXISTS increment_stock_on_grn ON public.grn_items;
CREATE TRIGGER increment_stock_on_grn
AFTER INSERT ON public.grn_items
FOR EACH ROW
EXECUTE FUNCTION public.increment_batch_stock();

-- Update trigger for sale items to use batch logic
DROP TRIGGER IF EXISTS decrement_stock_on_sale ON public.sale_items;
CREATE TRIGGER decrement_stock_on_sale
AFTER INSERT ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION public.decrement_batch_stock();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medicine_batches_medicine_id ON public.medicine_batches(medicine_id);
CREATE INDEX IF NOT EXISTS idx_medicine_batches_expiry_date ON public.medicine_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_medicine_batches_stock ON public.medicine_batches(stock);
CREATE INDEX IF NOT EXISTS idx_sale_items_batch_id ON public.sale_items(batch_id);

-- Create function to get expiring batches
CREATE OR REPLACE FUNCTION public.get_expiring_batches(months_ahead INTEGER DEFAULT 3)
RETURNS TABLE (
  id UUID,
  medicine_id UUID,
  medicine_name TEXT,
  batch_number TEXT,
  expiry_date DATE,
  stock INTEGER,
  days_to_expiry INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    mb.id,
    mb.medicine_id,
    m.name as medicine_name,
    mb.batch_number,
    mb.expiry_date,
    mb.stock,
    (mb.expiry_date - CURRENT_DATE)::INTEGER as days_to_expiry
  FROM public.medicine_batches mb
  JOIN public.medicines m ON m.id = mb.medicine_id
  WHERE mb.stock > 0
    AND mb.expiry_date <= CURRENT_DATE + (months_ahead || ' months')::INTERVAL
    AND mb.expiry_date >= CURRENT_DATE
  ORDER BY mb.expiry_date ASC;
$$;