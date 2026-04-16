-- Fix default prices on subscriptions table
ALTER TABLE public.subscriptions ALTER COLUMN monthly_price SET DEFAULT 599.00;
ALTER TABLE public.subscriptions ALTER COLUMN yearly_price SET DEFAULT 6999.00;

-- Update existing subscriptions that have the old wrong prices
UPDATE public.subscriptions SET monthly_price = 599.00 WHERE monthly_price = 999.00;
UPDATE public.subscriptions SET yearly_price = 6999.00 WHERE yearly_price = 9999.00;