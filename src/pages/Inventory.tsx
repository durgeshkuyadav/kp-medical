import { useState, useMemo, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, AlertTriangle, MapPin, Lightbulb, Check, Pencil, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useMedicines } from "@/hooks/useMedicines";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CSVImport } from "@/components/inventory/CSVImport";
import { supabase } from "@/integrations/supabase/client";
import { getAdminId } from "@/hooks/useAdminId";

const Inventory = () => {
  const { medicines, loading, lowStockMedicines, expiringMedicines, refetch } = useMedicines();
  const [showAddStock, setShowAddStock] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editLocationValue, setEditLocationValue] = useState('');
  const [invSearch, setInvSearch] = useState('');
  const [invPage, setInvPage] = useState(1);
  const INV_PAGE_SIZE = 20;
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    generic_name: '',
    category: '',
    manufacturer: '',
    batch_number: '',
    barcode: '',
    location: '',
    stock: '',
    min_stock: '',
    price: '',
    mrp: '',
    expiry_date: '',
    hsn_code: '',
    gst_rate: '12'
  });

  // Smart placement suggestion based on category
  const placementSuggestion = useMemo(() => {
    if (!formData.category.trim()) return null;
    const cat = formData.category.toLowerCase();
    // Find existing medicines with same category and their locations
    const sameCategoryMeds = medicines.filter(
      m => (m.category || '').toLowerCase() === cat && (m as any).location
    );
    if (sameCategoryMeds.length > 0) {
      const locationCounts: Record<string, number> = {};
      sameCategoryMeds.forEach(m => {
        const loc = (m as any).location;
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      });
      const topLocation = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0];
      return `Other "${formData.category}" medicines are stored at: ${topLocation[0]} (${topLocation[1]} items)`;
    }
    // Generic suggestions by category type
    if (cat.includes('tablet') || cat.includes('capsule')) return 'Suggested: Shelf A – Oral Medications';
    if (cat.includes('syrup') || cat.includes('liquid') || cat.includes('suspension')) return 'Suggested: Shelf B – Liquids & Syrups';
    if (cat.includes('injection') || cat.includes('injectable')) return 'Suggested: Shelf C – Injectables (Cold Storage if required)';
    if (cat.includes('cream') || cat.includes('ointment') || cat.includes('gel')) return 'Suggested: Shelf D – Topicals';
    if (cat.includes('drop') || cat.includes('eye') || cat.includes('ear')) return 'Suggested: Shelf E – Drops';
    if (cat.includes('powder') || cat.includes('sachet')) return 'Suggested: Shelf F – Powders & Sachets';
    if (cat.includes('surgical') || cat.includes('device')) return 'Suggested: Shelf G – Surgical Items';
    return null;
  }, [formData.category, medicines]);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const adminId = await getAdminId();
      const { error } = await supabase.from('medicines').insert([{
        name: formData.name,
        generic_name: formData.generic_name,
        category: formData.category,
        manufacturer: formData.manufacturer,
        batch_number: formData.batch_number,
        barcode: formData.barcode || null,
        location: formData.location || null,
        stock: parseInt(formData.stock),
        min_stock: parseInt(formData.min_stock),
        price: parseFloat(formData.price),
        mrp: parseFloat(formData.mrp || formData.price),
        expiry_date: formData.expiry_date,
        hsn_code: formData.hsn_code || null,
        gst_rate: parseFloat(formData.gst_rate) || 12,
        admin_id: adminId
      } as any]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Medicine added to inventory",
      });

      setShowAddStock(false);
      setFormData({
        name: '', generic_name: '', category: '', manufacturer: '',
        batch_number: '', barcode: '', location: '', stock: '', min_stock: '', price: '', mrp: '',
        expiry_date: '', hsn_code: '', gst_rate: '12'
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveLocation = async (medicineId: string) => {
    try {
      const { error } = await supabase
        .from('medicines')
        .update({ location: editLocationValue || null })
        .eq('id', medicineId);
      if (error) throw error;
      toast({ title: "Location updated" });
      setEditingLocationId(null);
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading inventory...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
            <p className="text-muted-foreground">
              Manage medicine stock, track expiry dates, and monitor inventory levels
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCSVImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Invoice/PDF
            </Button>
            <Button onClick={() => setShowAddStock(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Stock
            </Button>
          </div>
        </div>

        {/* Alerts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Low Stock Alert
              </CardTitle>
              <CardDescription>
                {lowStockMedicines.length} medicines are running low
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockMedicines.slice(0, 3).map((medicine) => (
                <div key={medicine.id} className="flex justify-between py-1">
                  <span className="text-sm">{medicine.name}</span>
                  <Badge variant="destructive">{medicine.stock} left</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                Expiring Soon
              </CardTitle>
              <CardDescription>
                {expiringMedicines.length} medicines expire in 3 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expiringMedicines.slice(0, 3).map((medicine) => (
                <div key={medicine.id} className="flex justify-between py-1">
                  <span className="text-sm">{medicine.name}</span>
                  <Badge variant="secondary">{new Date(medicine.expiry_date).toLocaleDateString()}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Search & Inventory Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Inventory</CardTitle>
                <CardDescription>
                  {medicines.length} medicines in stock
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search medicines..."
                  value={invSearch}
                  onChange={(e) => { setInvSearch(e.target.value); setInvPage(1); }}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine Name</TableHead>
                  <TableHead>Generic Name</TableHead>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const filtered = medicines.filter(m => {
                    if (!invSearch.trim()) return true;
                    const term = invSearch.toLowerCase();
                    return m.name.toLowerCase().includes(term) ||
                      (m.generic_name || '').toLowerCase().includes(term) ||
                      (m.batch_number || '').toLowerCase().includes(term) ||
                      (m.category || '').toLowerCase().includes(term);
                  });
                  const totalPages = Math.max(1, Math.ceil(filtered.length / INV_PAGE_SIZE));
                  const paginated = filtered.slice((invPage - 1) * INV_PAGE_SIZE, invPage * INV_PAGE_SIZE);
                  
                  return (
                    <>
                      {paginated.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                            {invSearch ? 'No matching medicines found' : 'No medicines in inventory'}
                          </TableCell>
                        </TableRow>
                      ) : paginated.map((medicine) => {
                        const isLowStock = medicine.stock <= (medicine.min_stock || 10);
                        const isExpiringSoon = expiringMedicines.some(m => m.id === medicine.id);
                        return (
                          <TableRow key={medicine.id}>
                            <TableCell className="font-medium">{medicine.name}</TableCell>
                            <TableCell>{medicine.generic_name || 'N/A'}</TableCell>
                            <TableCell className="font-mono text-xs">{medicine.batch_number || 'N/A'}</TableCell>
                            <TableCell>{medicine.category || 'N/A'}</TableCell>
                            <TableCell>
                              {editingLocationId === medicine.id ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={editLocationValue}
                                    onChange={e => setEditLocationValue(e.target.value)}
                                    className="h-7 text-xs w-32"
                                    placeholder="e.g., Shelf A"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleSaveLocation(medicine.id)}
                                  />
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveLocation(medicine.id)}>
                                    <Check className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <span
                                  className="flex items-center gap-1 text-sm cursor-pointer hover:text-primary group"
                                  onClick={() => { setEditingLocationId(medicine.id); setEditLocationValue((medicine as any).location || ''); }}
                                >
                                  {(medicine as any).location ? (
                                    <>
                                      <MapPin className="w-3 h-3 text-primary" />
                                      {(medicine as any).location}
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">Click to set</span>
                                  )}
                                  <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{medicine.stock}</TableCell>
                            <TableCell>{medicine.min_stock || 10}</TableCell>
                            <TableCell>₹{medicine.price}</TableCell>
                            <TableCell>{new Date(medicine.expiry_date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {isLowStock && <Badge variant="destructive">Low Stock</Badge>}
                              {isExpiringSoon && <Badge variant="secondary">Expiring</Badge>}
                              {!isLowStock && !isExpiringSoon && <Badge variant="default">Good</Badge>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {totalPages > 1 && (
                        <TableRow>
                          <TableCell colSpan={10}>
                            <div className="flex items-center justify-between py-2">
                              <p className="text-sm text-muted-foreground">
                                Showing {(invPage - 1) * INV_PAGE_SIZE + 1}–{Math.min(invPage * INV_PAGE_SIZE, filtered.length)} of {filtered.length}
                              </p>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" disabled={invPage <= 1} onClick={() => setInvPage(p => p - 1)}>
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm">Page {invPage} of {totalPages}</span>
                                <Button variant="outline" size="sm" disabled={invPage >= totalPages} onClick={() => setInvPage(p => p + 1)}>
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })()}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Stock Dialog */}
      <Dialog open={showAddStock} onOpenChange={setShowAddStock}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Medicine to Inventory</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddStock} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Medicine Name *</Label>
                <Input id="name" required value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="generic_name">Generic Name *</Label>
                <Input id="generic_name" required value={formData.generic_name}
                  onChange={e => setFormData({...formData, generic_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Input id="category" required value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer *</Label>
                <Input id="manufacturer" required value={formData.manufacturer}
                  onChange={e => setFormData({...formData, manufacturer: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch_number">Batch Number *</Label>
                <Input id="batch_number" required value={formData.batch_number}
                  onChange={e => setFormData({...formData, batch_number: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input id="barcode" placeholder="Scan or enter barcode" value={formData.barcode}
                  onChange={e => setFormData({...formData, barcode: e.target.value})} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="location" className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Storage Location
                </Label>
                <Input id="location" placeholder="e.g., Shelf A, Rack 2, Drawer 3" value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})} />
                {placementSuggestion && (
                  <div className="flex items-start gap-2 p-2 rounded-md bg-accent/50 border border-accent text-sm">
                    <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{placementSuggestion}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity *</Label>
                <Input id="stock" type="number" required value={formData.stock}
                  onChange={e => setFormData({...formData, stock: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_stock">Minimum Stock *</Label>
                <Input id="min_stock" type="number" required value={formData.min_stock}
                  onChange={e => setFormData({...formData, min_stock: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input id="price" type="number" step="0.01" required value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mrp">MRP (₹) *</Label>
                <Input id="mrp" type="number" step="0.01" required value={formData.mrp}
                  onChange={e => setFormData({...formData, mrp: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry_date">Expiry Date *</Label>
                <Input id="expiry_date" type="date" required value={formData.expiry_date}
                  onChange={e => setFormData({...formData, expiry_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hsn_code">HSN Code</Label>
                <Input id="hsn_code" value={formData.hsn_code}
                  onChange={e => setFormData({...formData, hsn_code: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst_rate">GST Rate (%)</Label>
                <Input id="gst_rate" type="number" value={formData.gst_rate}
                  onChange={e => setFormData({...formData, gst_rate: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddStock(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Medicine"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CSVImport
        isOpen={isCSVImportOpen}
        onClose={() => setIsCSVImportOpen(false)}
        onSuccess={refetch}
      />
    </MainLayout>
  );
};

export default Inventory;