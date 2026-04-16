import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { SupplierFormDialog } from './SupplierFormDialog';
import { useSuppliers, Supplier } from '@/hooks/useSuppliers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { maskPhone, maskEmail, maskGST } from '@/lib/maskData';
import { MaskToggle } from '@/components/ui/MaskToggle';

export const SuppliersList = ({ searchFilter = '' }: { searchFilter?: string }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const { suppliers, loading, refetch } = useSuppliers();
  const { toast } = useToast();

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteSupplier) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', deleteSupplier.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Supplier deleted successfully",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete supplier",
        variant: "destructive",
      });
    } finally {
      setDeleteSupplier(null);
    }
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingSupplier(null);
  };

  const handleSuccess = () => {
    handleClose();
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Suppliers</h2>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>GST Number</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : (() => {
              const filtered = suppliers.filter(s => {
                if (!searchFilter.trim()) return true;
                const term = searchFilter.toLowerCase();
                return s.name.toLowerCase().includes(term) ||
                  (s.contact_person || '').toLowerCase().includes(term) ||
                  (s.phone || '').includes(term) ||
                  (s.email || '').toLowerCase().includes(term);
              });
              if (filtered.length === 0) return (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {searchFilter ? 'No matching suppliers found' : 'No suppliers found'}
                  </TableCell>
                </TableRow>
              );
              return filtered.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.contact_person || '-'}</TableCell>
                  <TableCell>
                    <MaskToggle maskedValue={maskPhone(supplier.phone)} originalValue={supplier.phone || '-'} auditResource="supplier" auditId={supplier.id} auditField="phone" />
                  </TableCell>
                  <TableCell>
                    <MaskToggle maskedValue={maskEmail(supplier.email)} originalValue={supplier.email || '-'} auditResource="supplier" auditId={supplier.id} auditField="email" />
                  </TableCell>
                  <TableCell>
                    <MaskToggle maskedValue={maskGST(supplier.gst_number)} originalValue={supplier.gst_number || '-'} auditResource="supplier" auditId={supplier.id} auditField="gst_number" />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(supplier)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteSupplier(supplier)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ));
            })()}
          </TableBody>
        </Table>
      </Card>

      <SupplierFormDialog
        isOpen={isFormOpen}
        onClose={handleClose}
        onSuccess={handleSuccess}
        supplier={editingSupplier}
      />

      <AlertDialog open={!!deleteSupplier} onOpenChange={() => setDeleteSupplier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the supplier "{deleteSupplier?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
