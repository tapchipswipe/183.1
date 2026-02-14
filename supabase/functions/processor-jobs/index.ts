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

function rankSeverity(value: string) {
  if (value === "critical") return 4;
  if (value === "high") return 3;
  if (value === "medium") return 2;
  return 1;
}

function severityMeetsThreshold(eventSeverity: string, minSeverity: string) {
  return rankSeverity(eventSeverity) >= rankSeverity(minSeverity);
}

async function generateRiskEvents(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  fromIso: string,
  toIso: string,
) {
  const { data: txRows, error: txError } = await supabase
    .from("normalized_transactions")
    .select("id,merchant_id,source_txn_id,amount,approved,country,occurred_at,card_fingerprint_token")
    .eq("company_id", companyId)
    .gte("occurred_at", fromIso)
    .lte("occurred_at", toIso)
    .order("occurred_at", { ascending: false })
    .limit(5000);
  if (txError) throw txError;
  const rows = txRows ?? [];

  const riskEvents: Array<Record<string, unknown>> = [];
  const byMerchant = new Map<string, { total: number; declines: number; volume: number }>();
  const byCardCountry = new Map<string, Set<string>>();
  const byCardHour = new Map<string, number>();

  for (const row of rows) {
    const merchantKey = String(row.merchant_id ?? "unknown");
    const prev = byMerchant.get(merchantKey) ?? { total: 0, declines: 0, volume: 0 };
    prev.total += 1;
    prev.volume += Number(row.amount ?? 0);
    if (!row.approved) prev.declines += 1;
    byMerchant.set(merchantKey, prev);

    const cardToken = String(row.card_fingerprint_token ?? "");
    if (cardToken) {
      const countries = byCardCountry.get(cardToken) ?? new Set<string>();
      if (row.country) countries.add(String(row.country));
      byCardCountry.set(cardToken, countries);

      const d = new Date(String(row.occurred_at));
      const hourBucket = `${cardToken}:${d.toISOString().slice(0, 13)}`;
      byCardHour.set(hourBucket, (byCardHour.get(hourBucket) ?? 0) + 1);
    }
  }

  for (const [merchantId, stats] of byMerchant) {
    const declineRate = stats.total ? stats.declines / stats.total : 0;
    if (declineRate >= 0.35 && stats.total >= 10) {
      riskEvents.push({
        company_id: companyId,
        transaction_id: null,
        event_type: "risk.anomaly_detected",
        severity: declineRate > 0.5 ? "critical" : "high",
        score: Number((declineRate * 100).toFixed(2)),
        reasons_json: {
          merchant_id: merchantId === "unknown" ? null : merchantId,
          signal: "decline_rate",
          decline_rate: declineRate,
          txn_count: stats.total,
        },
        status: "open",
        workflow_state: "new",
      });
    }
  }

  for (const [bucket, count] of byCardHour) {
    if (count >= 8) {
      riskEvents.push({
        company_id: companyId,
        transaction_id: null,
        event_type: "risk.velocity_violation",
        severity: count >= 15 ? "critical" : "high",
        score: count,
        reasons_json: { bucket, signal: "card_hour_velocity", tx_count: count },
        status: "open",
        workflow_state: "new",
      });
    }
  }

  for (const [cardToken, countries] of byCardCountry) {
    if (countries.size >= 3) {
      riskEvents.push({
        company_id: companyId,
        transaction_id: null,
        event_type: "risk.geographic_anomaly",
        severity: "medium",
        score: countries.size,
        reasons_json: { signal: "multi_country_card_usage", card_token: cardToken, countries: Array.from(countries) },
        status: "open",
        workflow_state: "new",
      });
    }
  }

  if (riskEvents.length) {
    const { error } = await supabase.from("risk_events").insert(riskEvents);
    if (error) throw error;
  }
  return { scanned_rows: rows.length, created_events: riskEvents.length };
}

async function materializeSnapshots(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  fromIso: string,
  toIso: string,
) {
  const { data: txRows, error } = await supabase
    .from("normalized_transactions")
    .select("amount,approved,payment_method")
    .eq("company_id", companyId)
    .gte("occurred_at", fromIso)
    .lte("occurred_at", toIso);
  if (error) throw error;
  const rows = txRows ?? [];

  const txCount = rows.length;
  const volume = rows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  const approvedVolume = rows.filter((r) => r.approved).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  const declines = rows.filter((r) => !r.approved).length;
  const approvalRate = txCount ? ((txCount - declines) / txCount) * 100 : 0;
  const avgTicket = txCount ? approvedVolume / txCount : 0;

  const points = [
    { metric_key: "volume", metric_value: volume },
    { metric_key: "revenue", metric_value: approvedVolume },
    { metric_key: "tx_count", metric_value: txCount },
    { metric_key: "approval_rate", metric_value: approvalRate },
    { metric_key: "avg_ticket", metric_value: avgTicket },
    { metric_key: "declines", metric_value: declines },
  ];

  const summary = `From ${fromIso} to ${toIso}: ${txCount} txns, volume ${volume.toFixed(2)}, approval rate ${approvalRate.toFixed(2)}%.`;
  const payload = points.map((p) => ({
    company_id: companyId,
    period_start: fromIso,
    period_end: toIso,
    metric_key: p.metric_key,
    metric_value: p.metric_value,
    narrative_summary: summary,
    model: "deterministic-v1",
    prompt_version: "p2-summary-v1",
    provenance_json: {
      source_tables: ["normalized_transactions"],
      method: "deterministic_rollup",
      generated_at: new Date().toISOString(),
    },
  }));

  const { error: insertError } = await supabase.from("insight_snapshots").insert(payload);
  if (insertError) throw insertError;
  return { snapshot_rows: payload.length };
}

