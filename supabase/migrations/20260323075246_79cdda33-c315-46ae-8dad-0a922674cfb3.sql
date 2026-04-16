
ALTER TABLE public.medicines ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS upi_id TEXT;
