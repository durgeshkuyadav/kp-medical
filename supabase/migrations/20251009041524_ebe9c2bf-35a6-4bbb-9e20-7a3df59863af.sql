-- Update trigger to assign roles properly

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
BEGIN
  -- Determine role from metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'manager')::app_role;
  
  -- Insert user profile
  INSERT INTO public.user_profiles (user_id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert role into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;