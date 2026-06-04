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

    const { orderId } = await req.json();
    if (!orderId) throw new Error("Missing orderId");

    const accessToken = await getAccessToken();

    const orderRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!orderRes.ok) throw new Error(`Failed to get order [${orderRes.status}]`);
    const orderDetails = await orderRes.json();

    if (orderDetails.status === "COMPLETED") {
      return new Response(
        JSON.stringify({ success: true, already_processed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    if (orderDetails.status !== "APPROVED" && orderDetails.status !== "CREATED") {
      return new Response(
        JSON.stringify({ success: false, error: `Order not in capturable state. Status: ${orderDetails.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

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
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Parse minimal custom_id metadata (only user_id + pack_id, never price/quantity)
    const customId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id
      || orderDetails.purchase_units?.[0]?.custom_id;

    let meta: { user_id: string; pack_id: string };
    try {
      meta = JSON.parse(customId);
    } catch {
      throw new Error("Invalid order metadata");
    }

    if (meta.user_id !== userId) {
      throw new Error("Unauthorized: order does not belong to this user");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Re-read authoritative pack data from DB (defence-in-depth against tampering)
    const { data: pack, error: packErr } = await supabaseAdmin
      .from("pick_packs")
      .select("id, name, picks_count, price")
      .eq("id", meta.pack_id)
      .single();
    if (packErr || !pack) throw new Error("Pack not found");

    const picksCount = Number(pack.picks_count);
    const price = Number(pack.price);

    // Idempotency check
    const { data: existingPurchase } = await supabaseAdmin
      .from("pack_purchases")
      .select("id")
      .eq("payment_method", `paypal:${orderId}`)
      .limit(1);

    if (existingPurchase && existingPurchase.length > 0) {
      return new Response(
        JSON.stringify({ success: true, already_processed: true, picks_added: picksCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const { error: purchaseError } = await supabaseAdmin
      .from("pack_purchases")
      .insert({
        user_id: userId,
        pack_id: pack.id,
        pack_name: pack.name,
        picks_count: picksCount,
        price: price,
        payment_method: `paypal:${orderId}`,
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
