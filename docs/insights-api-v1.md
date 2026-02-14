# Insights API v1 Contract (Specification)

This is a versioned specification and implementation target for external service clients.

## Authentication

All endpoints require:

- `Authorization: Bearer <service_token>`

Token model:

- Service tokens are stored in `service_api_tokens`.
- Incoming bearer token is SHA-256 hashed and matched against `token_hash`.
- Token scopes are enforced per endpoint (`metrics:read`, `risk:read`, `merchant:read`, `recommendations:read`).

## Metrics

### `GET /v1/metrics/summary?from&to&merchant_id&currency`
Returns summary metrics for the selected scope.

Response:
```json
{
  "volume": 120343.22,
  "revenue": 117223.10,
  "tx_count": 1432,
  "approval_rate": 96.2,
  "avg_ticket": 81.86,
  "declines": 54,
  "credit_card_volume": 117223.10
}
```

### `GET /v1/metrics/transactions?granularity=day|week|month`

### `GET /v1/metrics/revenue?granularity=day|week|month`

## Risk

### `GET /v1/risk/events?severity&status&merchant_id`

## Merchant Scorecards

### `GET /v1/merchants/:id/scorecards`

## Recommendations

### `GET /v1/recommendations?status&priority`

## Implemented Function

- Edge function: `supabase/functions/insights-api/index.ts`
- Expected deployment route: `/functions/v1/insights-api/*`

## Event Types

- `txn.approved`
- `txn.declined`
- `txn.chargeback`
- `risk.anomaly_detected`
- `risk.velocity_violation`
- `merchant.score_updated`
- `insight.snapshot_ready`
