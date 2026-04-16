import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMedicineBatches } from '@/hooks/useMedicineBatches';
import { format, differenceInDays } from 'date-fns';
import { Pencil, Trash2, Save, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BatchManagementProps {
  medicineId: string;
  medicineName: string;
}

export const BatchManagement = ({ medicineId, medicineName }: BatchManagementProps) => {
  const { batches, loading, updateBatchStock, deleteBatch } = useMedicineBatches(medicineId);
  const [editingBatch, setEditingBatch] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<number>(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const getExpiryStatus = (expiryDate: string) => {
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return { label: 'Expired', variant: 'destructive' as const };
    if (days <= 30) return { label: `${days} days left`, variant: 'destructive' as const };
    if (days <= 90) return { label: `${days} days left`, variant: 'secondary' as const };
    return { label: `${days} days left`, variant: 'default' as const };
  };

  const handleEdit = (batchId: string, currentStock: number) => {
    setEditingBatch(batchId);
    setEditStock(currentStock);
  };

  const handleSave = async (batchId: string) => {
    await updateBatchStock(batchId, editStock);
    setEditingBatch(null);
  };

  const handleCancel = () => {
    setEditingBatch(null);
    setEditStock(0);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteBatch(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Details - {medicineName}</CardTitle>
        <CardDescription>Manage individual batches with expiry dates and stock levels</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-4">Loading batches...</p>
        ) : batches.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No batches found for this medicine</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Number</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Purchase Price</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => {
                const expiryStatus = getExpiryStatus(batch.expiry_date);
                const isEditing = editingBatch === batch.id;

                return (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.batch_number}</TableCell>
                    <TableCell>{format(new Date(batch.expiry_date), 'PPP')}</TableCell>
                    <TableCell>
                      <Badge variant={expiryStatus.variant}>{expiryStatus.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editStock}
                          onChange={(e) => setEditStock(parseInt(e.target.value) || 0)}
                          className="w-20"
                          min="0"
                        />
                      ) : (
                        <Badge variant={batch.stock === 0 ? 'destructive' : 'outline'}>
                          {batch.stock}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>₹{batch.purchase_price.toFixed(2)}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleSave(batch.id)}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(batch.id, batch.stock)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteConfirm(batch.id)}
                            disabled={batch.stock > 0}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Batch?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this batch. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
