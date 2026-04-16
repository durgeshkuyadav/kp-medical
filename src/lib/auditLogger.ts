import { supabase } from '@/integrations/supabase/client';

/**
 * Logs sensitive data access events to the audit_log table.
 * Fire-and-forget — does not block UI.
 */
export async function logSensitiveAccess(
  resourceType: string,
  resourceId: string,
  fieldName: string
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'sensitive_data_viewed',
      resource_type: resourceType,
      resource_id: resourceId,
      details: { field: fieldName, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    // Silent fail — audit logging should never block user actions
    console.error('Audit log error:', err);
  }
}
