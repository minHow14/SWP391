-- D:/SWP391/SWP391/server/prisma/migrations/20261026070000_add_ingredient_recognition/migration.sql

-- AlterEnum
ALTER TYPE "AiGenerationType" ADD VALUE 'INGREDIENT_RECOGNITION';

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FreshnessStatus" AS ENUM ('FRESH', 'GOOD', 'EXPIRING_SOON', 'SPOILED');

-- CreateTable
CREATE TABLE "ingredient_scans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" INTEGER,
    "image_url" VARCHAR(500) NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "summary" TEXT,
    "error_code" VARCHAR(100),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ingredient_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recognized_ingredient_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scan_id" UUID NOT NULL,
    "ingredient_id" INTEGER,
    "detected_name" VARCHAR(150) NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "quantity_estimate" VARCHAR(100),
    "freshness_status" "FreshnessStatus" NOT NULL,
    "freshness_score" SMALLINT NOT NULL,
    "estimated_shelf_life_days" SMALLINT,
    "spoilage_signs" JSONB,
    "storage_advice" VARCHAR(500),
    "bounding_box" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recognized_ingredient_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_ingredient_scans_user_created" ON "ingredient_scans"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_ingredient_scans_status" ON "ingredient_scans"("status");

-- CreateIndex
CREATE INDEX "idx_recognized_items_scan_id" ON "recognized_ingredient_items"("scan_id");

-- CreateIndex
CREATE INDEX "idx_recognized_items_ingredient_id" ON "recognized_ingredient_items"("ingredient_id");

-- AddForeignKey
ALTER TABLE "ingredient_scans" ADD CONSTRAINT "ingredient_scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recognized_ingredient_items" ADD CONSTRAINT "recognized_ingredient_items_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "ingredient_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recognized_ingredient_items" ADD CONSTRAINT "recognized_ingredient_items_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("ingredient_id") ON DELETE SET NULL ON UPDATE CASCADE;