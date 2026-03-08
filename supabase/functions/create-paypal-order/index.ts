import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYPAL_API = "https://api-m.sandbox.paypal.com"; // Change to https://api-m.paypal.com for production

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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed [${res.status}]: ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth - manual JWT decode
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.sub || (payload.exp && payload.exp * 1000 < Date.now())) {
      throw new Error("Invalid or expired token");
    }
    const userId = payload.sub;

    const { packName, packId, picksCount, price } = await req.json();
    if (!packName || !price) throw new Error("Missing pack data");

    const accessToken = await getAccessToken();
    const origin = req.headers.get("origin") || "https://eurekamatch.lovable.app";

    const orderRes = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "EUR",
              value: Number(price).toFixed(2),
            },
            description: `EUREKA - ${packName} (${picksCount} créditos)`,
            custom_id: JSON.stringify({
              user_id: userId,
              pack_name: packName,
              pack_id: packId,
              picks_count: picksCount,
              price: price,
            }),
          },
        ],
        application_context: {
          brand_name: "EUREKA",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: `${origin}/payment-success?provider=paypal`,
          cancel_url: `${origin}/buy-packs`,
        },
      }),
    });

    if (!orderRes.ok) {
      const text = await orderRes.text();
      throw new Error(`PayPal create order failed [${orderRes.status}]: ${text}`);
    }

    const order = await orderRes.json();
    const approveLink = order.links?.find((l: { rel: string }) => l.rel === "approve");

    if (!approveLink) throw new Error("No PayPal approval URL found");

    return new Response(
      JSON.stringify({ url: approveLink.href, orderId: order.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
