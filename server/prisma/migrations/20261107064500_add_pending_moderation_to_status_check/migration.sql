-- D:/Projects/FPT/SWP391/server/prisma/migrations/20261107064500_add_pending_moderation_to_status_check/migration.sql

-- Update CHECK constraint on posts table to allow PENDING_MODERATION
ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_status_check";
ALTER TABLE "posts" ADD CONSTRAINT "posts_status_check"
  CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING'::character varying, 'PUBLISHED'::character varying, 'PENDING_MODERATION'::character varying, 'HIDDEN'::character varying, 'HIDDEN_BY_AI'::character varying, 'DELETED'::character varying])::text[])));

-- Update CHECK constraint on comments table to allow PENDING_MODERATION
ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_status_check";
ALTER TABLE "comments" ADD CONSTRAINT "comments_status_check"
  CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'PENDING_MODERATION'::character varying, 'HIDDEN'::character varying, 'HIDDEN_BY_AI'::character varying, 'DELETED'::character varying])::text[])));
