import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";

interface InsightRow {
  id: string;
  insight_type: string;
  title: string;
  body: string | null;
  severity: string | null;
  window_start: string | null;
  window_end: string | null;
  created_at: string;
}

export default function Insights() {
  const { merchant } = useAuth();
  const merchantId = merchant?.id;

  const { data = [], isLoading } = useQuery({
    queryKey: ["insights", merchantId],
    enabled: !!merchantId,
    queryFn: async () => {
      if (!merchantId) return [];
      const { data, error } = await supabase
        .from("insights")
        .select("id, insight_type, title, body, severity, window_start, window_end, created_at")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as InsightRow[];
    },
  });

  const columns: Column<InsightRow>[] = useMemo(() => [
    { key: "created_at", label: "Created", render: (r) => new Date(r.created_at).toLocaleString() },
    { key: "insight_type", label: "Type" },
    { key: "severity", label: "Severity", render: (r) => r.severity ?? "—" },
    { key: "window_start", label: "From", render: (r) => (r.window_start ? new Date(r.window_start).toLocaleDateString() : "—") },
    { key: "window_end", label: "To", render: (r) => (r.window_end ? new Date(r.window_end).toLocaleDateString() : "—") },
    { key: "title", label: "Title" },
    { key: "body", label: "Details" },
  ], []);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-sm font-semibold">Insights</h1>
        <p className="text-xs text-muted-foreground">Generated findings (best sellers, seasonality, inventory risk) are stored here.</p>
      </div>
      <DataTable data={data} columns={columns} loading={isLoading} />
    </div>
  );
}

