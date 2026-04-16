-- Create enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('monthly', 'yearly');

-- Create enum for admin status
CREATE TYPE public.admin_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Create admin_registrations table for approval workflow
CREATE TABLE public.admin_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  shop_name TEXT,
  status admin_status NOT NULL DEFAULT 'pending',
  approval_token UUID DEFAULT gen_random_uuid(),
  rejection_reason TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL UNIQUE,
  plan subscription_plan NOT NULL DEFAULT 'monthly',
  monthly_price NUMERIC NOT NULL DEFAULT 999.00,
  yearly_price NUMERIC NOT NULL DEFAULT 9999.00,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  grace_period_end TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  razorpay_customer_id TEXT,
  razorpay_subscription_id TEXT,
  payment_method TEXT CHECK (payment_method IN ('stripe', 'razorpay')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tenant_schemas table to track each admin's schema
CREATE TABLE public.tenant_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL UNIQUE,
  schema_name TEXT NOT NULL UNIQUE,
  is_initialized BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment_history table
CREATE TABLE public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT NOT NULL,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.admin_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_registrations
CREATE POLICY "Users can view their own registration"
ON public.admin_registrations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own registration"
ON public.admin_registrations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all registrations"
ON public.admin_registrations FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for subscriptions
CREATE POLICY "Admins can view their own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = admin_id);

CREATE POLICY "Service role can manage subscriptions"
ON public.subscriptions FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for tenant_schemas
CREATE POLICY "Admins can view their own schema info"
ON public.tenant_schemas FOR SELECT
USING (auth.uid() = admin_id);

CREATE POLICY "Service role can manage schemas"
ON public.tenant_schemas FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for payment_history
CREATE POLICY "Admins can view their payment history"
ON public.payment_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.subscriptions s 
    WHERE s.id = subscription_id AND s.admin_id = auth.uid()
  )
);

-- Create function to check if admin is approved and has active subscription
CREATE OR REPLACE FUNCTION public.is_admin_active(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_registrations ar
    JOIN public.subscriptions s ON ar.user_id = s.admin_id
    WHERE ar.user_id = _user_id
      AND ar.status = 'approved'
      AND (
        s.is_active = true 
        OR (s.grace_period_end IS NOT NULL AND s.grace_period_end > now())
      )
  )
$$;

-- Create function to get admin's schema name
CREATE OR REPLACE FUNCTION public.get_admin_schema(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT schema_name FROM public.tenant_schemas WHERE admin_id = _user_id
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_admin_registrations_updated_at
BEFORE UPDATE ON public.admin_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_schemas_updated_at
BEFORE UPDATE ON public.tenant_schemas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();