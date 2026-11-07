-- AlterTable
ALTER TABLE "content_moderation_jobs" ADD COLUMN     "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
