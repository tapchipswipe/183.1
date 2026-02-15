# One82

AI-powered business intelligence for small-to-medium merchants. One82 ingests card transactions (starting with Stripe) and turns them into actionable insights: best sellers, inventory risk, seasonal patterns, and recommendations.

## What’s In This Repo

- React + Vite dashboard (`/src`)
- Supabase schema and Edge Functions (`/supabase`)
  - Core schema migration: `supabase/migrations/100_core_schema.sql`
  - Stripe webhook receiver: `supabase/functions/ingestion-webhook`

## Local Dev

1. Install deps:
   - `npm install`
2. Configure env:
   - `cp .env.example .env`
3. Run UI:
   - `npm run dev`

## Supabase Setup (Phase 1)

1. Apply core schema:
   - Run `supabase db reset` locally, or apply `supabase/migrations/100_core_schema.sql` to your project.
2. Deploy the Stripe webhook function:
   - `supabase functions deploy ingestion-webhook`
3. Set Edge Function secret:
   - `STRIPE_WEBHOOK_SECRET`

Stripe webhook URL:
- `${SUPABASE_URL}/functions/v1/ingestion-webhook/stripe`

Mapping webhooks to merchants:
- Create a row in `processor_connections` for the merchant with `provider='stripe'`.
- For Stripe Connect, set `account_id` to match the incoming `Stripe-Account` header.

