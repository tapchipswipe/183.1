import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/DataTable";
import { formatCurrency } from "@/lib/currencies";
import { ArrowLeftRight, DollarSign, Package, Users } from "lucide-react";

interface DashboardData {
  products: { id: string; name: string; quantity: number | null; price: number | null }[];
  customers: { id: string; name: string; store_credit: number | null }[];
  transactions: { id: string; type: string; amount: number | null; currency: string | null; status: string | null; transaction_date: string | null; description: string | null }[];
  expenses: { id: string; amount: number | null }[];
}

export default function Dashboard() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<DashboardData> => {
      if (!companyId) {
        return { products: [], customers: [], transactions: [], expenses: [] };
      }

      const [productsRes, customersRes, transactionsRes, expensesRes] = await Promise.all([
        supabase.from("products").select("id, name, quantity, price").eq("company_id", companyId),
        supabase.from("customers").select("id, name, store_credit").eq("company_id", companyId),
        supabase
          .from("transactions")
          .select("id, type, amount, currency, status, transaction_date, description")
          .eq("company_id", companyId)
          .order("transaction_date", { ascending: false })
          .limit(10),
        supabase.from("expenses").select("id, amount").eq("company_id", companyId),
      ]);

      return {
        products: (productsRes.data ?? []) as DashboardData["products"],
        customers: (customersRes.data ?? []) as DashboardData["customers"],
        transactions: (transactionsRes.data ?? []) as DashboardData["transactions"],
        expenses: (expensesRes.data ?? []) as DashboardData["expenses"],
      };
    },
  });

  const products = data?.products ?? [];
  const customers = data?.customers ?? [];
  const transactions = data?.transactions ?? [];
  const expenses = data?.expenses ?? [];

  const sales = transactions
    .filter((t) => t.type === "sale")
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0);
  const expenseTotal = expenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
  const lowStock = products.filter((p) => Number(p.quantity ?? 0) <= 5);

  const txColumns: Column<DashboardData["transactions"][number]>[] = [
    { key: "type", label: "Type" },
    { key: "description", label: "Description" },
    {
      key: "amount",
      label: "Amount",
      render: (r) => formatCurrency(Number(r.amount ?? 0), r.currency ?? "USD"),
    },
    {
      key: "transaction_date",
      label: "Date",
      render: (r) => (r.transaction_date ? new Date(r.transaction_date).toLocaleDateString() : "—"),
    },
  ];

  const lowStockColumns: Column<DashboardData["products"][number]>[] = [
    { key: "name", label: "Product" },
    { key: "quantity", label: "Stock" },
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
        <KpiCard title="Customers" value={String(customers.length)} icon={Users} />
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
          <CardTitle className="text-sm">Profit Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Revenue</span>
          <span className="font-semibold">{formatCurrency(sales, "USD")}</span>
        </CardContent>
        <CardContent className="flex items-center justify-between pt-0 text-sm">
          <span className="text-muted-foreground">Expenses</span>
          <span className="font-semibold">{formatCurrency(expenseTotal, "USD")}</span>
        </CardContent>
        <CardContent className="flex items-center justify-between pt-0 text-sm">
          <span className="text-muted-foreground">Net</span>
          <span className="font-semibold">{formatCurrency(sales - expenseTotal, "USD")}</span>
        </CardContent>
      </Card>
    </div>
  );
}
