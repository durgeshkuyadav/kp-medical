import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  CalendarIcon, Search, TrendingDown, TrendingUp, 
  ArrowDownCircle, ArrowUpCircle, Filter, RotateCcw
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';

interface StockMovement {
  id: string;
  medicine_id: string;
  movement_type: string;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  medicine?: {
    name: string;
    batch_number: string;
  };
}

const StockMovements = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [toDate, setToDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [movementType, setMovementType] = useState<string>('all');
  const [selectedMedicine, setSelectedMedicine] = useState<string>('all');

  // Fetch stock movements
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['stock-movements', fromDate, toDate],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          medicine:medicines(name, batch_number)
        `)
        .order('created_at', { ascending: false });

      if (fromDate) {
        query = query.gte('created_at', fromDate.toISOString());
      }
      if (toDate) {
        query = query.lte('created_at', new Date(toDate.getTime() + 86400000).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StockMovement[];
    },
  });

  // Fetch medicines for filter
  const { data: medicines = [] } = useQuery({
    queryKey: ['medicines-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medicines')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Filter movements
  const filteredMovements = useMemo(() => {
    return movements.filter(movement => {
      const matchesSearch = searchQuery === '' || 
        movement.medicine?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movement.reference_number?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = movementType === 'all' || movement.movement_type === movementType;
      const matchesMedicine = selectedMedicine === 'all' || movement.medicine_id === selectedMedicine;

      return matchesSearch && matchesType && matchesMedicine;
    });
  }, [movements, searchQuery, movementType, selectedMedicine]);

  // Stats
  const stats = useMemo(() => {
    const salesMovements = filteredMovements.filter(m => m.movement_type === 'sale');
    const purchaseMovements = filteredMovements.filter(m => m.movement_type === 'purchase');
    const adjustmentMovements = filteredMovements.filter(m => m.movement_type === 'adjustment');

    return {
      totalSales: salesMovements.reduce((sum, m) => sum + Math.abs(m.quantity_change), 0),
      totalPurchases: purchaseMovements.reduce((sum, m) => sum + m.quantity_change, 0),
      totalAdjustments: adjustmentMovements.length,
    };
  }, [filteredMovements]);

  const resetFilters = () => {
    setSearchQuery('');
    setFromDate(startOfMonth(new Date()));
    setToDate(endOfMonth(new Date()));
    setMovementType('all');
    setSelectedMedicine('all');
  };

  const getMovementBadge = (type: string, change: number) => {
    switch (type) {
      case 'sale':
        return (
          <Badge variant="destructive" className="gap-1">
            <TrendingDown className="h-3 w-3" />
            Sale
          </Badge>
        );
      case 'purchase':
        return (
          <Badge className="bg-green-500 hover:bg-green-600 gap-1">
            <TrendingUp className="h-3 w-3" />
            Purchase
          </Badge>
        );
      case 'adjustment':
        return (
          <Badge variant="secondary" className="gap-1">
            <RotateCcw className="h-3 w-3" />
            Adjustment
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stock Movement History</h1>
          <p className="text-muted-foreground">Track all inventory changes with detailed logs</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <ArrowDownCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">{stats.totalSales} units</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <ArrowUpCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Purchases</p>
                  <p className="text-2xl font-bold">{stats.totalPurchases} units</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <RotateCcw className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Adjustments</p>
                  <p className="text-2xl font-bold">{stats.totalAdjustments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {/* Search */}
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Medicine or reference..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* From Date */}
              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={setFromDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* To Date */}
              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Movement Type */}
              <div className="space-y-2">
                <Label>Movement Type</Label>
                <Select value={movementType} onValueChange={setMovementType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Medicine */}
              <div className="space-y-2">
                <Label>Medicine</Label>
                <Select value={selectedMedicine} onValueChange={setSelectedMedicine}>
                  <SelectTrigger>
                    <SelectValue placeholder="All medicines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Medicines</SelectItem>
                    {medicines.map((med) => (
                      <SelectItem key={med.id} value={med.id}>{med.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={resetFilters} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Movements Table */}
        <Card>
          <CardHeader>
            <CardTitle>Movement Records</CardTitle>
            <CardDescription>
              Showing {filteredMovements.length} of {movements.length} records
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredMovements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No stock movements found for the selected filters.
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Before</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">After</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(movement.created_at), 'dd MMM yyyy, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{movement.medicine?.name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">
                              Batch: {movement.medicine?.batch_number || 'N/A'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getMovementBadge(movement.movement_type, movement.quantity_change)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {movement.quantity_before}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono font-medium",
                          movement.quantity_change > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {movement.quantity_after}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {movement.reference_number || movement.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default StockMovements;
