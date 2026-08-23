-- Seed lab accreditation number into system_settings
-- This value is displayed in the PDF report footer for regulatory compliance.
-- Update the value via the Settings > General menu or directly in this table.

INSERT INTO system_settings (key, value, "updatedAt")
VALUES ('lab_accreditation_number', 'LAB-AKRED-2024-XXXX', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW();
