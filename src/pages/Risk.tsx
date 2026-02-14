import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RiskEvent } from "@/lib/processor-types";

export default function Risk() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["risk-events", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from("risk_events").select("*").eq("company_id", companyId).order("detected_at", { ascending: false }).limit(200);
      if (error) return [];
      return (data ?? []) as RiskEvent[];
    },
  });

  const columns: Column<RiskEvent>[] = useMemo(() => [
    { key: "event_type", label: "Event" },
    { key: "severity", label: "Severity" },
    { key: "score", label: "Score", render: (r) => String(r.score ?? "-") },
    { key: "status", label: "Status" },
    { key: "detected_at", label: "Detected", render: (r) => new Date(r.detected_at).toLocaleString() },
  ], []);

  const openCount = data.filter((e) => e.status === "open").length;

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Risk</h1>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Anomaly Detection Alerts</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Open alerts: <span className="font-semibold text-foreground">{openCount}</span>
          <button className="ml-3 rounded border px-2 py-0.5" onClick={() => refetch()}>Refresh</button>
        </CardContent>
      </Card>
      <DataTable data={data} columns={columns} loading={isLoading} />
    </div>
  );
}
