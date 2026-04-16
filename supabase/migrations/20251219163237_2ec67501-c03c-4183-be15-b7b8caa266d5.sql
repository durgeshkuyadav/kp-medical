-- Create a function to set up super admin on first login
CREATE OR REPLACE FUNCTION public.setup_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the user email is the super admin email, assign super_admin role
  IF NEW.email = 'durgeshyadavalld@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_super_admin_signup ON auth.users;
CREATE TRIGGER on_super_admin_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.setup_super_admin();

-- Check if super admin already exists and add role
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'durgeshyadavalld@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Add RLS policy for super admin to view all registrations and subscriptions
CREATE POLICY "Super admin can view all registrations"
ON public.admin_registrations
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can update all registrations"
ON public.admin_registrations
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can view all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can update all subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));