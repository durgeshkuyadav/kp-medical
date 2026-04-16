import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://kp-medical-shop-25.lovable.app',
  'https://id-preview--3d9989bf-ea5b-4add-957f-257fba915c37.lovable.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim().slice(0, 255) : '';
    const reason = typeof body?.reason === 'string' ? body.reason.replace(/<[^>]*>/g, '').slice(0, 200) : 'Invalid credentials';
    const userAgent = typeof body?.userAgent === 'string' ? body.userAgent.slice(0, 500) : req.headers.get('user-agent')?.slice(0, 500) || 'unknown';

    console.log(`Logging failed login attempt for email: ${email}`);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      console.error('Invalid email format');
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get IP address from headers
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      'unknown';

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if account is already locked
    const { data: isLocked, error: lockCheckError } = await supabaseAdmin
      .rpc('is_account_locked', { _email: email });

    if (lockCheckError) {
      console.error('Error checking lock status:', lockCheckError);
    }

    // Insert failed login attempt
    const { error: insertError } = await supabaseAdmin
      .from('failed_login_attempts')
      .insert({
        email,
        ip_address: ipAddress,
        user_agent: userAgent,
        reason
      });

    if (insertError) {
      console.error('Error inserting failed login attempt:', insertError);
      throw insertError;
    }

    // Get current failed attempts count
    const { data: attemptCount, error: countError } = await supabaseAdmin
      .rpc('get_failed_attempts_count', { _email: email });

    if (countError) {
      console.error('Error getting attempt count:', countError);
    }

    console.log(`Failed login attempt logged. Total attempts in window: ${attemptCount}`);

    // Check if account should now be locked
    const accountLocked = attemptCount >= 5;

    if (accountLocked) {
      console.log(`Account ${email} is now locked due to too many failed attempts`);
      
      // Log to audit log
      await supabaseAdmin
        .from('audit_log')
        .insert({
          action: 'account_locked',
          resource_type: 'user',
          details: { 
            email, 
            reason: 'Too many failed login attempts',
            attempt_count: attemptCount
          },
          ip_address: ipAddress
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        attemptCount,
        accountLocked,
        message: accountLocked 
          ? 'Account is temporarily locked. Please try again in 15 minutes.'
          : 'Failed login attempt logged'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in log-failed-login function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
