import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";
import type { Recommendation } from "@/lib/processor-types";

export default function Recommendations() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;

  const { data = [], isLoading } = useQuery({
    queryKey: ["recommendations", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from("recommendations").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(200);
      if (error) return [];
      return (data ?? []) as Recommendation[];
    },
  });

  const columns: Column<Recommendation>[] = useMemo(() => [
    { key: "category", label: "Category" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status" },
    { key: "recommendation_text", label: "Recommendation" },
  ], []);

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Recommendations</h1>
      <p className="text-xs text-muted-foreground">Actionable fee, outreach, and operational suggestions derived from insights + risk signals.</p>
      <DataTable data={data} columns={columns} loading={isLoading} />
    </div>
  );
}
