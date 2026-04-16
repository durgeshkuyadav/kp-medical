import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Calendar, X } from 'lucide-react';

interface RegistrationFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  paymentFilter: string;
  onPaymentChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  onClearFilters: () => void;
}

export const RegistrationFilters = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  paymentFilter,
  onPaymentChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onClearFilters
}: RegistrationFiltersProps) => {
  const hasActiveFilters = statusFilter !== 'all' || paymentFilter !== 'all' || dateFrom || dateTo;

  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or shop..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
        </SelectContent>
      </Select>

      <Select value={paymentFilter} onValueChange={onPaymentChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Payment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Payment</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="pending">Pending Payment</SelectItem>
          <SelectItem value="none">No Payment</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="w-[150px]"
          placeholder="From"
        />
        <span className="text-muted-foreground">to</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="w-[150px]"
          placeholder="To"
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear Filters
        </Button>
      )}
    </div>
  );
};
