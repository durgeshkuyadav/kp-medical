import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

interface CreateTenantRequest {
  adminId: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  console.log("create-tenant-schema function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 10 requests per minute per IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rlClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: isRateLimited } = await rlClient.rpc('check_rate_limit', { _identifier: ip, _endpoint: 'create-tenant-schema', _max_requests: 10, _window_seconds: 60 });
    if (isRateLimited) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const adminId = typeof body?.adminId === 'string' ? body.adminId.trim() : '';
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!adminId || !uuidRegex.test(adminId)) {
      return new Response(JSON.stringify({ error: 'Invalid adminId. Must be a valid UUID.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    console.log("Creating tenant schema for admin:", adminId);

    // Get the tenant schema info
    const { data: tenant, error: tenantError } = await supabase
      .from("tenant_schemas")
      .select("*")
      .eq("admin_id", adminId)
      .single();

    if (tenantError || !tenant) {
      throw new Error("Tenant schema not found");
    }

    if (tenant.is_initialized) {
      return new Response(
        JSON.stringify({ success: true, message: "Schema already initialized" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const schemaName = tenant.schema_name;

    // Note: In a production environment, you would use database triggers or 
    // a separate service to create the actual PostgreSQL schema.
    // For this implementation, we're using RLS with tenant_id approach
    // which is more manageable in Supabase without direct schema creation.
    
    // Mark the tenant schema as initialized
    const { error: updateError } = await supabase
      .from("tenant_schemas")
      .update({ is_initialized: true })
      .eq("id", tenant.id);

    if (updateError) {
      throw updateError;
    }

    console.log("Tenant schema initialized successfully:", schemaName);

    return new Response(
      JSON.stringify({ success: true, schemaName }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in create-tenant-schema function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);