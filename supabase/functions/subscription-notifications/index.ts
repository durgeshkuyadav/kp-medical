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
  console.log("subscription-notifications function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 5 requests per minute per IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rlClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: isRateLimited } = await rlClient.rpc('check_rate_limit', { _identifier: ip, _endpoint: 'subscription-notifications', _max_requests: 5, _window_seconds: 60 });
    if (isRateLimited) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find subscriptions expiring within 7 days
    const { data: expiringSubscriptions, error: expiringError } = await supabase
      .from("subscriptions")
      .select(`
        *,
        admin_registrations!inner(email, full_name, shop_name)
      `)
      .eq("is_active", true)
      .lte("current_period_end", sevenDaysFromNow.toISOString())
      .gt("current_period_end", now.toISOString());

    if (expiringError) {
      console.error("Error fetching expiring subscriptions:", expiringError);
    }

    // Find subscriptions that have entered grace period (expired but within grace period)
    const { data: graceSubscriptions, error: graceError } = await supabase
      .from("subscriptions")
      .select(`
        *,
        admin_registrations!inner(email, full_name, shop_name)
      `)
      .eq("is_active", true)
      .lt("current_period_end", now.toISOString())
      .gt("grace_period_end", now.toISOString());

    if (graceError) {
      console.error("Error fetching grace period subscriptions:", graceError);
    }

    // Find subscriptions that have been suspended (grace period ended)
    const { data: suspendedSubscriptions, error: suspendedError } = await supabase
      .from("subscriptions")
      .select(`
        *,
        admin_registrations!inner(email, full_name, shop_name)
      `)
      .eq("is_active", true)
      .not("grace_period_end", "is", null)
      .lte("grace_period_end", now.toISOString());

    if (suspendedError) {
      console.error("Error fetching suspended subscriptions:", suspendedError);
    }

    const results = {
      expiringNotifications: 0,
      graceNotifications: 0,
      suspendedNotifications: 0,
      errors: [] as string[],
    };

    // Send expiring soon notifications
    if (expiringSubscriptions && expiringSubscriptions.length > 0) {
      for (const sub of expiringSubscriptions) {
        const registration = (sub as any).admin_registrations;
        if (!registration?.email) continue;

        const expiryDate = new Date(sub.current_period_end);
        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        try {
          await resend.emails.send({
            from: "KP Medical Shop <onboarding@resend.dev>",
            to: [registration.email],
            subject: `⚠️ Subscription Expiring in ${daysLeft} Days`,
            html: generateExpiryEmail(registration.full_name, registration.shop_name, daysLeft, expiryDate),
          });
          results.expiringNotifications++;
        } catch (emailError: any) {
          console.error("Error sending expiry email:", emailError);
          results.errors.push(`Failed to send to ${registration.email}: ${emailError.message}`);
        }
      }
    }

    // Send grace period notifications
    if (graceSubscriptions && graceSubscriptions.length > 0) {
      for (const sub of graceSubscriptions) {
        const registration = (sub as any).admin_registrations;
        if (!registration?.email) continue;

        const graceEndDate = new Date(sub.grace_period_end!);
        const daysLeft = Math.ceil((graceEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        try {
          await resend.emails.send({
            from: "KP Medical Shop <onboarding@resend.dev>",
            to: [registration.email],
            subject: `🚨 Urgent: Grace Period Ending in ${daysLeft} Days`,
            html: generateGracePeriodEmail(registration.full_name, registration.shop_name, daysLeft, graceEndDate),
          });
          results.graceNotifications++;
        } catch (emailError: any) {
          console.error("Error sending grace period email:", emailError);
          results.errors.push(`Failed to send to ${registration.email}: ${emailError.message}`);
        }
      }
    }

    // Handle suspended subscriptions
    if (suspendedSubscriptions && suspendedSubscriptions.length > 0) {
      for (const sub of suspendedSubscriptions) {
        const registration = (sub as any).admin_registrations;
        if (!registration?.email) continue;

        // Deactivate the subscription
        await supabase
          .from("subscriptions")
          .update({ is_active: false })
          .eq("id", sub.id);

        try {
          await resend.emails.send({
            from: "KP Medical Shop <onboarding@resend.dev>",
            to: [registration.email],
            subject: "🔴 Account Suspended - Immediate Action Required",
            html: generateSuspensionEmail(registration.full_name, registration.shop_name),
          });
          results.suspendedNotifications++;
        } catch (emailError: any) {
          console.error("Error sending suspension email:", emailError);
          results.errors.push(`Failed to send to ${registration.email}: ${emailError.message}`);
        }
      }
    }

    console.log("Notification results:", results);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in subscription-notifications function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

function generateExpiryEmail(name: string, shopName: string | null, daysLeft: number, expiryDate: Date): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .btn { display: inline-block; padding: 14px 32px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; }
        .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Subscription Expiring Soon</h1>
        </div>
        <div class="content">
          <p>Dear ${name},</p>
          <p>Your subscription for <strong>${shopName || 'KP Medical Shop'}</strong> is expiring in <strong>${daysLeft} days</strong> (${expiryDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}).</p>
          
          <div class="warning-box">
            <strong>What happens if you don't renew?</strong>
            <ul>
              <li>You'll enter a 7-day grace period after expiry</li>
              <li>After the grace period, your account will be suspended</li>
              <li>You won't be able to access your shop data until you renew</li>
            </ul>
          </div>

          <p style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/subscription" class="btn">Renew Now</a>
          </p>
          
          <p>Thank you for using KP Medical Shop!</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateGracePeriodEmail(name: string, shopName: string | null, daysLeft: number, graceEndDate: Date): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .btn { display: inline-block; padding: 14px 32px; background: #dc2626; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; }
        .urgent-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .countdown { font-size: 48px; font-weight: bold; color: #dc2626; text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 URGENT: Grace Period Active</h1>
        </div>
        <div class="content">
          <p>Dear ${name},</p>
          
          <div class="countdown">${daysLeft} DAYS LEFT</div>
          
          <p>Your subscription for <strong>${shopName || 'KP Medical Shop'}</strong> has expired and you are now in the grace period.</p>
          
          <div class="urgent-box">
            <strong>⚠️ Your account will be SUSPENDED on ${graceEndDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
            <p>After suspension, you will lose access to:</p>
            <ul>
              <li>All sales and billing features</li>
              <li>Inventory management</li>
              <li>Patient records</li>
              <li>Reports and analytics</li>
            </ul>
          </div>

          <p style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/subscription" class="btn">RENEW IMMEDIATELY</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateSuspensionEmail(name: string, shopName: string | null): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #7f1d1d, #991b1b); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .btn { display: inline-block; padding: 14px 32px; background: #16a34a; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; }
        .suspended-box { background: #fecaca; border: 2px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔴 Account Suspended</h1>
        </div>
        <div class="content">
          <p>Dear ${name},</p>
          
          <div class="suspended-box">
            <h2 style="color: #dc2626; margin: 0;">Your account has been suspended</h2>
            <p style="margin: 10px 0 0;">Shop: ${shopName || 'KP Medical Shop'}</p>
          </div>
          
          <p>Your subscription has expired and the grace period has ended. Your account is now suspended.</p>
          
          <p><strong>What this means:</strong></p>
          <ul>
            <li>You cannot access your shop management features</li>
            <li>Your data is safe and will be restored upon renewal</li>
            <li>Your customers and records are preserved</li>
          </ul>

          <p><strong>To restore access:</strong></p>
          <ol>
            <li>Click the button below to renew your subscription</li>
            <li>Complete the payment process</li>
            <li>Your access will be restored immediately</li>
          </ol>

          <p style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/subscription" class="btn">Restore My Account</a>
          </p>
          
          <p>If you have any questions, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
