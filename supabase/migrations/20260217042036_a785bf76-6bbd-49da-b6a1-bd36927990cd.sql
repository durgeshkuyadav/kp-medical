
-- Create storage bucket for shop logos
INSERT INTO storage.buckets (id, name, public) VALUES ('shop-logos', 'shop-logos', true);

-- Allow authenticated users to upload their own logo
CREATE POLICY "Users can upload shop logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'shop-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own logo
CREATE POLICY "Users can update shop logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'shop-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own logo
CREATE POLICY "Users can delete shop logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'shop-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to logos
CREATE POLICY "Shop logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'shop-logos');
