-- Priority 1: Data Quality Checks
ALTER TABLE IF EXISTS normalized_transactions ADD CONSTRAINT valid_amount CHECK (amount > 0);
CREATE TABLE IF NOT EXISTS data_quality_issues (issue_id UUID PRIMARY KEY, source_provider TEXT, issue_type TEXT, detected_at TIMESTAMPTZ DEFAULT NOW());
