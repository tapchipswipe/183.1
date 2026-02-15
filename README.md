# One82

One82 is an AI-powered transaction analytics and inventory intelligence platform for small-to-medium merchants.

## Repo Contents

- React + Vite dashboard: `/src`
- Supabase schema + Edge Functions: `/supabase`
  - Core schema migration: `/supabase/migrations/100_core_schema.sql`
  - Stripe webhook receiver: `/supabase/functions/ingestion-webhook`
- Optional UI building blocks (not required by the app router):
  - `/src/lib/one82-core.ts`
  - `/src/components/one82-statement-parser.tsx`
  - `/src/components/multi-merchant-dashboard.tsx`

## Local Dev

1. Install dependencies:
   - `npm install`
2. Configure environment:
   - `cp .env.example .env`
3. Run the UI:
   - `npm run dev`

## Supabase Setup (Phase 1)

1. Apply the core schema:
   - Run `supabase db reset` locally, or apply `/supabase/migrations/100_core_schema.sql` to your project.
2. Deploy the Stripe webhook function:
   - `supabase functions deploy ingestion-webhook`
3. Set the Edge Function secret:
   - `STRIPE_WEBHOOK_SECRET`

Stripe webhook URL:
- `${SUPABASE_URL}/functions/v1/ingestion-webhook/stripe`

Merchant mapping:
- Create a row in `processor_connections` for the merchant with `provider='stripe'`.
- For Stripe Connect, set `account_id` to match the incoming `Stripe-Account` header.

