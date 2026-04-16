import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMedicines } from "@/hooks/useMedicines";
import { useMedicineBatches } from "@/hooks/useMedicineBatches";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInDays } from "date-fns";
import { useState, useEffect } from "react";
import { Package, AlertTriangle, Clock } from "lucide-react";
import { BatchManagement } from "@/components/inventory/BatchManagement";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BatchTracking = () => {
  const { medicines } = useMedicines();
  const { fetchExpiringBatches } = useMedicineBatches();
  const [expiringBatches, setExpiringBatches] = useState<any[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<{ id: string; name: string } | null>(null);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);

  useEffect(() => {
    const loadExpiringBatches = async () => {
      const batches = await fetchExpiringBatches(3);
      setExpiringBatches(batches);
    };
    loadExpiringBatches();
  }, []);

  const getExpiryBadge = (daysToExpiry: number) => {
    if (daysToExpiry <= 30) return <Badge variant="destructive">Critical</Badge>;
    if (daysToExpiry <= 60) return <Badge variant="secondary">Warning</Badge>;
    return <Badge variant="outline">Soon</Badge>;
  };

  const handleViewBatches = (medicineId: string, medicineName: string) => {
    setSelectedMedicine({ id: medicineId, name: medicineName });
    setBatchDialogOpen(true);
  };

  const medicinesWithBatches = medicines.map(med => {
    const batches = expiringBatches.filter(b => b.medicine_id === med.id);
    return {
      ...med,
      totalBatches: batches.length,
      earliestExpiry: batches[0]?.expiry_date,
    };
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batch Tracking</h1>
          <p className="text-muted-foreground">
            Monitor batch-wise inventory with expiry dates and stock levels
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expiringBatches.length}</div>
              <p className="text-xs text-muted-foreground">Active batches in inventory</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expiringBatches.filter(b => b.days_to_expiry <= 90).length}
              </div>
              <p className="text-xs text-muted-foreground">Within 90 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expiringBatches.filter(b => b.days_to_expiry <= 30).length}
              </div>
              <p className="text-xs text-muted-foreground">Within 30 days</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="expiring" className="w-full">
          <TabsList>
            <TabsTrigger value="expiring">Expiring Batches</TabsTrigger>
            <TabsTrigger value="all">All Medicines</TabsTrigger>
          </TabsList>

          <TabsContent value="expiring">
            <Card>
              <CardHeader>
                <CardTitle>Batches Expiring Soon</CardTitle>
                <CardDescription>Batches expiring within the next 3 months</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Batch Number</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Days Left</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No expiring batches found
                        </TableCell>
                      </TableRow>
                    ) : (
                      expiringBatches.map((batch) => (
                        <TableRow key={batch.id}>
                          <TableCell className="font-medium">{batch.medicine_name}</TableCell>
                          <TableCell>{batch.batch_number}</TableCell>
                          <TableCell>{format(new Date(batch.expiry_date), 'PPP')}</TableCell>
                          <TableCell>{batch.days_to_expiry} days</TableCell>
                          <TableCell>
                            <Badge variant={batch.stock === 0 ? 'destructive' : 'outline'}>
                              {batch.stock}
                            </Badge>
                          </TableCell>
                          <TableCell>{getExpiryBadge(batch.days_to_expiry)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Medicines with Batches</CardTitle>
                <CardDescription>View and manage batches for each medicine</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine Name</TableHead>
                      <TableHead>Total Stock</TableHead>
                      <TableHead>Active Batches</TableHead>
                      <TableHead>Earliest Expiry</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicinesWithBatches.map((medicine) => (
                      <TableRow key={medicine.id}>
                        <TableCell className="font-medium">{medicine.name}</TableCell>
                        <TableCell>
                          <Badge variant={medicine.stock === 0 ? 'destructive' : 'default'}>
                            {medicine.stock}
                          </Badge>
                        </TableCell>
                        <TableCell>{medicine.totalBatches}</TableCell>
                        <TableCell>
                          {medicine.earliestExpiry 
                            ? format(new Date(medicine.earliestExpiry), 'PPP')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewBatches(medicine.id, medicine.name)}
                          >
                            View Batches
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Batch Management</DialogTitle>
            </DialogHeader>
            {selectedMedicine && (
              <BatchManagement 
                medicineId={selectedMedicine.id}
                medicineName={selectedMedicine.name}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default BatchTracking;
