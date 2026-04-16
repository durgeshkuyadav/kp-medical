-- Allow super admin to view all payment history
CREATE POLICY "Super admin can view all payment history"
  ON public.payment_history
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admin to insert payment history (for reconciliation)
CREATE POLICY "Super admin can insert payment history"
  ON public.payment_history
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));