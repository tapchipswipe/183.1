import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";

interface Snapshot {
  id: string;
  metric_key: string;
  metric_value: number;
  period_start: string;
  period_end: string;
  narrative_summary: string | null;
  model: string | null;
}

interface ExportJob {
  id: string;
  export_format: "csv" | "parquet";
  target: "s3" | "gcs" | "download";
  status: "queued" | "running" | "completed" | "failed";
  file_ref: string | null;
  created_at: string;
}

export default function Insights() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;
  const [statusMessage, setStatusMessage] = useState("");

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["insights", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from("insight_snapshots").select("*").eq("company_id", companyId).order("period_end", { ascending: false }).limit(200);
      if (error) return [];
      return (data ?? []) as Snapshot[];
    },
  });

  const { data: exportJobs = [], refetch: refetchExports } = useQuery({
    queryKey: ["export-jobs", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("export_jobs")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return [];
      return (data ?? []) as ExportJob[];
    },
  });

  const runDailyPipeline = async () => {
    if (!companyId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setStatusMessage("No active session token");
      return;
    }

    const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/processor-jobs/v1/jobs/run-daily`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ company_id: companyId }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setStatusMessage(`Pipeline run failed: ${payload.error ?? "unknown error"}`);
      return;
    }
    setStatusMessage(`Pipeline run completed: ${payload.snapshots?.snapshot_rows ?? 0} snapshots, ${payload.recs?.recommendations_created ?? 0} recommendations`);
    refetch();
  };

  const runExport = async () => {
    if (!companyId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setStatusMessage("No active session token");
      return;
    }
    const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/processor-jobs/v1/jobs/exports/run`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        company_id: companyId,
        export_format: "csv",
        target: "download",
      }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setStatusMessage(`Export failed: ${payload.error ?? "unknown error"}`);
      return;
    }
    setStatusMessage(`Export completed: ${payload.file_ref}`);
    refetchExports();
  };

  const columns: Column<Snapshot>[] = useMemo(() => [
    { key: "metric_key", label: "Metric" },
    { key: "metric_value", label: "Value", render: (r) => Number(r.metric_value).toFixed(2) },
    { key: "period_start", label: "From", render: (r) => new Date(r.period_start).toLocaleString() },
    { key: "period_end", label: "To", render: (r) => new Date(r.period_end).toLocaleString() },
    { key: "model", label: "Model" },
    { key: "narrative_summary", label: "Narrative" },
  ], []);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold">Insights</h1>
          <p className="text-xs text-muted-foreground">Deterministic metrics and generated AI summaries are stored as snapshots here.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={runDailyPipeline}>Run Daily Pipeline</Button>
          <Button size="sm" variant="outline" onClick={runExport}>Run Export</Button>
        </div>
      </div>
      {statusMessage && <p className="text-xs text-muted-foreground">{statusMessage}</p>}
      <DataTable data={data} columns={columns} loading={isLoading} />
      <DataTable
        data={exportJobs}
        columns={[
          { key: "export_format", label: "Format" },
          { key: "target", label: "Target" },
          { key: "status", label: "Status" },
          { key: "file_ref", label: "File Ref" },
          { key: "created_at", label: "Created", render: (r) => new Date(r.created_at).toLocaleString() },
        ]}
      />
    </div>
  );
}
