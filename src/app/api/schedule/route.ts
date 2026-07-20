import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.date = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const slots = await prisma.scheduleSlot.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      classGroup: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "asc" }, { slotType: "asc" }],
  });

  return NextResponse.json(slots);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { date, slotType, horario, classGroupId, role, userId } = body;

  const slot = await prisma.scheduleSlot.create({
    data: {
      date: new Date(date),
      slotType,
      horario: horario ?? null,
      classGroupId: classGroupId ?? null,
      role: role ?? null,
      userId,
    },
    include: {
      user: { select: { id: true, name: true } },
      classGroup: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(slot, { status: 201 });
}
