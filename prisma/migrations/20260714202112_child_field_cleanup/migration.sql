-- Rename columns to preserve data
ALTER TABLE "children" RENAME COLUMN "phone" TO "phone_dad";
ALTER TABLE "children" RENAME COLUMN "whatsapp" TO "phone_mom";

-- Birthdate is date-only
ALTER TABLE "children" ALTER COLUMN "birthdate" SET DATA TYPE DATE;

-- Drop unused columns
ALTER TABLE "children" DROP COLUMN "parent_consent";
ALTER TABLE "children" DROP COLUMN "parent_expectations";
ALTER TABLE "children" DROP COLUMN "registration_status";
ALTER TABLE "children" DROP COLUMN "revista_certificate_url";

-- Drop unused enum
DROP TYPE "child_status";
