# 183.1 — Processor Intelligence Platform

This repo tracks the delivery of a payment processor intelligence and risk platform across Phases A–E (activation, testing, operations, performance, and release governance).

The goal is to stand up a Supabase‑backed, multi‑provider ingestion and risk system with:

- Provider ingestion (Stripe, Square, Authorize.net)
- Normalized transaction store and daily rollups
- Rule‑based anomaly detection and merchant risk scoring
- Recommendations and alerting
- External Insights API secured by hashed service tokens

## Current Focus: Phase A — Provider Activation

Phase A is about safely activating live (or sandbox) provider credentials and wiring them into Supabase so downstream phases can run against real ingestion flows.

Key artifacts:

- `docs/PHASE_A_PROVIDER_ACTIVATION.md` — Runbook for secrets, validation steps, and exit criteria.
- `scripts/phase_a_activate.sh` — Idempotent script to push provider secrets into Supabase and verify basic connectivity.
- `code.md` — Consolidated architecture and delivery plan for Phases A–E.

## Repository Layout

```text
.
├── code.md                         # High‑level program and architecture plan
├── README.md                       # You are here
├── docs/
│   └── PHASE_A_PROVIDER_ACTIVATION.md
└── scripts/
    ├── phase_a_activate.sh         # Phase A activation script (Supabase + providers)
    └── validate_phase_a.sh         # Phase A validation checks
```

## Prerequisites

- Supabase project created and reachable
- Supabase CLI installed and logged in
- Provider sandbox or production credentials:
  - Stripe: secret key + webhook secret
  - Square: access token + webhook signature key
  - Authorize.net: API login ID, transaction key, webhook signature key

## Configuration

1. Copy `.env.example` to `.env` and fill in values:

   ```bash
   cp .env.example .env
   ```

2. Ensure the following are set:

   - `PROJECT_REF` — Supabase project ref (e.g. `abcdexyz1234`)
   - `SUPABASE_ACCESS_TOKEN` — Supabase personal access token
   - Provider secrets for at least one provider (Stripe, Square, or Authorize.net)

## Running Phase A

1. **Push provider secrets into Supabase:**

   ```bash
   ./scripts/phase_a_activate.sh
   ```

2. **Validate Phase A completion (secrets + basic ingest readiness):**

   ```bash
   ./scripts/validate_phase_a.sh
   ```

3. When all Phase A exit criteria in `docs/PHASE_A_PROVIDER_ACTIVATION.md` are satisfied, you are clear to move on to Phase B (testing + QA).

## Next Phases (B–E)

Later phases will add:

- Integration + regression tests and GitHub Actions CI
- Scheduled jobs and alerting
- Data retention, rollup optimization, and performance indexes
- Release governance and environment promotion

See `code.md` for the full roadmap and detailed implementation notes.

## Script Usage
DRY_RUN=1 ./scripts/phase_a_activate.sh - Test without changes
See code.md for full implementation details
