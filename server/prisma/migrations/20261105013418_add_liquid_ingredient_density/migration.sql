/*
  Warnings:

  - The values [INGREDIENT_RECOGNITION] on the enum `AiGenerationType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `ingredient_scans` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `recognized_ingredient_items` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AiGenerationType_new" AS ENUM ('CHAT', 'MEAL_PLAN', 'FOOD_SCAN');
ALTER TABLE "ai_generations" ALTER COLUMN "type" TYPE "AiGenerationType_new" USING ("type"::text::"AiGenerationType_new");
ALTER TYPE "AiGenerationType" RENAME TO "AiGenerationType_old";
ALTER TYPE "AiGenerationType_new" RENAME TO "AiGenerationType";
DROP TYPE "public"."AiGenerationType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ingredient_scans" DROP CONSTRAINT "ingredient_scans_user_id_fkey";

-- DropForeignKey
ALTER TABLE "recognized_ingredient_items" DROP CONSTRAINT "recognized_ingredient_items_ingredient_id_fkey";

-- DropForeignKey
ALTER TABLE "recognized_ingredient_items" DROP CONSTRAINT "recognized_ingredient_items_scan_id_fkey";

-- DropTable
DROP TABLE "ingredient_scans";

-- DropTable
DROP TABLE "recognized_ingredient_items";

-- DropEnum
DROP TYPE "FreshnessStatus";

-- DropEnum
DROP TYPE "ScanStatus";

-- CreateTable
CREATE TABLE "liquid_ingredient_densities" (
    "density_id" SERIAL NOT NULL,
    "ingredient_id" INTEGER NOT NULL,
    "density" REAL NOT NULL,

    CONSTRAINT "liquid_ingredient_densities_pkey" PRIMARY KEY ("density_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "liquid_ingredient_densities_ingredient_id_key" ON "liquid_ingredient_densities"("ingredient_id");

-- AddForeignKey
ALTER TABLE "liquid_ingredient_densities" ADD CONSTRAINT "liquid_ingredient_densities_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("ingredient_id") ON DELETE CASCADE ON UPDATE NO ACTION;
