-- 1. Create a clean, isolated schema for our staging environment
CREATE SCHEMA IF NOT EXISTS data_ops_staging;

-- 2. Define the core verified records table with strict data constraints
CREATE TABLE IF NOT EXISTS data_ops_staging.verified_beneficiaries (
    record_id SERIAL PRIMARY KEY,
    partner_id VARCHAR(50) NOT NULL,
    beneficiary_name VARCHAR(255) NOT NULL,
    identity_id VARCHAR(100) UNIQUE NOT NULL, -- Enforces database-level deduplication
    amount_allocated NUMERIC(12, 2) DEFAULT 0.00,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create an audit log table to track flagged operational anomalies
CREATE TABLE IF NOT EXISTS data_ops_staging.audit_anomaly_logs (
    log_id SERIAL PRIMARY KEY,
    flagged_partner_id VARCHAR(50),
    flagged_name VARCHAR(255),
    error_type VARCHAR(100) NOT NULL, -- e.g., 'MISSING_UNIQUE_IDENTIFIER'
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Build a composite index to maximize performance on lookups
CREATE INDEX IF NOT EXISTS idx_partner_identity 
ON data_ops_staging.verified_beneficiaries (partner_id, identity_id);