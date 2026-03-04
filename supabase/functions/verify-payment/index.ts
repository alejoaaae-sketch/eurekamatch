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
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.sub || (payload.exp && payload.exp * 1000 < Date.now())) {
      throw new Error("Invalid or expired token");
    }
    const userId = payload.sub;

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

    // Verify the session belongs to this user
    const meta = session.metadata;
    if (!meta || meta.user_id !== userId) {
      throw new Error("Unauthorized: session does not belong to this user");
    }

    const picksCount = parseInt(meta.picks_count, 10);
    const price = parseFloat(meta.price);
    const packName = meta.pack_name;
    const packId = meta.pack_id;

    // Use service role to update balance
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if this session was already processed (idempotency)
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

    // Record purchase
    const { error: purchaseError } = await supabaseAdmin
      .from("pack_purchases")
      .insert({
        user_id: userId,
        pack_id: packId,
        pack_name: packName,
        picks_count: picksCount,
        price: price,
        payment_method: `stripe:${sessionId}`,
      });

    if (purchaseError) throw new Error(`Purchase insert failed: ${purchaseError.message}`);

    // Get current balance
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
        {
          user_id: userId,
          picks_remaining: remaining,
          total_purchased: purchased,
          total_used: used,
        },
        { onConflict: "user_id" }
      );

    if (balanceError) throw new Error(`Balance update failed: ${balanceError.message}`);

    return new Response(
      JSON.stringify({ success: true, picks_added: picksCount }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
