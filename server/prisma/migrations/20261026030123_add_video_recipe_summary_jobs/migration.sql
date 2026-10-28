-- D:/SWP391/SWP391/server/prisma/migrations/20261026030123_add_video_recipe_summary_jobs/migration.sql
-- CreateEnum
CREATE TYPE "VideoRecipeSummaryJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "VideoRecipeSummaryJobStage" AS ENUM ('VALIDATING_VIDEO', 'FETCHING_AUDIO', 'TRANSCRIBING', 'SUMMARIZING', 'SAVING_RESULT');

-- CreateTable
CREATE TABLE "video_recipe_summary_jobs" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "active_user_id" INTEGER,
    "video_id" VARCHAR(11) NOT NULL,
    "video_url" VARCHAR(255) NOT NULL,
    "pipeline_version" VARCHAR(20) NOT NULL,
    "status" "VideoRecipeSummaryJobStatus" NOT NULL DEFAULT 'PENDING',
    "stage" "VideoRecipeSummaryJobStage" NOT NULL DEFAULT 'VALIDATING_VIDEO',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_token" UUID,
    "lease_expires_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "transcript" JSONB,
    "error_code" VARCHAR(100),
    "error_message" VARCHAR(500),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "video_recipe_summary_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_recipe_summaries" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "video_id" VARCHAR(11) NOT NULL,
    "video_url" VARCHAR(255) NOT NULL,
    "recipe" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "video_recipe_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_video_recipe_jobs_active_user" ON "video_recipe_summary_jobs"("active_user_id");

-- CreateIndex
CREATE INDEX "idx_video_recipe_jobs_queue" ON "video_recipe_summary_jobs"("status", "available_at", "created_at", "id");

-- CreateIndex
CREATE INDEX "idx_video_recipe_jobs_expired_lease" ON "video_recipe_summary_jobs"("status", "lease_expires_at");

-- CreateIndex
CREATE INDEX "idx_video_recipe_jobs_user_created" ON "video_recipe_summary_jobs"("user_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_video_recipe_jobs_user_source_version" ON "video_recipe_summary_jobs"("user_id", "video_id", "pipeline_version");

-- CreateIndex
CREATE UNIQUE INDEX "uq_video_recipe_summaries_job" ON "video_recipe_summaries"("job_id");

-- CreateIndex
CREATE INDEX "idx_video_recipe_summaries_user_created" ON "video_recipe_summaries"("user_id", "created_at", "id");

-- AddForeignKey
ALTER TABLE "video_recipe_summary_jobs" ADD CONSTRAINT "video_recipe_summary_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_recipe_summaries" ADD CONSTRAINT "video_recipe_summaries_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "video_recipe_summary_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_recipe_summaries" ADD CONSTRAINT "video_recipe_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep the per-account active slot consistent even when competing workers recover jobs.
ALTER TABLE "video_recipe_summary_jobs" ADD CONSTRAINT "ck_video_recipe_jobs_active_owner" CHECK (
  ("status" IN ('PENDING', 'PROCESSING') AND "active_user_id" IS NOT NULL AND "active_user_id" = "user_id")
  OR ("status" IN ('COMPLETED', 'FAILED') AND "active_user_id" IS NULL)
);
ALTER TABLE "video_recipe_summary_jobs" ADD CONSTRAINT "ck_video_recipe_jobs_lease" CHECK (
  ("status" = 'PROCESSING' AND "lease_token" IS NOT NULL AND "lease_expires_at" IS NOT NULL)
  OR ("status" <> 'PROCESSING' AND "lease_token" IS NULL AND "lease_expires_at" IS NULL)
);
ALTER TABLE "video_recipe_summary_jobs" ADD CONSTRAINT "ck_video_recipe_jobs_attempt" CHECK ("attempt" >= 0);
