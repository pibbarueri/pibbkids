-- CreateEnum
CREATE TYPE "occurrence_context" AS ENUM ('EBD', 'CULTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "occurrence_status" AS ENUM ('EM_ANALISE', 'RESOLVIDO');

-- CreateTable
CREATE TABLE "occurrences" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "occurred_at" DATE NOT NULL,
    "context" "occurrence_context" NOT NULL,
    "details" TEXT NOT NULL,
    "status" "occurrence_status" NOT NULL DEFAULT 'EM_ANALISE',
    "resolved_by_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "occurrences_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
