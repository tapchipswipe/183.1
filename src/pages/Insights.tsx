import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";

interface Snapshot {
  id: string;
  metric_key: string;
  metric_value: number;
  period_start: string;
  period_end: string;
}

export default function Insights() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;

  const { data = [], isLoading } = useQuery({
    queryKey: ["insights", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from("insight_snapshots").select("*").eq("company_id", companyId).order("period_end", { ascending: false }).limit(200);
      if (error) return [];
      return (data ?? []) as Snapshot[];
    },
  });

  const columns: Column<Snapshot>[] = useMemo(() => [
    { key: "metric_key", label: "Metric" },
    { key: "metric_value", label: "Value", render: (r) => Number(r.metric_value).toFixed(2) },
    { key: "period_start", label: "From", render: (r) => new Date(r.period_start).toLocaleString() },
    { key: "period_end", label: "To", render: (r) => new Date(r.period_end).toLocaleString() },
  ], []);

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Insights</h1>
      <p className="text-xs text-muted-foreground">Deterministic metrics and generated AI summaries are stored as snapshots here.</p>
      <DataTable data={data} columns={columns} loading={isLoading} />
    </div>
  );
}
