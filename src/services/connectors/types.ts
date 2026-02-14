import type { Provider } from "@/lib/processor-types";

export interface NormalizedTransactionDraft {
  source_provider: Provider;
  source_txn_id: string;
  merchant_id?: string | null;
  card_fingerprint_token?: string | null;
  amount: number;
  currency: string;
  approved: boolean;
  decline_code?: string | null;
  avs_result?: string | null;
  cvv_result?: string | null;
  mcc?: string | null;
  country?: string | null;
  region?: string | null;
  channel?: string | null;
  occurred_at: string;
  settled_at?: string | null;
  raw_ref?: string | null;
  payment_method?: string | null;
}

export interface TransactionBatch {
  cursor?: string | null;
  transactions: NormalizedTransactionDraft[];
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export interface ConnectorHealth {
  ok: boolean;
  details?: string;
}

export interface ConnectorAdapter {
  provider: Provider;
  pullTransactions(cursor?: string | null, since?: string, until?: string): Promise<TransactionBatch>;
  validateWebhook(headers: Record<string, string>, body: string): ValidationResult;
  mapToNormalized(raw: Record<string, unknown>): NormalizedTransactionDraft;
  healthCheck(): Promise<ConnectorHealth>;
}
