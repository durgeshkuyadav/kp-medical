-- Add shop details fields to admin_registrations table
ALTER TABLE public.admin_registrations
ADD COLUMN IF NOT EXISTS shop_address text,
ADD COLUMN IF NOT EXISTS drug_license_number text,
ADD COLUMN IF NOT EXISTS gst_number text;