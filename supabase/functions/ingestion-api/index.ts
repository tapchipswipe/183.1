import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Provider = "stripe" | "square" | "authorizenet";

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
      const { company_id, source_ref, row_count } = body;

      const { data, error } = await supabase
        .from("ingestion_jobs")
        .insert({
          company_id,
          source_type: "csv",
          source_ref: source_ref ?? null,
          status: "completed",
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          stats_json: { ingested_rows: row_count ?? 0 },
        })
        .select("id")
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ job_id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && path.includes("v1/ingestion/jobs/")) {
      const id = path.split("/").pop();
      const { data, error } = await supabase.from("ingestion_jobs").select("*").eq("id", id).single();
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && path.includes("v1/connectors/") && path.endsWith("/connect")) {
      const provider = path.split("/")[2] as Provider;
      const body = await req.json();
      const { company_id } = body;

      const { data, error } = await supabase
        .from("processor_connections")
        .upsert({
          company_id,
          provider,
          status: "connected",
          credentials_ref: body.credentials_ref ?? null,
          webhook_secret_ref: body.webhook_secret_ref ?? null,
        }, { onConflict: "company_id,provider" })
        .select("id")
        .single();
      if (error) throw error;

      return new Response(JSON.stringify({ connection_id: data.id, status: "connected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && path.includes("v1/connectors/") && path.endsWith("/sync")) {
      const provider = path.split("/")[2] as Provider;
      const body = await req.json();
      const { company_id } = body;

      const { data, error } = await supabase
        .from("ingestion_jobs")
        .insert({
          company_id,
          source_type: provider,
          source_ref: "manual-sync",
          status: "queued",
          started_at: new Date().toISOString(),
          stats_json: { note: "Connector sync stub queued" },
        })
        .select("id")
        .single();
      if (error) throw error;

      return new Response(JSON.stringify({ job_id: data.id, status: "queued" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && path.includes("v1/webhooks/")) {
      return new Response(JSON.stringify({ accepted: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Route not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
