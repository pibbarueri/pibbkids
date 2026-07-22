-- DropForeignKey
ALTER TABLE "event_volunteers" DROP CONSTRAINT IF EXISTS "event_volunteers_event_id_fkey";
ALTER TABLE "event_volunteers" DROP CONSTRAINT IF EXISTS "event_volunteers_user_id_fkey";

-- DropTable
DROP TABLE "event_volunteers";
