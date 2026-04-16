import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useShopSettings } from '@/hooks/useShopSettings';
import { Printer, X } from 'lucide-react';
import { InvoicePDFDownload } from './InvoicePDF';

interface InvoicePrintProps {
  saleId: string;
  onClose: () => void;
}

interface SaleData {
  id: string;
  invoice_number: string | null;
  patient_name: string;
  patient_id: string | null;
  total: number;
  payment_method: string;
  created_at: string;
  sale_items: Array<{
    medicine_name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  patient?: {
    phone: string;
    email: string;
  };
}

export const InvoicePrint = ({ saleId, onClose }: InvoicePrintProps) => {
  const [saleData, setSaleData] = useState<SaleData | null>(null);
  const hasPrintedRef = useRef(false);
  const { settings } = useShopSettings();

  useEffect(() => {
    const fetchSale = async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            medicine_name,
            quantity,
            price,
            total
          ),
          patient:patients (
            phone,
            email
          )
        `)
        .eq('id', saleId)
        .single();

      if (!error && data) {
        setSaleData(data as SaleData);
      }
    };

    fetchSale();
  }, [saleId]);

  const handlePrint = () => {
    if (hasPrintedRef.current) return;
    hasPrintedRef.current = true;
    window.print();
  };

  if (!saleData) return null;

  const subtotal = saleData.sale_items.reduce((sum, item) => sum + item.total, 0);
  const roundOff = saleData.total - subtotal;

  return (
    <div className="fixed inset-0 bg-white z-50 p-8">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .print-content, .print-content * { visibility: visible; }
          .print-content { position: fixed; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div className="no-print flex gap-2 mb-4">
        <InvoicePDFDownload saleData={saleData} settings={settings} />
        <Button onClick={handlePrint} variant="outline">
          <Printer className="w-4 h-4 mr-2" />
          Print Invoice
        </Button>
        <Button onClick={onClose} variant="outline">
          <X className="w-4 h-4 mr-2" />
          Close
        </Button>
      </div>

        <div className="print-content bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 pb-4 border-b-2">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4">
              {settings?.logo_url && (
                <img src={settings.logo_url} alt="Shop Logo" className="w-16 h-16 object-contain" />
              )}
              <div>
              <h1 className="text-3xl font-bold text-gray-800">{settings?.shop_name || 'PHARMACY'}</h1>
              {settings?.address && <p className="text-sm text-gray-600 mt-1">{settings.address}</p>}
              <div className="flex gap-4 mt-1 text-sm text-gray-600">
                {settings?.phone && <span>Phone: {settings.phone}</span>}
                {settings?.email && <span>Email: {settings.email}</span>}
              </div>
              {settings?.gst_number && (
                <p className="text-sm text-gray-600 mt-1">GST: {settings.gst_number}</p>
              )}
              {settings?.drug_license_number && (
                <p className="text-sm text-gray-600">DL No: {settings.drug_license_number}</p>
              )}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-800">INVOICE</h2>
              {saleData.invoice_number && (
                <p className="text-lg font-semibold text-primary mt-1">{saleData.invoice_number}</p>
              )}
              <p className="text-sm text-gray-600 mt-1">{format(new Date(saleData.created_at), 'PPP')}</p>
            </div>
          </div>
        </div>

        <div className="border-y-2 border-black py-2 mb-4">
          <div className="flex justify-between">
            <div>
              <p className="font-bold">Patient Name: {saleData.patient_name}</p>
            </div>
            <div className="text-right">
              <p>Invoice No: {saleData.invoice_number || `INV${saleData.id.substring(0, 8).toUpperCase()}`}</p>
              <p>Date: {format(new Date(saleData.created_at), 'dd-MM-yyyy')}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-center text-xl font-bold mb-2">GST INVOICE</h2>
          <table className="w-full border-2 border-black">
            <thead>
              <tr className="border-b-2 border-black bg-gray-100">
                <th className="border-r border-black p-2 text-left">SN.</th>
                <th className="border-r border-black p-2 text-left">PRODUCT NAME</th>
                <th className="border-r border-black p-2 text-right">QTY</th>
                <th className="border-r border-black p-2 text-right">MRP</th>
                <th className="p-2 text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {saleData.sale_items.map((item, index) => (
                <tr key={index} className="border-b border-black">
                  <td className="border-r border-black p-2">{index + 1}</td>
                  <td className="border-r border-black p-2">{item.medicine_name}</td>
                  <td className="border-r border-black p-2 text-right">{item.quantity}</td>
                  <td className="border-r border-black p-2 text-right">₹{item.price.toFixed(2)}</td>
                  <td className="p-2 text-right">₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between mb-6">
          <div className="border-2 border-black p-4 w-1/2 mr-2">
            <p className="font-bold mb-2">Terms & Conditions:</p>
            <ol className="text-xs space-y-1">
              <li>All disputes subject to local jurisdiction only.</li>
              <li>Medicines without Batch No & Exp will not be taken back.</li>
              <li>Please consult Dr. before using the medicines.</li>
              <li>Loose items & Cut tabs & caps will not be taken back.</li>
            </ol>
          </div>

          <div className="border-2 border-black p-4 w-1/2">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>SUB TOTAL</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>DISCOUNT</span>
                <span>₹0.00</span>
              </div>
              <div className="flex justify-between">
                <span>ROUND OFF</span>
                <span>₹{roundOff.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t-2 border-black pt-2">
                <span>GRAND TOTAL</span>
                <span>₹{saleData.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="mb-16">Authorized Signatory</p>
        </div>
      </div>
    </div>
  );
};
