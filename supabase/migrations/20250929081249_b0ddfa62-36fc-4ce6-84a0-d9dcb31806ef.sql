-- Manually create profile for existing user
INSERT INTO public.user_profiles (user_id, email, full_name, role, phone)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', 'Admin User'), 
  'admin',
  raw_user_meta_data->>'phone'
FROM auth.users 
WHERE email = 'durgeshyadavalld@gmail.com' 
AND NOT EXISTS (
  SELECT 1 FROM public.user_profiles WHERE user_id = auth.users.id
);