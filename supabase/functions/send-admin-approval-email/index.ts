import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const APPROVAL_EMAIL = "durgeshyadavalld@gmail.com";

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

interface ApprovalEmailRequest {
  adminEmail: string;
  adminName: string;
  shopName?: string;
  phone?: string;
  userId: string;
  approvalToken: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  console.log("send-admin-approval-email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 5 requests per minute per IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rlClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: isRateLimited } = await rlClient.rpc('check_rate_limit', { _identifier: ip, _endpoint: 'send-admin-approval-email', _max_requests: 5, _window_seconds: 60 });
    if (isRateLimited) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    
    // Input validation and sanitization
    const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const adminEmail = typeof body?.adminEmail === 'string' ? body.adminEmail.trim().slice(0, 255) : '';
    const adminName = typeof body?.adminName === 'string' ? stripHtml(body.adminName).slice(0, 100) : '';
    const shopName = typeof body?.shopName === 'string' ? stripHtml(body.shopName).slice(0, 200) : undefined;
    const phone = typeof body?.phone === 'string' ? body.phone.replace(/[^0-9+\-\s()]/g, '').slice(0, 20) : undefined;
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    const approvalToken = typeof body?.approvalToken === 'string' ? body.approvalToken.trim() : '';

    if (!adminEmail || !emailRegex.test(adminEmail)) {
      return new Response(JSON.stringify({ error: 'Invalid admin email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!adminName || adminName.length === 0) {
      return new Response(JSON.stringify({ error: 'Admin name is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!userId || !uuidRegex.test(userId)) {
      return new Response(JSON.stringify({ error: 'Invalid userId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!approvalToken || !uuidRegex.test(approvalToken)) {
      return new Response(JSON.stringify({ error: 'Invalid approval token' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    console.log("Sending approval request for:", adminEmail);

    const baseUrl = Deno.env.get("SUPABASE_URL") || "";
    const approveUrl = `${baseUrl}/functions/v1/approve-admin?token=${approvalToken}&action=approve`;
    const rejectUrl = `${baseUrl}/functions/v1/approve-admin?token=${approvalToken}&action=reject`;

    const emailResponse = await resend.emails.send({
      from: "KP Medical Shop <onboarding@resend.dev>",
      to: [APPROVAL_EMAIL],
      subject: `New Admin Registration Request - ${adminName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #eee; }
            .info-label { font-weight: 600; color: #666; width: 120px; }
            .info-value { color: #333; }
            .buttons { margin-top: 30px; text-align: center; }
            .btn { display: inline-block; padding: 14px 32px; margin: 0 10px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; }
            .btn-approve { background: #22c55e; color: white; }
            .btn-reject { background: #ef4444; color: white; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏥 New Admin Registration Request</h1>
            </div>
            <div class="content">
              <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
                A new administrator has requested access to KP Medical Shop management system.
              </p>
              
              <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${adminName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value">${adminEmail}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <span class="info-value">${phone || 'Not provided'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Shop Name:</span>
                <span class="info-value">${shopName || 'Not provided'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">User ID:</span>
                <span class="info-value" style="font-size: 12px;">${userId}</span>
              </div>
              
              <div class="buttons">
                <a href="${approveUrl}" class="btn btn-approve">✓ Approve Admin</a>
                <a href="${rejectUrl}" class="btn btn-reject">✗ Reject</a>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated message from KP Medical Shop Management System.</p>
              <p>Please review the request and take appropriate action.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Approval email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-admin-approval-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);