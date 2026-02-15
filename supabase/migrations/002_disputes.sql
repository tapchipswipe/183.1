CREATE TABLE IF NOT EXISTS transaction_disputes (dispute_id UUID PRIMARY KEY, transaction_id UUID, dispute_status TEXT, company_id UUID);
