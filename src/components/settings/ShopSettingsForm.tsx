import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useShopSettings } from '@/hooks/useShopSettings';
import { Store, Save, Upload, X, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export const ShopSettingsForm = () => {
  const { settings, loading, updateSettings } = useShopSettings();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    shop_name: '',
    gst_number: '',
    drug_license_number: '',
    address: '',
    phone: '',
    email: '',
    upi_id: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        shop_name: settings.shop_name || '',
        gst_number: settings.gst_number || '',
        drug_license_number: settings.drug_license_number || '',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        upi_id: settings.upi_id || '',
      });
      setLogoPreview(settings.logo_url || null);
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload PNG, JPG, WebP, or SVG.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      toast({ title: 'File too large', description: 'Logo must be under 2MB.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `${user.id}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('shop-logos')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('shop-logos')
        .getPublicUrl(filePath);

      // Append cache-bust to force refresh
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      setLogoPreview(urlWithCacheBust);

      await updateSettings({ logo_url: publicUrl });

      toast({ title: 'Logo uploaded', description: 'Your shop logo has been updated.' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // List and remove existing files
      const { data: files } = await supabase.storage.from('shop-logos').list(user.id);
      if (files && files.length > 0) {
        await supabase.storage.from('shop-logos').remove(files.map(f => `${user.id}/${f.name}`));
      }

      setLogoPreview(null);
      await updateSettings({ logo_url: null });
      toast({ title: 'Logo removed' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings(formData);
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="w-5 h-5" />
          Shop Information
        </CardTitle>
        <CardDescription>
          Update your shop details, GST information, and license details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-3">
            <Label>Shop Logo</Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted/30">
                {logoPreview ? (
                  <img src={logoPreview} alt="Shop logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload Logo'}
                </Button>
                {logoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isUploading}
                    onClick={handleRemoveLogo}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">PNG, JPG, WebP or SVG. Max 2MB.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shop_name">Shop Name *</Label>
              <Input
                id="shop_name"
                name="shop_name"
                value={formData.shop_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gst_number">GST Number</Label>
              <Input
                id="gst_number"
                name="gst_number"
                value={formData.gst_number}
                onChange={handleChange}
                placeholder="e.g., 29ABCDE1234F1Z5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drug_license_number">Drug License Number</Label>
              <Input
                id="drug_license_number"
                name="drug_license_number"
                value={formData.drug_license_number}
                onChange={handleChange}
                placeholder="e.g., DL-12345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upi_id">UPI ID</Label>
              <Input
                id="upi_id"
                name="upi_id"
                value={formData.upi_id}
                onChange={handleChange}
                placeholder="e.g., shopname@upi"
              />
              <p className="text-xs text-muted-foreground">Used for UPI payment collection during sales</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};