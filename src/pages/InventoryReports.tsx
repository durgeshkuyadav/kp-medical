import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMedicines } from "@/hooks/useMedicines";
import { useGRNs } from "@/hooks/useGRNs";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, isAfter, addMonths } from "date-fns";
import { AlertTriangle, TrendingDown, Package, Clock } from "lucide-react";

const InventoryReports = () => {
  const { medicines, lowStockMedicines, expiringMedicines } = useMedicines();
  const { grns } = useGRNs();
  const { purchaseOrders } = usePurchaseOrders();

  const totalInventoryValue = medicines.reduce((sum, med) => sum + (med.stock * med.price), 0);
  const outOfStockCount = medicines.filter(m => m.stock === 0).length;

  const supplierAnalysis = grns.reduce((acc, grn) => {
    if (!acc[grn.supplier_name]) {
      acc[grn.supplier_name] = { count: 0, total: 0 };
    }
    acc[grn.supplier_name].count++;
    acc[grn.supplier_name].total += grn.total;
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Reports</h1>
          <p className="text-muted-foreground">
            Track stock levels, expiry dates, and supplier performance
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalInventoryValue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockMedicines.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{outOfStockCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expiringMedicines.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="reorder" className="w-full">
          <TabsList>
            <TabsTrigger value="reorder">Reorder Levels</TabsTrigger>
            <TabsTrigger value="expiry">Expiry Tracking</TabsTrigger>
            <TabsTrigger value="suppliers">Supplier Analysis</TabsTrigger>
            <TabsTrigger value="movement">Stock Movement</TabsTrigger>
          </TabsList>

          <TabsContent value="reorder">
            <Card>
              <CardHeader>
                <CardTitle>Items Below Minimum Stock</CardTitle>
                <CardDescription>Medicines that need to be reordered</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine Name</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Minimum Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockMedicines.map((med) => (
                      <TableRow key={med.id}>
                        <TableCell className="font-medium">{med.name}</TableCell>
                        <TableCell>{med.stock}</TableCell>
                        <TableCell>{med.min_stock}</TableCell>
                        <TableCell>
                          <Badge variant={med.stock === 0 ? "destructive" : "secondary"}>
                            {med.stock === 0 ? "Out of Stock" : "Low Stock"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expiry">
            <Card>
              <CardHeader>
                <CardTitle>Expiring Medicines</CardTitle>
                <CardDescription>Medicines expiring within 3 months</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine Name</TableHead>
                      <TableHead>Batch Number</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringMedicines.map((med) => (
                      <TableRow key={med.id}>
                        <TableCell className="font-medium">{med.name}</TableCell>
                        <TableCell>{med.batch_number}</TableCell>
                        <TableCell>{med.stock}</TableCell>
                        <TableCell>{format(new Date(med.expiry_date), 'PPP')}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">Expiring Soon</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers">
            <Card>
              <CardHeader>
                <CardTitle>Supplier-wise Purchase Analysis</CardTitle>
                <CardDescription>Total purchases from each supplier</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier Name</TableHead>
                      <TableHead>Total GRNs</TableHead>
                      <TableHead>Total Purchase Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(supplierAnalysis).map(([supplier, data]) => (
                      <TableRow key={supplier}>
                        <TableCell className="font-medium">{supplier}</TableCell>
                        <TableCell>{data.count}</TableCell>
                        <TableCell>₹{data.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movement">
            <Card>
              <CardHeader>
                <CardTitle>Recent Stock Movements</CardTitle>
                <CardDescription>Latest goods received notes</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>GRN Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grns.slice(0, 10).map((grn) => (
                      <TableRow key={grn.id}>
                        <TableCell className="font-medium">{grn.grn_number}</TableCell>
                        <TableCell>{grn.supplier_name}</TableCell>
                        <TableCell>{format(new Date(grn.received_date), 'PPP')}</TableCell>
                        <TableCell>₹{grn.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default InventoryReports;
