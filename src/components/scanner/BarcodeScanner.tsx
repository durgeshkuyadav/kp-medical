import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const BarcodeScanner = ({ isOpen, onClose, onScan }: BarcodeScannerProps) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<string>('barcode-scanner-' + Math.random().toString(36).slice(2));

  useEffect(() => {
    if (!isOpen) return;

    const startScanner = async () => {
      try {
        setError(null);
        const scanner = new Html5Qrcode(containerRef.current);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.5,
          },
          (decodedText) => {
            onScan(decodedText);
            scanner.stop().catch(console.error);
            onClose();
          },
          () => {} // ignore scan failures
        );
      } catch (err: any) {
        console.error('Scanner error:', err);
        setError(
          err?.message?.includes('Permission')
            ? 'Camera permission denied. Please allow camera access.'
            : 'Unable to start camera. Make sure your device has a camera.'
        );
      }
    };

    // Small delay to ensure DOM element is rendered
    const timeout = setTimeout(startScanner, 300);

    return () => {
      clearTimeout(timeout);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScan, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            id={containerRef.current}
            className="w-full min-h-[250px] rounded-lg overflow-hidden bg-muted"
          />

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
              {error}
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center">
            Point your camera at a medicine barcode to search
          </p>

          <Button variant="outline" onClick={onClose} className="w-full">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
