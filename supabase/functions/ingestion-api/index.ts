import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, x-square-hmacsha256-signature, x-anet-signature",
};

type Provider = "stripe" | "square" | "authorizenet";
type JobStatus = "queued" | "running" | "completed" | "failed";
type SourceType = "csv" | Provider;

interface NormalizedTx {
  source_provider: Provider;
  source_txn_id: string;
  amount: number;
  currency: string;
  approved: boolean;
  decline_code?: string | null;
  country?: string | null;
  channel?: string | null;
  occurred_at: string;
  settled_at?: string | null;
  raw_ref?: string | null;
  payment_method?: string | null;
}

const validProviders: Provider[] = ["stripe", "square", "authorizenet"];
const encoder = new TextEncoder();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toIsoOrNow(value?: string | null) {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function getPathParts(path: string) {
  return path.split("/").filter(Boolean);
}

function getProviderFromPath(path: string, segment = "connectors"): Provider | null {
  const parts = getPathParts(path);
  const idx = parts.indexOf(segment);
  const candidate = idx >= 0 ? parts[idx + 1] : null;
  if (!candidate || !validProviders.includes(candidate as Provider)) return null;
  return candidate as Provider;
}

function parseHeaderValue(headers: Headers, name: string): string | null {
  return headers.get(name) ?? headers.get(name.toLowerCase()) ?? headers.get(name.toUpperCase());
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes: ArrayBuffer) {
  const arr = new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin);
}

function looksHex(value: string) {
  return /^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0;
}

function hexToBytes(hex: string) {
  const clean = hex.replace(/^0x/, "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

function secureCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function hmacDigest(
  algo: "SHA-256" | "SHA-512",
  key: string | Uint8Array,
  message: string,
) {
  const keyBytes = typeof key === "string" ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: algo },
    false,
    ["sign"],
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
}

function normalizeAmountMinorUnits(value: unknown) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;
  return num / 100;
}

function connectionDefaultsFor(provider: Provider) {
  if (provider === "stripe") {
    return { credentialsRef: "STRIPE_SECRET_KEY", webhookSecretRef: "STRIPE_WEBHOOK_SECRET" };
  }
  if (provider === "square") {
    return { credentialsRef: "SQUARE_ACCESS_TOKEN", webhookSecretRef: "SQUARE_WEBHOOK_SIGNATURE_KEY" };
  }
  return { credentialsRef: "AUTHORIZENET_TRANSACTION_KEY", webhookSecretRef: "AUTHORIZENET_WEBHOOK_SIGNATURE_KEY" };
}

function providerTokenFromEnv(provider: Provider, credentialsRef?: string | null) {
  const ref = credentialsRef ?? connectionDefaultsFor(provider).credentialsRef;
  return Deno.env.get(ref);
}

function webhookSecretFromEnv(provider: Provider, webhookSecretRef?: string | null) {
  const ref = webhookSecretRef ?? connectionDefaultsFor(provider).webhookSecretRef;
  return Deno.env.get(ref);
}

