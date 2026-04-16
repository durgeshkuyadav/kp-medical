import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  console.log("approve-admin function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 10 requests per minute per IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rlClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: isRateLimited } = await rlClient.rpc('check_rate_limit', { _identifier: ip, _endpoint: 'approve-admin', _max_requests: 10, _window_seconds: 60 });
    if (isRateLimited) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const url = new URL(req.url);

    // Support BOTH:
    // 1) Email links: GET /approve-admin?token=...&action=...
    // 2) Super Admin UI: POST { token, action }
    let token = url.searchParams.get("token");
    let action = url.searchParams.get("action");
    const wantsJson = req.method === "POST";

    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      token = (body as any)?.token ?? token;
      action = (body as any)?.action ?? action;
    }

    // Sanitize inputs
    if (typeof token === 'string') token = token.trim();
    if (typeof action === 'string') action = action.trim().toLowerCase();

    if (!token || !action) {
      const payload = { error: "Missing token or action parameter" };
      return new Response(
        wantsJson ? JSON.stringify(payload) : generateHtmlResponse("error", payload.error),
        {
          status: 400,
          headers: {
            "Content-Type": wantsJson ? "application/json" : "text/html",
            ...corsHeaders,
          },
        }
      );
    }

    // Validate token is a valid UUID to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      const payload = { error: "Invalid token format" };
      return new Response(
        wantsJson ? JSON.stringify(payload) : generateHtmlResponse("error", payload.error),
        {
          status: 400,
          headers: {
            "Content-Type": wantsJson ? "application/json" : "text/html",
            ...corsHeaders,
          },
        }
      );
    }

    if (action !== "approve" && action !== "reject") {
      const payload = { error: "Invalid action. Must be 'approve' or 'reject'" };
      return new Response(
        wantsJson ? JSON.stringify(payload) : generateHtmlResponse("error", payload.error),
        {
          status: 400,
          headers: {
            "Content-Type": wantsJson ? "application/json" : "text/html",
            ...corsHeaders,
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the registration by approval token
    const { data: registration, error: fetchError } = await supabase
      .from("admin_registrations")
      .select("*")
      .eq("approval_token", token)
      .eq("status", "pending")
      .single();

    if (fetchError || !registration) {
      console.error("Registration not found or already processed:", fetchError);
      return new Response(
        generateHtmlResponse("error", "Registration not found or already processed"),
        { status: 404, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }
    // Sanitize registration name for use in HTML output
    const safeName = registration.full_name.replace(/[<>"'&]/g, '');

    if (action === "approve") {
      // Update registration status
      const { error: updateError } = await supabase
        .from("admin_registrations")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: "durgeshyadavalld@gmail.com",
        })
        .eq("id", registration.id);

      if (updateError) {
        console.error("Error updating registration:", updateError);
        throw updateError;
      }

      // Create tenant schema name
      const schemaName = `tenant_${registration.user_id.replace(/-/g, "_")}`;

      // Create tenant schema entry
      const { error: schemaError } = await supabase
        .from("tenant_schemas")
        .insert({
          admin_id: registration.user_id,
          schema_name: schemaName,
          is_initialized: false,
        });

      if (schemaError) {
        console.error("Error creating tenant schema entry:", schemaError);
      }

      // Create initial subscription (inactive until payment)
      const { error: subError } = await supabase
        .from("subscriptions")
        .insert({
          admin_id: registration.user_id,
          plan: "monthly",
          current_period_end: new Date().toISOString(), // Will be updated after payment
          is_active: false,
        });

      if (subError) {
        console.error("Error creating subscription:", subError);
      }

      // Send approval notification to the admin
      try {
        await resend.emails.send({
          from: "KP Medical Shop <onboarding@resend.dev>",
          to: [registration.email],
          subject: "Your Admin Account Has Been Approved! 🎉",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .btn { display: inline-block; padding: 14px 32px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Account Approved!</h1>
                </div>
                <div class="content">
                  <p>Dear ${safeName},</p>
                  <p>Great news! Your admin account has been approved.</p>
                  <p>To activate your account and start using KP Medical Shop, please complete your subscription payment.</p>
                  <p style="text-align: center; margin: 30px 0;">
                    <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/subscription" class="btn">Complete Subscription</a>
                  </p>
                  <p>Choose from our flexible plans:</p>
                  <ul>
                    <li><strong>Monthly:</strong> ₹999/month</li>
                    <li><strong>Yearly:</strong> ₹9,999/year (Save ₹2,989!)</li>
                  </ul>
                </div>
              </div>
            </body>
            </html>
          `,
        });
      } catch (emailError) {
        console.error("Error sending approval email to admin:", emailError);
      }

      return new Response(
        generateHtmlResponse("approved", `Admin ${safeName} has been approved successfully!`),
        { status: 200, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    } else {
      // Reject the registration
      const { error: updateError } = await supabase
        .from("admin_registrations")
        .update({
          status: "rejected",
          rejection_reason: "Registration rejected by super admin",
        })
        .eq("id", registration.id);

      if (updateError) {
        console.error("Error updating registration:", updateError);
        throw updateError;
      }

      // Send rejection notification
      try {
        await resend.emails.send({
          from: "KP Medical Shop <onboarding@resend.dev>",
          to: [registration.email],
          subject: "Admin Registration Status Update",
          html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Registration Status Update</h2>
              <p>Dear ${safeName},</p>
              <p>We regret to inform you that your admin registration request for KP Medical Shop has not been approved at this time.</p>
              <p>If you believe this was a mistake, please contact support.</p>
            </body>
            </html>
          `,
        });
      } catch (emailError) {
        console.error("Error sending rejection email:", emailError);
      }

      return new Response(
        generateHtmlResponse("rejected", `Admin ${safeName} has been rejected.`),
        { status: 200, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }
  } catch (error: any) {
    console.error("Error in approve-admin function:", error);
    return new Response(
      generateHtmlResponse("error", error.message),
      { status: 500, headers: { "Content-Type": "text/html", ...corsHeaders } }
    );
  }
};

function generateHtmlResponse(status: "approved" | "rejected" | "error", message: string): string {
  const colors = {
    approved: { bg: "#22c55e", icon: "✓" },
    rejected: { bg: "#f97316", icon: "⚠" },
    error: { bg: "#ef4444", icon: "✗" },
  };

  const { bg, icon } = colors[status];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin Approval - KP Medical Shop</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #1e3a5f, #2d5a87); }
        .card { background: white; padding: 50px; border-radius: 16px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3); max-width: 500px; }
        .icon { width: 80px; height: 80px; border-radius: 50%; background: ${bg}; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 40px; }
        h1 { color: #1e3a5f; margin: 0 0 16px; }
        p { color: #666; font-size: 18px; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${icon}</div>
        <h1>${status === "approved" ? "Approved!" : status === "rejected" ? "Rejected" : "Error"}</h1>
        <p>${message}</p>
      </div>
    </body>
    </html>
  `;
}

serve(handler);