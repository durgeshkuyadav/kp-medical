-- Create user profiles table for authentication system
CREATE TABLE public.user_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager')),
  shop_name text,
  manager_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user profiles
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can create manager profiles" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update all profiles" 
ON public.user_profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id, 
    email, 
    full_name, 
    phone, 
    role
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'role', 'manager')
  );
  RETURN new;
END;
$$;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for updating timestamps
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();