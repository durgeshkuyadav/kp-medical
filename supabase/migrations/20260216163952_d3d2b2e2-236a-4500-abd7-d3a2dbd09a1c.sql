
-- Allow managers to view their admin's subscription
CREATE POLICY "Managers can view admin subscription"
ON public.subscriptions
FOR SELECT
USING (
  admin_id IN (
    SELECT admin_id FROM public.manager_admin_mapping WHERE manager_id = auth.uid()
  )
);
