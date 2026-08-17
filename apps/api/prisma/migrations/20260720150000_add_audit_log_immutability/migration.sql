-- Enforce database-level immutability on audit_logs table
-- Regulatory compliance: audit records must be tamper-proof (ISO 15189, KEMENKES)
-- This prevents any UPDATE or DELETE operations on the audit_logs table

-- Create a helper function that raises an immutability violation exception
CREATE OR REPLACE FUNCTION fn_audit_logs_immutable_check(operation TEXT)
RETURNS TEXT AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs table is immutable - % operations are not permitted', operation;
END;
$$ LANGUAGE plpgsql;

-- Prevent UPDATE operations on audit_logs (raises exception)
CREATE RULE audit_logs_no_update AS
  ON UPDATE TO audit_logs
  DO INSTEAD (
    SELECT fn_audit_logs_immutable_check('UPDATE')
  );

-- Prevent DELETE operations on audit_logs (raises exception)
CREATE RULE audit_logs_no_delete AS
  ON DELETE TO audit_logs
  DO INSTEAD (
    SELECT fn_audit_logs_immutable_check('DELETE')
  );
