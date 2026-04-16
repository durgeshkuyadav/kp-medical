import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSales } from '@/hooks/useSales';
import { NewSaleForm } from '@/components/sales/NewSaleForm';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const PAGE_SIZE = 15;

const Sales = () => {
  const { sales, loading, refetch } = useSales();
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const channel = supabase
      .channel('sales-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sales;
    const term = search.toLowerCase();
    return sales.filter(s =>
      s.patient_name.toLowerCase().includes(term) ||
      (s.invoice_number || '').toLowerCase().includes(term) ||
      s.payment_method.toLowerCase().includes(term)
    );
  }, [sales, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading sales...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
            <p className="text-muted-foreground">
              Manage and view sales transactions
            </p>
          </div>
          <Button onClick={() => setIsNewSaleOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Sale
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient, invoice, payment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {search ? 'No matching sales found' : 'No sales yet'}
                  </TableCell>
                </TableRow>
              ) : paginated.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-mono">
                    {sale.invoice_number || `INV${sale.id.substring(0, 8).toUpperCase()}`}
                  </TableCell>
                  <TableCell>{sale.patient_name}</TableCell>
                  <TableCell>{sale.items.length} items</TableCell>
                  <TableCell>₹{sale.total.toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{sale.payment_method}</TableCell>
                  <TableCell>
                    <Badge variant={
                      sale.status === 'completed' ? 'default' : 
                      sale.status === 'pending_payment' ? 'secondary' : 'secondary'
                    } className={sale.status === 'pending_payment' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : ''}>
                      {sale.status === 'pending_payment' ? 'Pending UPI' : sale.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(sale.created_at), 'dd MMM yyyy, HH:mm')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <NewSaleForm
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />
    </MainLayout>
  );
};

export default Sales;
