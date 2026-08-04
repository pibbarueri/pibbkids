-- CreateTable
CREATE TABLE "notifications" (
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("user_id","key")
);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: purchase_requests.updated_at (nullable -> backfill -> NOT NULL)
ALTER TABLE "purchase_requests" ADD COLUMN "updated_at" TIMESTAMP(3);
UPDATE "purchase_requests" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
ALTER TABLE "purchase_requests" ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable: occurrences.updated_at (nullable -> backfill -> NOT NULL)
ALTER TABLE "occurrences" ADD COLUMN "updated_at" TIMESTAMP(3);
UPDATE "occurrences" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
ALTER TABLE "occurrences" ALTER COLUMN "updated_at" SET NOT NULL;
