export type Provider = "stripe" | "square" | "authorizenet" | "csv";

export interface ProcessorConnection {
  id: string;
  company_id: string;
  provider: Provider;
  status: "connected" | "disconnected" | "error";
  credentials_ref: string | null;
  webhook_secret_ref: string | null;
  created_at: string;
}

export interface IngestionJob {
  id: string;
  company_id: string;
  source_type: Provider;
  source_ref: string | null;
  status: "queued" | "running" | "completed" | "failed";
  started_at: string | null;
  finished_at: string | null;
  stats_json: Record<string, unknown> | null;
  error_json: Record<string, unknown> | null;
}

export interface NormalizedTransaction {
  id: string;
  company_id: string;
  source_provider: Provider;
  source_txn_id: string;
  merchant_id: string | null;
  card_fingerprint_token: string | null;
  amount: number;
  currency: string;
  approved: boolean;
  decline_code: string | null;
  avs_result: string | null;
  cvv_result: string | null;
  mcc: string | null;
  country: string | null;
  region: string | null;
  channel: string | null;
  occurred_at: string;
  settled_at: string | null;
  raw_ref: string | null;
  payment_method: string | null;
}

export interface MerchantProfile {
  id: string;
  company_id: string;
  external_merchant_id: string | null;
  legal_name: string;
  dba_name: string | null;
  vertical: string | null;
  country: string | null;
  risk_tier: string | null;
  status: string | null;
}

export interface RiskEvent {
  id: string;
  company_id: string;
  transaction_id: string | null;
  event_type: string;
  severity: "low" | "medium" | "high" | "critical";
  score: number | null;
  reasons_json: Record<string, unknown> | null;
  detected_at: string;
  status: "open" | "acknowledged" | "resolved";
}

export interface Recommendation {
  id: string;
  company_id: string;
  merchant_id: string | null;
  category: string;
  priority: "low" | "medium" | "high";
  recommendation_text: string;
  expected_impact_json: Record<string, unknown> | null;
  status: "open" | "accepted" | "dismissed";
}

export interface MetricsSummary {
  volume: number;
  revenue: number;
  txCount: number;
  approvalRate: number;
  avgTicket: number;
  declines: number;
  creditCardVolume: number;
}
