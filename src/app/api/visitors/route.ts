import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canLogVisitor } from "@/lib/permissions";
import { suggestedClassName, ageInYears } from "@/lib/age";
import { dayRangeUTC, dateTimeOnDay, dayKey } from "@/lib/dates";

const schema = z.object({
  name: z.string().min(2),
  birthdate: z.string().min(1),
  date: z.string().min(1).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (date) {
    if (!canLogVisitor(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { start, end } = dayRangeUTC(date);
    const visitors = await prisma.visitor.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: { classGroup: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(visitors);
  }

  if (from && to) {
    const { start } = dayRangeUTC(from);
    const { end } = dayRangeUTC(to);
    const visitors = await prisma.visitor.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(visitors);
  }

  return NextResponse.json({ error: "date, or from+to, is required" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canLogVisitor(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const birthdate = new Date(parsed.data.birthdate);
  const suggestion = suggestedClassName(birthdate);
  const classGroup = await prisma.classGroup.findFirst({
    where: { name: suggestion },
    select: { id: true, name: true },
  });

  const visitor = await prisma.visitor.create({
    data: {
      name: parsed.data.name,
      birthdate,
      classGroupId: classGroup?.id ?? null,
      createdById: session.user.id,
      createdAt: dateTimeOnDay(parsed.data.date ?? dayKey()),
    },
    include: { classGroup: { select: { id: true, name: true } } },
  });

  return NextResponse.json(
    { ...visitor, age: ageInYears(birthdate) },
    { status: 201 }
  );
}
