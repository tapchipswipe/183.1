import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, type Column } from "@/components/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RiskCaseNote, RiskEvent } from "@/lib/processor-types";

export default function Risk() {
  const { userRole, user } = useAuth();
  const companyId = userRole?.company_id;
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

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

  const selectedRisk = data.find((event) => event.id === selectedRiskId) ?? null;

  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ["risk-case-notes", companyId, selectedRiskId],
    enabled: !!companyId && !!selectedRiskId,
    queryFn: async () => {
      if (!companyId || !selectedRiskId) return [];
      const { data, error } = await supabase
        .from("risk_case_notes")
        .select("*")
        .eq("company_id", companyId)
        .eq("risk_event_id", selectedRiskId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return [];
      return (data ?? []) as RiskCaseNote[];
    },
  });

  const updateWorkflow = async (riskId: string, workflowState: RiskEvent["workflow_state"]) => {
    if (!companyId) return;
    const patch: Record<string, unknown> = {
      workflow_state: workflowState,
      resolved_at: workflowState === "resolved" ? new Date().toISOString() : null,
      owner_user_id: workflowState === "investigating" ? user?.id ?? null : undefined,
    };
    const { error } = await supabase
      .from("risk_events")
      .update(patch)
      .eq("company_id", companyId)
      .eq("id", riskId);
    if (error) {
      setStatusMessage(`Failed to update risk event: ${error.message}`);
      return;
    }
    await supabase.from("audit_events").insert({
      company_id: companyId,
      actor_user_id: user?.id ?? null,
      action: "risk_workflow_updated",
      entity_type: "risk_events",
      entity_id: riskId,
      after_json: { workflow_state: workflowState },
    });
    setStatusMessage(`Risk event moved to ${workflowState}`);
    refetch();
  };

  const assignToMe = async (riskId: string) => {
    if (!companyId || !user?.id) return;
    const due = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("risk_events")
      .update({
        owner_user_id: user.id,
        workflow_state: "investigating",
        sla_due_at: due,
      })
      .eq("company_id", companyId)
      .eq("id", riskId);
    if (error) {
      setStatusMessage(`Failed to assign case: ${error.message}`);
      return;
    }
    await supabase.from("audit_events").insert({
      company_id: companyId,
      actor_user_id: user.id,
      action: "risk_case_assigned",
      entity_type: "risk_events",
      entity_id: riskId,
      after_json: { owner_user_id: user.id, sla_due_at: due },
    });
    setStatusMessage("Assigned to you with 4-hour SLA");
    refetch();
  };

  const addCaseNote = async () => {
    if (!companyId || !selectedRiskId || !newNote.trim()) return;
    const { error } = await supabase.from("risk_case_notes").insert({
      company_id: companyId,
      risk_event_id: selectedRiskId,
      note: newNote.trim(),
      created_by: user?.id ?? null,
    });
    if (error) {
      setStatusMessage(`Failed to add note: ${error.message}`);
      return;
    }
    await supabase.from("audit_events").insert({
      company_id: companyId,
      actor_user_id: user?.id ?? null,
      action: "risk_case_note_added",
      entity_type: "risk_events",
      entity_id: selectedRiskId,
      after_json: { note: newNote.trim() },
    });
    setNewNote("");
    setStatusMessage("Case note added");
    refetchNotes();
  };

  const columns: Column<RiskEvent>[] = useMemo(() => [
    { key: "event_type", label: "Event" },
    { key: "severity", label: "Severity" },
    { key: "score", label: "Score", render: (r) => String(r.score ?? "-") },
    { key: "workflow_state", label: "Workflow" },
    {
      key: "owner_user_id",
      label: "Owner",
      render: (r) => (r.owner_user_id ? `${r.owner_user_id.slice(0, 8)}...` : "Unassigned"),
    },
    {
      key: "sla_due_at",
      label: "SLA",
      render: (r) => (r.sla_due_at ? new Date(r.sla_due_at).toLocaleString() : "—"),
    },
    { key: "detected_at", label: "Detected", render: (r) => new Date(r.detected_at).toLocaleString() },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-2xs"
            onClick={(e) => { e.stopPropagation(); assignToMe(r.id); }}
          >
            Assign
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-2xs"
            onClick={(e) => { e.stopPropagation(); updateWorkflow(r.id, "investigating"); }}
          >
            Investigate
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-2xs"
            onClick={(e) => { e.stopPropagation(); updateWorkflow(r.id, "resolved"); }}
          >
            Resolve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-2xs"
            onClick={(e) => { e.stopPropagation(); updateWorkflow(r.id, "false_positive"); }}
          >
            False+
          </Button>
        </div>
      ),
    },
  ], []);

  const openCount = data.filter((e) => ["new", "investigating"].includes(e.workflow_state)).length;

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Risk</h1>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Anomaly Detection Alerts</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Open alerts: <span className="font-semibold text-foreground">{openCount}</span>
          <button className="ml-3 rounded border px-2 py-0.5" onClick={() => refetch()}>Refresh</button>
          {statusMessage && <span className="ml-3">{statusMessage}</span>}
        </CardContent>
      </Card>
      <DataTable data={data} columns={columns} loading={isLoading} onRowClick={(row) => setSelectedRiskId(row.id)} />

      {selectedRisk && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Case Notes: {selectedRisk.event_type}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add investigation note or attachment reference"
                className="text-xs"
              />
              <Button size="sm" onClick={addCaseNote}>Add Note</Button>
            </div>
            <div className="space-y-1">
              {notes.length === 0 && <p className="text-xs text-muted-foreground">No notes yet.</p>}
              {notes.map((note) => (
                <div key={note.id} className="rounded border px-2 py-1 text-xs">
                  <p>{note.note}</p>
                  <p className="text-muted-foreground">{new Date(note.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
