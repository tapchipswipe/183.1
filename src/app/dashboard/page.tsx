"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth/AuthProvider";
import { supabase } from "../../lib/supabase/client";

type TxRow = {
  id: string;
  occurred_at: string;
  amount: number;
  currency: string;
  description: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const { loading, user, merchant, signOut } = useAuth();
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
        .select("id, occurred_at, amount, currency, description")
        .eq("merchant_id", merchant.id)
        .order("occurred_at", { ascending: false })
        .limit(25);
      if (error) {
        setStatus(error.message);
        return;
      }
      setTx((data ?? []) as TxRow[]);
    };
    run();
  }, [merchant?.id]);

  const revenue = useMemo(() => tx.reduce((sum, r) => sum + Number(r.amount || 0), 0), [tx]);

  if (loading) return null;

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-white/70">
            {merchant ? merchant.business_name : "No merchant profile yet"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
            onClick={() => router.push("/statements")}
          >
            Import statement
          </button>
          <button
            className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {!merchant && (
        <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
          <p className="text-sm">
            Complete onboarding to create your merchant workspace.
          </p>
          <button
            className="mt-3 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300"
            onClick={() => router.push("/onboarding")}
          >
            Go to onboarding
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">Recent revenue (25 tx)</p>
          <p className="mt-1 text-2xl font-bold">${revenue.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">Transactions</p>
          <p className="mt-1 text-2xl font-bold">{tx.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">Next</p>
          <p className="mt-1 text-sm text-white/70">Add AI insights + best sellers</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent Transactions</h2>
          <button
            className="text-xs text-white/70 hover:text-white"
            onClick={() => router.push("/transactions")}
          >
            View all
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {tx.length === 0 ? (
            <p className="text-sm text-white/60">No transactions yet. Import a statement to get started.</p>
          ) : (
            tx.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{r.description ?? "Transaction"}</p>
                  <p className="text-xs text-white/60">{new Date(r.occurred_at).toLocaleString()}</p>
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
    </div>
  );
}

