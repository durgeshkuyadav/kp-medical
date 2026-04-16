import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminId } from '@/hooks/useAdminId';
import { Upload } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Label } from '@/components/ui/label';

interface CSVImportProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CSVImport = ({ isOpen, onClose, onSuccess }: CSVImportProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Flexible header aliases to support various templates
  const headerAliases: Record<string, string[]> = {
    name: ['item name', 'medicine name', 'product name', 'medicine'],
    generic_name: ['generic name', 'generic', 'salt', 'composition'],
    manufacturer: ['brand', 'company', 'maker', 'mfg'],
    category: ['type', 'group', 'class'],
    stock: ['qty', 'quantity', 'stock qty', 'available'],
    min_stock: ['min stock', 'minimum stock', 'reorder level', 'min qty'],
    price: ['mrp', 'rate', 'cost', 'unit price', 'selling price', 'sp'],
    expiry_date: ['expiry', 'expiry date', 'exp date', 'exp', 'expiry_date'],
    batch_number: ['batch', 'batch no', 'batch number', 'batch_number'],
    location: ['rack', 'shelf', 'bin'],
    status: ['status'],
  };

  const normalizeKey = (k: string) => k?.toString().trim().toLowerCase().replace(/[_\-]+/g, ' ').trim();

  const findValue = (row: Record<string, any>, target: string): string | undefined => {
    const wanted = new Set([
      normalizeKey(target),
      ...(headerAliases[target] || []).map(normalizeKey),
    ]);
    for (const key of Object.keys(row)) {
      if (wanted.has(normalizeKey(key))) {
        const val = row[key];
        if (val === null || val === undefined || String(val).trim() === '') return undefined;
        return String(val).trim();
      }
    }
    return undefined;
  };

  const normalizeDate = (input?: string) => {
    if (!input) return undefined;
    const s = String(input).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      const d = m[1].padStart(2, '0');
      const mo = m[2].padStart(2, '0');
      const y = m[3].length === 2 ? `20${m[3]}` : m[3].padStart(4, '0');
      return `${y}-${mo}-${d}`;
    }
    // Handle Excel serial date numbers
    const num = Number(s);
    if (!isNaN(num) && num > 30000 && num < 100000) {
      const excelEpoch = new Date(1899, 11, 30);
      const dt = new Date(excelEpoch.getTime() + num * 86400000);
      if (!isNaN(dt.getTime())) {
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      }
    }
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    }
    return undefined;
  };

  const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h?.toString().trim(),
        complete: (results) => resolve(results.data as any[]),
        error: (err) => reject(err),
      });
    });
  };

  const parseExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
          resolve(jsonData as any[]);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const parseFile = async (file: File): Promise<any[]> => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || ext === 'txt') {
      return parseCSV(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      return parseExcel(file);
    } else {
      throw new Error(`Unsupported file format: .${ext}. Please use CSV or Excel (.xlsx/.xls) files.`);
    }
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_ROWS = 1000;
  const MAX_STRING_LENGTH = 200;
  const MAX_PRICE = 999999;
  const MAX_STOCK = 1000000;

  const sanitizeString = (val: string | undefined, maxLen = MAX_STRING_LENGTH): string | undefined => {
    if (!val) return undefined;
    return val.slice(0, maxLen).replace(/<[^>]*>/g, '').trim() || undefined;
  };

  const handleImport = async () => {
    if (!file) {
      toast({ title: "Error", description: "Please select a file", variant: "destructive" });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Error", description: "File too large (max 5MB). Please use a smaller file.", variant: "destructive" });
      return;
    }

    setIsImporting(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        throw new Error('Please sign in to import stock.');
      }

      const data = await parseFile(file);
      if (!data || data.length === 0) {
        throw new Error('No data found in the file. Please check the format.');
      }

      if (data.length > MAX_ROWS) {
        throw new Error(`Too many rows (${data.length}). Maximum ${MAX_ROWS} rows per import. Please split into smaller files.`);
      }

      const adminId = await getAdminId();

      // Fetch existing medicines to check for duplicates
      const { data: existingMedicines, error: existingError } = await supabase
        .from('medicines')
        .select('id, name, batch_number, stock');
      if (existingError) throw existingError;

      let newCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      // Default expiry: 1 year from now
      const defaultExpiry = new Date();
      defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
      const defaultExpiryStr = `${defaultExpiry.getFullYear()}-${String(defaultExpiry.getMonth() + 1).padStart(2, '0')}-${String(defaultExpiry.getDate()).padStart(2, '0')}`;

      for (let i = 0; i < data.length; i++) {
        const row = data[i] as Record<string, any>;

        const rawName = sanitizeString(findValue(row, 'name'));
        // Skip rows without a medicine name (likely header rows or empty rows)
        if (!rawName) {
          skippedCount++;
          continue;
        }

        // Skip rows that look like table headers stored as data
        if (rawName.toLowerCase() === 'medicine name' || rawName.toLowerCase() === 'item name') {
          skippedCount++;
          continue;
        }

        const parsedStock = Math.min(Math.max(parseInt(findValue(row, 'stock') || '0') || 0, 0), MAX_STOCK);
        const parsedPrice = Math.min(Math.max(parseFloat((findValue(row, 'price') || '0').replace(/[^\d.]/g, '')) || 0, 0), MAX_PRICE);
        const parsedMinStock = Math.min(Math.max(parseInt(findValue(row, 'min_stock') || '10') || 10, 0), MAX_STOCK);
        const expiryDate = normalizeDate(findValue(row, 'expiry_date')) || defaultExpiryStr;

        const medicineData: any = {
          name: rawName,
          generic_name: sanitizeString(findValue(row, 'generic_name')) || null,
          manufacturer: sanitizeString(findValue(row, 'manufacturer')) || null,
          category: sanitizeString(findValue(row, 'category'), 100) || null,
          stock: parsedStock,
          min_stock: parsedMinStock,
          price: parsedPrice,
          mrp: parsedPrice, // Default MRP = price
          expiry_date: expiryDate,
          batch_number: sanitizeString(findValue(row, 'batch_number'), 50) || `AUTO-${Date.now()}-${i + 1}`,
        };

        try {
          // Check if medicine exists by name and batch number
          const existing = existingMedicines?.find(
            (m: any) => m.name?.toLowerCase() === medicineData.name?.toLowerCase() && m.batch_number === medicineData.batch_number
          );

          if (existing) {
            const { error } = await supabase
              .from('medicines')
              .update({
                stock: (existing as any).stock + medicineData.stock,
                price: medicineData.price,
                mrp: medicineData.mrp,
                expiry_date: medicineData.expiry_date,
              })
              .eq('id', (existing as any).id);
            if (error) throw error;
            updatedCount++;
          } else {
            const { error } = await supabase
              .from('medicines')
              .insert({ ...medicineData, admin_id: adminId });
            if (error) throw error;
            newCount++;
          }
        } catch (rowError: any) {
          errors.push(`Row ${i + 1} (${name}): ${rowError.message}`);
          skippedCount++;
        }
      }

      const summary = `Imported: ${newCount} new, ${updatedCount} updated${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}`;
      toast({
        title: newCount + updatedCount > 0 ? "Import Complete" : "No Data Imported",
        description: errors.length > 0 ? `${summary}. Errors: ${errors.slice(0, 3).join('; ')}` : summary,
        variant: newCount + updatedCount > 0 ? "default" : "destructive",
      });

      if (newCount + updatedCount > 0) {
        onSuccess();
      }
      onClose();
      setFile(null);
    } catch (error: any) {
      console.error('Error importing file:', error);
      toast({
        title: "Import Failed",
        description: error?.message || "Failed to import file. Please check the format.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby="csv-import-desc">
        <DialogHeader>
          <DialogTitle>Import Stock from File</DialogTitle>
          <DialogDescription id="csv-import-desc">
            Upload a CSV or Excel file to add or update medicine inventory. Only "Medicine Name" is required — other fields use defaults if missing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">Select File (CSV or Excel)</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={isImporting}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Supported: CSV (.csv), Excel (.xlsx, .xls)
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">📋 Expected Columns:</p>
              <pre className="bg-background p-3 rounded border text-xs overflow-x-auto">
{`Medicine Name | Generic Name | Category | Stock | Min Stock | Price | Expiry Date | Batch Number`}
              </pre>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">✅ Only "Medicine Name" is required. Defaults:</p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Stock: 0 if not provided</li>
                <li>Min Stock: 10 if not provided</li>
                <li>Price/MRP: 0 if not provided</li>
                <li>Expiry Date: 1 year from today if not provided</li>
                <li>Batch Number: Auto-generated if not provided</li>
              </ul>
            </div>
            
            <p className="text-xs text-muted-foreground">
              💡 Existing medicines (matched by name + batch) will have stock incremented.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || isImporting} className="min-w-24">
            <Upload className="h-4 w-4 mr-2" />
            {isImporting ? (
              <span className="animate-pulse">Importing...</span>
            ) : (
              'Import Stock'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
