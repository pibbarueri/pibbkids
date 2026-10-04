import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canEditVisitor, canLogVisitor } from "@/lib/permissions";
import { visitorAgeText } from "@/lib/age";
import { ageMonthsField, classGroupIdForVisitor } from "@/lib/visitors";
import { dayRangeUTC, dateTimeOnDay, dayKey } from "@/lib/dates";
import { SundayType } from "@prisma/client";

// Reception logs either a birthdate or just the age, never both.
const schema = z
  .object({
    name: z.string().min(2),
    birthdate: z.string().min(1).optional(),
    ageMonths: ageMonthsField.optional(),
    date: z.string().min(1).optional(),
    type: z.enum(SundayType),
  })
  .refine((d) => (d.birthdate === undefined) !== (d.ageMonths === undefined), {
    message: "Informe a idade ou a data de nascimento.",
    path: ["ageMonths"],
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
    const today = dayKey();
    return NextResponse.json(
      visitors.map((v) => ({
        ...v,
        canEdit: !v.childId && canEditVisitor(session.user.role, dayKey(v.createdAt), today),
      }))
    );
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

  const birthdate = parsed.data.birthdate ? new Date(parsed.data.birthdate) : null;
  const ageMonths = birthdate ? null : parsed.data.ageMonths!;

  const visitor = await prisma.visitor.create({
    data: {
      name: parsed.data.name,
      birthdate,
      ageMonths,
      type: parsed.data.type,
      classGroupId: await classGroupIdForVisitor({ birthdate, ageMonths }),
      createdById: session.user.id,
      createdAt: dateTimeOnDay(parsed.data.date ?? dayKey()),
    },
    include: { classGroup: { select: { id: true, name: true } } },
  });

  return NextResponse.json(
    { ...visitor, ageText: visitorAgeText(visitor) },
    { status: 201 }
  );
}
