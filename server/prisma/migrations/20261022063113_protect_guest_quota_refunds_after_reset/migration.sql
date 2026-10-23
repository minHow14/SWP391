-- D:/SWP391/SWP391/server/prisma/migrations/20261022063113_protect_guest_quota_refunds_after_reset/migration.sql
-- AlterTable
ALTER TABLE "guest_quota" ADD COLUMN     "reservation_revision" INTEGER NOT NULL DEFAULT 0;
