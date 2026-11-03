-- D:/SWP391/SWP391/server/prisma/migrations/20261028112816_add_content_moderation_jobs/migration.sql
-- CreateEnum
CREATE TYPE "ContentModerationJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "moderation_version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "moderation_version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "content_moderation_jobs" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "post_id" INTEGER,
    "comment_id" INTEGER,
    "content_version" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "content" TEXT NOT NULL,
    "status" "ContentModerationJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_token" UUID,
    "lease_expires_at" TIMESTAMPTZ(6),
    "result" JSONB,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "error_code" VARCHAR(100),
    "error_message" VARCHAR(500),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "content_moderation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_content_moderation_jobs_user" ON "content_moderation_jobs"("user_id");

-- CreateIndex
CREATE INDEX "idx_content_moderation_jobs_post" ON "content_moderation_jobs"("post_id");

-- CreateIndex
CREATE INDEX "idx_content_moderation_jobs_comment" ON "content_moderation_jobs"("comment_id");

-- CreateIndex
CREATE INDEX "idx_content_moderation_jobs_queue" ON "content_moderation_jobs"("status", "available_at", "created_at", "id");

-- CreateIndex
CREATE INDEX "idx_content_moderation_jobs_lease" ON "content_moderation_jobs"("status", "lease_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_content_moderation_jobs_post_version" ON "content_moderation_jobs"("post_id", "content_version");

-- CreateIndex
CREATE UNIQUE INDEX "uq_content_moderation_jobs_comment_version" ON "content_moderation_jobs"("comment_id", "content_version");

-- AddForeignKey
ALTER TABLE "content_moderation_jobs" ADD CONSTRAINT "content_moderation_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "content_moderation_jobs" ADD CONSTRAINT "content_moderation_jobs_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "content_moderation_jobs" ADD CONSTRAINT "content_moderation_jobs_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("comment_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- A job checks exactly one immutable version of a post or a comment.
ALTER TABLE "content_moderation_jobs"
ADD CONSTRAINT "chk_content_moderation_jobs_target" CHECK (("post_id" IS NOT NULL) <> ("comment_id" IS NOT NULL)),
ADD CONSTRAINT "chk_content_moderation_jobs_version" CHECK ("content_version" > 0),
ADD CONSTRAINT "chk_content_moderation_jobs_attempt" CHECK ("attempt" >= 0);
