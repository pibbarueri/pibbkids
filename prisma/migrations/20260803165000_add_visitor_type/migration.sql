-- AlterTable
ALTER TABLE "visitors" ADD COLUMN "type" "sunday_tipo";

-- Backfill: existing rows predate this column, assume EBD (default tab on Presença).
UPDATE "visitors" SET "type" = 'EBD' WHERE "type" IS NULL;

-- AlterTable
ALTER TABLE "visitors" ALTER COLUMN "type" SET NOT NULL;
