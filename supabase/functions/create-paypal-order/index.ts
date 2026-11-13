import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { getCheckoutOrigin } from "../_shared/checkout-origin.ts";
import { isPaymentTrialAccount } from '../_shared/payment-trial.ts';

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
    const origin = getCheckoutOrigin(req.headers.get("origin"));
    // Verify JWT signature via Supabase Auth (never trust client-decoded claims)
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
    const destination = returnOrigin === undefined ? origin : getCheckoutOrigin(returnOrigin);
    if (!packId) throw new Error("Missing packId");

    // Fetch authoritative pack data server-side (never trust client-supplied price/quantity)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const { data: isAdmin, error: roleError } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
    const { data: config, error: configError } = await admin.from('global_config').select('beta_mode').limit(1).single();
    if (roleError || configError || !config) throw new Error('Payment configuration unavailable');
    if (config.beta_mode && !isPaymentTrialAccount(userId, isAdmin === true)) {
      return new Response(JSON.stringify({ error: 'Real payment trial is restricted to the owner' }), {
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

    const accessToken = await getAccessToken();

    const orderRes = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": crypto.randomUUID(),
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "EUR",
              value: Number(pack.price).toFixed(2),
            },
            description: `ysilegustas - ${pack.name} (${pack.picks_count} créditos)`,
            // custom_id stores only user_id and pack_id; price/picks are re-read from DB on capture
            custom_id: JSON.stringify({ user_id: userId, pack_id: pack.id }),
          },
        ],
        application_context: {
          brand_name: "ysilegustas",
          landing_page: "BILLING",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          payment_method_preference: "UNRESTRICTED",
          return_url: `${destination}/payment-success?provider=paypal`,
          cancel_url: `${destination}/buy-packs`,
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const status = msg === "Unauthorized" ? 401 : msg === "Invalid checkout origin" ? 400 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
