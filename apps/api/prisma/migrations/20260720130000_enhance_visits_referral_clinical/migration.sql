-- AlterTable: Add referral tracking and clinical context fields to visits
-- Requirements: 13.1 (referringDoctorName, referralLetterNo), 13.2 (encounterReason, chiefComplaint)

ALTER TABLE "visits" ADD COLUMN "referringDoctorName" VARCHAR(100);
ALTER TABLE "visits" ADD COLUMN "referralLetterNo" VARCHAR(50);
ALTER TABLE "visits" ADD COLUMN "encounterReason" TEXT;
ALTER TABLE "visits" ADD COLUMN "chiefComplaint" TEXT;
