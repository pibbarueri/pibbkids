/*
  Warnings:

  - Added the required column `updated_at` to the `materials` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "material_category" AS ENUM ('PAPELARIA', 'DECORACAO', 'LEMBRANCINHA', 'TEATRO_FANTOCHES', 'BRINQUEDOS', 'ELETRONICOS');

-- AlterTable
ALTER TABLE "materials" ADD COLUMN     "category" "material_category",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updated_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
