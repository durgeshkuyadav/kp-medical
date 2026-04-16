-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create purchase orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'received', 'cancelled')),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create purchase order items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  medicine_id UUID REFERENCES public.medicines(id) ON DELETE SET NULL,
  medicine_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create goods received notes table
CREATE TABLE IF NOT EXISTS public.goods_received_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number TEXT UNIQUE NOT NULL,
  po_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  total NUMERIC NOT NULL DEFAULT 0,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create GRN items table
CREATE TABLE IF NOT EXISTS public.grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID REFERENCES public.goods_received_notes(id) ON DELETE CASCADE NOT NULL,
  medicine_id UUID REFERENCES public.medicines(id) ON DELETE SET NULL NOT NULL,
  medicine_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  batch_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create shop settings table
CREATE TABLE IF NOT EXISTS public.shop_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name TEXT NOT NULL,
  logo_url TEXT,
  gst_number TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  invoice_prefix TEXT DEFAULT 'INV',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add invoice_number to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;

-- Create invoice counter table for sequential numbering
CREATE TABLE IF NOT EXISTS public.invoice_counter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  UNIQUE(year)
);

-- Function to increment medicine stock when GRN is created
CREATE OR REPLACE FUNCTION public.increment_medicine_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.medicines
  SET 
    stock = stock + NEW.quantity,
    batch_number = NEW.batch_number,
    expiry_date = NEW.expiry_date,
    updated_at = now()
  WHERE id = NEW.medicine_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to increment stock on GRN item insert
CREATE TRIGGER increment_stock_on_grn
  AFTER INSERT ON public.grn_items
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_medicine_stock();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER;
  current_counter INTEGER;
  invoice_prefix TEXT;
  new_invoice_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get invoice prefix from settings
  SELECT COALESCE(
    (SELECT invoice_prefix FROM public.shop_settings LIMIT 1),
    'INV'
  ) INTO invoice_prefix;
  
  -- Get or create counter for current year
  INSERT INTO public.invoice_counter (year, counter)
  VALUES (current_year, 1)
  ON CONFLICT (year) 
  DO UPDATE SET counter = invoice_counter.counter + 1
  RETURNING counter INTO current_counter;
  
  -- Format: INV-2025-001
  new_invoice_number := invoice_prefix || '-' || current_year || '-' || LPAD(current_counter::TEXT, 3, '0');
  
  RETURN new_invoice_number;
END;
$$;

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counter ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suppliers
CREATE POLICY "Authenticated staff can view suppliers" ON public.suppliers FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Authenticated staff can insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Authenticated staff can update suppliers" ON public.suppliers FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Only admins can delete suppliers" ON public.suppliers FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for purchase orders
CREATE POLICY "Authenticated staff can view purchase orders" ON public.purchase_orders FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Authenticated staff can insert purchase orders" ON public.purchase_orders FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Authenticated staff can update purchase orders" ON public.purchase_orders FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Only admins can delete purchase orders" ON public.purchase_orders FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for purchase order items
CREATE POLICY "Authenticated staff can view PO items" ON public.purchase_order_items FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Authenticated staff can insert PO items" ON public.purchase_order_items FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Authenticated staff can update PO items" ON public.purchase_order_items FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Only admins can delete PO items" ON public.purchase_order_items FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for GRNs
CREATE POLICY "Authenticated staff can view GRNs" ON public.goods_received_notes FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Authenticated staff can insert GRNs" ON public.goods_received_notes FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Authenticated staff can update GRNs" ON public.goods_received_notes FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Only admins can delete GRNs" ON public.goods_received_notes FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for GRN items
CREATE POLICY "Authenticated staff can view GRN items" ON public.grn_items FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Authenticated staff can insert GRN items" ON public.grn_items FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Authenticated staff can update GRN items" ON public.grn_items FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Only admins can delete GRN items" ON public.grn_items FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for shop settings
CREATE POLICY "Everyone can view shop settings" ON public.shop_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can insert shop settings" ON public.shop_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update shop settings" ON public.shop_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete shop settings" ON public.shop_settings FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for invoice counter
CREATE POLICY "Everyone can view invoice counter" ON public.invoice_counter FOR SELECT USING (true);
CREATE POLICY "Authenticated staff can modify invoice counter" ON public.invoice_counter FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Insert default shop settings if not exists
INSERT INTO public.shop_settings (shop_name, invoice_prefix)
VALUES ('My Pharmacy', 'INV')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON public.purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_grn_supplier ON public.goods_received_notes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON public.grn_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON public.sales(invoice_number);