// Edge Function: create-manager
// Creates a new manager user securely using the Service Role key
// Validates the caller is an admin using the has_role RPC and the caller's JWT

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 5 requests per minute per IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rlClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: isRateLimited } = await rlClient.rpc('check_rate_limit', { _identifier: ip, _endpoint: 'create-manager', _max_requests: 5, _window_seconds: 60 });
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
    // Prefer standard Supabase env name, fall back to publishable key if present
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing environment variables", {
        hasUrl: Boolean(supabaseUrl),
        hasAnon: Boolean(anonKey),
        hasServiceRole: Boolean(serviceRoleKey),
      });
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header");
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
      console.error("Error getting caller user:", callerErr);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller is an admin using the secure RPC
    const { data: isAdmin, error: roleErr } = await callerClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      console.error("Admin role check failed:", roleErr, "isAdmin:", isAdmin);
      return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { email, password, fullName, phone, shopName } = body ?? {};

    // Comprehensive input validation
    if (!email || !password || !fullName) {
      console.log("Missing required fields:", { email: !!email, password: !!password, fullName: !!fullName });
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, password, and full name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Email validation - RFC 5322 basic format check with length limit
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      console.log("Invalid email format:", email);
      return new Response(
        JSON.stringify({ error: "Invalid email format or email too long (max 255 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Password strength validation
    if (password.length < 8 || password.length > 100) {
      console.log("Invalid password length");
      return new Response(
        JSON.stringify({ error: "Password must be between 8 and 100 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check password complexity (at least one number, one letter)
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      console.log("Password lacks complexity");
      return new Response(
        JSON.stringify({ error: "Password must contain at least one letter and one number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Full name validation - length limit and basic sanitization
    if (fullName.length > 100) {
      console.log("Full name too long");
      return new Response(
        JSON.stringify({ error: "Full name must be less than 100 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize full name - remove any dangerous characters
    const sanitizedFullName = fullName.trim().replace(/[<>]/g, '');
    if (sanitizedFullName.length === 0) {
      console.log("Full name empty after sanitization");
      return new Response(
        JSON.stringify({ error: "Full name contains invalid characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Phone validation (if provided) - length and format
    if (phone && (phone.length > 20 || phone.length < 10)) {
      console.log("Invalid phone length");
      return new Response(
        JSON.stringify({ error: "Phone number must be between 10 and 20 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Shop name validation (if provided)
    if (shopName && shopName.length > 200) {
      console.log("Shop name too long");
      return new Response(
        JSON.stringify({ error: "Shop name must be less than 200 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client to create users
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if email already exists
    const { data: existingUser } = await adminClient.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some(u => u.email === email);
    
    if (emailExists) {
      console.log("Email already exists:", email);
      return new Response(
        JSON.stringify({ error: "Email already in use" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch admin's shop name as fallback
    let adminShopName = shopName || null;
    if (!adminShopName) {
      const { data: shopData } = await adminClient
        .from('shop_settings')
        .select('shop_name')
        .eq('admin_id', caller.id)
        .maybeSingle();
      if (shopData?.shop_name) {
        adminShopName = shopData.shop_name;
      }
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: sanitizedFullName,
        phone,
        role: "manager",
        shop_name: adminShopName,
      },
      email_confirm: true,
    });

    if (error) {
      console.error("Error creating manager user:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create profile record for the new manager
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        user_id: data.user!.id,
        full_name: sanitizedFullName,
        phone: phone || null,
        shop_name: adminShopName,
        email: email,
      });

    if (profileError) {
      console.error("Error creating manager profile:", profileError);
      // Don't fail the whole operation if profile creation fails
    }

    // Assign manager role
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: data.user!.id,
        role: 'manager',
      });

    if (roleError) {
      console.error("Error assigning manager role:", roleError);
    }

    // Map manager to admin
    const { error: mappingError } = await adminClient
      .from('manager_admin_mapping')
      .insert({
        manager_id: data.user!.id,
        admin_id: caller.id,
      });

    if (mappingError) {
      console.error("Error creating manager-admin mapping:", mappingError);
    }

    console.log("Manager created successfully:", data.user?.id);
    return new Response(
      JSON.stringify({ success: true, user_id: data.user?.id }),
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