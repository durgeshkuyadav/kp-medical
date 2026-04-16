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

interface OrderRequest {
  plan: 'monthly' | 'yearly';
  userId: string;
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
    const { data: isRateLimited } = await rlClient.rpc('check_rate_limit', { _identifier: ip, _endpoint: 'create-razorpay-order', _max_requests: 10, _window_seconds: 60 });
    if (isRateLimited) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const plan = body?.plan;
    const userId = body?.userId;

    // Input validation
    if (!plan || (plan !== 'monthly' && plan !== 'yearly')) {
      return new Response(JSON.stringify({ error: 'Invalid plan. Must be "monthly" or "yearly".' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!userId || typeof userId !== 'string' || !uuidRegex.test(userId)) {
      return new Response(JSON.stringify({ error: 'Invalid userId. Must be a valid UUID.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured');
    }
    const amount = plan === 'monthly' ? 59900 : 699900; // Amount in paise (₹599 / ₹6999)

    // Create Razorpay order
    const auth = btoa(`${keyId}:${keySecret}`);
    
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        // Razorpay requires receipt length <= 40 chars
        receipt: `sub_${plan}_${Date.now().toString(36)}_${userId.slice(0, 8)}`,
        notes: {
          userId,
          plan,
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('Razorpay order creation failed:', errorText);
      throw new Error(`Failed to create Razorpay order: ${errorText}`);
    }

    const order = await orderResponse.json();
    console.log('Razorpay order created:', order.id);

    return new Response(
      JSON.stringify({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
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
