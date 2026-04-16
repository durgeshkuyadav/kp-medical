import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ShopSettings } from '@/hooks/useShopSettings';
import { format } from 'date-fns';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: 2,
    paddingBottom: 10,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  invoiceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 10,
  },
  table: {
    marginTop: 10,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: 1,
    borderTop: 1,
    backgroundColor: '#f0f0f0',
    padding: 5,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    padding: 5,
  },
  col1: { width: '10%' },
  col2: { width: '40%' },
  col3: { width: '15%' },
  col4: { width: '15%' },
  col5: { width: '20%', textAlign: 'right' },
  totalsSection: {
    marginTop: 10,
    marginLeft: '60%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  grandTotal: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
    paddingTop: 5,
    borderTop: 1,
  },
});

interface SaleItem {
  medicine_name: string;
  quantity: number;
  price: number;
  total: number;
}

interface InvoicePDFProps {
  saleData: {
    invoice_number: string | null;
    patient_name: string;
    created_at: string;
    total: number;
    sale_items: SaleItem[];
  };
  settings: ShopSettings | null;
}

const InvoicePDFDocument = ({ saleData, settings }: InvoicePDFProps) => {
  const subtotal = saleData.sale_items.reduce((sum, item) => sum + item.total, 0);
  const roundOff = saleData.total - subtotal;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
            {settings?.logo_url && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <View style={{ width: 50, height: 50, marginRight: 10 }} />
            )}
            <View>
              <Text style={styles.shopName}>{settings?.shop_name || 'PHARMACY'}</Text>
              {settings?.address && <Text>{settings.address}</Text>}
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 3 }}>
            {settings?.phone && <Text>Phone: {settings.phone}  </Text>}
            {settings?.email && <Text>Email: {settings.email}</Text>}
          </View>
          {settings?.gst_number && <Text>GST: {settings.gst_number}</Text>}
          {settings?.drug_license_number && <Text>DL No: {settings.drug_license_number}</Text>}
        </View>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text>Invoice No: {saleData.invoice_number || 'N/A'}</Text>
            <Text>Date: {format(new Date(saleData.created_at), 'dd-MM-yyyy')}</Text>
          </View>
          <View>
            <Text>Patient: {saleData.patient_name}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>SN.</Text>
            <Text style={styles.col2}>PRODUCT NAME</Text>
            <Text style={styles.col3}>QTY</Text>
            <Text style={styles.col4}>MRP</Text>
            <Text style={styles.col5}>AMOUNT</Text>
          </View>
          {saleData.sale_items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col1}>{index + 1}</Text>
              <Text style={styles.col2}>{item.medicine_name}</Text>
              <Text style={styles.col3}>{item.quantity}</Text>
              <Text style={styles.col4}>₹{item.price.toFixed(2)}</Text>
              <Text style={styles.col5}>₹{item.total.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text>SUB TOTAL</Text>
            <Text>₹{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>DISCOUNT</Text>
            <Text>₹0.00</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>ROUND OFF</Text>
            <Text>₹{roundOff.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>GRAND TOTAL</Text>
            <Text>₹{saleData.total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 30 }}>
          <Text style={{ fontSize: 9 }}>Terms & Conditions:</Text>
          <Text style={{ fontSize: 8, marginTop: 3 }}>1. All disputes subject to local jurisdiction only.</Text>
          <Text style={{ fontSize: 8 }}>2. Medicines without Batch No & Exp will not be taken back.</Text>
          <Text style={{ fontSize: 8 }}>3. Please consult Dr. before using the medicines.</Text>
        </View>

        <View style={{ marginTop: 30, alignItems: 'flex-end' }}>
          <Text>Authorized Signatory</Text>
        </View>
      </Page>
    </Document>
  );
};

export const InvoicePDFDownload = ({ saleData, settings }: InvoicePDFProps) => {
  return (
    <PDFDownloadLink
      document={<InvoicePDFDocument saleData={saleData} settings={settings} />}
      fileName={`invoice-${saleData.invoice_number || 'N/A'}.pdf`}
    >
      {({ loading }) => (
        <Button variant="outline" disabled={loading}>
          <Download className="w-4 h-4 mr-2" />
          {loading ? 'Generating PDF...' : 'Download PDF'}
        </Button>
      )}
    </PDFDownloadLink>
  );
};
