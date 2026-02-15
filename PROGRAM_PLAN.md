# ONE82 - COMPLETE PROGRAM PLAN

## Executive Summary

One82 is an AI-powered credit card processing intelligence platform that transforms transaction data into actionable business insights. It analyzes best-selling products, predicts inventory needs, identifies seasonal trends, and provides data-driven recommendations to help businesses grow revenue and optimize operations.

## Core Mission

**For Businesses**: Turn every credit card transaction into a strategic business decision  
**For One82**: Be the AI co-pilot that helps small-to-medium businesses compete with enterprise-level analytics

---

## PHASE-BY-PHASE IMPLEMENTATION

### Phase 1: Foundation & Data Ingestion (Weeks 1-4) ✅ IN PROGRESS

#### Objectives
- Build robust transaction ingestion pipeline
- Create normalized database schema
- Establish merchant authentication
- Deploy basic dashboard UI

#### Critical Components

**1. Complete Database Schema**  
Status: Needs overhaul - current migrations are incomplete stubs

Required Tables:
- `merchants` - Business profiles and settings
- `processor_connections` - Payment processor API credentials (encrypted)
- `transactions` - Normalized transaction records
- `transaction_line_items` - Individual products per transaction
- `products` - Merchant product catalog with inventory tracking
- `inventory_snapshots` - Daily stock level history
- `insights` - AI-generated findings
- `recommendations` - Actionable items with priority scoring
- `recommendation_feedback` - Merchant feedback loop for ML improvement

**Action**: Create `supabase/migrations/100_core_schema.sql` with complete schema

**2. Transaction Ingestion System**  
Components:
- Stripe webhook receiver with signature validation
- Transaction normalizer (extract products, quantities, prices)
- Duplicate detection using external_transaction_id
- CSV batch uploader for legacy systems
- Idempotent processing with retry logic

**3. Merchant Dashboard MVP**  
Components:
- Supabase Auth integration
- Processor connection wizard
- Real-time transaction list
- Basic KPIs: Today's revenue, transaction count, top product

#### Success Criteria
- Merchant can sign up and connect Stripe account
- Transactions flow into database within 5 seconds of payment
- Dashboard displays live transaction data
- No data loss (100% ingestion reliability)

---

### Phase 2: Core Analytics Engine (Weeks 5-8)

#### Feature 1: Best Sellers Analysis (P0 Critical)
- Top 10 products by revenue (7/30/90 day windows)
- Trending products (week-over-week growth)
- Sortable table with sparkline charts

#### Feature 2: Inventory Forecasting (P0 Critical)
- Linear Velocity Model (ship first)
- Color-coded inventory health (🟢🟡🔴)
- Predicted stockout dates

#### Feature 3: Seasonal Intelligence (P1 High)
- Calendar seasons, holidays, day-of-week patterns
- Seasonal heatmaps

---

### Phase 3: AI Enhancement & Multi-Processor (Weeks 9-12)
- Seasonal ARIMA Forecasting
- Recommendation Engine (6 types: reorder, promote, bundle, pricing, discontinue, staffing)
- Square + Authorize.net integration
- Data visualization charts

---

### Phase 4: Customer Intelligence (Weeks 13-16)
- Customer Cohort Analysis
- Churn Prediction
- Basket Analysis
- Customer Segmentation Dashboard

---

### Phase 5: Enterprise Features (Weeks 17-20)
- Multi-Location Support
- Custom Business Rules Engine
- Public API with OpenAPI docs
- Advanced Reporting (PDF, scheduled emails)

---

### Phase 6: Growth & Optimization (Ongoing)
- Mobile app (React Native)
- AI chatbot
- Integration marketplace (Shopify, WooCommerce, QuickBooks)
- Pricing intelligence, anomaly detection

---

## IMMEDIATE ACTION ITEMS (Next 7 Days)

### Day 1-2: Database Schema
- [ ] Create `supabase/migrations/100_core_schema.sql`
- [ ] Include all tables, indexes, foreign keys, RLS policies
- [ ] Test locally: `supabase db reset`

### Day 3-4: Stripe Integration
- [ ] Build `/supabase/functions/ingestion-webhook/index.ts`
- [ ] Implement Stripe signature validation
- [ ] Test with Stripe CLI

### Day 5-6: Basic Dashboard
- [ ] Create React app with Supabase Auth
- [ ] Build transaction list page
- [ ] Add "Connect Stripe" button
- [ ] Display basic stats

### Day 7: Best Sellers MVP
- [ ] Implement best sellers SQL query
- [ ] Create insights-generator function
- [ ] Display top 10 products in dashboard

---

## SUCCESS METRICS

### Product Metrics
- **Merchant Activation Rate**: >60%
- **Insight Action Rate**: >25%
- **Daily Active Merchants**: >40%
- **Insight Accuracy**: >80%
- **Time to First Value**: <24h

### Business Metrics
- **CAC**: <$200
- **LTV**: >$2,400
- **LTV:CAC Ratio**: >3:1
- **Churn Rate**: <5% monthly
- **NPS Score**: >50

### Technical Metrics
- **Webhook Latency**: <500ms p95
- **Insight Generation**: <5 seconds
- **API Uptime**: 99.9%
- **Query Performance**: <100ms

---

## PRICING STRATEGY

**Starter - $49/month**: 1K transactions, 1 processor, basic insights  
**Growth - $149/month**: 10K transactions, unlimited processors, all AI insights  
**Pro - $399/month**: Unlimited, multi-location, API access  
**Enterprise - Custom**: White-label, custom ML, SLA guarantees

---

## COMPETITIVE ANALYSIS

**Toast Analytics**: Deep POS integration BUT locked to hardware  
**Square Analytics**: Free with Square BUT limited AI  
**Shopify Analytics**: E-commerce focus BUT no brick-and-mortar  
**One82 Advantage**: Processor-agnostic, AI-first, affordable, works with physical locations

---

## RISK MITIGATION

**Technical**: Idempotent processing, retry logic, materialized views, caching  
**Business**: Beta program, weekly feedback, rapid iteration, focus on time-to-value

---

## TECHNOLOGY DECISIONS

**Supabase**: Postgres for analytics, real-time subscriptions, edge functions, cost-effective  
**React + Vite**: Fast development, modern tooling, large ecosystem  
**Web MVP First**: Focus on desktop users initially, mobile app in Phase 6

---

**Built with ❤️ to help small businesses compete with enterprise-grade intelligence**
