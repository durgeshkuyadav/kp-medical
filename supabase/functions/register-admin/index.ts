import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, password, fullName, phone, shopName, shopAddress, drugLicenseNumber, gstNumber } = body;

    // Validate required fields
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 1) {
      return new Response(JSON.stringify({ error: "Full name is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check rate limit
    const { data: rateLimited } = await supabaseAdmin.rpc("check_rate_limit", {
      _identifier: email,
      _endpoint: "register-admin",
      _max_requests: 3,
      _window_seconds: 3600,
    });
    if (rateLimited) {
      return new Response(JSON.stringify({ error: "Too many registration attempts. Try again later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user via admin API (bypasses email confirmation requirement for creation)
    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    });

    if (signUpError) {
      return new Response(JSON.stringify({ error: signUpError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = signUpData.user.id;
    const approvalToken = crypto.randomUUID();

    // Insert admin_registrations (service role bypasses RLS)
    const { error: regError } = await supabaseAdmin
      .from("admin_registrations")
      .insert({
        user_id: userId,
        email,
        full_name: fullName,
        phone: phone || null,
        shop_name: shopName || null,
        shop_address: shopAddress || null,
        drug_license_number: drugLicenseNumber || null,
        gst_number: gstNumber || null,
        status: "pending",
        approval_token: approvalToken,
      });

    if (regError) {
      console.error("Registration insert error:", regError);
      // Cleanup: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "Failed to create registration record" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });

    if (roleError) {
      console.error("Role insert error:", roleError);
    }

    // Create profile
    await supabaseAdmin.from("profiles").insert({
      user_id: userId,
      full_name: fullName,
      phone: phone || null,
      shop_name: shopName || null,
    });

    // Try sending approval email (non-blocking)
    try {
      await supabaseAdmin.functions.invoke("send-admin-approval-email", {
        body: {
          adminEmail: email,
          adminName: fullName,
          phone,
          shopName,
          shopAddress,
          drugLicenseNumber,
          gstNumber,
          userId,
          approvalToken,
        },
      });
    } catch (e) {
      console.error("Failed to send approval email:", e);
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Register admin error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});