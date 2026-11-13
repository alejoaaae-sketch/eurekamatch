import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { completedCaptureAmount } from "../_shared/paypal-capture.ts";

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
    if (typeof orderId !== "string" || !/^[A-Z0-9]{8,64}$/.test(orderId)) throw new Error("Invalid orderId");

    const accessToken = await getAccessToken();

    const orderRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!orderRes.ok) throw new Error(`Failed to get order [${orderRes.status}]`);
    const orderDetails = await orderRes.json();

    // Parse minimal custom_id metadata (only user_id + pack_id, never price/quantity)
    const customId = orderDetails.purchase_units?.[0]?.custom_id;

    let meta: { user_id: string; pack_id: string };
    try {
      meta = JSON.parse(customId);
    } catch {
      throw new Error("Invalid order metadata");
    }

    if (meta.user_id !== userId) {
      throw new Error("Unauthorized: order does not belong to this user");
    }

    let captureData = orderDetails;
    if (orderDetails.status !== "COMPLETED") {
      if (orderDetails.status !== "APPROVED") {
        return new Response(JSON.stringify({ success: false, error: "Order not approved by buyer" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": `capture-${orderId}`,
        },
      });
      if (!captureRes.ok) throw new Error(`PayPal capture failed [${captureRes.status}]: ${await captureRes.text()}`);
      captureData = await captureRes.json();
    }
    const paidAmount = completedCaptureAmount(captureData);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: picksCount, error: fulfillmentError } = await supabaseAdmin.rpc('fulfill_paypal_purchase', {
      p_user_id: userId, p_pack_id: meta.pack_id, p_order_id: orderId, p_amount: paidAmount,
    });
    if (fulfillmentError) throw new Error(`Payment completed; credit registration pending. Do not pay again: ${fulfillmentError.message}`);

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
