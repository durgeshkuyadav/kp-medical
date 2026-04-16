import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logSensitiveAccess } from '@/lib/auditLogger';

interface MaskToggleProps {
  maskedValue: string;
  originalValue: string;
  className?: string;
  /** Optional: resource type for audit logging (e.g., "patient", "supplier") */
  auditResource?: string;
  /** Optional: resource ID for audit logging */
  auditId?: string;
  /** Optional: field name for audit logging (e.g., "email", "phone") */
  auditField?: string;
}

/**
 * Displays a masked value with a toggle button to reveal the original.
 * Optionally logs reveal events to the audit trail.
 */
export function MaskToggle({ 
  maskedValue, 
  originalValue, 
  className = '',
  auditResource,
  auditId,
  auditField,
}: MaskToggleProps) {
  const [revealed, setRevealed] = useState(false);

  const handleToggle = () => {
    if (!revealed && auditResource && auditId && auditField) {
      logSensitiveAccess(auditResource, auditId, auditField);
    }
    setRevealed(!revealed);
  };

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="font-mono text-sm">{revealed ? originalValue : maskedValue}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
        onClick={handleToggle}
        title={revealed ? 'Hide' : 'Reveal'}
      >
        {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </Button>
    </span>
  );
}
