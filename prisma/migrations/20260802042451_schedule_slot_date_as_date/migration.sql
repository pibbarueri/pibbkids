-- A schedule slot belongs to a calendar day, not an instant. Stored as a timestamp,
-- the same Sunday ended up written at two different times: 00:00 (the original import)
-- and 03:00 (local midnight in America/Sao_Paulo, written by the app). Equality filters
-- then matched only one of the two sets, hiding part of a volunteer's schedule.
--
-- The column is `timestamp without time zone`, so the stored value is already the UTC
-- wall time Prisma wrote. Casting to DATE truncates the time portion with no timezone
-- conversion: both 2026-08-02 00:00 and 2026-08-02 03:00 become 2026-08-02. No row
-- changes calendar day, and nothing is deleted.

-- The unique index covers `date`, so rows differing only by time-of-day would collide
-- once truncated. Fail with a readable message instead of a raw index violation.
DO $$
DECLARE
  collisions bigint;
BEGIN
  SELECT count(*) INTO collisions FROM (
    SELECT 1
    FROM "schedule_slots"
    GROUP BY "date"::date, "slot_type", "horario", "class_group_id", "role", "user_id"
    HAVING count(*) > 1
  ) dups;

  IF collisions > 0 THEN
    RAISE EXCEPTION
      'Cannot convert schedule_slots.date to DATE: % duplicate slot(s) differ only by time-of-day. Resolve them before deploying.',
      collisions;
  END IF;
END $$;

ALTER TABLE "schedule_slots"
  ALTER COLUMN "date" SET DATA TYPE DATE USING "date"::date;
