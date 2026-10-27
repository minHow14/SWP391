-- server/prisma/migrations/20261025113000_health_history_recorded_date_timestamptz/migration.sql
-- AlterTable
ALTER TABLE "health_histories" ALTER COLUMN "recorded_date" SET DATA TYPE TIMESTAMPTZ(6) USING "recorded_date"::timestamptz;
ALTER TABLE "health_histories" ALTER COLUMN "recorded_date" SET DEFAULT CURRENT_TIMESTAMP;
