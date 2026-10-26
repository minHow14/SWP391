-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "place_id" VARCHAR(100),
ADD COLUMN "source" VARCHAR(20) NOT NULL DEFAULT 'local',
ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "updated_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE UNIQUE INDEX "uq_restaurants_place_id" ON "restaurants"("place_id");

-- CreateIndex
CREATE INDEX "idx_restaurants_status_coords" ON "restaurants"("status", "latitude", "longitude");

-- CreateIndex
CREATE INDEX "idx_restaurants_diet_coords" ON "restaurants"("diet_type_id", "latitude", "longitude");
