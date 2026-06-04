import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Missing sessionId");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ success: false, error: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const meta = session.metadata;
    if (!meta || meta.user_id !== userId || !meta.pack_id) {
      throw new Error("Unauthorized: session does not belong to this user");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Re-read authoritative pack data
    const { data: pack, error: packErr } = await supabaseAdmin
      .from("pick_packs")
      .select("id, name, picks_count, price")
      .eq("id", meta.pack_id)
      .single();
    if (packErr || !pack) throw new Error("Pack not found");

    const picksCount = Number(pack.picks_count);
    const price = Number(pack.price);

    const { data: existingPurchase } = await supabaseAdmin
      .from("pack_purchases")
      .select("id")
      .eq("payment_method", `stripe:${sessionId}`)
      .limit(1);

    if (existingPurchase && existingPurchase.length > 0) {
      return new Response(JSON.stringify({ success: true, already_processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { error: purchaseError } = await supabaseAdmin
      .from("pack_purchases")
      .insert({
        user_id: userId,
        pack_id: pack.id,
        pack_name: pack.name,
        picks_count: picksCount,
        price: price,
        payment_method: `stripe:${sessionId}`,
      });

    if (purchaseError) throw new Error(`Purchase insert failed: ${purchaseError.message}`);

    const { data: currentBalance } = await supabaseAdmin
      .from("user_pick_balance")
      .select("picks_remaining, total_purchased, total_used")
      .eq("user_id", userId)
      .single();

    const remaining = (currentBalance?.picks_remaining ?? 0) + picksCount;
    const purchased = (currentBalance?.total_purchased ?? 0) + picksCount;
    const used = currentBalance?.total_used ?? 0;

    const { error: balanceError } = await supabaseAdmin
      .from("user_pick_balance")
      .upsert(
        { user_id: userId, picks_remaining: remaining, total_purchased: purchased, total_used: used },
        { onConflict: "user_id" },
      );

    if (balanceError) throw new Error(`Balance update failed: ${balanceError.message}`);

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
