import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import type { Recommendation } from "@/lib/processor-types";

export default function Recommendations() {
  const { userRole, user } = useAuth();
  const companyId = userRole?.company_id;
  const [statusMessage, setStatusMessage] = useState("");

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["recommendations", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from("recommendations").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(200);
      if (error) return [];
      return (data ?? []) as Recommendation[];
    },
  });

  const setLifecycle = async (id: string, lifecycleState: Recommendation["lifecycle_state"]) => {
    if (!companyId) return;
    const { error } = await supabase
      .from("recommendations")
      .update({
        lifecycle_state: lifecycleState,
        actioned_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("id", id);
    if (error) {
      setStatusMessage(`Failed to update recommendation: ${error.message}`);
      return;
    }
    await supabase.from("audit_events").insert({
      company_id: companyId,
      actor_user_id: user?.id ?? null,
      action: "recommendation_lifecycle_updated",
      entity_type: "recommendations",
      entity_id: id,
      after_json: { lifecycle_state: lifecycleState },
    });
    setStatusMessage(`Recommendation moved to ${lifecycleState}`);
    refetch();
  };

  const submitFeedback = async (id: string, feedback: "helpful" | "not_helpful") => {
    if (!companyId) return;
    const { error } = await supabase
      .from("recommendations")
      .update({
        analyst_feedback: feedback,
        analyst_feedback_reason: null,
      })
      .eq("company_id", companyId)
      .eq("id", id);
    if (error) {
      setStatusMessage(`Failed to submit feedback: ${error.message}`);
      return;
    }

    await supabase.from("recommendation_feedback").insert({
      company_id: companyId,
      recommendation_id: id,
      user_id: user?.id ?? null,
      feedback,
      reason: null,
    });
    await supabase.from("audit_events").insert({
      company_id: companyId,
      actor_user_id: user?.id ?? null,
      action: "recommendation_feedback_submitted",
      entity_type: "recommendations",
      entity_id: id,
      after_json: { feedback },
    });
    setStatusMessage(`Feedback submitted: ${feedback}`);
    refetch();
  };

  const columns: Column<Recommendation>[] = useMemo(() => [
    { key: "category", label: "Category" },
    { key: "priority", label: "Priority" },
    { key: "lifecycle_state", label: "Lifecycle" },
    { key: "confidence", label: "Confidence", render: (r) => (r.confidence == null ? "—" : `${Math.round(r.confidence * 100)}%`) },
    { key: "analyst_feedback", label: "Feedback", render: (r) => (r.analyst_feedback ? r.analyst_feedback : "—") },
    { key: "recommendation_text", label: "Recommendation" },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" className="h-6 px-2 text-2xs" onClick={() => setLifecycle(r.id, "accepted")}>Accept</Button>
          <Button size="sm" variant="outline" className="h-6 px-2 text-2xs" onClick={() => setLifecycle(r.id, "rejected")}>Reject</Button>
          <Button size="sm" variant="outline" className="h-6 px-2 text-2xs" onClick={() => setLifecycle(r.id, "deferred")}>Defer</Button>
          <Button size="sm" variant="outline" className="h-6 px-2 text-2xs" onClick={() => submitFeedback(r.id, "helpful")}>Helpful</Button>
          <Button size="sm" variant="outline" className="h-6 px-2 text-2xs" onClick={() => submitFeedback(r.id, "not_helpful")}>Not helpful</Button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Recommendations</h1>
      <p className="text-xs text-muted-foreground">Actionable fee, outreach, and operational suggestions derived from insights + risk signals.</p>
      {statusMessage && <p className="text-xs text-muted-foreground">{statusMessage}</p>}
      <DataTable data={data} columns={columns} loading={isLoading} />
    </div>
  );
}
