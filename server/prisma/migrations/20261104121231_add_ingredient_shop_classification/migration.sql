-- D:/SWP391/SWP391/server/prisma/migrations/20261104121231_add_ingredient_shop_classification/migration.sql
-- Preserve existing restaurants while recording ingredient shops independently of diet.
ALTER TABLE "restaurants" ADD COLUMN     "is_ingredient_shop" BOOLEAN NOT NULL DEFAULT false;
