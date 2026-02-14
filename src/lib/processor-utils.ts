import type { MetricsSummary, NormalizedTransaction } from "@/lib/processor-types";

export function summarizeTransactions(rows: NormalizedTransaction[]): MetricsSummary {
  const txCount = rows.length;
  const revenue = rows.filter((r) => r.approved).reduce((s, r) => s + Number(r.amount || 0), 0);
  const declines = rows.filter((r) => !r.approved).length;
  const volume = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const approvalRate = txCount ? ((txCount - declines) / txCount) * 100 : 0;
  const avgTicket = txCount ? revenue / txCount : 0;
  const creditCardVolume = rows
    .filter((r) => (r.payment_method || "").toLowerCase().includes("card") || !r.payment_method)
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  return { volume, revenue, txCount, approvalRate, avgTicket, declines, creditCardVolume };
}

export function bucketByGranularity(
  rows: NormalizedTransaction[],
  mode: "day" | "week" | "month",
): Array<{ id: string; period: string; txns: number; revenue: number }> {
  const map = new Map<string, { txns: number; revenue: number }>();

  for (const row of rows) {
    const d = new Date(row.occurred_at);
    if (Number.isNaN(d.getTime())) continue;

    let key = d.toISOString().slice(0, 10);
    if (mode === "week") {
      const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const dayNum = copy.getUTCDay() || 7;
      copy.setUTCDate(copy.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((copy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      key = `${copy.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
    }
    if (mode === "month") {
      key = d.toISOString().slice(0, 7);
    }

    const prev = map.get(key) ?? { txns: 0, revenue: 0 };
    prev.txns += 1;
    if (row.approved) prev.revenue += Number(row.amount || 0);
    map.set(key, prev);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value], idx) => ({ id: `${period}-${idx}`, period, ...value }));
}

export type CsvRow = Record<string, string>;

export function parseCsv(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) return [];
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: CsvRow = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
}

export interface CsvReject {
  row: number;
  reason: string;
}

export interface NormalizedCsvTransactionDraft {
  source_txn_id: string;
  amount: number;
  currency: string;
  approved: boolean;
  occurred_at: string;
  payment_method: string;
  raw_ref: string;
}

export function validateAndNormalizeCsvTransactions(content: string): {
  validRows: NormalizedCsvTransactionDraft[];
  rejectedRows: CsvReject[];
} {
  const parsed = parseCsv(content);
  const validRows: NormalizedCsvTransactionDraft[] = [];
  const rejectedRows: CsvReject[] = [];

  for (let i = 0; i < parsed.length; i += 1) {
    const row = parsed[i];
    const rowNum = i + 2;

    const amount = Number(row.amount ?? "");
    if (!Number.isFinite(amount)) {
      rejectedRows.push({ row: rowNum, reason: "Invalid amount" });
      continue;
    }

    const occurred = new Date(row.occurred_at ?? "");
    if (Number.isNaN(occurred.getTime())) {
      rejectedRows.push({ row: rowNum, reason: "Invalid occurred_at timestamp" });
      continue;
    }

    const currency = (row.currency || "USD").toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      rejectedRows.push({ row: rowNum, reason: "Invalid currency (must be ISO-4217 3 letters)" });
      continue;
    }

    const approvedRaw = String(row.approved ?? "true").trim().toLowerCase();
    if (!["true", "false", "1", "0", "yes", "no"].includes(approvedRaw)) {
      rejectedRows.push({ row: rowNum, reason: "Invalid approved value (use true/false)" });
      continue;
    }

    validRows.push({
      source_txn_id: row.source_txn_id || crypto.randomUUID(),
      amount,
      currency,
      approved: ["true", "1", "yes"].includes(approvedRaw),
      occurred_at: occurred.toISOString(),
      payment_method: row.payment_method || "card",
      raw_ref: "csv-upload",
    });
  }

  return { validRows, rejectedRows };
}
