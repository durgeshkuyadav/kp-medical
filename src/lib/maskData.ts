/**
 * Utility functions for masking sensitive data in the UI.
 * Toggle visibility with a reveal button per field.
 */

export function maskEmail(email: string | null | undefined): string {
  if (!email) return 'N/A';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visibleLocal = local.slice(0, 2);
  return `${visibleLocal}***@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return 'N/A';
  if (phone.length <= 4) return '****';
  return phone.slice(0, 2) + '*'.repeat(phone.length - 4) + phone.slice(-2);
}

export function maskGST(gst: string | null | undefined): string {
  if (!gst) return '-';
  if (gst.length <= 4) return '****';
  return gst.slice(0, 2) + '*'.repeat(gst.length - 4) + gst.slice(-2);
}

export function maskLicense(license: string | null | undefined): string {
  if (!license) return '-';
  if (license.length <= 4) return '****';
  return license.slice(0, 3) + '*'.repeat(license.length - 5) + license.slice(-2);
}

export function maskIP(ip: string | null | undefined): string {
  if (!ip) return 'N/A';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return ip.slice(0, 4) + '***';
}
