import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function parseStripeSignature(header: string | null) {
  if (!header) return null;
  const parts = header.split(",").map((p) => p.trim());
  const t = parts.find((p) => p.startsWith("t="))?.slice(2);
  const v1 = parts.find((p) => p.startsWith("v1="))?.slice(3);
  if (!t || !v1) return null;
  return { t, v1 };
}

serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace("/functions/v1/ingestion-webhook", "");

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (path !== "/stripe") return json({ error: "Not found" }, 404);

  if (!stripeWebhookSecret) return json({ error: "STRIPE_WEBHOOK_SECRET is not configured" }, 500);
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);

  const rawBody = await req.text();
  const sig = parseStripeSignature(req.headers.get("stripe-signature"));
  if (!sig) return json({ error: "Missing/invalid Stripe-Signature header" }, 400);

  const ts = Number(sig.t);
  if (!Number.isFinite(ts)) return json({ error: "Invalid Stripe signature timestamp" }, 400);
  // 5 minute replay window
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > 300) return json({ error: "Stripe signature timestamp outside tolerance window" }, 400);

  const signedPayload = `${sig.t}.${rawBody}`;
  const expected = await hmacSha256Hex(stripeWebhookSecret, signedPayload);
  if (!timingSafeEqualHex(expected, sig.v1)) return json({ error: "Invalid Stripe signature" }, 400);

  const event = JSON.parse(rawBody) as Record<string, unknown>;
  const eventType = String(event.type ?? "");
  const obj = (event as any)?.data?.object;

  // We accept a minimal set; other types are acknowledged.
  const supported = new Set(["charge.succeeded", "payment_intent.succeeded", "checkout.session.completed"]);
  if (!supported.has(eventType)) return json({ received: true, ignored: true, type: eventType });

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Attempt to identify merchant by Stripe-Account header (Connect). Fallback to single active Stripe connection.
  const stripeAccount = req.headers.get("stripe-account");

  let connection: any = null;
  if (stripeAccount) {
    const { data } = await supabase
      .from("processor_connections")
      .select("id, merchant_id, provider, account_id, status")
      .eq("provider", "stripe")
      .eq("account_id", stripeAccount)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    connection = data;
  }

  if (!connection) {
    const { data } = await supabase
      .from("processor_connections")
      .select("id, merchant_id, provider, account_id, status")
      .eq("provider", "stripe")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    connection = data;
  }

  if (!connection?.merchant_id) {
    return json({ error: "No active Stripe processor connection found to map webhook to merchant" }, 409);
  }

  const externalId = String(obj?.id ?? (event as any).id ?? "");
  if (!externalId) return json({ error: "Missing external transaction id" }, 400);

  const amountCents = Number(obj?.amount ?? obj?.amount_total ?? 0);
  const amount = Math.round(amountCents) / 100;

  const currency = String(obj?.currency ?? "usd").toUpperCase();
  const status = String(obj?.status ?? "");

  const created = Number(obj?.created ?? 0);
  const occurredAt = created ? new Date(created * 1000).toISOString() : new Date().toISOString();

  const description = String(obj?.description ?? obj?.statement_descriptor ?? "Card sale");

  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .upsert(
      {
        merchant_id: connection.merchant_id,
        processor_connection_id: connection.id,
        processor: "stripe",
        external_transaction_id: externalId,
        occurred_at: occurredAt,
        amount,
        currency,
        status,
        description,
        raw: event,
      },
      { onConflict: "merchant_id,processor,external_transaction_id" },
    )
    .select("id")
    .single();

  if (txError) return json({ error: txError.message }, 500);

  // Minimal line item: treat entire charge as one line.
  await supabase.from("transaction_line_items").insert({
    transaction_id: tx.id,
    name: description,
    quantity: 1,
    unit_price: amount,
    line_total: amount,
  });

  return json({ received: true, type: eventType, transaction_id: tx.id });
});

