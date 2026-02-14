import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getPathParts(path: string) {
  return path.split("/").filter(Boolean);
}

function parseBearerToken(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim();
}

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bucketLabel(d: Date, granularity: "day" | "week" | "month") {
  if (granularity === "day") return d.toISOString().slice(0, 10);
  if (granularity === "month") return d.toISOString().slice(0, 7);

  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((copy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${copy.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = parseBearerToken(req);
    if (!token) return json({ error: "Missing bearer token" }, 401);
    const tokenHash = await sha256Hex(token);

    const { data: tokenRow, error: tokenErr } = await supabase
      .from("service_api_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("status", "active")
      .maybeSingle();
    if (tokenErr) throw tokenErr;
    if (!tokenRow) return json({ error: "Invalid API token" }, 401);
    if (tokenRow.expires_at && new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return json({ error: "API token expired" }, 401);
    }

    const scopes = Array.isArray(tokenRow.scopes) ? tokenRow.scopes as string[] : [];
    const hasScope = (scope: string) => scopes.includes("*") || scopes.includes(scope);

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/+/, "");
    const parts = getPathParts(path);
    const companyId = String(tokenRow.company_id);

    const baseTxQuery = () => {
      let query = supabase.from("normalized_transactions").select("*").eq("company_id", companyId);
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const merchantId = url.searchParams.get("merchant_id");
      const currency = url.searchParams.get("currency");
      if (from) query = query.gte("occurred_at", from);
      if (to) query = query.lte("occurred_at", to);
      if (merchantId) query = query.eq("merchant_id", merchantId);
      if (currency) query = query.eq("currency", currency.toUpperCase());
      return query;
    };

    if (req.method === "GET" && path.endsWith("v1/metrics/summary")) {
      if (!hasScope("metrics:read")) return json({ error: "Missing scope metrics:read" }, 403);
      const { data, error } = await baseTxQuery().limit(5000);
      if (error) throw error;
      const rows = data ?? [];
      const txCount = rows.length;
      const volume = rows.reduce((s, r: any) => s + Number(r.amount ?? 0), 0);
      const revenue = rows.filter((r: any) => r.approved).reduce((s, r: any) => s + Number(r.amount ?? 0), 0);
      const declines = rows.filter((r: any) => !r.approved).length;
      const approvalRate = txCount ? ((txCount - declines) / txCount) * 100 : 0;
      const avgTicket = txCount ? revenue / txCount : 0;
      const creditCardVolume = rows
        .filter((r: any) => String(r.payment_method ?? "card").toLowerCase().includes("card"))
        .reduce((s, r: any) => s + Number(r.amount ?? 0), 0);
      return json({
        volume,
        revenue,
        tx_count: txCount,
        approval_rate: Number(approvalRate.toFixed(2)),
        avg_ticket: Number(avgTicket.toFixed(2)),
        declines,
        credit_card_volume: Number(creditCardVolume.toFixed(2)),
      });
    }

    if (req.method === "GET" && path.endsWith("v1/metrics/transactions")) {
      if (!hasScope("metrics:read")) return json({ error: "Missing scope metrics:read" }, 403);
      const granularity = (url.searchParams.get("granularity") ?? "day") as "day" | "week" | "month";
      const { data, error } = await baseTxQuery().limit(10000);
      if (error) throw error;
      const buckets = new Map<string, number>();
      for (const row of data ?? []) {
        const key = bucketLabel(new Date(row.occurred_at), granularity);
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
      return json(Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([period, tx_count]) => ({ period, tx_count })));
    }

    if (req.method === "GET" && path.endsWith("v1/metrics/revenue")) {
      if (!hasScope("metrics:read")) return json({ error: "Missing scope metrics:read" }, 403);
      const granularity = (url.searchParams.get("granularity") ?? "day") as "day" | "week" | "month";
      const { data, error } = await baseTxQuery().eq("approved", true).limit(10000);
      if (error) throw error;
      const buckets = new Map<string, number>();
      for (const row of data ?? []) {
        const key = bucketLabel(new Date(row.occurred_at), granularity);
        buckets.set(key, (buckets.get(key) ?? 0) + Number(row.amount ?? 0));
      }
      return json(Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([period, revenue]) => ({ period, revenue })));
    }

    if (req.method === "GET" && path.endsWith("v1/risk/events")) {
      if (!hasScope("risk:read")) return json({ error: "Missing scope risk:read" }, 403);
      let query = supabase.from("risk_events").select("*").eq("company_id", companyId).order("detected_at", { ascending: false }).limit(500);
      const severity = url.searchParams.get("severity");
      const status = url.searchParams.get("status");
      const merchantId = url.searchParams.get("merchant_id");
      if (severity) query = query.eq("severity", severity);
      if (status) query = query.eq("status", status);
      if (merchantId) {
        query = query.contains("reasons_json", { merchant_id: merchantId });
      }
      const { data, error } = await query;
      if (error) throw error;
      return json(data ?? []);
    }

    const merchantIdx = parts.indexOf("merchants");
    if (req.method === "GET" && merchantIdx >= 0 && parts[merchantIdx + 2] === "scorecards") {
      if (!hasScope("merchant:read")) return json({ error: "Missing scope merchant:read" }, 403);
      const merchantId = parts[merchantIdx + 1];
      const { data, error } = await supabase
        .from("merchant_scores")
        .select("*")
        .eq("company_id", companyId)
        .eq("merchant_id", merchantId)
        .order("as_of", { ascending: false })
        .limit(500);
      if (error) throw error;
      return json(data ?? []);
    }

    if (req.method === "GET" && path.endsWith("v1/recommendations")) {
      if (!hasScope("recommendations:read")) return json({ error: "Missing scope recommendations:read" }, 403);
      let query = supabase
        .from("recommendations")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(500);
      const status = url.searchParams.get("status");
      const priority = url.searchParams.get("priority");
      if (status) query = query.eq("lifecycle_state", status);
      if (priority) query = query.eq("priority", priority);
      const { data, error } = await query;
      if (error) throw error;
      return json(data ?? []);
    }

    if (req.method === "POST" && path.endsWith("v1/auth/tokens/last-used")) {
      await supabase.from("service_api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tokenRow.id);
      return json({ ok: true });
    }

    return json({ error: "Route not found" }, 404);
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
});
