import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isLeadership } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !isLeadership(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { dates, slotType, classGroupId, role, userId } = body;

  if (!Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json({ error: "dates required" }, { status: 422 });
  }

  const created = [];
  for (const date of dates) {
    const existing = await prisma.scheduleSlot.findFirst({
      where: { date: new Date(date), slotType, classGroupId: classGroupId ?? null, role, userId },
    });
    if (existing) continue;

    const slot = await prisma.scheduleSlot.create({
      data: {
        date: new Date(date),
        slotType,
        classGroupId: classGroupId ?? null,
        role,
        userId,
      },
      include: {
        user: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
      },
    });
    created.push(slot);
  }

  return NextResponse.json(created, { status: 201 });
}
