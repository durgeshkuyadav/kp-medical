import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: isRateLimited } = await supabaseClient.rpc('check_rate_limit', {
      _identifier: ip,
      _endpoint: 'verify-upi-payment',
      _max_requests: 10,
      _window_seconds: 60,
    });
    if (isRateLimited) {
      return new Response(JSON.stringify({ error: 'Too many requests.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, saleId } = body ?? {};

    // Validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const razorpayIdRegex = /^[a-zA-Z0-9_]{10,40}$/;
    const hexRegex = /^[0-9a-f]{64}$/i;

    if (!razorpay_order_id || !razorpayIdRegex.test(razorpay_order_id)) {
      return new Response(JSON.stringify({ error: 'Invalid razorpay_order_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!razorpay_payment_id || !razorpayIdRegex.test(razorpay_payment_id)) {
      return new Response(JSON.stringify({ error: 'Invalid razorpay_payment_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!razorpay_signature || !hexRegex.test(razorpay_signature)) {
      return new Response(JSON.stringify({ error: 'Invalid razorpay_signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!saleId || !uuidRegex.test(saleId)) {
      return new Response(JSON.stringify({ error: 'Invalid saleId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      throw new Error('Razorpay secret not configured');
    }

    // Verify signature
    const signatureBody = razorpay_order_id + "|" + razorpay_payment_id;
    const encoder = new TextEncoder();
    const key = encoder.encode(keySecret);
    const data = encoder.encode(signatureBody);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
    const generatedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (generatedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Invalid payment signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Payment verified - update sale status
    const { error: updateError } = await supabaseClient
      .from('sales')
      .update({
        status: 'completed',
        notes: `UPI Payment verified. Razorpay ID: ${razorpay_payment_id}`,
      })
      .eq('id', saleId);

    if (updateError) {
      console.error('Error updating sale:', updateError);
      throw new Error('Failed to update sale status');
    }

    console.log('UPI payment verified for sale:', saleId);

    return new Response(
      JSON.stringify({ success: true, paymentId: razorpay_payment_id }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error verifying UPI payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
