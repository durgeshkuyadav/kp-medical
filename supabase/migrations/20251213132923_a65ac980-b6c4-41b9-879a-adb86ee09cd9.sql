-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medicines table
CREATE TABLE public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT,
  batch_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER DEFAULT 10,
  supplier_id UUID REFERENCES public.suppliers(id),
  manufacturer TEXT,
  hsn_code TEXT,
  gst_rate DECIMAL(5,2) DEFAULT 12.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  date_of_birth DATE,
  blood_group TEXT,
  allergies TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE,
  patient_id UUID REFERENCES public.patients(id),
  patient_name TEXT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sale_items table
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  medicine_id UUID REFERENCES public.medicines(id),
  medicine_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase_orders table
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT NOT NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  expected_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase_order_items table
CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  medicine_id UUID REFERENCES public.medicines(id),
  medicine_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create goods_received_notes table
CREATE TABLE public.goods_received_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number TEXT UNIQUE,
  po_id UUID REFERENCES public.purchase_orders(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT NOT NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'received',
  received_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create grn_items table
CREATE TABLE public.grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID REFERENCES public.goods_received_notes(id) ON DELETE CASCADE NOT NULL,
  medicine_id UUID REFERENCES public.medicines(id),
  medicine_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  batch_number TEXT,
  expiry_date DATE,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cash_entries table
CREATE TABLE public.cash_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  amount DECIMAL(10,2) NOT NULL,
  category TEXT,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shop_settings table
CREATE TABLE public.shop_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  gst_number TEXT,
  drug_license_number TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice number generator function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  prefix TEXT := 'INV';
  current_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO current_count FROM public.sales;
  new_number := prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(current_count::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

-- Enable RLS on all new tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users (admin and manager)
-- Suppliers
CREATE POLICY "Authenticated users can view suppliers"
ON public.suppliers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert suppliers"
ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update suppliers"
ON public.suppliers FOR UPDATE TO authenticated USING (true);

-- Medicines
CREATE POLICY "Authenticated users can view medicines"
ON public.medicines FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert medicines"
ON public.medicines FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update medicines"
ON public.medicines FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete medicines"
ON public.medicines FOR DELETE TO authenticated USING (true);

-- Patients
CREATE POLICY "Authenticated users can view patients"
ON public.patients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert patients"
ON public.patients FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update patients"
ON public.patients FOR UPDATE TO authenticated USING (true);

-- Sales
CREATE POLICY "Authenticated users can view sales"
ON public.sales FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert sales"
ON public.sales FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales"
ON public.sales FOR UPDATE TO authenticated USING (true);

-- Sale items
CREATE POLICY "Authenticated users can view sale_items"
ON public.sale_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert sale_items"
ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);

-- Purchase orders
CREATE POLICY "Authenticated users can view purchase_orders"
ON public.purchase_orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert purchase_orders"
ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update purchase_orders"
ON public.purchase_orders FOR UPDATE TO authenticated USING (true);

-- Purchase order items
CREATE POLICY "Authenticated users can view purchase_order_items"
ON public.purchase_order_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert purchase_order_items"
ON public.purchase_order_items FOR INSERT TO authenticated WITH CHECK (true);

-- GRNs
CREATE POLICY "Authenticated users can view grns"
ON public.goods_received_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert grns"
ON public.goods_received_notes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update grns"
ON public.goods_received_notes FOR UPDATE TO authenticated USING (true);

-- GRN items
CREATE POLICY "Authenticated users can view grn_items"
ON public.grn_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert grn_items"
ON public.grn_items FOR INSERT TO authenticated WITH CHECK (true);

-- Cash entries
CREATE POLICY "Authenticated users can view cash_entries"
ON public.cash_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert cash_entries"
ON public.cash_entries FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update cash_entries"
ON public.cash_entries FOR UPDATE TO authenticated USING (true);

-- Shop settings - public read, admin write
CREATE POLICY "Anyone can view shop_settings"
ON public.shop_settings FOR SELECT USING (true);

CREATE POLICY "Admins can update shop_settings"
ON public.shop_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert shop_settings"
ON public.shop_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add update triggers
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medicines_updated_at
  BEFORE UPDATE ON public.medicines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grns_updated_at
  BEFORE UPDATE ON public.goods_received_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shop_settings_updated_at
  BEFORE UPDATE ON public.shop_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();