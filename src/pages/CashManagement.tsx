import { useState } from 'react';
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { useSales } from "@/hooks/useSales";
import { format, startOfDay, endOfDay } from "date-fns";
import { IndianRupee, CreditCard, Smartphone, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CashEntryForm } from "@/components/cash/CashEntryForm";
import { useCashEntries } from "@/hooks/useCashEntries";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const CashManagement = () => {
  const { sales } = useSales();
  const { entries, refetch, deleteEntry } = useCashEntries();
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  const todaySales = sales.filter(s => {
    const date = new Date(s.created_at);
    return date >= todayStart && date <= todayEnd;
  });

  const cashSales = todaySales.filter(s => s.payment_method === 'cash');
  const cardSales = todaySales.filter(s => s.payment_method === 'card');
  const upiSales = todaySales.filter(s => s.payment_method === 'upi');

  const cashTotal = cashSales.reduce((sum, s) => sum + s.total, 0);
  const cardTotal = cardSales.reduce((sum, s) => sum + s.total, 0);
  const upiTotal = upiSales.reduce((sum, s) => sum + s.total, 0);
  
  // Calculate cash entries
  const todayEntries = entries.filter(e => {
    const date = new Date(e.created_at);
    return date >= todayStart && date <= todayEnd;
  });
  
  const cashIncome = todayEntries
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const cashExpense = todayEntries
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const totalRevenue = cashTotal + cardTotal + upiTotal + cashIncome - cashExpense;
  
  const handleDeleteEntry = (id: string) => {
    setEntryToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (entryToDelete) {
      await deleteEntry(entryToDelete);
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cash Management</h1>
            <p className="text-muted-foreground">
              Track daily cash flow and payment methods
            </p>
          </div>
          <Button onClick={() => setIsEntryFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Cash Entry
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <IndianRupee className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">₹{totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <IndianRupee className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cash</p>
                <p className="text-2xl font-bold">₹{cashTotal.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{cashSales.length} transactions</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Card</p>
                <p className="text-2xl font-bold">₹{cardTotal.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{cardSales.length} transactions</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Smartphone className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">UPI</p>
                <p className="text-2xl font-bold">₹{upiTotal.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{upiSales.length} transactions</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Today's Transactions</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Invoice No</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todaySales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{format(new Date(sale.created_at), 'HH:mm')}</TableCell>
                  <TableCell className="font-mono">
                    INV{sale.id.substring(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell>{sale.patient_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {sale.payment_method === 'cash' && <IndianRupee className="h-4 w-4" />}
                      {sale.payment_method === 'card' && <CreditCard className="h-4 w-4" />}
                      {sale.payment_method === 'upi' && <Smartphone className="h-4 w-4" />}
                      <span className="capitalize">{sale.payment_method}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">₹{sale.total.toFixed(2)}</TableCell>
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

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Manual Cash Entries</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todayEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(new Date(entry.created_at), 'HH:mm')}</TableCell>
                  <TableCell>
                    <Badge variant={entry.type === 'income' ? 'default' : 'destructive'}>
                      {entry.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.category || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">{entry.description || '-'}</TableCell>
                  <TableCell className={entry.type === 'income' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {entry.type === 'income' ? '+' : '-'}₹{entry.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteEntry(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <CashEntryForm
        isOpen={isEntryFormOpen}
        onClose={() => setIsEntryFormOpen(false)}
        onSuccess={refetch}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this cash entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default CashManagement;
