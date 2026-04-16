import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Supplier } from '@/hooks/useSuppliers';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getAdminId } from '@/hooks/useAdminId';

interface SupplierFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: Supplier | null;
}

export const SupplierFormDialog = ({ isOpen, onClose, onSuccess, supplier }: SupplierFormDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        phone: supplier.phone,
        email: supplier.email || '',
        address: supplier.address || '',
        gst_number: supplier.gst_number || '',
      });
    } else {
      setFormData({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        gst_number: '',
      });
    }
  }, [supplier, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (supplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(formData)
          .eq('id', supplier.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Supplier updated successfully",
        });
      } else {
        const adminId = await getAdminId();
        const { error } = await supabase
          .from('suppliers')
          .insert([{ ...formData, admin_id: adminId }] as any);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Supplier created successfully",
        });
      }

      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${supplier ? 'update' : 'create'} supplier`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit' : 'Add'} Supplier</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Supplier Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gst_number">GST Number</Label>
              <Input
                id="gst_number"
                value={formData.gst_number}
                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {supplier ? 'Update' : 'Create'} Supplier
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
