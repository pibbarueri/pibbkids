import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canEditSchedule } from "@/lib/permissions";
import { addDays, today } from "@/lib/dates";
import { ELIGIBILITY_SELECT, conflicts, isEligibleForSlot, slotKindKey } from "@/lib/schedule";

/**
 * Volunteers who could take over the given slots. For each slot, returns who is eligible and
 * free on that day/horário, so the swap dialogs and the drag chips can grey out conflicts per
 * day instead of hiding the person entirely.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !canEditSchedule(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ids = (new URL(req.url).searchParams.get("slotIds") ?? "").split(",").filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ volunteers: [], availability: {} });

  const slots = await prisma.scheduleSlot.findMany({ where: { id: { in: ids } } });
  const dates = [...new Set(slots.map((s) => s.date.toISOString()))].map((d) => new Date(d));

  // Seats without a requirement (Sala Plus) make everyone eligible. "regular" marks who
  // already serves in these seats (last 6 months onwards), so the UI can show them first.
  const kinds = [...new Set(slots.map(slotKindKey))];
  const [volunteers, busy, seatHistory] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, status: "APPROVED" },
      select: ELIGIBILITY_SELECT,
      orderBy: { name: "asc" },
    }),
    prisma.scheduleSlot.findMany({
      where: { date: { in: dates } },
      select: { userId: true, date: true, timeSlot: true },
    }),
    prisma.scheduleSlot.findMany({
      where: {
        date: { gte: addDays(today(), -180) },
        OR: slots.map((s) => ({ slotType: s.slotType, classGroupId: s.classGroupId, role: s.role })),
      },
      select: { userId: true, slotType: true, classGroupId: true, role: true },
    }),
  ]);
  const regulars = new Set(seatHistory.filter((h) => kinds.includes(slotKindKey(h))).map((h) => h.userId));

  // Eligible for at least one of the slots; per-slot availability tells which ones.
  const availability: Record<string, string[]> = {};
  for (const slot of slots) {
    const at = { date: slot.date.toISOString(), timeSlot: slot.timeSlot };
    availability[slot.id] = volunteers
      .filter((v) => v.id !== slot.userId && isEligibleForSlot(v, slot))
      .filter((v) => !busy.some((b) => b.userId === v.id && conflicts({ date: b.date.toISOString(), timeSlot: b.timeSlot }, at)))
      .map((v) => v.id);
  }
  const candidateIds = new Set(Object.values(availability).flat());
  return NextResponse.json({
    volunteers: volunteers
      .filter((v) => candidateIds.has(v.id))
      .map((v) => ({ id: v.id, name: v.name, username: v.username, regular: regulars.has(v.id) })),
    availability,
  });
}
