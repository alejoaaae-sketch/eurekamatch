import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.99.1";
import { getCheckoutOrigin } from "../_shared/checkout-origin.ts";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { isPaymentTrialAccount } from '../_shared/payment-trial.ts';

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
    const origin = getCheckoutOrigin(req.headers.get("origin"));
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
    const { packId, returnOrigin } = await req.json();
    if (typeof packId !== 'string' || !/^[0-9a-f-]{36}$/i.test(packId)) throw new Error("Invalid packId");
    const destination = returnOrigin === undefined ? origin : getCheckoutOrigin(returnOrigin);

    // Fetch authoritative pack data from DB
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const { data: config, error: configError } = await admin.from('global_config').select('beta_mode').limit(1).single();
    if (configError || !config) throw new Error('Payment configuration unavailable');
    const { data: isAdmin, error: roleError } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (roleError) throw new Error('Payment authorization unavailable');
    if (config.beta_mode && !isPaymentTrialAccount(userId, isAdmin === true)) {
      return new Response(JSON.stringify({ error: 'Stripe real trial is restricted to the owner' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
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

    const account = await stripe.accounts.retrieve();
    if (account.id !== 'acct_1SxTl1EiIlwiZF4c') throw new Error('La clave de Stripe pertenece a otra cuenta; no se abrirá el pago');
    if (!account.charges_enabled) throw new Error('Stripe todavía no permite cobrar con esta cuenta; completa su verificación antes de probar tu Visa');
    const price = await stripe.prices.retrieve(priceId);
    if (!price.livemode || !price.active || price.currency !== 'eur' || price.unit_amount !== Math.round(Number(pack.price) * 100)) {
      throw new Error('El precio de Stripe no corresponde al pack en pagos reales');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${destination}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${destination}/buy-packs`,
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
    const status = msg === "Unauthorized" ? 401 : msg === "Invalid checkout origin" ? 400 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
