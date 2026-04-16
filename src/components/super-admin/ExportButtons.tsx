import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

interface AdminRegistration {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  shop_name: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  created_at: string;
  approved_at: string | null;
}

interface ExportButtonsProps {
  registrations: AdminRegistration[];
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #1e40af',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
  },
  table: {
    display: 'flex',
    width: 'auto',
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
    minHeight: 30,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
  },
  tableCell: {
    flex: 1,
    padding: 6,
    fontSize: 9,
  },
  tableCellHeader: {
    flex: 1,
    padding: 6,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  statusApproved: {
    color: '#16a34a',
  },
  statusPending: {
    color: '#ca8a04',
  },
  statusRejected: {
    color: '#dc2626',
  },
  statusSuspended: {
    color: '#ea580c',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },
  summary: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1e40af',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});

// PDF Document Component
const MedicalShopsPDF = ({ registrations }: { registrations: AdminRegistration[] }) => {
  const pendingCount = registrations.filter(r => r.status === 'pending').length;
  const approvedCount = registrations.filter(r => r.status === 'approved').length;
  const rejectedCount = registrations.filter(r => r.status === 'rejected').length;
  const suspendedCount = registrations.filter(r => r.status === 'suspended').length;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved': return styles.statusApproved;
      case 'pending': return styles.statusPending;
      case 'rejected': return styles.statusRejected;
      case 'suspended': return styles.statusSuspended;
      default: return {};
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Medical Shops Report</Text>
          <Text style={styles.subtitle}>Generated on {format(new Date(), 'dd MMMM yyyy, hh:mm a')}</Text>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Medical Shops:</Text>
            <Text style={styles.summaryValue}>{registrations.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Approved:</Text>
            <Text style={[styles.summaryValue, styles.statusApproved]}>{approvedCount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pending:</Text>
            <Text style={[styles.summaryValue, styles.statusPending]}>{pendingCount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Rejected:</Text>
            <Text style={[styles.summaryValue, styles.statusRejected]}>{rejectedCount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Suspended:</Text>
            <Text style={[styles.summaryValue, styles.statusSuspended]}>{suspendedCount}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCellHeader}>Shop Name</Text>
            <Text style={styles.tableCellHeader}>Owner Name</Text>
            <Text style={styles.tableCellHeader}>Email</Text>
            <Text style={styles.tableCellHeader}>Phone</Text>
            <Text style={styles.tableCellHeader}>Status</Text>
            <Text style={styles.tableCellHeader}>Registered</Text>
          </View>
          {registrations.map((reg) => (
            <View key={reg.id} style={styles.tableRow}>
              <Text style={styles.tableCell}>{reg.shop_name || '-'}</Text>
              <Text style={styles.tableCell}>{reg.full_name}</Text>
              <Text style={styles.tableCell}>{reg.email}</Text>
              <Text style={styles.tableCell}>{reg.phone || '-'}</Text>
              <Text style={[styles.tableCell, getStatusStyle(reg.status)]}>{reg.status.toUpperCase()}</Text>
              <Text style={styles.tableCell}>{format(new Date(reg.created_at), 'dd/MM/yyyy')}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          KP Medical Shop Management System • Confidential Report
        </Text>
      </Page>
    </Document>
  );
};

export const ExportButtons = ({ registrations }: ExportButtonsProps) => {
  const exportToCSV = () => {
    const headers = ['Shop Name', 'Owner Name', 'Email', 'Phone', 'Status', 'Registered Date', 'Approved Date'];
    const rows = registrations.map(reg => [
      reg.shop_name || '',
      reg.full_name,
      reg.email,
      reg.phone || '',
      reg.status,
      format(new Date(reg.created_at), 'dd/MM/yyyy'),
      reg.approved_at ? format(new Date(reg.approved_at), 'dd/MM/yyyy') : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `medical-shops-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportToPDF = async () => {
    const blob = await pdf(<MedicalShopsPDF registrations={registrations} />).toBlob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `medical-shops-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
