import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYPAL_API = "https://api-m.paypal.com";

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID") || "";
  const secretKey = Deno.env.get("PAYPAL_SECRET_KEY") || "";

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secretKey}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`PayPal auth failed [${res.status}]`);
  const data = await res.json();
  return data.access_token;
}

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

    const { orderId } = await req.json();
    if (!orderId) throw new Error("Missing orderId");

    const accessToken = await getAccessToken();

    // First get order details to check status
    const orderRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!orderRes.ok) throw new Error(`Failed to get order [${orderRes.status}]`);
    const orderDetails = await orderRes.json();

    // If already captured, handle idempotently
    if (orderDetails.status === "COMPLETED") {
      return new Response(
        JSON.stringify({ success: true, already_processed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (orderDetails.status !== "APPROVED") {
      return new Response(
        JSON.stringify({ success: false, error: `Order not approved. Status: ${orderDetails.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Capture the payment
    const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!captureRes.ok) {
      const text = await captureRes.text();
      throw new Error(`PayPal capture failed [${captureRes.status}]: ${text}`);
    }

    const captureData = await captureRes.json();

    if (captureData.status !== "COMPLETED") {
      return new Response(
        JSON.stringify({ success: false, error: "Payment capture not completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Parse custom_id metadata
    const customId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id
      || orderDetails.purchase_units?.[0]?.custom_id;

    let meta: { user_id: string; pack_name: string; pack_id: string; picks_count: number; price: number };
    try {
      meta = JSON.parse(customId);
    } catch {
      throw new Error("Invalid order metadata");
    }

    // Verify user matches
    if (meta.user_id !== userId) {
      throw new Error("Unauthorized: order does not belong to this user");
    }

    const picksCount = Number(meta.picks_count);
    const price = Number(meta.price);

    // Use service role for DB operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Idempotency check
    const { data: existingPurchase } = await supabaseAdmin
      .from("pack_purchases")
      .select("id")
      .eq("payment_method", `paypal:${orderId}`)
      .limit(1);

    if (existingPurchase && existingPurchase.length > 0) {
      return new Response(
        JSON.stringify({ success: true, already_processed: true, picks_added: picksCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Record purchase
    const { error: purchaseError } = await supabaseAdmin
      .from("pack_purchases")
      .insert({
        user_id: userId,
        pack_id: meta.pack_id,
        pack_name: meta.pack_name,
        picks_count: picksCount,
        price: price,
        payment_method: `paypal:${orderId}`,
      });

    if (purchaseError) throw new Error(`Purchase insert failed: ${purchaseError.message}`);

    // Update balance
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
        { onConflict: "user_id" }
      );

    if (balanceError) throw new Error(`Balance update failed: ${balanceError.message}`);

    return new Response(
      JSON.stringify({ success: true, picks_added: picksCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
