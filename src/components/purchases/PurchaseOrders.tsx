import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { NewPurchaseOrderDialog } from './NewPurchaseOrderDialog';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export const PurchaseOrders = () => {
  const [isNewPOOpen, setIsNewPOOpen] = useState(false);
  const { purchaseOrders, loading, refetch } = usePurchaseOrders();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      received: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Purchase Orders</h2>
        <Button onClick={() => setIsNewPOOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Purchase Order
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Expected Delivery</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : purchaseOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No purchase orders found
                </TableCell>
              </TableRow>
            ) : (
              purchaseOrders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">{po.po_number}</TableCell>
                  <TableCell>{po.supplier_name}</TableCell>
                  <TableCell>{format(new Date(po.order_date), 'PPP')}</TableCell>
                  <TableCell>
                    {po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'PPP') : '-'}
                  </TableCell>
                  <TableCell>₹{po.total.toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(po.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <NewPurchaseOrderDialog
        isOpen={isNewPOOpen}
        onClose={() => setIsNewPOOpen(false)}
        onSuccess={refetch}
      />
    </div>
  );
};
