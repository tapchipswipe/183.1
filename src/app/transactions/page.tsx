"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth/AuthProvider";
import { supabase } from "../../lib/supabase/client";

type TxRow = {
  id: string;
  occurred_at: string;
  amount: number;
  currency: string;
  description: string | null;
  source: string | null;
};

export default function TransactionsPage() {
  const router = useRouter();
  const { loading, user, merchant } = useAuth();
  const [tx, setTx] = useState<TxRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const run = async () => {
      if (!merchant?.id) return;
      const { data, error } = await supabase
        .from("transactions")
        .select("id, occurred_at, amount, currency, description, source")
        .eq("merchant_id", merchant.id)
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (error) {
        setStatus(error.message);
        return;
      }
      setTx((data ?? []) as TxRow[]);
    };
    run();
  }, [merchant?.id]);

  if (loading) return null;

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="mt-1 text-sm text-white/70">
            {merchant ? merchant.business_name : "No merchant profile"}
          </p>
        </div>
        <button
          className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
          onClick={() => router.push("/dashboard")}
        >
          Back
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {tx.length === 0 ? (
          <p className="text-sm text-white/60">No transactions yet.</p>
        ) : (
          tx.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm">{r.description ?? "Transaction"}</p>
                <p className="text-xs text-white/60">
                  {new Date(r.occurred_at).toLocaleString()} {r.source ? `• ${r.source}` : ""}
                </p>
              </div>
              <div className="text-sm font-semibold">
                {r.currency} {Number(r.amount).toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>

      {status && <p className="mt-3 text-xs text-red-300">{status}</p>}
    </div>
  );
}

