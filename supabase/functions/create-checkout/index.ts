import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map pack names (from pick_packs.name) to Stripe price IDs
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
    // Verify JWT signature via Supabase Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) throw new Error("Unauthorized");
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? undefined;

    const { packId } = await req.json();
    if (!packId) throw new Error("Missing packId");

    // Fetch authoritative pack data from DB
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const { data: pack, error: packErr } = await admin
      .from("pick_packs")
      .select("id, name, picks_count, price, enabled")
      .eq("id", packId)
      .eq("enabled", true)
      .single();
    if (packErr || !pack) throw new Error("Invalid or disabled pack");

    const priceId = PACK_PRICES[pack.name];
    if (!priceId) throw new Error(`Unknown pack: ${pack.name}`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://eurekamatch.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/buy-packs`,
      // metadata only carries the pack reference; verify-payment re-reads price/picks from DB
      metadata: {
        user_id: userId,
        pack_id: pack.id,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const status = msg === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
