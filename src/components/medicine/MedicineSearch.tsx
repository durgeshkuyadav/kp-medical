import { useState, useMemo } from 'react';
import { useMedicines, type Medicine } from '@/hooks/useMedicines';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Package, X, AlertTriangle, FlaskConical, ScanBarcode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';

export function MedicineSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [isAddMedicineOpen, setIsAddMedicineOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [newMedicine, setNewMedicine] = useState({
    name: '',
    generic_name: '',
    manufacturer: '',
    category: '',
    batch_number: '',
    expiry_date: '',
    price: '',
    mrp: '',
    stock: '',
    min_stock: '',
    hsn_code: '',
    gst_rate: '12'
  });
  const { medicines, addMedicine } = useMedicines();
  const { toast } = useToast();

  const filteredMedicines = useMemo(() => {
    if (!searchTerm.trim()) return medicines;
    const term = searchTerm.toLowerCase();
    return medicines.filter(m =>
      m.name.toLowerCase().includes(term) ||
      (m.generic_name || '').toLowerCase().includes(term) ||
      (m.manufacturer || '').toLowerCase().includes(term) ||
      m.batch_number.toLowerCase().includes(term) ||
      (m.hsn_code || '').toLowerCase().includes(term) ||
      (m.category || '').toLowerCase().includes(term) ||
      ((m as any).barcode || '').toLowerCase().includes(term)
    );
  }, [medicines, searchTerm]);

  // Group medicines by name for batch view
  const getBatchesForMedicine = (medicine: Medicine) => {
    return medicines.filter(m => m.name === medicine.name);
  };

  // Get same-generic alternatives (different brand/manufacturer, same generic_name)
  const getAlternatives = (medicine: Medicine) => {
    if (!medicine.generic_name) return [];
    return medicines.filter(m =>
      m.generic_name?.toLowerCase() === medicine.generic_name?.toLowerCase() &&
      m.name !== medicine.name
    );
  };

  // Unique medicines by name for the card grid
  const uniqueMedicines = useMemo(() => {
    const seen = new Map<string, Medicine>();
    filteredMedicines.forEach(m => {
      const existing = seen.get(m.name);
      if (!existing || m.stock > existing.stock) {
        seen.set(m.name, m);
      }
    });
    return Array.from(seen.values());
  }, [filteredMedicines]);

  // Total available stock across batches
  const getTotalStock = (medicineName: string) => {
    return medicines.filter(m => m.name === medicineName).reduce((sum, m) => sum + m.stock, 0);
  };

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addMedicine({
        name: newMedicine.name,
        generic_name: newMedicine.generic_name,
        manufacturer: newMedicine.manufacturer,
        category: newMedicine.category,
        batch_number: newMedicine.batch_number,
        expiry_date: newMedicine.expiry_date,
        price: parseFloat(newMedicine.price),
        mrp: parseFloat(newMedicine.mrp || newMedicine.price),
        stock: parseInt(newMedicine.stock),
        min_stock: parseInt(newMedicine.min_stock) || 10,
        hsn_code: newMedicine.hsn_code || null,
        gst_rate: parseFloat(newMedicine.gst_rate) || 12,
        supplier_id: null
      });
      setNewMedicine({
        name: '', generic_name: '', manufacturer: '', category: '',
        batch_number: '', expiry_date: '', price: '', mrp: '',
        stock: '', min_stock: '', hsn_code: '', gst_rate: '12'
      });
      setIsAddMedicineOpen(false);
    } catch (error) {
      // toast already shown by hook
    }
  };

  const isExpiringSoon = (date: string) => {
    const expiry = new Date(date);
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    return expiry <= threeMonths;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Medicine Inventory</h2>
        <Dialog open={isAddMedicineOpen} onOpenChange={setIsAddMedicineOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Medicine
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Medicine</DialogTitle>
              <DialogDescription>Enter the details of the new medicine</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddMedicine} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Medicine Name</Label>
                  <Input id="name" placeholder="Enter medicine name" value={newMedicine.name} onChange={(e) => setNewMedicine({...newMedicine, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="generic_name">Generic Name</Label>
                  <Input id="generic_name" placeholder="Enter generic name" value={newMedicine.generic_name} onChange={(e) => setNewMedicine({...newMedicine, generic_name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input id="manufacturer" placeholder="Enter manufacturer" value={newMedicine.manufacturer} onChange={(e) => setNewMedicine({...newMedicine, manufacturer: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" placeholder="Enter category" value={newMedicine.category} onChange={(e) => setNewMedicine({...newMedicine, category: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch_number">Batch Number</Label>
                  <Input id="batch_number" placeholder="Enter batch number" value={newMedicine.batch_number} onChange={(e) => setNewMedicine({...newMedicine, batch_number: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Input id="expiry_date" type="date" value={newMedicine.expiry_date} onChange={(e) => setNewMedicine({...newMedicine, expiry_date: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input id="price" type="number" step="0.01" placeholder="Enter price" value={newMedicine.price} onChange={(e) => setNewMedicine({...newMedicine, price: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mrp">MRP (₹)</Label>
                  <Input id="mrp" type="number" step="0.01" placeholder="Enter MRP" value={newMedicine.mrp} onChange={(e) => setNewMedicine({...newMedicine, mrp: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input id="stock" type="number" placeholder="Enter stock quantity" value={newMedicine.stock} onChange={(e) => setNewMedicine({...newMedicine, stock: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_stock">Minimum Stock</Label>
                  <Input id="min_stock" type="number" placeholder="Enter minimum stock" value={newMedicine.min_stock} onChange={(e) => setNewMedicine({...newMedicine, min_stock: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hsn_code">HSN Code</Label>
                  <Input id="hsn_code" placeholder="Enter HSN code" value={newMedicine.hsn_code} onChange={(e) => setNewMedicine({...newMedicine, hsn_code: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gst_rate">GST Rate (%)</Label>
                  <Input id="gst_rate" type="number" placeholder="Enter GST rate" value={newMedicine.gst_rate} onChange={(e) => setNewMedicine({...newMedicine, gst_rate: e.target.value})} />
                </div>
              </div>
              <Button type="submit" className="w-full">Add Medicine</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, generic name, batch, barcode, manufacturer, or HSN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsScannerOpen(true)}
          title="Scan barcode"
          className="shrink-0"
        >
          <ScanBarcode className="h-5 w-5" />
        </Button>
      </div>

      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(barcode) => setSearchTerm(barcode)}
      />

      {/* Medicine Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {uniqueMedicines.map((medicine) => {
          const totalStock = getTotalStock(medicine.name);
          const batches = getBatchesForMedicine(medicine);
          const isLowStock = totalStock <= (medicine.min_stock || 10);

          return (
            <Card
              key={medicine.id}
              className="shadow-card cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => setSelectedMedicine(medicine)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="w-5 h-5 text-primary" />
                  {medicine.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Generic: {medicine.generic_name || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">Manufacturer: {medicine.manufacturer || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">Category: {medicine.category || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">Batches: {batches.length}</p>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold text-lg">₹{medicine.mrp}</span>
                  <Badge variant={isLowStock ? 'destructive' : 'secondary'} className={!isLowStock ? 'bg-emerald-500/10 text-emerald-600' : ''}>
                    Available: {totalStock}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredMedicines.length === 0 && searchTerm && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No medicines found matching "{searchTerm}"</p>
        </div>
      )}

      {/* Medicine Detail Dialog with Batch View + Alternatives */}
      <Dialog open={!!selectedMedicine} onOpenChange={(open) => !open && setSelectedMedicine(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedMedicine && (() => {
            const batches = getBatchesForMedicine(selectedMedicine);
            const alternatives = getAlternatives(selectedMedicine);
            const totalStock = getTotalStock(selectedMedicine.name);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    {selectedMedicine.name}
                  </DialogTitle>
                  <DialogDescription className="space-y-1">
                    <div className="flex flex-wrap gap-3 text-sm mt-1">
                      {selectedMedicine.generic_name && <span>Generic: <strong>{selectedMedicine.generic_name}</strong></span>}
                      {selectedMedicine.manufacturer && <span>| Mfr: <strong>{selectedMedicine.manufacturer}</strong></span>}
                      {selectedMedicine.category && <span>| Category: <strong>{selectedMedicine.category}</strong></span>}
                      {selectedMedicine.hsn_code && <span>| HSN: <strong>{selectedMedicine.hsn_code}</strong></span>}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant={totalStock <= (selectedMedicine.min_stock || 10) ? 'destructive' : 'secondary'} className={totalStock > (selectedMedicine.min_stock || 10) ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}>
                        AVAILABLE QUANTITY: {totalStock}
                      </Badge>
                      <span className="text-sm">MRP: ₹{selectedMedicine.mrp} | GST: {selectedMedicine.gst_rate}%</span>
                      {(selectedMedicine as any).location && (
                        <Badge variant="outline" className="gap-1">
                          📍 {(selectedMedicine as any).location}
                        </Badge>
                      )}
                    </div>
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="batches" className="mt-4">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="batches">Batches ({batches.length})</TabsTrigger>
                    {alternatives.length > 0 && (
                      <TabsTrigger value="alternatives">
                        <FlaskConical className="w-4 h-4 mr-1" />
                        Same Formula ({alternatives.length})
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="batches">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Batch Number</TableHead>
                          <TableHead>Expiry Date</TableHead>
                          <TableHead className="text-right">Available Qty</TableHead>
                          <TableHead className="text-right">MRP (₹)</TableHead>
                          <TableHead className="text-right">Price (₹)</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batches.map((batch) => (
                          <TableRow key={batch.id}>
                            <TableCell className="font-mono font-medium">{batch.batch_number}</TableCell>
                            <TableCell className={isExpiringSoon(batch.expiry_date) ? 'text-destructive font-medium' : ''}>
                              {new Date(batch.expiry_date).toLocaleDateString('en-IN')}
                              {isExpiringSoon(batch.expiry_date) && <AlertTriangle className="inline w-3 h-3 ml-1" />}
                            </TableCell>
                            <TableCell className="text-right font-semibold">{batch.stock}</TableCell>
                            <TableCell className="text-right">₹{batch.mrp}</TableCell>
                            <TableCell className="text-right">₹{batch.price}</TableCell>
                            <TableCell>
                              {batch.stock === 0 ? (
                                <Badge variant="destructive">Out of Stock</Badge>
                              ) : batch.stock <= (batch.min_stock || 10) ? (
                                <Badge variant="destructive" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Low Stock</Badge>
                              ) : isExpiringSoon(batch.expiry_date) ? (
                                <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20">Expiring Soon</Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">In Stock</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  {alternatives.length > 0 && (
                    <TabsContent value="alternatives">
                      <div className="mb-3">
                        <p className="text-sm text-muted-foreground">
                          Other brands with the same formula ({selectedMedicine.generic_name}):
                        </p>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Brand Name</TableHead>
                            <TableHead>Manufacturer</TableHead>
                            <TableHead>Batch</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="text-right">MRP (₹)</TableHead>
                            <TableHead className="text-right">Price (₹)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {alternatives.map((alt) => (
                            <TableRow key={alt.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedMedicine(alt)}>
                              <TableCell className="font-medium">{alt.name}</TableCell>
                              <TableCell>{alt.manufacturer || 'N/A'}</TableCell>
                              <TableCell className="font-mono text-sm">{alt.batch_number}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={alt.stock <= (alt.min_stock || 10) ? 'destructive' : 'secondary'} className={alt.stock > (alt.min_stock || 10) ? 'bg-emerald-500/10 text-emerald-600' : ''}>
                                  {alt.stock}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">₹{alt.mrp}</TableCell>
                              <TableCell className="text-right">₹{alt.price}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TabsContent>
                  )}
                </Tabs>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
