-- Categories move from a Postgres enum to a lookup table, so adding or retiring one is
-- an INSERT/UPDATE instead of a migration plus a deploy. Written by hand rather than
-- generated, so the categories already assigned to materials survive the switch.

CREATE TABLE "material_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "material_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "material_categories_name_key" ON "material_categories"("name");

-- Seeded with readable ids so the old enum values stay traceable in the data.
INSERT INTO "material_categories" ("id", "name", "sort_order") VALUES
  ('papelaria',        'Papelaria',          10),
  ('decoracao',        'Decoração',          20),
  ('lembrancinha',     'Lembrancinha',       30),
  ('teatro_fantoches', 'Teatro e Fantoches', 40),
  ('brinquedos',       'Brinquedos',         50),
  ('eletronicos',      'Eletrônicos',        60);

ALTER TABLE "materials" ADD COLUMN "category_id" TEXT;

-- Carry over whatever was already categorised. NULL stays NULL ("Sem categoria").
UPDATE "materials" SET "category_id" = lower("category"::text) WHERE "category" IS NOT NULL;

ALTER TABLE "materials" DROP COLUMN "category";
DROP TYPE "material_category";

CREATE INDEX "materials_category_id_idx" ON "materials"("category_id");

ALTER TABLE "materials" ADD CONSTRAINT "materials_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "material_categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
