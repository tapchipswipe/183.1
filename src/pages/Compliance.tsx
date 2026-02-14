import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AlertChannel } from "@/lib/processor-types";

const checks = [
  "No PAN/CVV stored in app tables",
  "Tokenized card references only",
  "Audit logging required for privileged actions",
  "Role-based access controls enforced",
  "Encrypted transport and storage defaults",
  "Retention controls for raw references",
];

export default function Compliance() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;
  const [channelType, setChannelType] = useState<AlertChannel["channel_type"]>("email");
  const [destination, setDestination] = useState("");
  const [minSeverity, setMinSeverity] = useState<AlertChannel["min_severity"]>("high");
  const [statusMessage, setStatusMessage] = useState("");

  const { data: channels = [], refetch: refetchChannels } = useQuery({
    queryKey: ["alert-channels", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("alert_channels")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return [];
      return (data ?? []) as AlertChannel[];
    },
  });

  const { data: dispatches = [], refetch: refetchDispatches } = useQuery({
    queryKey: ["alert-dispatches", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("alert_dispatches")
        .select("id,status,created_at,payload_json,error_message")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return [];
      return data ?? [];
    },
  });

  const addChannel = async () => {
    if (!companyId || !destination.trim()) return;
    const { error } = await supabase.from("alert_channels").upsert({
      company_id: companyId,
      channel_type: channelType,
      destination: destination.trim(),
      min_severity: minSeverity,
      enabled: true,
    }, { onConflict: "company_id,channel_type,destination" });
    if (error) {
      setStatusMessage(`Failed to add channel: ${error.message}`);
      return;
    }
    setStatusMessage("Alert channel saved");
    setDestination("");
    refetchChannels();
  };

  const runDispatch = async () => {
    if (!companyId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setStatusMessage("No active session token");
      return;
    }
    const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/processor-jobs/v1/jobs/alerts/dispatch`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ company_id: companyId }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setStatusMessage(`Alert dispatch failed: ${payload.error ?? "unknown error"}`);
      return;
    }
    setStatusMessage(`Alert dispatch finished: ${payload.dispatches ?? 0} messages`);
    refetchDispatches();
  };

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Compliance</h1>
      <p className="text-xs text-muted-foreground">PCI-aware baseline controls for processor intelligence workflows.</p>
      {statusMessage && <p className="text-xs text-muted-foreground">{statusMessage}</p>}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Compliance Monitoring Checklist</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {checks.map((item) => (
              <li key={item} className="rounded-md border px-3 py-2 text-xs">{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Alert Routing</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <Input value={channelType} onChange={(e) => setChannelType(e.target.value as AlertChannel["channel_type"])} placeholder="channel: slack|email|webhook" />
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="destination (email/url/channel)" />
            <Input value={minSeverity} onChange={(e) => setMinSeverity(e.target.value as AlertChannel["min_severity"])} placeholder="min severity" />
            <Button size="sm" onClick={addChannel}>Add Channel</Button>
          </div>
          <div className="space-y-1">
            {channels.map((channel) => (
              <div key={channel.id} className="rounded border px-2 py-1">
                {channel.channel_type} {channel.destination} (min {channel.min_severity})
              </div>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={runDispatch}>Run Alert Dispatch</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Alert Dispatches</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-xs">
          {dispatches.length === 0 && <p className="text-muted-foreground">No dispatch records yet.</p>}
          {dispatches.map((item: any) => (
            <div key={item.id} className="rounded border px-2 py-1">
              <p>{item.status} at {new Date(item.created_at).toLocaleString()}</p>
              <p className="text-muted-foreground">{item.error_message || JSON.stringify(item.payload_json ?? {})}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
