CREATE TABLE IF NOT EXISTS anomaly_rules (rule_id UUID PRIMARY KEY, company_id UUID, rule_type TEXT, threshold_config JSONB, enabled BOOLEAN DEFAULT TRUE);