async function updateMerchantScores(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  fromIso: string,
  toIso: string,
) {
  const { data: txRows, error } = await supabase
    .from("normalized_transactions")
    .select("merchant_id,approved")
    .eq("company_id", companyId)
    .gte("occurred_at", fromIso)
    .lte("occurred_at", toIso);
  if (error) throw error;
  const rows = (txRows ?? []).filter((r) => r.merchant_id);

  const map = new Map<string, { total: number; approved: number }>();
  for (const row of rows) {
    const key = String(row.merchant_id);
    const prev = map.get(key) ?? { total: 0, approved: 0 };
    prev.total += 1;
    if (row.approved) prev.approved += 1;
    map.set(key, prev);
  }

  const inserts = Array.from(map.entries()).map(([merchantId, v]) => ({
    company_id: companyId,
    merchant_id: merchantId,
    score_type: "approval_health",
    score_value: v.total ? Number(((v.approved / v.total) * 100).toFixed(3)) : 0,
    factors_json: { approved: v.approved, total: v.total, window: { from: fromIso, to: toIso } },
    as_of: toIso,
  }));
  if (inserts.length) {
    const { error: insertError } = await supabase.from("merchant_scores").insert(inserts);
    if (insertError) throw insertError;
  }
  return { merchant_scores: inserts.length };
}

async function generateRecommendations(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
) {
  const { data: openRisk, error: riskError } = await supabase
    .from("risk_events")
    .select("id,severity,event_type,score")
    .eq("company_id", companyId)
    .in("workflow_state", ["new", "investigating"])
    .order("detected_at", { ascending: false })
    .limit(50);
  if (riskError) throw riskError;

  const events = openRisk ?? [];
  const recs: Array<Record<string, unknown>> = [];
  const velocityCount = events.filter((e) => e.event_type === "risk.velocity_violation").length;
  const geoCount = events.filter((e) => e.event_type === "risk.geographic_anomaly").length;
  const highCount = events.filter((e) => ["high", "critical"].includes(String(e.severity))).length;

  if (velocityCount > 0) {
    recs.push({
      company_id: companyId,
      category: "risk-controls",
      priority: "high",
      recommendation_text: "Increase card velocity controls for high-risk MCCs and add temporary declines after threshold breaches.",
      expected_impact_json: { metric: "fraud_loss_reduction", basis: "velocity_violations", count: velocityCount },
      status: "open",
      lifecycle_state: "open",
      confidence: 0.83,
      model: "rules-v1",
      prompt_version: "p2-rec-v1",
    });
  }
  if (geoCount > 0) {
    recs.push({
      company_id: companyId,
      category: "fraud-ops",
      priority: "medium",
      recommendation_text: "Require step-up verification for cards with same-day activity across 3+ countries.",
      expected_impact_json: { metric: "false_positive_control", basis: "geo_anomaly", count: geoCount },
      status: "open",
      lifecycle_state: "open",
      confidence: 0.74,
      model: "rules-v1",
      prompt_version: "p2-rec-v1",
    });
  }
  if (highCount > 5) {
    recs.push({
      company_id: companyId,
      category: "operations",
      priority: "high",
      recommendation_text: "Temporarily route high-severity alerts to a dedicated analyst queue with 4-hour SLA.",
      expected_impact_json: { metric: "resolution_time", basis: "open_high_events", count: highCount },
      status: "open",
      lifecycle_state: "open",
      confidence: 0.7,
      model: "rules-v1",
      prompt_version: "p2-rec-v1",
    });
  }

  if (recs.length) {
    const { error } = await supabase.from("recommendations").insert(recs);
    if (error) throw error;
  }
  return { recommendations_created: recs.length };
}

