// One82 core utilities (server-safe and browser-safe).
// Keep this file free of React/JSX and avoid instantiating SDK clients at import time.

export interface One82Transaction {
  id: string;
  amount: number;
  currency: string;
  occurred_at: string; // ISO timestamp
  description?: string | null;
  product?: string | null;
}

export interface One82Insight {
  title: string;
  summary: string;
  confidence: number; // 0..1
  recommendations: string[];
  metadata?: Record<string, unknown>;
}

export function summarizeTransactions(transactions: One82Transaction[]) {
  const count = transactions.length;
  const revenue = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const avgTicket = count ? revenue / count : 0;

  const topProducts = new Map<string, number>();
  for (const t of transactions) {
    const key = (t.product ?? t.description ?? "").trim();
    if (!key) continue;
    topProducts.set(key, (topProducts.get(key) ?? 0) + 1);
  }

  const top = [...topProducts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, n]) => ({ name, n }));

  return { count, revenue, avgTicket, top };
}

// Deterministic placeholder insight. The plan expects AI APIs to power this later.
export function generateHeuristicInsight(transactions: One82Transaction[]): One82Insight {
  const s = summarizeTransactions(transactions);

  const recs: string[] = [];
  if (s.avgTicket > 0 && s.avgTicket < 15) recs.push("Test a small add-on offer to raise average ticket size.");
  if (s.top.length) recs.push(`Check inventory for: ${s.top.map((t) => t.name).join(", ")}.`);
  if (!recs.length) recs.push("Ingest more transactions to unlock richer insights.");

  return {
    title: "Snapshot",
    summary: `Processed ${s.count} transactions. Estimated revenue: ${Math.round(s.revenue * 100) / 100}.`,
    confidence: transactions.length >= 25 ? 0.7 : 0.45,
    recommendations: recs,
    metadata: { count: s.count, revenue: s.revenue, avg_ticket: s.avgTicket, top: s.top },
  };
}

