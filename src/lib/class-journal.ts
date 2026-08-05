import { prisma } from "@/lib/prisma";

// "Teacher of that room" = has had at least one CLASS ScheduleSlot for that
// classGroupId, on any date (history is enough, no assignment table needed).
export async function getTeacherRoomIds(userId: string): Promise<string[]> {
  const slots = await prisma.scheduleSlot.findMany({
    where: { userId, slotType: "CLASS", classGroupId: { not: null } },
    select: { classGroupId: true },
    distinct: ["classGroupId"],
  });
  return slots.map((s) => s.classGroupId!).filter(Boolean);
}
