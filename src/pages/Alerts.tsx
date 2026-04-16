import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMedicines } from "@/hooks/useMedicines";
import { AlertTriangle, Calendar } from "lucide-react";
import { differenceInDays } from "date-fns";

const Alerts = () => {
  const { medicines } = useMedicines();

  const lowStockMedicines = medicines.filter(m => m.stock <= m.min_stock);
  const expiringMedicines = medicines.filter(m => {
    const daysUntilExpiry = differenceInDays(new Date(m.expiry_date), new Date());
    return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
  });
  const expiredMedicines = medicines.filter(m => {
    const daysUntilExpiry = differenceInDays(new Date(m.expiry_date), new Date());
    return daysUntilExpiry <= 0;
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">
            Monitor stock levels and expiry dates
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold">{lowStockMedicines.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold">{expiringMedicines.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold">{expiredMedicines.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {expiredMedicines.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Expired Medicines
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiredMedicines.map((medicine) => (
                  <TableRow key={medicine.id}>
                    <TableCell className="font-medium">{medicine.name}</TableCell>
                    <TableCell>{medicine.batch_number}</TableCell>
                    <TableCell>{medicine.stock}</TableCell>
                    <TableCell>{medicine.expiry_date}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">Expired</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {lowStockMedicines.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Low Stock Medicines
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Minimum Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockMedicines.map((medicine) => (
                  <TableRow key={medicine.id}>
                    <TableCell className="font-medium">{medicine.name}</TableCell>
                    <TableCell>{medicine.stock}</TableCell>
                    <TableCell>{medicine.min_stock}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">Low Stock</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {expiringMedicines.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              Expiring Soon (Within 90 Days)
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Days Left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringMedicines.map((medicine) => {
                  const daysLeft = differenceInDays(new Date(medicine.expiry_date), new Date());
                  return (
                    <TableRow key={medicine.id}>
                      <TableCell className="font-medium">{medicine.name}</TableCell>
                      <TableCell>{medicine.batch_number}</TableCell>
                      <TableCell>{medicine.stock}</TableCell>
                      <TableCell>{medicine.expiry_date}</TableCell>
                      <TableCell>
                        <Badge variant={daysLeft <= 30 ? "destructive" : "secondary"}>
                          {daysLeft} days
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Alerts;
