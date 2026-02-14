import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type Column } from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, CreditCard, DollarSign, Receipt, Store, TrendingUp } from "lucide-react";

type Granularity = "day" | "week" | "year";

interface TxRow {
  id: string;
  type: string;
  amount: number | null;
  currency: string | null;
  payment_method: string | null;
  transaction_date: string | null;
}

interface ExpenseRow {
  id: string;
  amount: number | null;
}

interface ProductPerf {
  id: string;
  product_name: string;
  quantity: number | null;
  subtotal: number | null;
}

interface StatementRow {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  paymentMethod: string;
}

function getWeekKey(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function bucketKey(isoDate: string | null, granularity: Granularity) {
  if (!isoDate) return "Unknown";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "Unknown";
  if (granularity === "day") return d.toISOString().slice(0, 10);
  if (granularity === "week") return getWeekKey(d);
  return String(d.getFullYear());
}

function parseStatementCsv(text: string): StatementRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const indexOfAny = (...names: string[]) => headers.findIndex((h) => names.includes(h));

  const dateI = indexOfAny("date", "transaction_date", "posted_date");
  const merchantI = indexOfAny("merchant", "client", "customer", "name");
  const amountI = indexOfAny("amount", "total", "gross", "net");
  const methodI = indexOfAny("payment_method", "method", "card_type", "tender");

  return lines.slice(1).map((line, idx) => {
    const cols = line.split(",").map((c) => c.trim());
    const rawAmount = (amountI >= 0 ? cols[amountI] : "0") ?? "0";
    const amount = Number(rawAmount.replace(/[$,]/g, "")) || 0;
    return {
      id: String(idx + 1),
      date: (dateI >= 0 ? cols[dateI] : "") ?? "",
      merchant: (merchantI >= 0 ? cols[merchantI] : "") ?? "",
      amount,
      paymentMethod: (methodI >= 0 ? cols[methodI] : "") ?? "",
    };
  });
}

