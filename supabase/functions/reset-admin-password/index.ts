// Edge Function: reset-admin-password
// Allows super_admin to reset admin passwords securely

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 5 requests per minute per IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rlClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: isRateLimited } = await rlClient.rpc('check_rate_limit', { _identifier: ip, _endpoint: 'reset-admin-password', _max_requests: 5, _window_seconds: 60 });
    if (isRateLimited) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { 
        status: 405,
        headers: corsHeaders
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing environment variables");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client bound to the caller's JWT for authorization checks
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerErr,
    } = await callerClient.auth.getUser();
    
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller is a super_admin
    const { data: isSuperAdmin, error: roleErr } = await callerClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "super_admin",
    });
    
    if (roleErr || !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden - Super Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { adminId, newPassword } = body ?? {};

    if (!adminId || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Admin ID and new password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Password validation
    if (newPassword.length < 8 || newPassword.length > 100) {
      return new Response(
        JSON.stringify({ error: "Password must be between 8 and 100 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client to update user
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify the target user is an admin
    const { data: targetRoles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', adminId);

    const isTargetAdmin = targetRoles?.some(r => r.role === 'admin');
    const isTargetSuperAdmin = targetRoles?.some(r => r.role === 'super_admin');

    if (isTargetSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Cannot reset super admin password through this endpoint" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isTargetAdmin) {
      return new Response(
        JSON.stringify({ error: "User is not an admin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reset the password
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      adminId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the action
    await adminClient.from('audit_log').insert({
      user_id: caller.id,
      action: 'reset_admin_password',
      resource_type: 'admin',
      resource_id: adminId,
      details: { target_admin_id: adminId },
    });

    console.log("Password reset successfully for admin:", adminId);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
