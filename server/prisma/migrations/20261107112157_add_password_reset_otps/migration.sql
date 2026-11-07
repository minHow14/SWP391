-- D:/SWP391/SWP391/server/prisma/migrations/20261107112157_add_password_reset_otps/migration.sql
-- CreateTable
CREATE TABLE "password_reset_otps" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "otp_hash" VARCHAR(64) NOT NULL,
    "token_version" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_sent_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "password_reset_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_password_reset_otps_user" ON "password_reset_otps"("user_id");

-- AddForeignKey
ALTER TABLE "password_reset_otps" ADD CONSTRAINT "password_reset_otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
