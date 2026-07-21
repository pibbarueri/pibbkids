-- CreateEnum
CREATE TYPE "snack_category" AS ENUM ('COMIDA', 'BEBIDA', 'OUTROS');

-- AlterEnum
ALTER TYPE "slot_type" ADD VALUE 'INCLUSAO';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "inclusion_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "event_volunteers" (
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "event_volunteers_pkey" PRIMARY KEY ("event_id","user_id")
);

-- CreateTable
CREATE TABLE "snacks" (
    "id" TEXT NOT NULL,
    "category" "snack_category" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "snacks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "event_volunteers" ADD CONSTRAINT "event_volunteers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_volunteers" ADD CONSTRAINT "event_volunteers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "attendance_child_id_date_tipo_key" RENAME TO "attendance_child_id_date_type_key";

-- RenameIndex
ALTER INDEX "schedule_slots_date_slot_type_horario_class_group_id_role_use" RENAME TO "schedule_slots_date_slot_type_horario_class_group_id_role_u_key";

-- RenameIndex
ALTER INDEX "users_email_key" RENAME TO "users_username_key";
