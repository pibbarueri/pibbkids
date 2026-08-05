-- AlterTable
ALTER TABLE "purchase_requests" ADD COLUMN "category_id" TEXT;
ALTER TABLE "purchase_requests" ADD COLUMN "description" TEXT;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "material_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
