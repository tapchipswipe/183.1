import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import { summarizeTransactions, bucketByGranularity } from "@/lib/processor-utils";
import type { NormalizedTransaction } from "@/lib/processor-types";
import { Activity, BadgeCheck, CreditCard, DollarSign, Percent, XCircle } from "lucide-react";

type Granularity = "day" | "week" | "month";

export default function Monitoring() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;
  const [granularity, setGranularity] = useState<Granularity>("day");

  const fromIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["monitoring", companyId, fromIso],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [] as NormalizedTransaction[];
      const { data, error } = await supabase
        .from("normalized_transactions")
        .select("*")
        .eq("company_id", companyId)
        .gte("occurred_at", fromIso)
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (error) {
        console.warn("Monitoring query failed", error.message);
        return [] as NormalizedTransaction[];
      }
      return (data ?? []) as NormalizedTransaction[];
    },
  });

  const rows = data ?? [];
  const summary = summarizeTransactions(rows);
  const trend = bucketByGranularity(rows, granularity);

  const txColumns: Column<NormalizedTransaction>[] = [
    { key: "source_provider", label: "Provider" },
    { key: "source_txn_id", label: "Txn ID" },
    { key: "amount", label: "Amount", render: (r) => `${r.currency} ${Number(r.amount).toFixed(2)}` },
    { key: "approved", label: "Status", render: (r) => (r.approved ? "Approved" : "Declined") },
    { key: "occurred_at", label: "Time", render: (r) => new Date(r.occurred_at).toLocaleString() },
  ];

  const trendColumns: Column<(typeof trend)[number]>[] = [
    { key: "period", label: `Period (${granularity})` },
    { key: "txns", label: "Transactions" },
    { key: "revenue", label: "Revenue", render: (r) => `$${r.revenue.toFixed(2)}` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Monitoring</h1>
          <p className="text-xs text-muted-foreground">Real-time plus historical processor transaction intelligence.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="Transaction Volume" value={`$${summary.volume.toFixed(2)}`} icon={DollarSign} />
        <KpiCard title="Revenue" value={`$${summary.revenue.toFixed(2)}`} icon={CreditCard} />
        <KpiCard title="Transactions" value={String(summary.txCount)} icon={Activity} />
        <KpiCard title="Approval Rate" value={`${summary.approvalRate.toFixed(1)}%`} icon={Percent} />
        <KpiCard title="Approved" value={String(summary.txCount - summary.declines)} icon={BadgeCheck} />
        <KpiCard title="Declined" value={String(summary.declines)} icon={XCircle} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Trend Analytics</CardTitle>
          <div className="flex gap-1">
            {(["day", "week", "month"] as const).map((m) => (
              <Button key={m} size="sm" variant={granularity === m ? "default" : "outline"} onClick={() => setGranularity(m)}>
                {m}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable data={trend} columns={trendColumns} loading={isLoading} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Live Transaction Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable data={rows} columns={txColumns} loading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
