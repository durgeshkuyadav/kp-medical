import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useMedicines } from '@/hooks/useMedicines';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getAdminId } from '@/hooks/useAdminId';
import { Plus, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface NewPurchaseOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface POItem {
  medicine_id: string;
  medicine_name: string;
  quantity: number;
  price: number;
  total: number;
}

export const NewPurchaseOrderDialog = ({ isOpen, onClose, onSuccess }: NewPurchaseOrderDialogProps) => {
  const { suppliers } = useSuppliers();
  const { medicines } = useMedicines();
  const { toast } = useToast();
  const [supplierId, setSupplierId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<POItem[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('0');

  const addItem = () => {
    const medicine = medicines.find(m => m.id === selectedMedicine);
    if (!medicine || !quantity || !price) return;

    const qty = parseInt(quantity);
    const unitPrice = parseFloat(price);
    const total = qty * unitPrice;

    const newItem: POItem = {
      medicine_id: medicine.id,
      medicine_name: medicine.name,
      quantity: qty,
      price: unitPrice,
      total,
    };

    setItems([...items, newItem]);
    setSelectedMedicine('');
    setQuantity('1');
    setPrice('0');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId || items.length === 0) {
      toast({
        title: "Error",
        description: "Please select a supplier and add at least one item",
        variant: "destructive",
      });
      return;
    }

    try {
      const poNumber = `PO-${Date.now()}`;

      const adminId = await getAdminId();
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert([{
          po_number: poNumber,
          supplier_id: supplierId,
          supplier_name: suppliers.find(s => s.id === supplierId)?.name || 'Unknown',
          total: totalAmount,
          expected_date: expectedDeliveryDate || null,
          notes,
          status: 'pending',
          admin_id: adminId,
        }] as any)
        .select()
        .single();

      if (poError) throw poError;

      const poItems = items.map(item => ({
        po_id: po.id,
        medicine_id: item.medicine_id,
        medicine_name: item.medicine_name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(poItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: `Purchase Order ${poNumber} created successfully`,
      });

      onSuccess?.();
      onClose();

      // Reset form
      setSupplierId('');
      setExpectedDeliveryDate('');
      setNotes('');
      setItems([]);
    } catch (error) {
      console.error('Error creating purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Purchase Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supplier *</Label>
              <Select value={supplierId} onValueChange={setSupplierId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Expected Delivery Date</Label>
              <Input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>

          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Add Items</h3>
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-2">
                <Select value={selectedMedicine} onValueChange={setSelectedMedicine}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select medicine" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicines.map((medicine) => (
                      <SelectItem key={medicine.id} value={medicine.id}>
                        {medicine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="number"
                placeholder="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
              />
              <Input
                type="number"
                placeholder="Price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <Button type="button" onClick={addItem} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          {items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.medicine_name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>₹{item.price.toFixed(2)}</TableCell>
                    <TableCell>₹{item.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold">Grand Total:</TableCell>
                  <TableCell className="font-bold">₹{totalAmount.toFixed(2)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Purchase Order</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
