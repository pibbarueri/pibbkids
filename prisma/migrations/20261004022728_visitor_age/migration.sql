-- Visitors can be logged with just an age instead of a birthdate.
ALTER TABLE "visitors" ALTER COLUMN "birthdate" DROP NOT NULL;
ALTER TABLE "visitors" ADD COLUMN "age" INTEGER;
