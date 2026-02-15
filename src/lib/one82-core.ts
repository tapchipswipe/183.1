// Lightweight One82 core utilities.
// Keep this file dependency-free so it can be used in the Vite frontend without bundling server-only SDKs.

export interface One82Transaction {
  id: string;
  amount: number;
  currency: string;
  occurred_at: string; // ISO
  description?: string | null;
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

  const topDescriptions = new Map<string, number>();
  for (const t of transactions) {
    const key = (t.description ?? "").trim();
    if (!key) continue;
    topDescriptions.set(key, (topDescriptions.get(key) ?? 0) + 1);
  }

  const top = [...topDescriptions.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([description, n]) => ({ description, n }));

  return { count, revenue, avgTicket, top };
}

// Heuristic insight generator (placeholder for a future Edge Function that calls an LLM safely).
export function generateHeuristicInsight(transactions: One82Transaction[]): One82Insight {
  const s = summarizeTransactions(transactions);

  const recs: string[] = [];
  if (s.avgTicket > 0 && s.avgTicket < 15) recs.push("Test a small add-on offer to raise average ticket size.");
  if (s.top.length) recs.push(`Verify inventory for: ${s.top.map((t) => t.description).join(", ")}.`);
  if (!recs.length) recs.push("Add more products and ingest more transactions to unlock richer insights.");

  return {
    title: "Daily Snapshot",
    summary: `Processed ${s.count} transactions. Estimated revenue: ${Math.round(s.revenue * 100) / 100}.`,
    confidence: transactions.length >= 25 ? 0.7 : 0.45,
    recommendations: recs,
    metadata: { count: s.count, revenue: s.revenue, avg_ticket: s.avgTicket, top: s.top },
  };
}

