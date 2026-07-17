CREATE TABLE "journals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "series" "series_type" NOT NULL,
    "edition" INTEGER NOT NULL,
    "total_weeks" INTEGER NOT NULL,
    "class_group_id" TEXT NOT NULL,
    "usage" "frequencia" NOT NULL,
    "teacher_copies" INTEGER NOT NULL DEFAULT 0,
    "student_copies" INTEGER NOT NULL DEFAULT 0,
    "has_visual_resources" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "journals_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "journals" ADD CONSTRAINT "journals_class_group_id_fkey"
  FOREIGN KEY ("class_group_id") REFERENCES "class_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sunday_plans" DROP COLUMN "curriculum_id";
ALTER TABLE "sunday_plans" ADD COLUMN "journal_id" TEXT;
ALTER TABLE "sunday_plans" ADD CONSTRAINT "sunday_plans_journal_id_fkey"
  FOREIGN KEY ("journal_id") REFERENCES "journals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE "curriculums";