async function dispatchAlerts(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
) {
  const { data: channels, error: chErr } = await supabase
    .from("alert_channels")
    .select("*")
    .eq("company_id", companyId)
    .eq("enabled", true);
  if (chErr) throw chErr;
  const channelRows = channels ?? [];

  const { data: events, error: evErr } = await supabase
    .from("risk_events")
    .select("id,severity,event_type,reasons_json")
    .eq("company_id", companyId)
    .in("workflow_state", ["new", "investigating"])
    .order("detected_at", { ascending: false })
    .limit(100);
  if (evErr) throw evErr;
  const riskRows = events ?? [];

  const dispatches: Array<Record<string, unknown>> = [];
  for (const event of riskRows) {
    for (const channel of channelRows) {
      if (!severityMeetsThreshold(String(event.severity), String(channel.min_severity))) continue;
      dispatches.push({
        company_id: companyId,
        risk_event_id: event.id,
        channel_id: channel.id,
        status: "sent",
        attempted_at: new Date().toISOString(),
        payload_json: {
          event_type: event.event_type,
          severity: event.severity,
          destination: channel.destination,
          reasons: event.reasons_json,
        },
      });
    }
  }

  if (dispatches.length) {
    const { error } = await supabase.from("alert_dispatches").insert(dispatches);
    if (error) throw error;
  }
  return { dispatches: dispatches.length };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/+/, "");

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (req.method === "POST" && path.endsWith("v1/jobs/run-daily")) {
      const body = await req.json();
      const companyId = String(body.company_id);
      const fromIso = body.from ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const toIso = body.to ?? new Date().toISOString();

      const anomaly = await generateRiskEvents(supabase, companyId, fromIso, toIso);
      const snapshots = await materializeSnapshots(supabase, companyId, fromIso, toIso);
      const scores = await updateMerchantScores(supabase, companyId, fromIso, toIso);
      const recs = await generateRecommendations(supabase, companyId);
      const alerts = await dispatchAlerts(supabase, companyId);
      return json({ anomaly, snapshots, scores, recs, alerts });
    }

    if (req.method === "POST" && path.endsWith("v1/jobs/anomaly-detect")) {
      const body = await req.json();
      const companyId = String(body.company_id);
      const fromIso = body.from ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const toIso = body.to ?? new Date().toISOString();
      return json(await generateRiskEvents(supabase, companyId, fromIso, toIso));
    }

    if (req.method === "POST" && path.endsWith("v1/jobs/snapshots/materialize")) {
      const body = await req.json();
      const companyId = String(body.company_id);
      const fromIso = body.from ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const toIso = body.to ?? new Date().toISOString();
      return json(await materializeSnapshots(supabase, companyId, fromIso, toIso));
    }

    if (req.method === "POST" && path.endsWith("v1/jobs/merchant-scores/update")) {
      const body = await req.json();
      const companyId = String(body.company_id);
      const fromIso = body.from ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const toIso = body.to ?? new Date().toISOString();
      return json(await updateMerchantScores(supabase, companyId, fromIso, toIso));
    }

    if (req.method === "POST" && path.endsWith("v1/jobs/recommendations/generate")) {
      const body = await req.json();
      const companyId = String(body.company_id);
      return json(await generateRecommendations(supabase, companyId));
    }

    if (req.method === "POST" && path.endsWith("v1/jobs/alerts/dispatch")) {
      const body = await req.json();
      const companyId = String(body.company_id);
      return json(await dispatchAlerts(supabase, companyId));
    }

    if (req.method === "POST" && path.endsWith("v1/recommendations/feedback")) {
      const body = await req.json();
      const companyId = String(body.company_id);
      const recommendationId = String(body.recommendation_id);
      const feedback = String(body.feedback);
      const reason = body.reason ? String(body.reason) : null;
      const userId = body.user_id ? String(body.user_id) : null;

      const { error: updateErr } = await supabase
        .from("recommendations")
        .update({
          analyst_feedback: feedback,
          analyst_feedback_reason: reason,
        })
        .eq("id", recommendationId)
        .eq("company_id", companyId);
      if (updateErr) throw updateErr;

      const { error: fbErr } = await supabase.from("recommendation_feedback").insert({
        company_id: companyId,
        recommendation_id: recommendationId,
        user_id: userId,
        feedback,
        reason,
      });
      if (fbErr) throw fbErr;
      return json({ updated: true });
    }

    if (req.method === "POST" && path.endsWith("v1/jobs/exports/run")) {
      const body = await req.json();
      const companyId = String(body.company_id);
      const exportFormat = (body.export_format ?? "csv") as "csv" | "parquet";
      const target = (body.target ?? "download") as "s3" | "gcs" | "download";
      const fromIso = body.from ?? null;
      const toIso = body.to ?? null;

      const { data: job, error: createErr } = await supabase
        .from("export_jobs")
        .insert({
          company_id: companyId,
          export_format: exportFormat,
          target,
          status: "running",
          period_start: fromIso,
          period_end: toIso,
        })
        .select("id")
        .single();
      if (createErr) throw createErr;

      const fileRef = `exports/${companyId}/${job.id}.${exportFormat}`;
      const { error: doneErr } = await supabase.from("export_jobs").update({
        status: "completed",
        file_ref: fileRef,
        stats_json: { note: "export metadata generated; wire object-storage uploader for production" },
        finished_at: new Date().toISOString(),
      }).eq("id", job.id);
      if (doneErr) throw doneErr;
      return json({ export_job_id: job.id, file_ref: fileRef, status: "completed" });
    }

    return json({ error: "Route not found" }, 404);
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
});
