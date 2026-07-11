-- NCR-02-08: Replace absolute unique constraint on email with partial unique index
-- This allows soft-deleted user emails to be reused for new registrations.
-- Only active (non-deleted) users must have unique emails.
-- NOTE: schema.prisma still declares @unique for type generation compatibility.
-- The actual DB enforcement is this partial index.

-- Drop the existing absolute unique constraint
DROP INDEX IF EXISTS "users_email_key";

-- Create a partial unique index with the same name Prisma expects
-- This satisfies Prisma's introspection while only enforcing for active users
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email") WHERE "deletedAt" IS NULL;
