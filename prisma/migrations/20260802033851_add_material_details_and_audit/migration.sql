-- CreateEnum
CREATE TYPE "material_category" AS ENUM ('PAPELARIA', 'DECORACAO', 'LEMBRANCINHA', 'TEATRO_FANTOCHES', 'BRINQUEDOS', 'ELETRONICOS');

-- AlterTable
-- category stays nullable: materials registered before categories existed have no
-- meaningful value, and they show up as "Sem categoria" until someone edits them.
ALTER TABLE "materials" ADD COLUMN     "category" "material_category",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "updated_by_id" TEXT;

-- updated_at is NOT NULL with no default (Prisma sets it from the app via @updatedAt),
-- so it has to be added nullable and backfilled before the constraint goes on, or the
-- ALTER fails on any table that already has rows.
ALTER TABLE "materials" ADD COLUMN "updated_at" TIMESTAMP(3);
UPDATE "materials" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
ALTER TABLE "materials" ALTER COLUMN "updated_at" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
