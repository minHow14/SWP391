-- server/prisma/migrations/20261026124500_add_food_scan_ai_generation_type/migration.sql
-- AlterEnum
ALTER TYPE "public"."AiGenerationType" ADD VALUE 'FOOD_SCAN';
