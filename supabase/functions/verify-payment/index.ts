import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.99.1";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { paidStripeAmount } from '../_shared/stripe-payment.ts';

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

    const { sessionId } = await req.json();
    if (typeof sessionId !== 'string' || !/^cs_live_[A-Za-z0-9]{1,255}$/.test(sessionId)) throw new Error("Invalid live sessionId");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const meta = session.metadata;
    if (!meta || meta.user_id !== userId || !meta.pack_id) {
      throw new Error("Unauthorized: session does not belong to this user");
    }

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ success: false, error: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const paidAmount = paidStripeAmount(session);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: picksCount, error: fulfillmentError } = await supabaseAdmin.rpc('fulfill_stripe_purchase', {
      p_user_id: userId, p_pack_id: meta.pack_id, p_session_id: sessionId, p_amount: paidAmount,
    });
    if (fulfillmentError) throw new Error('Pago confirmado; créditos pendientes. No vuelvas a pagar: ' + fulfillmentError.message);

    return new Response(
      JSON.stringify({ success: true, picks_added: picksCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const status = msg === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
