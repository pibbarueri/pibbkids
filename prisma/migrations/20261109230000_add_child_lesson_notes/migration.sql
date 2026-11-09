-- CreateTable
CREATE TABLE "child_lesson_notes" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "sunday_type" NOT NULL,
    "note" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_lesson_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "child_lesson_notes_child_id_date_type_key" ON "child_lesson_notes"("child_id", "date", "type");

-- AddForeignKey
ALTER TABLE "child_lesson_notes" ADD CONSTRAINT "child_lesson_notes_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_lesson_notes" ADD CONSTRAINT "child_lesson_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
