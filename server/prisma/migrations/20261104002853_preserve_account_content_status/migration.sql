-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "status_before_account_deletion" VARCHAR(30);

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "status_before_account_deletion" VARCHAR(30);
