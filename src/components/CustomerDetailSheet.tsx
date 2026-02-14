import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomerDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any;
  companyId: string;
}

export function CustomerDetailSheet({ open, onOpenChange, customer, companyId }: CustomerDetailSheetProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !customer?.id) return;
    setLoading(true);
    Promise.all([
      supabase.from("transactions").select("*").eq("company_id", companyId).eq("customer_id", customer.id).order("transaction_date", { ascending: false }).limit(50),
      supabase.from("pos_line_items").select("*, transactions!inner(customer_id)").eq("company_id", companyId).eq("transactions.customer_id", customer.id).limit(100),
    ]).then(([txRes, liRes]) => {
      setTransactions(txRes.data ?? []);
      setLineItems(liRes.data ?? []);
      setLoading(false);
    });
  }, [open, customer?.id, companyId]);

  if (!customer) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-sm">{customer.name}</SheetTitle>
          <p className="text-2xs text-muted-foreground">{customer.email}</p>
        </SheetHeader>

        <div className="flex gap-3 py-3">
          <div className="flex-1 rounded-md border p-2 text-center">
            <p className="text-lg font-bold text-primary">{customer.loyalty_points ?? 0}</p>
            <p className="text-2xs text-muted-foreground">Points</p>
          </div>
          <div className="flex-1 rounded-md border p-2 text-center">
            <p className="text-lg font-bold text-primary">${Number(customer.store_credit ?? 0).toFixed(2)}</p>
            <p className="text-2xs text-muted-foreground">Store Credit</p>
          </div>
          <div className="flex-1 rounded-md border p-2 text-center">
            <p className="text-lg font-bold text-primary">{transactions.length}</p>
            <p className="text-2xs text-muted-foreground">Transactions</p>
          </div>
        </div>

        <Tabs defaultValue="transactions" className="mt-2">
          <TabsList className="h-7 w-full">
            <TabsTrigger value="transactions" className="text-2xs flex-1">Transactions</TabsTrigger>
            <TabsTrigger value="purchases" className="text-2xs flex-1">Purchases</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-2">
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : transactions.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No transactions found</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted/50">
                    <div>
                      <p className="font-medium">{tx.description || tx.type}</p>
                      <p className="text-2xs text-muted-foreground">{new Date(tx.transaction_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={tx.type === "sale" ? "text-primary font-medium" : ""}>${Number(tx.amount).toFixed(2)}</span>
                      <Badge variant="outline" className="ml-1 text-2xs capitalize">{tx.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="purchases" className="mt-2">
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : lineItems.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No purchase history</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {lineItems.map((li) => (
                  <div key={li.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted/50">
                    <div>
                      <p className="font-medium">{li.product_name}</p>
                      <p className="text-2xs text-muted-foreground">Qty: {li.quantity}</p>
                    </div>
                    <span className="font-mono">${Number(li.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
