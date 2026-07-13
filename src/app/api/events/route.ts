import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isLeadership } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const events = await prisma.event.findMany({
    where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    include: { classes: { include: { classGroup: { select: { id: true, name: true } } } } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !isLeadership(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, date, description, classGroupIds } = body;

  const event = await prisma.event.create({
    data: {
      title,
      date: new Date(date),
      description: description || null,
      classes: { create: (classGroupIds ?? []).map((classGroupId: string) => ({ classGroupId })) },
    },
    include: { classes: { include: { classGroup: { select: { id: true, name: true } } } } },
  });

  return NextResponse.json(event, { status: 201 });
}
