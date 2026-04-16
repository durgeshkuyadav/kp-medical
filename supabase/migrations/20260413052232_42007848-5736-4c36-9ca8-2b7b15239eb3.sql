
-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Backfill shop names for existing managers from their admin's shop_settings
UPDATE profiles p
SET shop_name = ss.shop_name
FROM manager_admin_mapping mam
JOIN shop_settings ss ON ss.admin_id = mam.admin_id
WHERE p.user_id = mam.manager_id
AND p.shop_name IS NULL
AND ss.shop_name IS NOT NULL;
