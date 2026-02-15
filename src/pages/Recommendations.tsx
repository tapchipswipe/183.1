import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";

interface RecommendationRow {
  id: string;
  recommendation_type: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "accepted" | "rejected" | "dismissed";
  title: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function Recommendations() {
  const { merchant } = useAuth();
  const merchantId = merchant?.id;
  const [statusMessage, setStatusMessage] = useState("");

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["recommendations", merchantId],
    enabled: !!merchantId,
    queryFn: async () => {
      if (!merchantId) return [];
      const { data, error } = await supabase
        .from("recommendations")
        .select("id, recommendation_type, priority, status, title, description, created_at, updated_at")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as RecommendationRow[];
    },
  });

  const setStatus = async (id: string, status: RecommendationRow["status"]) => {
    const { error } = await supabase
      .from("recommendations")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      setStatusMessage(`Failed to update: ${error.message}`);
      return;
    }
    setStatusMessage(`Updated to ${status}.`);
    refetch();
  };

  const columns: Column<RecommendationRow>[] = useMemo(() => [
    { key: "created_at", label: "Created", render: (r) => new Date(r.created_at).toLocaleString() },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status" },
    { key: "recommendation_type", label: "Type" },
    { key: "title", label: "Title", render: (r) => r.title ?? "—" },
    { key: "description", label: "Description", render: (r) => r.description ?? "—" },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" className="h-6 px-2 text-2xs" onClick={() => setStatus(r.id, "accepted")}>Accept</Button>
          <Button size="sm" variant="outline" className="h-6 px-2 text-2xs" onClick={() => setStatus(r.id, "rejected")}>Reject</Button>
          <Button size="sm" variant="outline" className="h-6 px-2 text-2xs" onClick={() => setStatus(r.id, "dismissed")}>Dismiss</Button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-sm font-semibold">Recommendations</h1>
        <p className="text-xs text-muted-foreground">Actionable items generated from your transaction data and inventory history.</p>
      </div>
      {statusMessage && <p className="text-xs text-muted-foreground">{statusMessage}</p>}
      <DataTable data={data} columns={columns} loading={isLoading} />
    </div>
  );
}

