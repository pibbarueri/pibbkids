import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const events = await prisma.event.findMany({
    where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    orderBy: { date: "asc" },
    include: { volunteers: { select: { userId: true, user: { select: { name: true, username: true } } } } },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, date, endDate, description, notes, volunteerIds } = body;

  const event = await prisma.event.create({
    data: {
      title,
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : null,
      description: description || null,
      notes: notes || null,
      volunteers: volunteerIds?.length
        ? { create: volunteerIds.map((userId: string) => ({ userId })) }
        : undefined,
    },
    include: { volunteers: { select: { userId: true, user: { select: { name: true, username: true } } } } },
  });

  return NextResponse.json(event, { status: 201 });
}