async function findJobByIdempotency(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  sourceType: SourceType,
  idempotencyKey?: string | null,
) {
  if (!idempotencyKey) return null;
  const { data, error } = await supabase
    .from("ingestion_jobs")
    .select("*")
    .eq("company_id", companyId)
    .eq("source_type", sourceType)
    .eq("idempotency_key", idempotencyKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

async function updateJob(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  updates: Record<string, unknown>,
) {
  const { error } = await supabase.from("ingestion_jobs").update(updates).eq("id", jobId);
  if (error) throw error;
}

async function upsertNormalizedTransactions(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  rows: NormalizedTx[],
) {
  if (!rows.length) return;
  const payload = rows.map((row) => ({ ...row, company_id: companyId }));
  const { error } = await supabase.from("normalized_transactions").upsert(payload, {
    onConflict: "company_id,source_provider,source_txn_id",
    ignoreDuplicates: false,
  });
  if (error) throw error;
}

async function loadConnection(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  provider: Provider,
) {
  const { data, error } = await supabase
    .from("processor_connections")
    .select("*")
    .eq("company_id", companyId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function syncStripe(params: { token: string; cursor?: string | null; since?: string; until?: string }) {
  const qs = new URLSearchParams();
  qs.set("limit", "100");
  if (params.cursor) qs.set("starting_after", params.cursor);
  if (params.since) qs.set("created[gte]", String(Math.floor(new Date(params.since).getTime() / 1000)));
  if (params.until) qs.set("created[lte]", String(Math.floor(new Date(params.until).getTime() / 1000)));

  const res = await fetch(`https://api.stripe.com/v1/charges?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${params.token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Stripe sync failed: ${body?.error?.message ?? res.statusText}`);
  const charges = Array.isArray(body.data) ? body.data : [];
  const mapped: NormalizedTx[] = charges.map((c: any) => ({
    source_provider: "stripe",
    source_txn_id: String(c.id),
    amount: normalizeAmountMinorUnits(c.amount),
    currency: String(c.currency ?? "USD").toUpperCase(),
    approved: c.status === "succeeded",
    decline_code: c.outcome?.reason ?? c.failure_code ?? null,
    country: c.billing_details?.address?.country ?? null,
    channel: c.payment_method_details?.type ?? "card",
    occurred_at: new Date(Number(c.created) * 1000).toISOString(),
    raw_ref: `stripe:${c.id}`,
    payment_method: c.payment_method_details?.type ?? "card",
  }));
  const nextCursor = body.has_more && charges.length ? String(charges[charges.length - 1].id) : null;
  return { transactions: mapped, cursor: nextCursor };
}

async function syncSquare(params: { token: string; cursor?: string | null; since?: string; until?: string }) {
  const payload: Record<string, unknown> = {
    limit: 100,
    cursor: params.cursor ?? undefined,
  };
  if (params.since || params.until) {
    payload.query = {
      filter: {
        date_time_filter: {
          created_at: {
            start_at: params.since ? toIsoOrNow(params.since) : undefined,
            end_at: params.until ? toIsoOrNow(params.until) : undefined,
          },
        },
      },
      sort: { sort_field: "CREATED_AT", sort_order: "ASC" },
    };
  }

  const res = await fetch("https://connect.squareup.com/v2/payments/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.token}`,
      "Square-Version": "2026-01-15",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Square sync failed: ${body?.errors?.[0]?.detail ?? res.statusText}`);
  const payments = Array.isArray(body.payments) ? body.payments : [];
  const mapped: NormalizedTx[] = payments.map((p: any) => ({
    source_provider: "square",
    source_txn_id: String(p.id),
    amount: normalizeAmountMinorUnits(p.amount_money?.amount),
    currency: String(p.amount_money?.currency ?? "USD").toUpperCase(),
    approved: p.status === "COMPLETED",
    decline_code: p.status === "FAILED" ? String(p.delay_duration ?? "failed") : null,
    country: p.buyer_address?.country ?? null,
    channel: p.source_type ?? "card",
    occurred_at: toIsoOrNow(p.created_at),
    settled_at: p.updated_at ?? null,
    raw_ref: `square:${p.id}`,
    payment_method: p.source_type ?? "card",
  }));
  return { transactions: mapped, cursor: body.cursor ?? null };
}

async function requestAuthorizeNet(
  endpoint: string,
  loginId: string,
  transactionKey: string,
  requestBody: Record<string, unknown>,
) {
  const body = {
    ...requestBody,
    merchantAuthentication: {
      name: loginId,
      transactionKey,
    },
  };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const jsonBody = await res.json();
  if (!res.ok) throw new Error(`Authorize.net request failed: ${res.statusText}`);
  return jsonBody;
}

async function syncAuthorizeNet(params: { loginId: string; transactionKey: string; since?: string; until?: string }) {
  const endpoint = Deno.env.get("AUTHORIZENET_API_URL") ?? "https://apitest.authorize.net/xml/v1/request.api";
  const firstSettlementDate = params.since ? toIsoOrNow(params.since) : new Date(Date.now() - 86400000).toISOString();
  const lastSettlementDate = params.until ? toIsoOrNow(params.until) : new Date().toISOString();

  const batchResp = await requestAuthorizeNet(endpoint, params.loginId, params.transactionKey, {
    getSettledBatchListRequest: {
      firstSettlementDate,
      lastSettlementDate,
      includeStatistics: false,
    },
  });
  const batches = batchResp?.batchList ?? batchResp?.getSettledBatchListResponse?.batchList ?? [];
  const list = Array.isArray(batches) ? batches : [];

  const transactions: NormalizedTx[] = [];
  for (const batch of list.slice(0, 10)) {
    const batchId = String(batch.batchId ?? batch.batchID ?? "");
    if (!batchId) continue;

    const txResp = await requestAuthorizeNet(endpoint, params.loginId, params.transactionKey, {
      getTransactionListRequest: { batchId },
    });
    const txList = txResp?.transactions ?? txResp?.getTransactionListResponse?.transactions ?? [];
    const arr = Array.isArray(txList) ? txList : [];
    for (const tx of arr) {
      const status = String(tx.transactionStatus ?? "").toLowerCase();
      transactions.push({
        source_provider: "authorizenet",
        source_txn_id: String(tx.transId ?? tx.transactionId ?? crypto.randomUUID()),
        amount: Number(tx.settleAmount ?? tx.authAmount ?? 0) || 0,
        currency: String(tx.settleCurrency ?? "USD").toUpperCase(),
        approved: status.includes("settled") || status.includes("approved"),
        decline_code: status.includes("declined") ? status : null,
        country: tx?.billTo?.country ?? null,
        channel: "card",
        occurred_at: toIsoOrNow(tx.submitTimeUTC ?? tx.submitTimeLocal),
        settled_at: toIsoOrNow(tx.settlementTimeUTC ?? tx.settlementTimeLocal),
        raw_ref: `authorizenet:${tx.transId ?? tx.transactionId ?? ""}`,
        payment_method: "card",
      });
    }
  }

  return { transactions, cursor: null };
}

async function pullProviderTransactions(
  provider: Provider,
  params: {
    token?: string;
    cursor?: string | null;
    since?: string;
    until?: string;
    authorizeNetLoginId?: string;
    authorizeNetTxKey?: string;
  },
) {
  if (provider === "stripe") {
    if (!params.token) throw new Error("Missing Stripe API token");
    return await syncStripe({
      token: params.token,
      cursor: params.cursor,
      since: params.since,
      until: params.until,
    });
  }
  if (provider === "square") {
    if (!params.token) throw new Error("Missing Square access token");
    return await syncSquare({
      token: params.token,
      cursor: params.cursor,
      since: params.since,
      until: params.until,
    });
  }
  if (!params.authorizeNetLoginId || !params.authorizeNetTxKey) {
    throw new Error("Missing Authorize.net credentials (login id + transaction key)");
  }
  return await syncAuthorizeNet({
    loginId: params.authorizeNetLoginId,
    transactionKey: params.authorizeNetTxKey,
    since: params.since,
    until: params.until,
  });
}

async function validateWebhookSignature(
  provider: Provider,
  req: Request,
  bodyText: string,
  webhookSecret: string,
) {
  if (provider === "stripe") {
    const header = parseHeaderValue(req.headers, "stripe-signature");
    if (!header) return false;
    const parts = header.split(",").map((x) => x.trim());
    const tPart = parts.find((x) => x.startsWith("t="));
    const v1Part = parts.find((x) => x.startsWith("v1="));
    if (!tPart || !v1Part) return false;
    const timestamp = tPart.split("=")[1];
    const received = v1Part.split("=")[1];
    const signedPayload = `${timestamp}.${bodyText}`;
    const digest = await hmacDigest("SHA-256", webhookSecret, signedPayload);
    return secureCompare(bytesToHex(digest), received);
  }

  if (provider === "square") {
    const received = parseHeaderValue(req.headers, "x-square-hmacsha256-signature");
    if (!received) return false;
    const signedPayload = `${req.url}${bodyText}`;
    const digest = await hmacDigest("SHA-256", webhookSecret, signedPayload);
    return secureCompare(bytesToBase64(digest), received);
  }

  const rawHeader = parseHeaderValue(req.headers, "x-anet-signature");
  if (!rawHeader) return false;
  const received = rawHeader.replace(/^SHA512=/i, "").trim().toLowerCase();
  const keyBytes = looksHex(webhookSecret) ? hexToBytes(webhookSecret) : encoder.encode(webhookSecret);
  const digest = await hmacDigest("SHA-512", keyBytes, bodyText);
  return secureCompare(bytesToHex(digest).toLowerCase(), received);
}

function mapStripeWebhookEvent(payload: any): NormalizedTx[] {
  const object = payload?.data?.object;
  if (!object || !object.id) return [];
  if (!String(payload?.type ?? "").startsWith("charge.")) return [];
  return [{
    source_provider: "stripe",
    source_txn_id: String(object.id),
    amount: normalizeAmountMinorUnits(object.amount),
    currency: String(object.currency ?? "USD").toUpperCase(),
    approved: object.status === "succeeded",
    decline_code: object.failure_code ?? object.outcome?.reason ?? null,
    country: object.billing_details?.address?.country ?? null,
    channel: object.payment_method_details?.type ?? "card",
    occurred_at: new Date(Number(object.created) * 1000).toISOString(),
    raw_ref: `stripe:${object.id}`,
    payment_method: object.payment_method_details?.type ?? "card",
  }];
}

function mapSquareWebhookEvent(payload: any): NormalizedTx[] {
  const payment = payload?.data?.object?.payment;
  if (!payment?.id) return [];
  return [{
    source_provider: "square",
    source_txn_id: String(payment.id),
    amount: normalizeAmountMinorUnits(payment.amount_money?.amount),
    currency: String(payment.amount_money?.currency ?? "USD").toUpperCase(),
    approved: payment.status === "COMPLETED",
    decline_code: payment.status === "FAILED" ? "failed" : null,
    country: payment.buyer_address?.country ?? null,
    channel: payment.source_type ?? "card",
    occurred_at: toIsoOrNow(payment.created_at),
    settled_at: payment.updated_at ?? null,
    raw_ref: `square:${payment.id}`,
    payment_method: payment.source_type ?? "card",
  }];
}

function mapAuthorizeNetWebhookEvent(payload: any): NormalizedTx[] {
  const item = payload?.payload;
  if (!item?.id) return [];
  const status = String(item.responseCode ?? "").toLowerCase();
  return [{
    source_provider: "authorizenet",
    source_txn_id: String(item.id),
    amount: Number(item.authAmount ?? item.settleAmount ?? 0) || 0,
    currency: String(item.currencyCode ?? "USD").toUpperCase(),
    approved: ["1", "approved"].includes(status),
    decline_code: ["2", "3", "declined"].includes(status) ? status : null,
    country: item?.billTo?.country ?? null,
    channel: "card",
    occurred_at: toIsoOrNow(item.submitTimeUTC),
    raw_ref: `authorizenet:${item.id}`,
    payment_method: "card",
  }];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/+/, "");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === "POST" && path.endsWith("v1/ingestion/csv/jobs")) {
      const body = await req.json();
      const { company_id, source_ref, row_count, idempotency_key, rejected_rows, error: jobError, max_retries } = body;
      const existing = await findJobByIdempotency(supabase, company_id, "csv", idempotency_key ?? null);
      if (existing) return json({ job_id: existing.id, deduplicated: true, status: existing.status });

      const status: JobStatus = jobError ? "failed" : "completed";
      const { data, error } = await supabase
        .from("ingestion_jobs")
        .insert({
          company_id,
          source_type: "csv",
          source_ref: source_ref ?? null,
          idempotency_key: idempotency_key ?? null,
          status,
          retry_count: 0,
          max_retries: Number(max_retries ?? 3),
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          stats_json: { ingested_rows: row_count ?? 0, rejected_rows: Array.isArray(rejected_rows) ? rejected_rows.length : 0 },
          error_json: jobError ?? null,
          rejected_rows_json: Array.isArray(rejected_rows) ? rejected_rows : null,
          last_error: jobError?.message ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return json({ job_id: data.id, deduplicated: false, status });
    }

    if (req.method === "GET" && path.includes("v1/ingestion/jobs/")) {
      const parts = getPathParts(path);
      const id = parts[parts.indexOf("jobs") + 1];
      const { data, error } = await supabase.from("ingestion_jobs").select("*").eq("id", id).single();
      if (error) throw error;
      return json(data);
    }

    if (req.method === "POST" && path.includes("v1/ingestion/jobs/") && path.endsWith("/retry")) {
      const parts = getPathParts(path);
      const id = parts[parts.indexOf("jobs") + 1];
      const { data: job, error: readError } = await supabase.from("ingestion_jobs").select("*").eq("id", id).single();
      if (readError) throw readError;

      const retries = Number(job.retry_count ?? 0);
      const maxRetries = Number(job.max_retries ?? 3);
      if (retries >= maxRetries) {
        return json({ error: "Max retries exceeded", retry_count: retries, max_retries: maxRetries }, 409);
      }

      await updateJob(supabase, id, {
        status: "queued",
        retry_count: retries + 1,
        next_retry_at: null,
        last_error: null,
        started_at: null,
        finished_at: null,
        error_json: null,
      });
      return json({ job_id: id, status: "queued", retry_count: retries + 1, max_retries: maxRetries });
    }

    if (req.method === "POST" && path.includes("v1/connectors/") && path.endsWith("/connect")) {
      const provider = getProviderFromPath(path, "connectors");
      if (!provider) return json({ error: "Invalid connector provider" }, 400);
      const body = await req.json();
      const { company_id } = body;
      const defaults = connectionDefaultsFor(provider);

      const { data, error } = await supabase
        .from("processor_connections")
        .upsert({
          company_id,
          provider,
          status: "connected",
          credentials_ref: body.credentials_ref ?? defaults.credentialsRef,
          webhook_secret_ref: body.webhook_secret_ref ?? defaults.webhookSecretRef,
          retry_count: 0,
          last_error: null,
          dead_letter_ref: null,
        }, { onConflict: "company_id,provider" })
        .select("id")
        .single();
      if (error) throw error;
      return json({ connection_id: data.id, status: "connected" });
    }

    if (req.method === "POST" && path.includes("v1/connectors/") && path.endsWith("/sync")) {
      const provider = getProviderFromPath(path, "connectors");
      if (!provider) return json({ error: "Invalid connector provider" }, 400);
      const body = await req.json();
      const { company_id, idempotency_key, max_retries, since, until, cursor } = body;

      const existing = await findJobByIdempotency(supabase, company_id, provider, idempotency_key ?? null);
      if (existing) return json({ job_id: existing.id, deduplicated: true, status: existing.status });

      const { data: job, error: createError } = await supabase
        .from("ingestion_jobs")
        .insert({
          company_id,
          source_type: provider,
          source_ref: "manual-sync",
          status: "running",
          idempotency_key: idempotency_key ?? null,
          retry_count: 0,
          max_retries: Number(max_retries ?? 3),
          started_at: new Date().toISOString(),
          stats_json: { note: "Connector sync running" },
        })
        .select("id")
        .single();
      if (createError) throw createError;

      const jobId = job.id as string;
      try {
        const connection = await loadConnection(supabase, company_id, provider);
        const token = providerTokenFromEnv(provider, connection?.credentials_ref ?? null);
        const loginId = Deno.env.get("AUTHORIZENET_API_LOGIN_ID");
        const authorizeNetTxKey = token;

        const pulled = await pullProviderTransactions(provider, {
          token: provider === "authorizenet" ? undefined : token,
          cursor: cursor ?? null,
          since: since ?? undefined,
          until: until ?? undefined,
          authorizeNetLoginId: loginId ?? undefined,
          authorizeNetTxKey: authorizeNetTxKey ?? undefined,
        });

        await upsertNormalizedTransactions(supabase, company_id, pulled.transactions);
        const finishedAt = new Date().toISOString();
        await updateJob(supabase, jobId, {
          status: "completed",
          finished_at: finishedAt,
          stats_json: {
            ingested_rows: pulled.transactions.length,
            pulled_rows: pulled.transactions.length,
            next_cursor: pulled.cursor,
          },
          last_error: null,
        });
        await supabase
          .from("processor_connections")
          .update({
            status: "connected",
            last_sync_at: finishedAt,
            last_error: null,
            dead_letter_ref: null,
          })
          .eq("company_id", company_id)
          .eq("provider", provider);

        return json({
          job_id: jobId,
          status: "completed",
          ingested_rows: pulled.transactions.length,
          next_cursor: pulled.cursor,
        });
      } catch (error) {
        const message = String(error);
        const { data: currentJob } = await supabase.from("ingestion_jobs").select("retry_count").eq("id", jobId).single();
        const retryCount = Number(currentJob?.retry_count ?? 0) + 1;

        await updateJob(supabase, jobId, {
          status: "failed",
          finished_at: new Date().toISOString(),
          retry_count: retryCount,
          last_error: message,
          error_json: { message },
          next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        });
        await supabase
          .from("processor_connections")
          .update({
            status: "error",
            retry_count: retryCount,
            last_error: message,
            dead_letter_ref: `ingestion_jobs/${jobId}`,
          })
          .eq("company_id", company_id)
          .eq("provider", provider);
        return json({ job_id: jobId, status: "failed", error: message }, 500);
      }
    }

    if (req.method === "POST" && path.includes("v1/webhooks/")) {
      const provider = getProviderFromPath(path, "webhooks");
      if (!provider) return json({ error: "Invalid webhook provider" }, 400);

      const companyId = url.searchParams.get("company_id");
      if (!companyId) return json({ error: "Missing company_id query parameter" }, 400);

      const connection = await loadConnection(supabase, companyId, provider);
      const webhookSecret = webhookSecretFromEnv(provider, connection?.webhook_secret_ref ?? null);
      if (!webhookSecret) return json({ error: `Missing webhook secret for ${provider}` }, 500);

      const bodyText = await req.text();
      const valid = await validateWebhookSignature(provider, req, bodyText, webhookSecret);
      if (!valid) return json({ error: "Invalid webhook signature" }, 401);

      const payload = JSON.parse(bodyText || "{}");
      let mapped: NormalizedTx[] = [];
      if (provider === "stripe") mapped = mapStripeWebhookEvent(payload);
      if (provider === "square") mapped = mapSquareWebhookEvent(payload);
      if (provider === "authorizenet") mapped = mapAuthorizeNetWebhookEvent(payload);

      if (!mapped.length) return json({ accepted: true, ingested_rows: 0 });
      await upsertNormalizedTransactions(supabase, companyId, mapped);
      return json({ accepted: true, ingested_rows: mapped.length });
    }

    return json({ error: "Route not found" }, 404);
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
});
