-- Extend FinancialAuditEvent enum with export event
ALTER TYPE "FinancialAuditEvent" ADD VALUE IF NOT EXISTS 'EXPORT_GENERATED';
