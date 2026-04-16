import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { useSales } from "@/hooks/useSales";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const Orders = () => {
  const { sales, loading } = useSales();

  const pendingOrders = sales.filter(s => s.status === 'pending');
  const completedOrders = sales.filter(s => s.status === 'completed');

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            Manage customer orders and prescriptions
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Pending Orders</p>
              <p className="text-3xl font-bold">{pendingOrders.length}</p>
            </div>
          </Card>
          <Card className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Completed Orders</p>
              <p className="text-3xl font-bold">{completedOrders.length}</p>
            </div>
          </Card>
        </div>
        
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">All Orders</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-mono">
                    ORD{sale.id.substring(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell>{format(new Date(sale.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{sale.patient_name}</TableCell>
                  <TableCell>{sale.items.length} items</TableCell>
                  <TableCell className="font-semibold">₹{sale.total.toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{sale.payment_method}</TableCell>
                  <TableCell>
                    <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'}>
                      {sale.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Orders;
