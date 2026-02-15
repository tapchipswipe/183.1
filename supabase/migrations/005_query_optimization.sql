CREATE MATERIALIZED VIEW merchant_daily_stats AS SELECT merchant_id, DATE(transaction_date) AS date, COUNT(*) AS txn_count FROM normalized_transactions GROUP BY merchant_id, DATE(transaction_date);
