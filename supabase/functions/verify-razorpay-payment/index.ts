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

interface PaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  userId: string;
  plan: 'monthly' | 'yearly';
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 10 requests per minute per IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rlClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: isRateLimited } = await rlClient.rpc('check_rate_limit', { _identifier: ip, _endpoint: 'verify-razorpay-payment', _max_requests: 10, _window_seconds: 60 });
    if (isRateLimited) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, plan } = body ?? {};

    // Input validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const razorpayIdRegex = /^[a-zA-Z0-9_]{10,40}$/;
    const hexRegex = /^[0-9a-f]{64}$/i;

    if (!razorpay_order_id || typeof razorpay_order_id !== 'string' || !razorpayIdRegex.test(razorpay_order_id)) {
      return new Response(JSON.stringify({ error: 'Invalid razorpay_order_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!razorpay_payment_id || typeof razorpay_payment_id !== 'string' || !razorpayIdRegex.test(razorpay_payment_id)) {
      return new Response(JSON.stringify({ error: 'Invalid razorpay_payment_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!razorpay_signature || typeof razorpay_signature !== 'string' || !hexRegex.test(razorpay_signature)) {
      return new Response(JSON.stringify({ error: 'Invalid razorpay_signature' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!userId || typeof userId !== 'string' || !uuidRegex.test(userId)) {
      return new Response(JSON.stringify({ error: 'Invalid userId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!plan || (plan !== 'monthly' && plan !== 'yearly')) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keySecret) {
      throw new Error('Razorpay secret not configured');
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const encoder = new TextEncoder();
    const key = encoder.encode(keySecret);
    const data = encoder.encode(body);
    
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
      throw new Error('Invalid payment signature');
    }

    // Payment verified - update subscription
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const endDate = new Date(now);
    if (plan === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Check if subscription exists
    const { data: existingSub } = await supabaseClient
      .from('subscriptions')
      .select('id')
      .eq('admin_id', userId)
      .maybeSingle();

    if (existingSub) {
      // Update existing subscription
      const { error: updateError } = await supabaseClient
        .from('subscriptions')
        .update({
          plan,
          is_active: true,
          current_period_start: now.toISOString(),
          current_period_end: endDate.toISOString(),
          payment_method: 'razorpay',
          razorpay_subscription_id: razorpay_payment_id,
          grace_period_end: null,
        })
        .eq('id', existingSub.id);

      if (updateError) throw updateError;

      // Record payment with updated pricing
      await supabaseClient.from('payment_history').insert({
        subscription_id: existingSub.id,
        amount: plan === 'monthly' ? 599 : 6999,
        payment_method: 'razorpay',
        transaction_id: razorpay_payment_id,
        status: 'completed',
      });
    } else {
      // Create new subscription
      const { data: newSub, error: insertError } = await supabaseClient
        .from('subscriptions')
        .insert({
          admin_id: userId,
          plan,
          is_active: true,
          current_period_start: now.toISOString(),
          current_period_end: endDate.toISOString(),
          payment_method: 'razorpay',
          razorpay_subscription_id: razorpay_payment_id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Record payment with updated pricing
      await supabaseClient.from('payment_history').insert({
        subscription_id: newSub.id,
        amount: plan === 'monthly' ? 599 : 6999,
        payment_method: 'razorpay',
        transaction_id: razorpay_payment_id,
        status: 'completed',
      });

      // Assign admin role if not exists
      const { data: existingRole } = await supabaseClient
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (!existingRole) {
        await supabaseClient.from('user_roles').insert({
          user_id: userId,
          role: 'admin',
        });
      }
    }

    console.log('Payment verified and subscription updated for user:', userId);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error verifying payment:', error);
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
