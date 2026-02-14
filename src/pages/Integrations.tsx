import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/DataTable";
import type { IngestionJob, ProcessorConnection } from "@/lib/processor-types";
import { validateAndNormalizeCsvTransactions, type CsvReject } from "@/lib/processor-utils";

const providers = ["stripe", "square", "authorizenet"] as const;

const providerRefs: Record<typeof providers[number], { credentials: string; webhook: string }> = {
  stripe: { credentials: "STRIPE_SECRET_KEY", webhook: "STRIPE_WEBHOOK_SECRET" },
  square: { credentials: "SQUARE_ACCESS_TOKEN", webhook: "SQUARE_WEBHOOK_SIGNATURE_KEY" },
  authorizenet: { credentials: "AUTHORIZENET_TRANSACTION_KEY", webhook: "AUTHORIZENET_WEBHOOK_SIGNATURE_KEY" },
};

export default function Integrations() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;
  const [csvText, setCsvText] = useState("source_txn_id,amount,currency,approved,occurred_at,payment_method\ntxn_1,42.50,USD,true,2026-02-14T00:00:00Z,card");
  const [statusMessage, setStatusMessage] = useState("");
  const [csvRejects, setCsvRejects] = useState<CsvReject[]>([]);

  const hashCsv = async (text: string) => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest)).map((x) => x.toString(16).padStart(2, "0")).join("");
  };

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
      {
        company_id: companyId,
        provider,
        status: "connected",
        credentials_ref: providerRefs[provider].credentials,
        webhook_secret_ref: providerRefs[provider].webhook,
        retry_count: 0,
        last_error: null,
        dead_letter_ref: null,
      },
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
      retry_count: 0,
      max_retries: 3,
      idempotency_key: `manual-sync:${provider}:${new Date().toISOString().slice(0, 16)}`,
      stats_json: { provider, note: "sync queued", initiated_from: "integrations_ui" },
    });
    if (error) {
      setStatusMessage(`Failed to queue ${provider} sync: ${error.message}`);
      return;
    }
    await supabase
      .from("processor_connections")
      .update({ last_sync_at: new Date().toISOString(), last_error: null, retry_count: 0 })
      .eq("company_id", companyId)
      .eq("provider", provider);
    setStatusMessage(`${provider} sync queued`);
    refetchConnections();
    refetchJobs();
  };

  const runCsvImport = async () => {
    if (!companyId) return;
    const { validRows, rejectedRows } = validateAndNormalizeCsvTransactions(csvText);
    setCsvRejects(rejectedRows);

    if (validRows.length === 0) {
      setStatusMessage("CSV import rejected: no valid rows");
      return;
    }
    const normalized = validRows.map((r) => ({
      company_id: companyId,
      source_provider: "csv",
      source_txn_id: r.source_txn_id,
      amount: r.amount,
      currency: r.currency,
      approved: r.approved,
      occurred_at: r.occurred_at,
      payment_method: r.payment_method,
      raw_ref: r.raw_ref,
    }));
    const idempotencyKey = `csv:${await hashCsv(csvText)}`;

    const { error: txError } = await supabase.from("normalized_transactions").upsert(normalized, {
      onConflict: "company_id,source_provider,source_txn_id",
      ignoreDuplicates: false,
    });

    const { error: jobError } = await supabase.from("ingestion_jobs").insert({
      company_id: companyId,
      source_type: "csv",
      source_ref: "manual-csv",
      status: txError ? "failed" : "completed",
      idempotency_key: idempotencyKey,
      retry_count: 0,
      max_retries: 3,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      stats_json: { ingested_rows: normalized.length, rejected_rows: rejectedRows.length },
      error_json: txError ? { message: txError.message, rejected_rows: rejectedRows } : null,
      last_error: txError?.message ?? null,
    });

    if (txError || jobError) {
      setStatusMessage(`CSV import failed: ${(txError || jobError)?.message}`);
    } else if (rejectedRows.length) {
      setStatusMessage(`CSV import completed with partial reject report (${normalized.length} ingested, ${rejectedRows.length} rejected)`);
    } else {
      setStatusMessage(`CSV import completed (${normalized.length} rows)`);
    }
    refetchJobs();
  };

  const connectionColumns: Column<ProcessorConnection>[] = useMemo(() => [
    { key: "provider", label: "Provider" },
    { key: "status", label: "Status" },
    { key: "last_sync_at", label: "Last Sync", render: (r) => (r.last_sync_at ? new Date(r.last_sync_at).toLocaleString() : "Never") },
    { key: "retry_count", label: "Retries", render: (r) => String(r.retry_count ?? 0) },
    { key: "created_at", label: "Connected", render: (r) => new Date(r.created_at).toLocaleString() },
  ], []);

  const jobColumns: Column<IngestionJob>[] = useMemo(() => [
    { key: "source_type", label: "Source" },
    { key: "status", label: "Status" },
    { key: "retry_count", label: "Retries", render: (r) => String(r.retry_count ?? 0) },
    { key: "idempotency_key", label: "Idempotency", render: (r) => (r.idempotency_key ? `${r.idempotency_key.slice(0, 12)}...` : "N/A") },
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
        {csvRejects.length > 0 && (
          <div className="rounded-md border p-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">CSV Reject Report (first 20)</p>
            <div className="space-y-1 text-xs">
              {csvRejects.slice(0, 20).map((reject) => (
                <p key={`${reject.row}-${reject.reason}`}>Row {reject.row}: {reject.reason}</p>
              ))}
            </div>
          </div>
        )}
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
