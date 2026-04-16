import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSales } from "@/hooks/useSales";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { useState } from "react";
import { InvoicePrint } from "@/components/sales/InvoicePrint";

const Invoices = () => {
  const { sales, loading } = useSales();
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading invoices...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            View and manage all sales invoices
          </p>
        </div>
        
        <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-mono">
                    INV{sale.id.substring(0, 8).toUpperCase()}
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
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedSaleId(sale.id)}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {selectedSaleId && (
        <InvoicePrint
          saleId={selectedSaleId}
          onClose={() => setSelectedSaleId(null)}
        />
      )}
    </MainLayout>
  );
};

export default Invoices;
