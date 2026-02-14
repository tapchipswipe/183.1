import type { ConnectorAdapter, ConnectorHealth, NormalizedTransactionDraft, TransactionBatch, ValidationResult } from "@/services/connectors/types";

class BaseStubAdapter implements ConnectorAdapter {
  provider: "stripe" | "square" | "authorizenet";

  constructor(provider: "stripe" | "square" | "authorizenet") {
    this.provider = provider;
  }

  async pullTransactions(_cursor?: string | null): Promise<TransactionBatch> {
    return { cursor: null, transactions: [] };
  }

  validateWebhook(_headers: Record<string, string>, _body: string): ValidationResult {
    return { valid: true };
  }

  mapToNormalized(raw: Record<string, unknown>): NormalizedTransactionDraft {
    return {
      source_provider: this.provider,
      source_txn_id: String(raw.id ?? crypto.randomUUID()),
      amount: Number(raw.amount ?? 0),
      currency: String(raw.currency ?? "USD"),
      approved: Boolean(raw.approved ?? true),
      occurred_at: new Date().toISOString(),
      payment_method: String(raw.payment_method ?? "card"),
    };
  }

  async healthCheck(): Promise<ConnectorHealth> {
    return { ok: true, details: `${this.provider} stub connector healthy` };
  }
}

export const stripeAdapter = new BaseStubAdapter("stripe");
export const squareAdapter = new BaseStubAdapter("square");
export const authorizenetAdapter = new BaseStubAdapter("authorizenet");
