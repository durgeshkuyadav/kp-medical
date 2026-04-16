-- Critical Security Fixes for KP Medical Shop

-- Step 1: Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager');

-- Step 2: Create user_roles table with proper security
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 4: Migrate existing roles from user_profiles to user_roles
INSERT INTO public.user_roles (user_id, role, created_by)
SELECT 
  user_id,
  CASE 
    WHEN role = 'admin' THEN 'admin'::app_role
    ELSE 'manager'::app_role
  END,
  created_by
FROM public.user_profiles
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: Drop the insecure policies on all tables
DROP POLICY IF EXISTS "Allow all operations on patients" ON public.patients;
DROP POLICY IF EXISTS "Allow all operations on medicines" ON public.medicines;
DROP POLICY IF EXISTS "Allow all operations on sales" ON public.sales;
DROP POLICY IF EXISTS "Allow all operations on sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Allow all operations on patient_medications" ON public.patient_medications;

-- Step 6: Create secure RLS policies for patients table
CREATE POLICY "Authenticated staff can view patients"
ON public.patients
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Authenticated staff can insert patients"
ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Authenticated staff can update patients"
ON public.patients
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Only admins can delete patients"
ON public.patients
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 7: Create secure RLS policies for patient_medications table
CREATE POLICY "Authenticated staff can view patient medications"
ON public.patient_medications
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Authenticated staff can insert patient medications"
ON public.patient_medications
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Authenticated staff can update patient medications"
ON public.patient_medications
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Only admins can delete patient medications"
ON public.patient_medications
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 8: Create secure RLS policies for sales table
CREATE POLICY "Authenticated staff can view sales"
ON public.sales
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Authenticated staff can insert sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Authenticated staff can update sales"
ON public.sales
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Only admins can delete sales"
ON public.sales
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 9: Create secure RLS policies for sale_items table
CREATE POLICY "Authenticated staff can view sale items"
ON public.sale_items
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Authenticated staff can insert sale items"
ON public.sale_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Authenticated staff can update sale items"
ON public.sale_items
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Only admins can delete sale items"
ON public.sale_items
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 10: Create secure RLS policies for medicines table
CREATE POLICY "Authenticated staff can view medicines"
ON public.medicines
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Authenticated staff can insert medicines"
ON public.medicines
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Authenticated staff can update medicines"
ON public.medicines
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Only admins can delete medicines"
ON public.medicines
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 11: Create RLS policies for user_roles table (highly restrictive)
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only allow role assignment through admin functions (no direct INSERT/UPDATE/DELETE for users)
CREATE POLICY "Prevent direct role modifications"
ON public.user_roles
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Step 12: Update user_profiles RLS to prevent role column updates
-- Users can still view and update their profile, but role is now in separate table

-- Step 13: Create admin function to assign roles (security definer)
CREATE OR REPLACE FUNCTION public.assign_user_role(
  _user_id uuid,
  _role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can assign roles
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can assign roles';
  END IF;

  -- Insert or update the role
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (_user_id, _role, auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Step 14: Create admin function to remove roles
CREATE OR REPLACE FUNCTION public.remove_user_role(
  _user_id uuid,
  _role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can remove roles
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can remove roles';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND role = _role;
END;
$$;