import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { NewGRNDialog } from './NewGRNDialog';
import { useGRNs } from '@/hooks/useGRNs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';

export const GoodsReceivedNotes = () => {
  const [isNewGRNOpen, setIsNewGRNOpen] = useState(false);
  const { grns, loading, refetch } = useGRNs();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Goods Received Notes</h2>
        <Button onClick={() => setIsNewGRNOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New GRN
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>GRN Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Received Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : grns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No GRNs found
                </TableCell>
              </TableRow>
            ) : (
              grns.map((grn) => (
                <TableRow key={grn.id}>
                  <TableCell className="font-medium">{grn.grn_number}</TableCell>
                  <TableCell>{grn.supplier_name}</TableCell>
                  <TableCell>{format(new Date(grn.received_date), 'PPP')}</TableCell>
                  <TableCell>₹{grn.total.toFixed(2)}</TableCell>
                  <TableCell className="max-w-xs truncate">{grn.notes || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <NewGRNDialog
        isOpen={isNewGRNOpen}
        onClose={() => setIsNewGRNOpen(false)}
        onSuccess={refetch}
      />
    </div>
  );
};
