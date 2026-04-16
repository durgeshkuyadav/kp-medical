import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMedicines } from '@/hooks/useMedicines';
import { usePatients } from '@/hooks/usePatients';
import { useShopSettings } from '@/hooks/useShopSettings';
import { Trash2, Plus, Printer, AlertCircle, Smartphone } from 'lucide-react';
import { InvoicePrint } from './InvoicePrint';
import { patientSchema } from '@/lib/validations';
import { z } from 'zod';
import { getAdminId } from '@/hooks/useAdminId';

interface SaleItem {
  medicine_id: string;
  medicine_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  price: number;
  total: number;
}

interface NewSaleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewSaleForm = ({ isOpen, onClose, onSuccess }: NewSaleFormProps) => {
  const { toast } = useToast();
  const { medicines } = useMedicines();
  const { patients, refetch: refetchPatients } = usePatients();
  const { settings } = useShopSettings();
  
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSaleId, setSavedSaleId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ name?: string; phone?: string }>({});
  const [upiPaymentPending, setUpiPaymentPending] = useState(false);

  const addItem = () => {
    setItems([...items, {
      medicine_id: '',
      medicine_name: '',
      batch_number: '',
      expiry_date: '',
      quantity: 1,
      price: 0,
      total: 0
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'medicine_id') {
      const medicine = medicines.find(m => m.id === value);
      if (medicine) {
        newItems[index].medicine_name = medicine.name;
        newItems[index].batch_number = medicine.batch_number;
        newItems[index].expiry_date = medicine.expiry_date;
        newItems[index].price = Number(medicine.price);
        // Auto-calculate total when medicine is selected
        newItems[index].total = newItems[index].quantity * Number(medicine.price);
      }
    }
    
    if (field === 'quantity' || field === 'price') {
      newItems[index].total = newItems[index].quantity * newItems[index].price;
    }
    
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const roundOff = Math.round(subtotal - discount) - (subtotal - discount);
  const grandTotal = Math.round(subtotal - discount);
  const initiateUpiPayment = async (saleId: string, amount: number, customerName: string) => {
    try {
      setUpiPaymentPending(true);
      const { data, error } = await supabase.functions.invoke('create-upi-payment', {
        body: { amount, saleId, customerName, description: `Sale payment - ${customerName}` },
      });
      if (error) throw new Error(error.message || 'Failed to create payment');
      const { orderId, keyId } = data;

      if (!(window as any).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Razorpay'));
          document.head.appendChild(script);
        });
      }

      const options = {
        key: keyId,
        amount: Math.round(amount * 100),
        currency: 'INR',
        name: settings?.shop_name || 'Medical Shop',
        description: 'Payment for sale',
        order_id: orderId,
        prefill: { name: customerName },
        method: { upi: true, card: false, netbanking: false, wallet: false },
        handler: async (response: any) => {
          try {
            const { error: verifyError } = await supabase.functions.invoke('verify-upi-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                saleId,
              },
            });
            if (verifyError) throw new Error(verifyError.message);
            toast({ title: 'UPI Payment Verified', description: 'Payment received successfully!' });
            setSavedSaleId(saleId);
            onSuccess();
          } catch (err: any) {
            toast({ title: 'Verification Failed', description: err.message, variant: 'destructive' });
          } finally {
            setUpiPaymentPending(false);
          }
        },
        modal: {
          ondismiss: () => {
            setUpiPaymentPending(false);
            toast({ title: 'Payment Cancelled', description: 'UPI payment was cancelled. Sale saved as pending.' });
            setSavedSaleId(saleId);
            onSuccess();
          },
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      setUpiPaymentPending(false);
      toast({ title: 'UPI Payment Error', description: err.message, variant: 'destructive' });
      setSavedSaleId(saleId);
      onSuccess();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item",
        variant: "destructive",
      });
      return;
    }

    // Validate patient data with Zod
    setValidationErrors({});
    try {
      patientSchema.parse({ name: patientName, phone: patientPhone });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: { name?: string; phone?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === 'name') {
            errors.name = err.message;
          } else if (err.path[0] === 'phone') {
            errors.phone = err.message;
          }
        });
        setValidationErrors(errors);
        toast({
          title: "Validation Error",
          description: "Please fix the patient information errors",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // First check stock availability for all items
      for (const item of items) {
        if (!item.medicine_id) continue;
        const medicine = medicines.find(m => m.id === item.medicine_id);
        if (medicine && medicine.stock < item.quantity) {
          toast({
            title: "Insufficient Stock",
            description: `Not enough stock for ${item.medicine_name}. Available: ${medicine.stock}, Requested: ${item.quantity}`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }

      const adminId = await getAdminId();

      // Create or get patient
      let finalPatientId = patientId;
      
      if (!patientId && patientName && patientPhone) {
        const { data: newPatient, error: patientError } = await supabase
          .from('patients')
          .insert({
            name: patientName,
            phone: patientPhone,
            admin_id: adminId,
          } as any)
          .select()
          .single();

        if (patientError) throw patientError;
        finalPatientId = newPatient.id;
        refetchPatients();
      }

      // Generate invoice number
      const { data: invoiceData, error: invoiceError } = await supabase
        .rpc('generate_invoice_number');

      if (invoiceError) throw invoiceError;

      const saleStatus = paymentMethod === 'upi' ? 'pending_payment' : 'completed';

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          patient_id: finalPatientId || null,
          patient_name: patientName,
          total: grandTotal,
          discount: discount,
          payment_method: paymentMethod,
          status: saleStatus,
          invoice_number: invoiceData,
          admin_id: adminId,
        } as any)
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = items.map(item => ({
        sale_id: saleData.id,
        medicine_id: item.medicine_id,
        medicine_name: item.medicine_name,
        quantity: item.quantity,
        price: item.price,
        total: item.total
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Process atomic stock deduction
      const { data: stockResult, error: stockError } = await supabase
        .rpc('process_sale_stock', { p_sale_id: saleData.id });

      if (stockError) {
        console.error('Stock deduction error:', stockError);
        toast({
          title: "Warning",
          description: "Sale saved but stock deduction failed. Please check inventory.",
          variant: "destructive",
        });
      } else if (stockResult && !(stockResult as any).success) {
        toast({
          title: "Stock Error",
          description: (stockResult as any).error || "Failed to deduct stock",
          variant: "destructive",
        });
      }

      // If UPI payment, initiate Razorpay checkout
      if (paymentMethod === 'upi') {
        await initiateUpiPayment(saleData.id, grandTotal, patientName);
      } else {
        setSavedSaleId(saleData.id);
        toast({
          title: "Success",
          description: "Sale created successfully",
        });
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error creating sale:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create sale",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePatientChange = (patientId: string) => {
    if (patientId === 'new') {
      setPatientId('');
      setPatientName('');
      setPatientPhone('');
    } else {
      setPatientId(patientId);
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        setPatientName(patient.name);
        setPatientPhone(patient.phone);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      refetchPatients();
    }
  }, [isOpen, refetchPatients]);

  const handlePrintAndClose = () => {
    setSavedSaleId(null);
    setPatientId('');
    setPatientName('');
    setPatientPhone('');
    setPaymentMethod('cash');
    setItems([]);
    setDiscount(0);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Sale</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Existing Patient</Label>
                <Select value={patientId} onValueChange={handlePatientChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select existing or enter new patient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">+ Add New Patient</SelectItem>
                    {patients.map(patient => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name} - {patient.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patient Name *</Label>
                <Input
                  value={patientName}
                  onChange={(e) => {
                    setPatientName(e.target.value);
                    if (validationErrors.name) {
                      setValidationErrors(prev => ({ ...prev, name: undefined }));
                    }
                  }}
                  placeholder="Enter patient name"
                  className={validationErrors.name ? 'border-destructive' : ''}
                />
                {validationErrors.name && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input
                  value={patientPhone}
                  onChange={(e) => {
                    setPatientPhone(e.target.value);
                    if (validationErrors.phone) {
                      setValidationErrors(prev => ({ ...prev, phone: undefined }));
                    }
                  }}
                  placeholder="Enter phone number"
                  className={validationErrors.phone ? 'border-destructive' : ''}
                />
                {validationErrors.phone && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Items</h3>
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-4 border rounded">
                  <div className="col-span-3">
                    <Label className="text-xs">Medicine</Label>
                    <Select
                      value={item.medicine_id}
                      onValueChange={(v) => updateItem(index, 'medicine_id', v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {medicines.map(med => (
                          <SelectItem key={med.id} value={med.id}>
                            {med.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Batch</Label>
                    <Input value={item.batch_number} disabled className="h-9" />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Expiry</Label>
                    <Input value={item.expiry_date} disabled className="h-9" />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="h-9"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Amount</Label>
                    <Input value={item.total.toFixed(2)} disabled className="h-9" />
                  </div>

                  <div className="col-span-1 flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="h-9"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 bg-muted p-4 rounded">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <Label>Discount:</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-32"
                />
              </div>
              <div className="flex justify-between text-sm">
                <span>Round Off:</span>
                <span>₹{roundOff.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Grand Total:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save & Print'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {savedSaleId && (
        <InvoicePrint
          saleId={savedSaleId}
          onClose={handlePrintAndClose}
        />
      )}
    </>
  );
};
