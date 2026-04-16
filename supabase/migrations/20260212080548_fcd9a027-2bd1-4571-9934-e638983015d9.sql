
-- Create manager_admin_mapping table
CREATE TABLE public.manager_admin_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(manager_id)
);
ALTER TABLE public.manager_admin_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their mappings" ON public.manager_admin_mapping
  FOR SELECT USING (admin_id = auth.uid() OR manager_id = auth.uid());
CREATE POLICY "Admins can insert mappings" ON public.manager_admin_mapping
  FOR INSERT WITH CHECK (admin_id = auth.uid());
CREATE POLICY "Admins can delete mappings" ON public.manager_admin_mapping
  FOR DELETE USING (admin_id = auth.uid());

-- Function to get current user's admin_id
CREATE OR REPLACE FUNCTION public.get_current_admin_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT admin_id FROM public.manager_admin_mapping WHERE manager_id = auth.uid()),
    auth.uid()
  )
$$;

-- Add admin_id to medicines
ALTER TABLE public.medicines ADD COLUMN admin_id uuid;
UPDATE public.medicines SET admin_id = (SELECT auth.uid()) WHERE admin_id IS NULL;

-- Add admin_id to patients
ALTER TABLE public.patients ADD COLUMN admin_id uuid;

-- Add admin_id to sales
ALTER TABLE public.sales ADD COLUMN admin_id uuid;

-- Add admin_id to sale_items (inherit from sale)
-- sale_items already linked via sale_id, no need

-- Add admin_id to suppliers
ALTER TABLE public.suppliers ADD COLUMN admin_id uuid;

-- Add admin_id to purchase_orders
ALTER TABLE public.purchase_orders ADD COLUMN admin_id uuid;

-- Add admin_id to goods_received_notes
ALTER TABLE public.goods_received_notes ADD COLUMN admin_id uuid;

-- Add admin_id to cash_entries
ALTER TABLE public.cash_entries ADD COLUMN admin_id uuid;

-- Add admin_id to stock_movements
ALTER TABLE public.stock_movements ADD COLUMN admin_id uuid;

-- Indexes
CREATE INDEX idx_medicines_admin_id ON public.medicines(admin_id);
CREATE INDEX idx_patients_admin_id ON public.patients(admin_id);
CREATE INDEX idx_sales_admin_id ON public.sales(admin_id);
CREATE INDEX idx_suppliers_admin_id ON public.suppliers(admin_id);
CREATE INDEX idx_purchase_orders_admin_id ON public.purchase_orders(admin_id);
CREATE INDEX idx_goods_received_notes_admin_id ON public.goods_received_notes(admin_id);
CREATE INDEX idx_cash_entries_admin_id ON public.cash_entries(admin_id);
CREATE INDEX idx_stock_movements_admin_id ON public.stock_movements(admin_id);

-- Drop old permissive policies and create tenant-isolated ones

-- MEDICINES
DROP POLICY IF EXISTS "Authenticated users can view medicines" ON public.medicines;
DROP POLICY IF EXISTS "Authenticated users can insert medicines" ON public.medicines;
DROP POLICY IF EXISTS "Authenticated users can update medicines" ON public.medicines;
DROP POLICY IF EXISTS "Authenticated users can delete medicines" ON public.medicines;

CREATE POLICY "Tenant users can view medicines" ON public.medicines
  FOR SELECT USING (admin_id = get_current_admin_id());
CREATE POLICY "Tenant users can insert medicines" ON public.medicines
  FOR INSERT WITH CHECK (admin_id = get_current_admin_id());
CREATE POLICY "Tenant users can update medicines" ON public.medicines
  FOR UPDATE USING (admin_id = get_current_admin_id());
CREATE POLICY "Tenant users can delete medicines" ON public.medicines
  FOR DELETE USING (admin_id = get_current_admin_id());

-- PATIENTS
DROP POLICY IF EXISTS "Authenticated users can view patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can insert patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can update patients" ON public.patients;

CREATE POLICY "Tenant users can view patients" ON public.patients
  FOR SELECT USING (admin_id = get_current_admin_id());
CREATE POLICY "Tenant users can insert patients" ON public.patients
  FOR INSERT WITH CHECK (admin_id = get_current_admin_id());
CREATE POLICY "Tenant users can update patients" ON public.patients
  FOR UPDATE USING (admin_id = get_current_admin_id());

-- SALES
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can update sales" ON public.sales;

CREATE POLICY "Tenant users can view sales" ON public.sales
  FOR SELECT USING (admin_id = get_current_admin_id());
CREATE POLICY "Tenant users can insert sales" ON public.sales
  FOR INSERT WITH CHECK (admin_id = get_current_admin_id());
CREATE POLICY "Tenant users can update sales" ON public.sales
  FOR UPDATE USING (admin_id = get_current_admin_id());

-- SUPPLIERS
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can update suppliers" ON public.suppliers;

CREATE POLICY "Tenant users can view suppliers" ON public.suppliers
  FOR SELECT USING (admin_id = get_current_admin_id());
CREATE POLICY "Tenant users can insert suppliers" ON public.suppliers
  FOR INSERT WITH CHECK (admin_id = get_current_admin_id());
CREATE POLICY "Tenant users can update suppliers" ON public.suppliers
  FOR UPDATE USING (admin_id = get_current_admin_id());

