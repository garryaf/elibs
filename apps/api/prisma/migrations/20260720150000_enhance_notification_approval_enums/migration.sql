-- AlterEnum: Add PROCESSING to NotificationStatus
-- Provides observability during active delivery (Requirement 11.8)
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';

-- AlterEnum: Add DISCOUNT to ApprovalType
-- Enables discount approval workflow (Requirement 9.1)
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'DISCOUNT';
