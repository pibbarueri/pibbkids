-- Enum type renames
ALTER TYPE "frequencia" RENAME TO "frequency";
ALTER TYPE "sunday_tipo" RENAME TO "sunday_type";

-- FunctionType value renames
ALTER TYPE "function_type" RENAME VALUE 'PROFESSOR' TO 'TEACHER';
ALTER TYPE "function_type" RENAME VALUE 'AUXILIAR' TO 'ASSISTANT';
ALTER TYPE "function_type" RENAME VALUE 'APOIO_GERAL' TO 'SUPPORT';
ALTER TYPE "function_type" RENAME VALUE 'LOUVOR' TO 'WORSHIP';
ALTER TYPE "function_type" RENAME VALUE 'RECEPCAO' TO 'RECEPTION';
ALTER TYPE "function_type" RENAME VALUE 'MIDIAS_DESIGN' TO 'MEDIA_DESIGN';

-- LessonType value renames
ALTER TYPE "lesson_type" RENAME VALUE 'APOSTILA' TO 'WORKBOOK';
ALTER TYPE "lesson_type" RENAME VALUE 'AULA_EXTRA' TO 'EXTRA_CLASS';
ALTER TYPE "lesson_type" RENAME VALUE 'QUIZ_GINCANA' TO 'QUIZ_GAME';
ALTER TYPE "lesson_type" RENAME VALUE 'SEM_AULA' TO 'NO_CLASS';
ALTER TYPE "lesson_type" RENAME VALUE 'TEMA_LIVRE' TO 'FREE_TOPIC';

-- SlotRole value renames
ALTER TYPE "slot_role" RENAME VALUE 'PROFESSOR' TO 'TEACHER';
ALTER TYPE "slot_role" RENAME VALUE 'AUXILIAR' TO 'ASSISTANT';

-- SlotType value renames
ALTER TYPE "slot_type" RENAME VALUE 'COORDENACAO' TO 'COORDINATOR';
ALTER TYPE "slot_type" RENAME VALUE 'SALA_PLUS' TO 'ROOM_PLUS';
ALTER TYPE "slot_type" RENAME VALUE 'RECEPCAO' TO 'RECEPTION';
ALTER TYPE "slot_type" RENAME VALUE 'LANCHE' TO 'SNACK';
ALTER TYPE "slot_type" RENAME VALUE 'INCLUSAO' TO 'INCLUSION';
ALTER TYPE "slot_type" RENAME VALUE 'TURMA' TO 'CLASS';

-- RequestStatus value renames
ALTER TYPE "request_status" RENAME VALUE 'PENDENTE' TO 'PENDING';
ALTER TYPE "request_status" RENAME VALUE 'APROVADO' TO 'APPROVED';
ALTER TYPE "request_status" RENAME VALUE 'REJEITADO' TO 'REJECTED';
ALTER TYPE "request_status" RENAME VALUE 'COMPRADO' TO 'PURCHASED';
ALTER TYPE "request_status" RENAME VALUE 'EM_ESTOQUE' TO 'IN_STOCK';

-- SnackCategory value renames
ALTER TYPE "snack_category" RENAME VALUE 'COMIDA' TO 'FOOD';
ALTER TYPE "snack_category" RENAME VALUE 'BEBIDA' TO 'DRINK';
ALTER TYPE "snack_category" RENAME VALUE 'OUTROS' TO 'OTHER';

-- OccurrenceStatus value renames
ALTER TYPE "occurrence_status" RENAME VALUE 'EM_ANALISE' TO 'UNDER_REVIEW';
ALTER TYPE "occurrence_status" RENAME VALUE 'RESOLVIDO' TO 'RESOLVED';

-- Column renames
ALTER TABLE "sunday_plans" RENAME COLUMN "tipo" TO "type";
ALTER TABLE "sunday_plans" RENAME COLUMN "licao_number" TO "lesson_number";
ALTER TABLE "schedule_slots" RENAME COLUMN "horario" TO "time_slot";
