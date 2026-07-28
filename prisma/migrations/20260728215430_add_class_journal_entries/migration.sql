-- CreateTable
CREATE TABLE "class_journal_entries" (
    "id" TEXT NOT NULL,
    "class_group_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "entry_date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "acknowledged_by_id" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_journal_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "class_journal_entries" ADD CONSTRAINT "class_journal_entries_class_group_id_fkey" FOREIGN KEY ("class_group_id") REFERENCES "class_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_journal_entries" ADD CONSTRAINT "class_journal_entries_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_journal_entries" ADD CONSTRAINT "class_journal_entries_acknowledged_by_id_fkey" FOREIGN KEY ("acknowledged_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
