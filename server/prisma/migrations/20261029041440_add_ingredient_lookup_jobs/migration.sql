-- CreateEnum
CREATE TYPE "IngredientLookupJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ingredient_lookup_jobs" (
    "id" UUID NOT NULL,
    "owner_key" CHAR(64) NOT NULL,
    "active_key" CHAR(64),
    "ingredient_name" VARCHAR(150) NOT NULL,
    "status" "IngredientLookupJobStatus" NOT NULL DEFAULT 'PENDING',
    "ingredient_id" INTEGER,
    "source_photo" BYTEA,
    "source_mime_type" VARCHAR(50),
    "reservation" JSONB,
    "lease_token" UUID,
    "lease_expires_at" TIMESTAMPTZ(6),
    "error_code" VARCHAR(100),
    "error_message" VARCHAR(500),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ingredient_lookup_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_ingredient_lookup_jobs_active" ON "ingredient_lookup_jobs"("active_key");

-- CreateIndex
CREATE INDEX "idx_ingredient_lookup_jobs_owner" ON "ingredient_lookup_jobs"("owner_key", "created_at", "id");

-- CreateIndex
CREATE INDEX "idx_ingredient_lookup_jobs_queue" ON "ingredient_lookup_jobs"("status", "created_at", "id");

-- CreateIndex
CREATE INDEX "idx_ingredient_lookup_jobs_expired" ON "ingredient_lookup_jobs"("status", "lease_expires_at");

-- CreateIndex
CREATE INDEX "idx_ingredient_lookup_jobs_ingredient" ON "ingredient_lookup_jobs"("ingredient_id");

-- AddForeignKey
ALTER TABLE "ingredient_lookup_jobs" ADD CONSTRAINT "ingredient_lookup_jobs_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("ingredient_id") ON DELETE SET NULL ON UPDATE CASCADE;