export default function Reports() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;

  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [txnGranularity, setTxnGranularity] = useState<Granularity>("day");
  const [revenueGranularity, setRevenueGranularity] = useState<Granularity>("day");

  const [statementText, setStatementText] = useState("date,merchant,amount,payment_method\n2026-02-01,Acme Store,120.50,card");
  const [statementRows, setStatementRows] = useState<StatementRow[]>([]);

  const range = useMemo(() => {
    const fromIso = new Date(from).toISOString();
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    return { fromIso, toIso: toDate.toISOString() };
  }, [from, to]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["reports", companyId, range.fromIso, range.toIso],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) {
        return {
          tx: [] as TxRow[],
          expenses: [] as ExpenseRow[],
          perf: [] as ProductPerf[],
          customers: [] as { id: string }[],
        };
      }

      const [txRes, expRes, perfRes, customersRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("id, type, amount, currency, payment_method, transaction_date")
          .eq("company_id", companyId)
          .gte("transaction_date", range.fromIso)
          .lte("transaction_date", range.toIso),
        supabase
          .from("expenses")
          .select("id, amount")
          .eq("company_id", companyId)
          .gte("expense_date", range.fromIso)
          .lte("expense_date", range.toIso),
        supabase
          .from("pos_line_items")
          .select("id, product_name, quantity, subtotal")
          .eq("company_id", companyId)
          .gte("created_at", range.fromIso)
          .lte("created_at", range.toIso),
        supabase.from("customers").select("id").eq("company_id", companyId),
      ]);

      return {
        tx: (txRes.data ?? []) as TxRow[],
        expenses: (expRes.data ?? []) as ExpenseRow[],
        perf: (perfRes.data ?? []) as ProductPerf[],
        customers: (customersRes.data ?? []) as { id: string }[],
      };
    },
  });

  const sales = (data?.tx ?? [])
    .filter((t) => t.type === "sale")
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0);
  const txCount = (data?.tx ?? []).length;
  const expenseTotal = (data?.expenses ?? []).reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
  const net = sales - expenseTotal;
  const merchants = (data?.customers ?? []).length;
  const creditCardVolume = (data?.tx ?? [])
    .filter((t) => (t.payment_method ?? "").toLowerCase().includes("card"))
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

  const txPerPeriod = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of data?.tx ?? []) {
      const key = bucketKey(t.transaction_date, txnGranularity);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, value], i) => ({ id: `txn-${i}`, period, value }));
  }, [data?.tx, txnGranularity]);

  const revenuePerPeriod = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of data?.tx ?? []) {
      if (t.type !== "sale") continue;
      const key = bucketKey(t.transaction_date, revenueGranularity);
      map.set(key, (map.get(key) ?? 0) + Number(t.amount ?? 0));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, value], i) => ({ id: `rev-${i}`, period, value }));
  }, [data?.tx, revenueGranularity]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const row of data?.perf ?? []) {
      const key = row.product_name || "Unknown";
      const prev = map.get(key) ?? { name: key, qty: 0, revenue: 0 };
      prev.qty += Number(row.quantity ?? 0);
      prev.revenue += Number(row.subtotal ?? 0);
      map.set(key, prev);
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((v, i) => ({ id: String(i + 1), ...v }));
  }, [data?.perf]);

  const parseStatement = () => {
    setStatementRows(parseStatementCsv(statementText));
  };

  const statementRevenue = statementRows.reduce((sum, r) => sum + r.amount, 0);
  const statementMerchants = new Set(statementRows.map((r) => r.merchant).filter(Boolean)).size;
  const statementCreditCardVolume = statementRows
    .filter((r) => r.paymentMethod.toLowerCase().includes("card") || r.paymentMethod.toLowerCase().includes("credit"))
    .reduce((sum, r) => sum + r.amount, 0);

  const topProductCols: Column<(typeof topProducts)[number]>[] = [
    { key: "name", label: "Product" },
    { key: "qty", label: "Units Sold" },
    { key: "revenue", label: "Revenue", render: (r) => `$${r.revenue.toFixed(2)}` },
  ];

  const txnCols: Column<(typeof txPerPeriod)[number]>[] = [
    { key: "period", label: `Period (${txnGranularity})` },
    { key: "value", label: "Transactions" },
  ];

  const revCols: Column<(typeof revenuePerPeriod)[number]>[] = [
    { key: "period", label: `Period (${revenueGranularity})` },
    { key: "value", label: "Revenue", render: (r) => `$${r.value.toFixed(2)}` },
  ];

  const statementCols: Column<StatementRow>[] = [
    { key: "date", label: "Date" },
    { key: "merchant", label: "Merchant" },
    { key: "amount", label: "Amount", render: (r) => `$${r.amount.toFixed(2)}` },
    { key: "paymentMethod", label: "Payment Method" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-sm font-semibold">Reports</h1>
        <Button size="sm" className="h-8" onClick={() => refetch()}>Refresh</Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Date Range</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="analytics">
        <TabsList className="h-8">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="statement">Merchant Statement Reader</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-3 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <KpiCard title="Sales" value={`$${sales.toFixed(2)}`} icon={DollarSign} />
            <KpiCard title="Expenses" value={`$${expenseTotal.toFixed(2)}`} icon={Receipt} />
            <KpiCard title="Net" value={`$${net.toFixed(2)}`} icon={TrendingUp} />
            <KpiCard title="TXN Count" value={String(txCount)} icon={BarChart3} />
            <KpiCard title="Merchants" value={String(merchants)} icon={Store} />
            <KpiCard title="Credit Card Volume" value={`$${creditCardVolume.toFixed(2)}`} icon={CreditCard} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm">TXN's per day/week/year</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant={txnGranularity === "day" ? "default" : "outline"} onClick={() => setTxnGranularity("day")}>Day</Button>
                  <Button size="sm" variant={txnGranularity === "week" ? "default" : "outline"} onClick={() => setTxnGranularity("week")}>Week</Button>
                  <Button size="sm" variant={txnGranularity === "year" ? "default" : "outline"} onClick={() => setTxnGranularity("year")}>Year</Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable data={txPerPeriod} columns={txnCols} loading={isLoading} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm">Revenue per day/week/year</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant={revenueGranularity === "day" ? "default" : "outline"} onClick={() => setRevenueGranularity("day")}>Day</Button>
                  <Button size="sm" variant={revenueGranularity === "week" ? "default" : "outline"} onClick={() => setRevenueGranularity("week")}>Week</Button>
                  <Button size="sm" variant={revenueGranularity === "year" ? "default" : "outline"} onClick={() => setRevenueGranularity("year")}>Year</Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable data={revenuePerPeriod} columns={revCols} loading={isLoading} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable data={topProducts} columns={topProductCols} loading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statement" className="mt-3 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Merchant Statement Reader</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Upload CSV</label>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    setStatementText(text);
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Statement CSV Content</label>
                <textarea
                  value={statementText}
                  onChange={(e) => setStatementText(e.target.value)}
                  className="min-h-40 w-full rounded-md border bg-background p-2 text-xs"
                />
              </div>
              <Button size="sm" onClick={parseStatement}>Parse Statement</Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="TXN Count" value={String(statementRows.length)} icon={BarChart3} />
            <KpiCard title="Revenue" value={`$${statementRevenue.toFixed(2)}`} icon={DollarSign} />
            <KpiCard title="Merchants" value={String(statementMerchants)} icon={Store} />
            <KpiCard title="Credit Card Volume" value={`$${statementCreditCardVolume.toFixed(2)}`} icon={CreditCard} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Parsed Statement Rows</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable data={statementRows} columns={statementCols} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