-- PURCHASE_ORDERS
DROP POLICY IF EXISTS "Authenticated users can view purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can insert purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can update purchase_orders" ON public.purchase_orders;

CREATE POLICY "Tenant users can view purchase_orders" ON public.purchase_orders
  FOR SELECT USING (admin_id = get_current_admin_id());
CREATE POLICY "Tenant users can insert purchase_orders" ON public.purchase_orders
  FOR INSERT WITH CHECK (admin_id = get_current_admin_id());
CREATE POLICY "Tenant users can update purchase_orders" ON public.purchase_orders
  FOR UPDATE USING (admin_id = get_current_admin_id());

-- GOODS_RECEIVED_NOTES
DROP POLICY IF EXISTS "Authenticated users can view grns" ON public.goods_received_notes;
DROP POLICY IF EXISTS "Authenticated users can insert grns" ON public.goods_received_notes;
DROP POLICY IF EXISTS "Authenticated users can update grns" ON public.goods_received_notes;

CREATE POLICY "Tenant users can view grns" ON public.goods_received_notes
  FOR SELECT USING (admin_id = get_current_admin_id());
CREATE POLICY "Tenant users can insert grns" ON public.goods_received_notes
  FOR INSERT WITH CHECK (admin_id = get_current_admin_id());
CREATE POLICY "Tenant users can update grns" ON public.goods_received_notes
  FOR UPDATE USING (admin_id = get_current_admin_id());

-- CASH_ENTRIES
DROP POLICY IF EXISTS "Authenticated users can view cash_entries" ON public.cash_entries;
DROP POLICY IF EXISTS "Authenticated users can insert cash_entries" ON public.cash_entries;
DROP POLICY IF EXISTS "Authenticated users can update cash_entries" ON public.cash_entries;

CREATE POLICY "Tenant users can view cash_entries" ON public.cash_entries
  FOR SELECT USING (admin_id = get_current_admin_id());
CREATE POLICY "Tenant users can insert cash_entries" ON public.cash_entries
  FOR INSERT WITH CHECK (admin_id = get_current_admin_id());
CREATE POLICY "Tenant users can update cash_entries" ON public.cash_entries
  FOR UPDATE USING (admin_id = get_current_admin_id());

-- STOCK_MOVEMENTS
DROP POLICY IF EXISTS "Authenticated users can view stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Authenticated users can insert stock_movements" ON public.stock_movements;

CREATE POLICY "Tenant users can view stock_movements" ON public.stock_movements
  FOR SELECT USING (admin_id = get_current_admin_id());
CREATE POLICY "Tenant users can insert stock_movements" ON public.stock_movements
  FOR INSERT WITH CHECK (admin_id = get_current_admin_id());

-- SALE_ITEMS: restrict via sale's admin_id
DROP POLICY IF EXISTS "Authenticated users can view sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can insert sale_items" ON public.sale_items;

CREATE POLICY "Tenant users can view sale_items" ON public.sale_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.admin_id = get_current_admin_id()));
CREATE POLICY "Tenant users can insert sale_items" ON public.sale_items
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.admin_id = get_current_admin_id()));

-- GRN_ITEMS
DROP POLICY IF EXISTS "Authenticated users can view grn_items" ON public.grn_items;
DROP POLICY IF EXISTS "Authenticated users can insert grn_items" ON public.grn_items;

CREATE POLICY "Tenant users can view grn_items" ON public.grn_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.goods_received_notes g WHERE g.id = grn_id AND g.admin_id = get_current_admin_id()));
CREATE POLICY "Tenant users can insert grn_items" ON public.grn_items
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.goods_received_notes g WHERE g.id = grn_id AND g.admin_id = get_current_admin_id()));

-- PURCHASE_ORDER_ITEMS
DROP POLICY IF EXISTS "Authenticated users can view purchase_order_items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Authenticated users can insert purchase_order_items" ON public.purchase_order_items;

CREATE POLICY "Tenant users can view purchase_order_items" ON public.purchase_order_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = po_id AND po.admin_id = get_current_admin_id()));
CREATE POLICY "Tenant users can insert purchase_order_items" ON public.purchase_order_items
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = po_id AND po.admin_id = get_current_admin_id()));

-- Update deduct_stock_atomic to include admin_id in stock_movements
CREATE OR REPLACE FUNCTION public.deduct_stock_atomic(p_medicine_id uuid, p_quantity integer, p_sale_id uuid, p_reference_number text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_medicine_name TEXT;
  v_admin_id UUID;
BEGIN
  SELECT stock, name, admin_id INTO v_current_stock, v_medicine_name, v_admin_id
  FROM public.medicines
  WHERE id = p_medicine_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Medicine not found');
  END IF;

  IF v_current_stock < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', format('Insufficient stock for %s. Available: %s, Requested: %s', v_medicine_name, v_current_stock, p_quantity));
  END IF;

  v_new_stock := v_current_stock - p_quantity;

  UPDATE public.medicines SET stock = v_new_stock, updated_at = now() WHERE id = p_medicine_id;

  INSERT INTO public.stock_movements (medicine_id, sale_id, movement_type, quantity_before, quantity_change, quantity_after, reference_number, admin_id)
  VALUES (p_medicine_id, p_sale_id, 'sale', v_current_stock, -p_quantity, v_new_stock, p_reference_number, v_admin_id);

  RETURN jsonb_build_object('success', true, 'quantity_before', v_current_stock, 'quantity_after', v_new_stock);
END;
$$;
