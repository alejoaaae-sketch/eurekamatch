import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map pack names to Stripe price IDs
const PACK_PRICES: Record<string, string> = {
  basic: "price_1T7HzXEiIlwiZF4cUp6OnszL",
  small: "price_1T7HzsEiIlwiZF4cNr8U8N4G",
  medium: "price_1T7I08EiIlwiZF4cUNym283z",
  large: "price_1T7I0LEiIlwiZF4c0pHIDC4Q",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Manual JWT decode (same pattern as other edge functions)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.sub || (payload.exp && payload.exp * 1000 < Date.now())) {
      throw new Error("Invalid or expired token");
    }
    const userId = payload.sub;

    const { packName, packId, picksCount, price, userEmail } = await req.json();

    const priceId = PACK_PRICES[packName];
    if (!priceId) throw new Error(`Unknown pack: ${packName}`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check existing Stripe customer
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    const origin = req.headers.get("origin") || "https://eurekamatch.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/buy-packs`,
      metadata: {
        user_id: userId,
        pack_name: packName,
        pack_id: packId,
        picks_count: String(picksCount),
        price: String(price),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
