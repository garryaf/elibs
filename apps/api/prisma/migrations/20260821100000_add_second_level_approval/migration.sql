-- AlterTable: Add second-level approval fields to orders
ALTER TABLE "orders" ADD COLUMN "secondApprovalRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "orders" ADD COLUMN "secondApprovalBy" UUID;
ALTER TABLE "orders" ADD COLUMN "secondApprovalAt" TIMESTAMP(3);
