import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/DataTable";
import { formatCurrency } from "@/lib/currencies";
import { ArrowLeftRight, DollarSign, Package } from "lucide-react";

interface DashboardData {
  products: { id: string; name: string; current_quantity: number | null; price: number | null }[];
  transactions: { id: string; amount: number | null; currency: string | null; status: string | null; occurred_at: string | null; description: string | null; processor: string }[];
}

export default function Dashboard() {
  const { merchant } = useAuth();
  const merchantId = merchant?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", merchantId],
    enabled: !!merchantId,
    queryFn: async (): Promise<DashboardData> => {
      if (!merchantId) {
        return { products: [], transactions: [] };
      }

      const [productsRes, transactionsRes] = await Promise.all([
        supabase.from("products").select("id, name, current_quantity, price").eq("merchant_id", merchantId),
        supabase
          .from("transactions")
          .select("id, processor, amount, currency, status, occurred_at, description")
          .eq("merchant_id", merchantId)
          .order("occurred_at", { ascending: false })
          .limit(10),
      ]);

      return {
        products: (productsRes.data ?? []) as DashboardData["products"],
        transactions: (transactionsRes.data ?? []) as DashboardData["transactions"],
      };
    },
  });

  const products = data?.products ?? [];
  const transactions = data?.transactions ?? [];

  const sales = transactions.reduce((sum, t) => sum + Number(t.amount ?? 0), 0);
  const lowStock = products.filter((p) => Number(p.current_quantity ?? 0) <= 5);

  const txColumns: Column<DashboardData["transactions"][number]>[] = [
    { key: "processor", label: "Processor" },
    { key: "description", label: "Description" },
    {
      key: "amount",
      label: "Amount",
      render: (r) => formatCurrency(Number(r.amount ?? 0), r.currency ?? "USD"),
    },
    {
      key: "occurred_at" as any,
      label: "Date",
      render: (r) => (r.occurred_at ? new Date(r.occurred_at).toLocaleDateString() : "—"),
    },
  ];

  const lowStockColumns: Column<any>[] = [
    { key: "name", label: "Product" },
    { key: "current_quantity", label: "Stock" },
    {
      key: "price",
      label: "Price",
      render: (r) => formatCurrency(Number(r.price ?? 0), "USD"),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-sm font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Products" value={String(products.length)} icon={Package} />
        <KpiCard title="Sales" value={formatCurrency(sales, "USD")} icon={DollarSign} />
        <KpiCard title="Transactions" value={String(transactions.length)} icon={ArrowLeftRight} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable data={transactions} columns={txColumns} loading={isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable data={lowStock} columns={lowStockColumns} loading={isLoading} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Revenue Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Revenue (last 10 txns)</span>
          <span className="font-semibold">{formatCurrency(sales, "USD")}</span>
        </CardContent>
      </Card>
    </div>
  );
}
