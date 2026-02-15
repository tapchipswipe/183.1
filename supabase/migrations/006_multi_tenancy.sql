CREATE TABLE normalized_transactions_partitioned (LIKE normalized_transactions) PARTITION BY HASH (company_id);
