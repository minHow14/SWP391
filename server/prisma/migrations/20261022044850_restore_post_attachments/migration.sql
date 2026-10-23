-- D:/SWP391/SWP391/server/prisma/migrations/20261022044850_restore_post_attachments/migration.sql
-- CreateTable
CREATE TABLE "post_attachments" (
    "attachment_id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "file_type" VARCHAR(20) NOT NULL,
    "file_name" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_attachments_pkey" PRIMARY KEY ("attachment_id")
);

-- CreateIndex
CREATE INDEX "idx_post_attachments_post" ON "post_attachments"("post_id");

-- AddForeignKey
ALTER TABLE "post_attachments" ADD CONSTRAINT "post_attachments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE CASCADE ON UPDATE NO ACTION;
