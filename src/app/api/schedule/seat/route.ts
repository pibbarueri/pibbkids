import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SlotRole, SlotType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canEditSchedule } from "@/lib/permissions";

const query = z.object({
  slotType: z.enum(SlotType),
  classGroupId: z.string().min(1).nullable(),
  role: z.enum(SlotRole).nullable(),
  from: z.string().min(1),
  to: z.string().min(1),
});

/**
 * Every slot of one seat (same slotType, class and role) in a date range, whoever serves it.
 * The bulk swap view uses it to show the whole seat, not just one volunteer's Sundays.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !canEditSchedule(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const p = new URL(req.url).searchParams;
  const parsed = query.safeParse({
    slotType: p.get("slotType"),
    classGroupId: p.get("classGroupId") || null,
    role: p.get("role") || null,
    from: p.get("from"),
    to: p.get("to"),
  });
  if (!parsed.success) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  const { slotType, classGroupId, role, from, to } = parsed.data;

  const slots = await prisma.scheduleSlot.findMany({
    where: { slotType, classGroupId, role, date: { gte: new Date(from), lte: new Date(to) } },
    include: {
      classGroup: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, username: true } },
    },
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
  });
  return NextResponse.json(slots);
}
