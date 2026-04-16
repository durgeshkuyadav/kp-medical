import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useMedicines } from '@/hooks/useMedicines';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getAdminId } from '@/hooks/useAdminId';
import { Plus, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface NewGRNDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface GRNItem {
  medicine_id: string;
  medicine_name: string;
  quantity: number;
  price: number;
  batch_number: string;
  expiry_date: string;
  total: number;
}

export const NewGRNDialog = ({ isOpen, onClose, onSuccess }: NewGRNDialogProps) => {
  const { suppliers } = useSuppliers();
  const { medicines } = useMedicines();
  const { purchaseOrders } = usePurchaseOrders();
  const { toast } = useToast();
  const [supplierId, setSupplierId] = useState('');
  const [poId, setPoId] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<GRNItem[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('0');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const addItem = () => {
    const medicine = medicines.find(m => m.id === selectedMedicine);
    if (!medicine || !quantity || !price || !batchNumber || !expiryDate) {
      toast({
        title: "Error",
        description: "Please fill all item fields",
        variant: "destructive",
      });
      return;
    }

    const qty = parseInt(quantity);
    const unitPrice = parseFloat(price);
    const total = qty * unitPrice;

    const newItem: GRNItem = {
      medicine_id: medicine.id,
      medicine_name: medicine.name,
      quantity: qty,
      price: unitPrice,
      batch_number: batchNumber,
      expiry_date: expiryDate,
      total,
    };

    setItems([...items, newItem]);
    setSelectedMedicine('');
    setQuantity('1');
    setPrice('0');
    setBatchNumber('');
    setExpiryDate('');
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
      const grnNumber = `GRN-${Date.now()}`;

      const adminId = await getAdminId();
      const { data: grn, error: grnError } = await supabase
        .from('goods_received_notes')
        .insert([{
          grn_number: grnNumber,
          supplier_id: supplierId,
          supplier_name: suppliers.find(s => s.id === supplierId)?.name || 'Unknown',
          po_id: poId || null,
          total: totalAmount,
          notes,
          admin_id: adminId,
        }] as any)
        .select()
        .single();

      if (grnError) throw grnError;

      const grnItems = items.map(item => ({
        grn_id: grn.id,
        medicine_id: item.medicine_id,
        medicine_name: item.medicine_name,
        quantity: item.quantity,
        price: item.price,
        batch_number: item.batch_number,
        expiry_date: item.expiry_date,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from('grn_items')
        .insert(grnItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: `GRN ${grnNumber} created successfully and stock updated`,
      });

      onSuccess?.();
      onClose();

      // Reset form
      setSupplierId('');
      setPoId('');
      setReceivedDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setItems([]);
    } catch (error) {
      console.error('Error creating GRN:', error);
      toast({
        title: "Error",
        description: "Failed to create GRN",
        variant: "destructive",
      });
    }
  };

  const filteredPOs = purchaseOrders.filter(po => 
    !supplierId || po.supplier_id === supplierId
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Goods Received Note</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
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
              <Label>Purchase Order (Optional)</Label>
              <Select value={poId} onValueChange={setPoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select PO" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPOs.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.po_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Received Date *</Label>
              <Input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                required
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
            <div className="grid grid-cols-6 gap-2">
              <div className="col-span-2">
                <Select value={selectedMedicine} onValueChange={setSelectedMedicine}>
                  <SelectTrigger>
                    <SelectValue placeholder="Medicine" />
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
                placeholder="Qty"
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
              <Input
                placeholder="Batch"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
              />
              <Input
                type="date"
                placeholder="Expiry"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
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
                  <TableHead>Qty</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
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
                    <TableCell>{item.batch_number}</TableCell>
                    <TableCell>{item.expiry_date}</TableCell>
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
                  <TableCell colSpan={5} className="text-right font-bold">Grand Total:</TableCell>
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
            <Button type="submit">Create GRN</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
