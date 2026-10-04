-- Per-snack low-stock threshold. Default 5 keeps the previous fixed behavior for existing rows.
ALTER TABLE "snacks" ADD COLUMN "min_quantity" INTEGER NOT NULL DEFAULT 5;
