-- Drop old unique index (will be recreated with horario included)
DROP INDEX "schedule_slots_date_slot_type_class_group_id_role_user_id_key";

-- Rebuild slot_type enum: category-only (turma identity stays on class_group_id FK)
ALTER TABLE "schedule_slots" DROP COLUMN "slot_type";
DROP TYPE "slot_type";
CREATE TYPE "slot_type" AS ENUM ('COORDENACAO', 'SALA_PLUS', 'RECEPCAO', 'LANCHE', 'TURMA');
ALTER TABLE "schedule_slots" ADD COLUMN "slot_type" "slot_type" NOT NULL;

-- New horario field (reuses existing frequencia enum: EBD/CULTO/AMBOS)
ALTER TABLE "schedule_slots" ADD COLUMN "horario" "frequencia";

-- role is only meaningful for TURMA slots now
ALTER TABLE "schedule_slots" ALTER COLUMN "role" DROP NOT NULL;

-- New unique constraint including horario
CREATE UNIQUE INDEX "schedule_slots_date_slot_type_horario_class_group_id_role_use" ON "schedule_slots"("date", "slot_type", "horario", "class_group_id", "role", "user_id");
