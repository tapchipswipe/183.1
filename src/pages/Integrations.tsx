import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/DataTable";

interface ProcessorConnectionRow {
  id: string;
  provider: "stripe" | "square" | "authorizenet";
  account_id: string | null;
  status: "active" | "inactive" | "error";
  created_at: string;
  updated_at: string;
}

export default function Integrations() {
  const { merchant } = useAuth();
  const merchantId = merchant?.id;

  const [stripeAccountId, setStripeAccountId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingestion-webhook/stripe`;

  const { data: connections = [], isLoading, refetch } = useQuery({
    queryKey: ["processor-connections", merchantId],
    enabled: !!merchantId,
    queryFn: async () => {
      if (!merchantId) return [];
      const { data, error } = await supabase
        .from("processor_connections")
        .select("id, provider, account_id, status, created_at, updated_at")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProcessorConnectionRow[];
    },
  });

  const connectStripe = async () => {
    if (!merchantId) return;
    setStatusMessage("");
    const payload = {
      merchant_id: merchantId,
      provider: "stripe",
      account_id: stripeAccountId.trim() || null,
      status: "active",
      credentials_encrypted: {},
    };
    const { error } = await supabase.from("processor_connections").insert(payload);
    if (error) {
      setStatusMessage(`Failed to add Stripe connection: ${error.message}`);
      return;
    }
    setStripeAccountId("");
    setStatusMessage("Stripe connection saved.");
    refetch();
  };

  const deactivate = async (id: string) => {
    const { error } = await supabase.from("processor_connections").update({ status: "inactive" }).eq("id", id);
    if (error) {
      setStatusMessage(`Failed to deactivate: ${error.message}`);
      return;
    }
    setStatusMessage("Connection deactivated.");
    refetch();
  };

  const columns: Column<ProcessorConnectionRow>[] = useMemo(() => [
    { key: "provider", label: "Provider" },
    { key: "account_id", label: "Account", render: (r) => r.account_id ?? "(default)" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Created", render: (r) => new Date(r.created_at).toLocaleString() },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-2xs"
            onClick={() => deactivate(r.id)}
            disabled={r.status !== "active"}
          >
            Deactivate
          </Button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-sm font-semibold">Integrations</h1>
        <p className="text-xs text-muted-foreground">
          Connect processors and configure ingestion. For Stripe webhooks, point Stripe to the URL below.
        </p>
      </div>

      <div className="rounded-md border p-3">
        <p className="text-xs font-semibold">Stripe Webhook URL</p>
        <p className="mt-1 font-mono text-2xs break-all">{functionUrl}</p>
        <p className="mt-2 text-2xs text-muted-foreground">
          Configure the Edge Function secret `STRIPE_WEBHOOK_SECRET` to match Stripe.
          If you use Stripe Connect, set the connection `Account ID` to match the incoming `Stripe-Account` header.
        </p>
      </div>

      <div className="rounded-md border p-3 space-y-2">
        <p className="text-xs font-semibold">Add Stripe Connection</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <Input
            value={stripeAccountId}
            onChange={(e) => setStripeAccountId(e.target.value)}
            placeholder="Stripe Account ID (optional, e.g. acct_...)"
          />
          <div className="md:col-span-2 flex gap-2">
            <Button size="sm" onClick={connectStripe} disabled={!merchantId}>
              Save
            </Button>
          </div>
        </div>
        {statusMessage && <p className="text-xs text-muted-foreground">{statusMessage}</p>}
      </div>

      <DataTable data={connections} columns={columns} loading={isLoading} />
    </div>
  );
}

