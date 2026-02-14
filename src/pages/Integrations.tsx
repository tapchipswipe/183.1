import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/DataTable";
import type { IngestionJob, ProcessorConnection } from "@/lib/processor-types";
import { parseCsv } from "@/lib/processor-utils";

const providers = ["stripe", "square", "authorizenet"] as const;

export default function Integrations() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;
  const [csvText, setCsvText] = useState("source_txn_id,amount,currency,approved,occurred_at,payment_method\ntxn_1,42.50,USD,true,2026-02-14T00:00:00Z,card");
  const [statusMessage, setStatusMessage] = useState("");

  const { data: connections = [], refetch: refetchConnections } = useQuery({
    queryKey: ["processor-connections", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from("processor_connections").select("*").eq("company_id", companyId);
      if (error) return [];
      return (data ?? []) as ProcessorConnection[];
    },
  });

  const { data: jobs = [], refetch: refetchJobs } = useQuery({
    queryKey: ["ingestion-jobs", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from("ingestion_jobs").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(100);
      if (error) return [];
      return (data ?? []) as IngestionJob[];
    },
  });

  const connectProvider = async (provider: typeof providers[number]) => {
    if (!companyId) return;
    const { error } = await supabase.from("processor_connections").upsert(
      { company_id: companyId, provider, status: "connected", credentials_ref: `${provider}-credentials`, webhook_secret_ref: `${provider}-webhook` },
      { onConflict: "company_id,provider" },
    );
    if (error) {
      setStatusMessage(`Failed to connect ${provider}: ${error.message}`);
      return;
    }
    setStatusMessage(`${provider} connected`);
    refetchConnections();
  };

  const runSync = async (provider: typeof providers[number]) => {
    if (!companyId) return;
    const { error } = await supabase.from("ingestion_jobs").insert({
      company_id: companyId,
      source_type: provider,
      source_ref: "manual-sync",
      status: "queued",
      started_at: new Date().toISOString(),
      stats_json: { provider, note: "sync queued" },
    });
    if (error) {
      setStatusMessage(`Failed to queue ${provider} sync: ${error.message}`);
      return;
    }
    setStatusMessage(`${provider} sync queued`);
    refetchJobs();
  };

  const runCsvImport = async () => {
    if (!companyId) return;
    const rows = parseCsv(csvText);
    if (rows.length === 0) {
      setStatusMessage("CSV has no rows");
      return;
    }

    const normalized = rows.map((r) => ({
      company_id: companyId,
      source_provider: "csv",
      source_txn_id: r.source_txn_id || crypto.randomUUID(),
      amount: Number(r.amount || 0),
      currency: r.currency || "USD",
      approved: String(r.approved || "true").toLowerCase() === "true",
      occurred_at: r.occurred_at || new Date().toISOString(),
      payment_method: r.payment_method || "card",
      raw_ref: "csv-upload",
    }));

    const { error: txError } = await supabase.from("normalized_transactions").upsert(normalized, {
      onConflict: "company_id,source_provider,source_txn_id",
      ignoreDuplicates: false,
    });

    const { error: jobError } = await supabase.from("ingestion_jobs").insert({
      company_id: companyId,
      source_type: "csv",
      source_ref: "manual-csv",
      status: txError ? "failed" : "completed",
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      stats_json: { ingested_rows: normalized.length },
      error_json: txError ? { message: txError.message } : null,
    });

    if (txError || jobError) {
      setStatusMessage(`CSV import failed: ${(txError || jobError)?.message}`);
    } else {
      setStatusMessage(`CSV import completed (${normalized.length} rows)`);
    }
    refetchJobs();
  };

  const connectionColumns: Column<ProcessorConnection>[] = useMemo(() => [
    { key: "provider", label: "Provider" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Connected", render: (r) => new Date(r.created_at).toLocaleString() },
  ], []);

  const jobColumns: Column<IngestionJob>[] = useMemo(() => [
    { key: "source_type", label: "Source" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Created", render: (r) => new Date((r as any).created_at ?? r.started_at ?? Date.now()).toLocaleString() },
  ], []);

  return (
    <div className="space-y-4">
      <h1 className="text-sm font-semibold">Integrations</h1>
      <p className="text-xs text-muted-foreground">Connect Stripe/Square/Authorize.net and ingest historical data with CSV.</p>

      <div className="flex flex-wrap gap-2">
        {providers.map((p) => (
          <div key={p} className="flex items-center gap-1">
            <Button size="sm" onClick={() => connectProvider(p)}>Connect {p}</Button>
            <Button size="sm" variant="outline" onClick={() => runSync(p)}>Sync {p}</Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">CSV / Excel (paste CSV) Bulk Import</label>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          className="min-h-36 w-full rounded-md border bg-background p-2 text-xs"
        />
        <div className="flex gap-2">
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setCsvText(await file.text());
            }}
          />
          <Button onClick={runCsvImport}>Run CSV Import</Button>
        </div>
        {statusMessage && <p className="text-xs text-muted-foreground">{statusMessage}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connections</h2>
          <DataTable data={connections} columns={connectionColumns} />
        </div>
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ingestion Jobs</h2>
          <DataTable data={jobs} columns={jobColumns} />
        </div>
      </div>
    </div>
  );
}
