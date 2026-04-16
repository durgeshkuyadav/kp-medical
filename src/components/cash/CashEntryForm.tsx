import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminId } from '@/hooks/useAdminId';

interface CashEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CashEntryForm = ({ isOpen, onClose, onSuccess }: CashEntryFormProps) => {
  const { toast } = useToast();
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const adminId = await getAdminId();
      const { error } = await (supabase as any)
        .from('cash_entries')
        .insert({
          type,
          amount: parseFloat(amount),
          description,
          category,
          admin_id: adminId,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cash entry added successfully",
      });

      setType('income');
      setAmount('');
      setDescription('');
      setCategory('');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding cash entry:', error);
      toast({
        title: "Error",
        description: "Failed to add cash entry",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby="cash-entry-desc">
        <DialogHeader>
          <DialogTitle>Add Cash Entry</DialogTitle>
          <DialogDescription id="cash-entry-desc">Record a manual income or expense for cash management.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Sales, Utilities, Supplies"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the transaction"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};